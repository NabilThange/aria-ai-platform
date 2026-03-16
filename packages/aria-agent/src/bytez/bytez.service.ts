import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
  isComputerToolUseContentBlock,
  isImageContentBlock,
  isUserActionContentBlock,
} from '@bytebot/shared';
import {
  BytebotAgentService,
  BytebotAgentInterrupt,
  BytebotAgentResponse,
} from '../agent/agent.types';
import { Message, Role } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { BytezKeyManagerService } from './bytez-key-manager.service';

const DEFAULT_MODEL_NAME = 'anthropic/claude-haiku-4-5';

@Injectable()
export class BytezService implements BytebotAgentService {
  private readonly baseUrl = 'https://api.bytez.com/models/v2';
  private readonly logger = new Logger(BytezService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: BytezKeyManagerService,
  ) {
    const totalKeys = this.keyManager.getTotalKeys();
    if (totalKeys === 0) {
      this.logger.warn(
        'No BYTEZ_API_KEY found. BytezService will not work properly.',
      );
    } else {
      this.logger.log(`BytezService initialized with ${totalKeys} API key(s)`);
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL_NAME,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    this.logger.log(`🔌 [BytezService] API call initiated`);
    this.logger.log(`   Model: ${model}`);
    this.logger.log(`   Use Tools: ${useTools}`);
    this.logger.log(`   Messages: ${messages.length}`);
    this.logger.log(`   System Prompt: ${systemPrompt?.substring(0, 100)}...`);
    
    const maxRetries = this.keyManager.getTotalKeys();
    let lastError: Error | null = null;

    // Try with each available key
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.keyManager.getCurrentKey();
      
      if (!apiKey) {
        throw new Error('No valid Bytez API key available');
      }

      try {
        const bytezMessages = this.formatMessagesForBytez(messages, systemPrompt);

        // Extract provider and model from model string (e.g., "anthropic/claude-haiku-4-5")
        const [provider, modelName] = model.split('/');
        if (!provider || !modelName) {
          throw new Error(`Invalid model format: ${model}. Expected format: provider/model-name`);
        }

        // Determine endpoint based on provider
        // For Anthropic models, ALWAYS use native endpoint (supports images + tools)
        // For other providers, use OpenAI-compatible endpoint when tools are needed
        const useNativeAnthropicEndpoint = provider === 'anthropic';
        const endpoint = useNativeAnthropicEndpoint
          ? `${this.baseUrl}/${provider}/${modelName}`
          : useTools 
            ? 'https://api.bytez.com/models/v2/openai/v1/chat/completions'
            : `${this.baseUrl}/${provider}/${modelName}`;

        const requestBody: any = {
          messages: bytezMessages,
          max_tokens: 8192,
        };

        // Configure request based on endpoint type
        if (useNativeAnthropicEndpoint) {
          // Native Anthropic endpoint: Use params object for tools
          if (useTools) {
            requestBody.params = {
              max_tokens: 8192,
              tools: this.getAnthropicTools(),
              tool_choice: { type: 'auto' },
            };
          }
          // System prompt will be extracted and added as requestBody.system below
        } else if (useTools) {
          // OpenAI-compatible endpoint: Use top-level tools
          requestBody.model = model;
          requestBody.tools = this.getComputerUseTools();
          requestBody.tool_choice = 'auto';
        }

        // Handle system prompt extraction for native Anthropic endpoint
        if (provider === 'anthropic') {
          // For native Anthropic endpoint, system prompt goes as separate parameter
          // Remove system message from messages array if present
          const systemMessageIndex = bytezMessages.findIndex(m => m.role === 'system');
          this.logger.debug(`System message index: ${systemMessageIndex}, Total messages before extraction: ${bytezMessages.length}`);
          if (systemMessageIndex !== -1) {
            const systemMessage = bytezMessages.splice(systemMessageIndex, 1)[0];
            requestBody.system = systemMessage.content;
            this.logger.debug(`Extracted system message, remaining messages: ${bytezMessages.length}`);
          }
        } else if (provider === 'google') {
          // For Google Gemini, system prompt can stay in messages array
          // Gemini accepts system messages in the standard format
          this.logger.debug(`Using Google Gemini - keeping system message in messages array`);
        } else {
          // For open-source models (Qwen, Llama, etc.), keep system message in messages array
          this.logger.debug(`Using open-source model (${provider}) - keeping system message in messages array`);
        }

        // Validate we have at least one message
        if (requestBody.messages.length === 0) {
          this.logger.error(`Empty messages array! bytezMessages length: ${bytezMessages.length}`);
          throw new Error('Cannot send request with empty messages array. This indicates a message formatting issue.');
        }

        // DEBUG: Log the exact request being sent to Bytez (WITHOUT full image data to avoid huge logs)
        this.logger.debug(`📤 Sending request to Bytez:`);
        this.logger.debug(`   Endpoint: ${endpoint}`);
        this.logger.debug(`   Messages count: ${requestBody.messages.length}`);
        requestBody.messages.forEach((msg: any, idx: number) => {
          this.logger.debug(`   Message ${idx}: role=${msg.role}, contentType=${typeof msg.content}, isArray=${Array.isArray(msg.content)}`);
          if (Array.isArray(msg.content)) {
            this.logger.debug(`      Content array length: ${msg.content.length}`);
            msg.content.forEach((part: any, partIdx: number) => {
              if (part.type === 'image') {
                // Don't log full image data - just log that it exists
                const dataSize = part.source?.data ? `${(part.source.data.length / 1024).toFixed(1)}KB` : 'unknown';
                this.logger.debug(`      Part ${partIdx}: type=image, media_type=${part.source?.media_type}, size=${dataSize}`);
              } else if (part.type === 'text') {
                const textPreview = part.text?.substring(0, 100) || '';
                this.logger.debug(`      Part ${partIdx}: type=text, length=${part.text?.length || 0}, preview="${textPreview}..."`);
              } else {
                this.logger.debug(`      Part ${partIdx}: type=${part.type}`);
              }
            });
          } else if (typeof msg.content === 'string') {
            const preview = msg.content.substring(0, 100);
            this.logger.debug(`      Content: string, length=${msg.content.length}, preview="${preview}..."`);
          }
        });

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(
            `Bytez API error: ${response.status} - ${JSON.stringify(errorData)}`,
          );
          
          // Mark key as failed and try next one
          this.keyManager.markCurrentKeyAsFailed(error);
          lastError = error;
          continue;
        }

        const data = await response.json() as any;

        // Handle native Anthropic endpoint response (when using native endpoint)
        if (useNativeAnthropicEndpoint && useTools) {
          // Mark key as successful
          this.keyManager.markCurrentKeyAsSuccessful();
          
          // LOG ACTUAL RESPONSE CONTENT
          this.logger.log(`📝 [BytezService] Native Anthropic response:`);
          const providerContentPreview = JSON.stringify(data.provider?.content || []).substring(0, 500);
          this.logger.log(`   Provider content: ${providerContentPreview}${providerContentPreview.length >= 500 ? '...[truncated]' : ''}`);
          const outputPreview = JSON.stringify(data.output || {}).substring(0, 500);
          this.logger.log(`   Output: ${outputPreview}${outputPreview.length >= 500 ? '...[truncated]' : ''}`);
          
          return this.formatNativeAnthropicResponse(data);
        }

        // Handle OpenAI-compatible response format
        if (useTools && data.choices) {
          // Mark key as successful
          this.keyManager.markCurrentKeyAsSuccessful();
          
          // LOG ACTUAL RESPONSE CONTENT
          this.logger.log(`📝 [BytezService] OpenAI-format response:`);
          this.logger.log(`   Message content: ${data.choices[0]?.message?.content || '(empty)'}`);
          if (data.choices[0]?.message?.tool_calls) {
            const toolCallsPreview = JSON.stringify(data.choices[0].message.tool_calls, null, 2).substring(0, 500);
            this.logger.log(`   Tool calls: ${toolCallsPreview}${toolCallsPreview.length >= 500 ? '...[truncated]' : ''}`);
          }
          
          return this.formatOpenAIResponse(data);
        }

        // Handle native Bytez response format (non-tool, non-Anthropic)
        if (data.error) {
          const error = new Error(`Bytez error: ${data.error}`);
          this.keyManager.markCurrentKeyAsFailed(error);
          lastError = error;
          continue;
        }

        if (!data.output || !data.output.content) {
          const error = new Error('No output content in Bytez response');
          this.keyManager.markCurrentKeyAsFailed(error);
          lastError = error;
          continue;
        }

        // Mark key as successful
        this.keyManager.markCurrentKeyAsSuccessful();
        
        // LOG ACTUAL RESPONSE CONTENT
        this.logger.log(`✅ [BytezService] API call successful`);
        this.logger.log(`   Input tokens: ${data.provider?.usage?.input_tokens || 0}`);
        this.logger.log(`   Output tokens: ${data.provider?.usage?.output_tokens || 0}`);
        
        // LOG ACTUAL RESPONSE CONTENT (truncated to avoid huge logs)
        this.logger.log(`📝 [BytezService] Response content:`);
        const outputPreview = JSON.stringify(data.output, null, 2).substring(0, 500);
        this.logger.log(outputPreview + (outputPreview.length >= 500 ? '\n...[truncated]' : ''));
        
        return {
          contentBlocks: this.formatBytezResponse(data.output),
          tokenUsage: {
            inputTokens: data.provider?.usage?.input_tokens || 0,
            outputTokens: data.provider?.usage?.output_tokens || 0,
            totalTokens:
              (data.provider?.usage?.input_tokens || 0) +
              (data.provider?.usage?.output_tokens || 0),
          },
        };
      } catch (error: any) {
        if (error.name === 'AbortError') {
          throw new BytebotAgentInterrupt();
        }
        
        // Mark key as failed and try next one
        this.keyManager.markCurrentKeyAsFailed(error);
        lastError = error;
        
        // If this was the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          this.logger.error(
            `All Bytez API keys failed. Last error: ${error.message}`,
            error.stack,
          );
          throw error;
        }
        
        // Otherwise, continue to next key
        this.logger.warn(
          `Attempt ${attempt + 1}/${maxRetries} failed, trying next key...`,
        );
      }
    }

    // If we get here, all keys failed
    throw lastError || new Error('All Bytez API keys failed');
  }

  private formatMessagesForBytez(messages: Message[], systemPrompt: string): any[] {
    const bytezMessages: any[] = [];

    this.logger.debug(`formatMessagesForBytez called with ${messages.length} messages`);
    this.logger.debug(`System prompt length: ${systemPrompt?.length || 0}`);
    this.logger.debug(`Input messages structure: ${JSON.stringify(messages.map(m => ({ role: m.role, contentType: typeof m.content, contentLength: Array.isArray(m.content) ? m.content.length : 'not-array' })))}`);

    // Add system prompt as first message
    if (systemPrompt) {
      bytezMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    for (const message of messages) {
      this.logger.debug(`Processing message with role: ${message.role}`);
      const messageContentBlocks = message.content as MessageContentBlock[];
      this.logger.debug(`Content blocks: ${messageContentBlocks?.length || 'null/undefined'}`);

      // Handle user action blocks
      if (
        messageContentBlocks.every((block) => isUserActionContentBlock(block))
      ) {
        const userActionContentBlocks = messageContentBlocks.flatMap(
          (block) => block.content,
        );
        const contentParts: any[] = [];

        for (const block of userActionContentBlocks) {
          if (isComputerToolUseContentBlock(block)) {
            contentParts.push({
              type: 'text',
              text: `User performed action: ${block.name}\n${JSON.stringify(block.input, null, 2)}`,
            });
          } else if (isImageContentBlock(block)) {
            // Anthropic native image format
            if (block.source.data) {
              contentParts.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: block.source.media_type,
                  data: block.source.data,
                },
              });
            } else if ((block.source as any).url) {
              contentParts.push({
                type: 'image',
                source: {
                  type: 'url',
                  url: (block.source as any).url,
                },
              });
            }
          }
        }

        if (contentParts.length > 0) {
          bytezMessages.push({
            role: 'user',
            content: contentParts.length === 1 && contentParts[0].type === 'text'
              ? contentParts[0].text
              : contentParts,
          });
        }
        continue;
      }

      // Handle regular message blocks
      const textParts: string[] = [];
      const contentParts: any[] = [];
      const toolCalls: any[] = [];
      let hasImage = false;

      for (const block of messageContentBlocks) {
        switch (block.type) {
          case MessageContentType.Text:
            if (hasImage) {
              contentParts.push({
                type: 'text',
                text: block.text,
              });
            } else {
              textParts.push(block.text);
            }
            break;
          case MessageContentType.Image:
            hasImage = true;
            // If we have text parts, convert them to content parts first
            if (textParts.length > 0) {
              contentParts.push({
                type: 'text',
                text: textParts.join('\n\n'),
              });
              textParts.length = 0;
            }
            // Anthropic native format: use base64 or url
            if (block.source.data) {
              // Base64 image
              contentParts.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: block.source.media_type,
                  data: block.source.data,
                },
              });
            } else if ((block.source as any).url) {
              // URL-based image
              contentParts.push({
                type: 'image',
                source: {
                  type: 'url',
                  url: (block.source as any).url,
                },
              });
            }
            break;
          case MessageContentType.ToolResult: {
            // For OpenAI format, tool results are separate messages
            const content = block.content[0];
            let resultText: string;
            
            if (content.type === MessageContentType.Image) {
              // For image results, we'll need to send them as user messages with images
              // This is a limitation - we'll convert to text description for now
              resultText = '[Screenshot captured]';
            } else {
              resultText =
                content.type === MessageContentType.Text
                  ? content.text
                  : JSON.stringify(content);
            }
            
            // Store tool result to be added as separate message
            bytezMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: block.is_error ? `Error: ${resultText}` : resultText,
            });
            break;
          }
          case MessageContentType.Thinking:
            const thinkingText = `[Thinking: ${block.thinking}]`;
            if (hasImage) {
              contentParts.push({
                type: 'text',
                text: thinkingText,
              });
            } else {
              textParts.push(thinkingText);
            }
            break;
          case MessageContentType.ToolUse:
            // For OpenAI format, tool calls are part of assistant message
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
            });
            break;
        }
      }

      // Skip tool result messages as they were already added above
      if (messageContentBlocks.some(b => b.type === MessageContentType.ToolResult)) {
        this.logger.debug(`Skipping message - contains ToolResult`);
        continue;
      }

      if (message.role === Role.ASSISTANT) {
        this.logger.debug(`Processing ASSISTANT message - toolCalls: ${toolCalls.length}, hasImage: ${hasImage}, contentParts: ${contentParts.length}, textParts: ${textParts.length}`);
        const assistantMessage: any = {
          role: 'assistant',
        };

        if (toolCalls.length > 0) {
          assistantMessage.tool_calls = toolCalls;
          // OpenAI format requires content to be present, even if empty
          assistantMessage.content = textParts.join('\n\n') || '';
        } else if (hasImage && contentParts.length > 0) {
          assistantMessage.content = contentParts;
        } else if (textParts.length > 0) {
          assistantMessage.content = textParts.join('\n\n');
        }

        if (assistantMessage.content !== undefined || assistantMessage.tool_calls) {
          bytezMessages.push(assistantMessage);
        }
      } else if (message.role === Role.USER) {
        this.logger.debug(`Adding USER message - hasImage: ${hasImage}, contentParts: ${contentParts.length}, textParts: ${textParts.length}`);
        if (hasImage && contentParts.length > 0) {
          // Validate content parts before adding
          const validContentParts = contentParts.filter(part => {
            if (!part || typeof part !== 'object') {
              this.logger.warn(`Invalid content part (not an object): ${typeof part}`);
              return false;
            }
            if (!part.type) {
              this.logger.warn(`Content part missing type`);
              return false;
            }
            if (part.type === 'text' && !part.text) {
              this.logger.warn(`Text content part missing text field`);
              return false;
            }
            if (part.type === 'image' && !part.url) {
              this.logger.warn(`Image content part missing url field`);
              return false;
            }
            return true;
          });

          if (validContentParts.length === 0) {
            this.logger.error(`All content parts were invalid! Count: ${contentParts.length}, Types: ${contentParts.map(p => p?.type || 'unknown').join(', ')}`);
            throw new Error('Cannot create USER message with no valid content parts');
          }

          bytezMessages.push({
            role: 'user',
            content: validContentParts,
          });
        } else if (textParts.length > 0) {
          bytezMessages.push({
            role: 'user',
            content: textParts.join('\n\n'),
          });
        } else {
          this.logger.warn(`USER message skipped - no content to add`);
        }
      }
    }

    this.logger.debug(`formatMessagesForBytez returning ${bytezMessages.length} messages`);
    this.logger.debug(`Message roles: ${bytezMessages.map(m => m.role).join(', ')}`);
    if (bytezMessages.length === 0) {
      this.logger.error('formatMessagesForBytez produced EMPTY messages array!');
      this.logger.error(`Input messages: ${JSON.stringify(messages, null, 2)}`);
    }

    return bytezMessages;
  }

  /**
   * Format response from native Anthropic endpoint
   * Tool calls are in data.provider.content, text may be in data.output.content
   */
  private formatNativeAnthropicResponse(data: any): BytebotAgentResponse {
    const blocks: MessageContentBlock[] = [];

    // Extract content from provider (where tool_use blocks live)
    const providerContent = data.provider?.content || [];
    
    // Extract content from output (where text may be)
    const outputContent = data.output?.content || [];

    // Merge both sources
    const allContent = Array.isArray(providerContent) ? providerContent : [];
    if (Array.isArray(outputContent)) {
      allContent.push(...outputContent);
    } else if (typeof outputContent === 'string') {
      allContent.push({ type: 'text', text: outputContent });
    }

    // Process content blocks
    for (const block of allContent) {
      if (!block || typeof block !== 'object') continue;

      if (block.type === 'text' && block.text) {
        blocks.push({
          type: MessageContentType.Text,
          text: block.text,
        } as TextContentBlock);
      } else if (block.type === 'tool_use') {
        // Parse tool_use block from Anthropic format
        blocks.push({
          type: MessageContentType.ToolUse,
          id: block.id,
          name: block.name,
          input: block.input || {},
        } as ToolUseContentBlock);
      }
    }

    return {
      contentBlocks: blocks,
      tokenUsage: {
        inputTokens: data.provider?.usage?.input_tokens || 0,
        outputTokens: data.provider?.usage?.output_tokens || 0,
        totalTokens:
          (data.provider?.usage?.input_tokens || 0) +
          (data.provider?.usage?.output_tokens || 0),
      },
    };
  }

  private formatBytezResponse(output: any): MessageContentBlock[] {
    const blocks: MessageContentBlock[] = [];

    if (output.content) {
      blocks.push({
        type: MessageContentType.Text,
        text: output.content,
      } as TextContentBlock);
    }

    return blocks;
  }

  private formatOpenAIResponse(data: any): BytebotAgentResponse {
    const choice = data.choices[0];
    const message = choice.message;
    const blocks: MessageContentBlock[] = [];

    // Add text content if present
    if (message.content) {
      blocks.push({
        type: MessageContentType.Text,
        text: message.content,
      } as TextContentBlock);
    }

    // Add tool calls if present
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        blocks.push({
          type: MessageContentType.ToolUse,
          id: toolCall.id,
          name: toolCall.function.name,
          input: args,
        } as ToolUseContentBlock);
      }
    }

    return {
      contentBlocks: blocks,
      tokenUsage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  }

  private getComputerUseTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'computer',
          description: 'Control mouse and keyboard to interact with the desktop. Use this to click, type, paste, press keys, and take screenshots.',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'screenshot', 'scroll', 'application', 'terminal_command'],
                description: 'The action to perform: click (left click), double_click, right_click, type (type text slowly), paste (paste text fast via clipboard), key (press key/combo), screenshot, scroll, application (open app), terminal_command (run command in terminal)',
              },
              x: {
                type: 'integer',
                description: 'X coordinate for mouse actions (click, double_click, right_click, scroll)',
              },
              y: {
                type: 'integer',
                description: 'Y coordinate for mouse actions (click, double_click, right_click, scroll)',
              },
              text: {
                type: 'string',
                description: 'Text to type/paste (for type or paste action) or key to press (for key action, e.g., "Return", "ctrl+c"). Use paste for long text (faster), type for short text.',
              },
              direction: {
                type: 'string',
                enum: ['up', 'down'],
                description: 'Scroll direction (for scroll action)',
              },
              amount: {
                type: 'integer',
                description: 'Scroll amount in lines (for scroll action)',
              },
              application: {
                type: 'string',
                description: 'Application name to open (for application action, e.g., "chromium", "terminal", "vscode")',
              },
              command: {
                type: 'string',
                description: 'Terminal command to run (for terminal_command action, e.g., "ls -la", "npm install")',
              },
            },
            required: ['action'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'set_task_status',
          description: 'Mark the current step as completed or failed. Use this when the success criteria is met or when the step cannot be completed.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['completed', 'failed'],
                description: 'The status: completed (success criteria met) or failed (cannot complete)',
              },
              message: {
                type: 'string',
                description: 'Brief message explaining the status (what was accomplished or why it failed)',
              },
            },
            required: ['status', 'message'],
          },
        },
      },
    ];
  }

  /**
   * Get tools in Anthropic native format (for native Anthropic endpoint)
   * Uses input_schema instead of parameters
   * Based on desktop.tools.ts structure - unified 'computer' tool + set_task_status
   */
  private getAnthropicTools(): any[] {
    return [
      {
        name: 'computer',
        description: 'Control mouse and keyboard to interact with the desktop. Use this to click, type, paste, press keys, and take screenshots.',
        input_schema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'screenshot', 'scroll', 'application', 'terminal_command'],
              description: 'The action to perform: click (left click), double_click, right_click, type (type text slowly), paste (paste text fast via clipboard), key (press key/combo), screenshot, scroll, application (open app), terminal_command (run command in terminal)',
            },
            x: {
              type: 'integer',
              description: 'X coordinate for mouse actions (click, double_click, right_click, scroll)',
            },
            y: {
              type: 'integer',
              description: 'Y coordinate for mouse actions (click, double_click, right_click, scroll)',
            },
            text: {
              type: 'string',
              description: 'Text to type/paste (for type or paste action) or key to press (for key action, e.g., "Return", "ctrl+c"). Use paste for long text (faster), type for short text.',
            },
            direction: {
              type: 'string',
              enum: ['up', 'down'],
              description: 'Scroll direction (for scroll action)',
            },
            amount: {
              type: 'integer',
              description: 'Scroll amount in lines (for scroll action)',
            },
            application: {
              type: 'string',
              description: 'Application name to open (for application action, e.g., "chromium", "terminal", "vscode")',
            },
            command: {
              type: 'string',
              description: 'Terminal command to run (for terminal_command action, e.g., "ls -la", "npm install")',
            },
          },
          required: ['action'],
        },
      },
      {
        name: 'set_task_status',
        description: 'Mark the current step as completed or failed. Use this when the success criteria is met or when the step cannot be completed.',
        input_schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['completed', 'failed'],
              description: 'The status: completed (success criteria met) or failed (cannot complete)',
            },
            message: {
              type: 'string',
              description: 'Brief message explaining the status (what was accomplished or why it failed)',
            },
          },
          required: ['status', 'message'],
        },
      },
    ];
  }
}
