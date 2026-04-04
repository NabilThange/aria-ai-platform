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
import { MockLlmService } from '../mock/mock-llm.service';


const DEFAULT_MODEL_NAME = 'anthropic/claude-haiku-4-5';

@Injectable()
export class BytezService implements BytebotAgentService {
  private readonly baseUrl = 'https://api.bytez.com/models/v2';
  private readonly logger = new Logger(BytezService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: BytezKeyManagerService,
    private readonly mockLlmService: MockLlmService,
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
    customTools?: any[], // Allow passing custom tools
    options?: {
      isFirstMessage?: boolean;      // NEW: Only send system prompt on first message
      conversationId?: string;       // NEW: Track conversation context
      skipSystemPrompt?: boolean;    // NEW: Explicitly skip system prompt
    },
  ): Promise<BytebotAgentResponse> {
    if (this.mockLlmService.isMockTask(messages)) {
      return this.mockLlmService.handleMockTask(systemPrompt, messages, model);
    }

    // Reduced logging - only log at debug level
    this.logger.debug(`API call: ${model}, tools=${useTools}, messages=${messages.length}`);
    
    const maxRetries = this.keyManager.getTotalKeys();
    let lastError: Error | null = null;

    // Try with each available key
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.keyManager.getCurrentKey();
      
      if (!apiKey) {
        throw new Error('No valid Bytez API key available');
      }

      try {
        // ===== SYSTEM PROMPT OPTIMIZATION =====
        // Only include system prompt on first message or if explicitly requested
        const shouldIncludeSystemPrompt = options?.skipSystemPrompt === false || 
                                          options?.isFirstMessage === true || 
                                          options?.isFirstMessage === undefined; // Default: include (backward compatible)
        
        if (!shouldIncludeSystemPrompt) {
          this.logger.log(`🚀 [OPTIMIZATION] Skipping system prompt (conversation continuation)`);
          this.logger.log(`   Saved: ~${Math.ceil(systemPrompt.length / 4)} tokens (${systemPrompt.length} chars)`);
        }
        // ===== END SYSTEM PROMPT OPTIMIZATION =====

        const bytezMessages = this.formatMessagesForBytez(messages, shouldIncludeSystemPrompt ? systemPrompt : '');

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

        // Use custom tools if provided, otherwise use default tools
        const tools = customTools || (useNativeAnthropicEndpoint ? this.getAnthropicTools() : this.getComputerUseTools());

        // Configure request based on endpoint type
        if (useNativeAnthropicEndpoint) {
          // PHASE 1 FIX: Native Anthropic endpoint requires tools at TOP LEVEL, not in params
          if (useTools) {
            // Validate tool format before sending
            this.validateAnthropicTools(tools);
            
            requestBody.tools = tools;
            requestBody.tool_choice = { type: 'auto' };
            requestBody.max_tokens = 8192;
          }
          // System prompt will be extracted and added as requestBody.system below
        } else if (useTools) {
          // OpenAI-compatible endpoint: Use top-level tools
          requestBody.model = model;
          requestBody.tools = tools;
          requestBody.tool_choice = 'auto';
        }

        // Handle system prompt extraction for native Anthropic endpoint
        if (provider === 'anthropic') {
          // For native Anthropic endpoint, system prompt goes as separate parameter
          const systemMessageIndex = bytezMessages.findIndex(m => m.role === 'system');
          if (systemMessageIndex !== -1) {
            const systemMessage = bytezMessages.splice(systemMessageIndex, 1)[0];
            requestBody.system = systemMessage.content;
          }
        }

        // PHASE 4: Validate we have at least one message after system prompt extraction
        if (requestBody.messages.length === 0) {
          this.logger.error(`Empty messages array after system prompt extraction! Original count: ${bytezMessages.length}`);
          throw new Error('Cannot send request with empty messages array. This indicates a message formatting issue.');
        }

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
          
          // PHASE 2: Smart error classification
          const errorType = this.classifyError(response.status, errorData, error);
          
          // PHASE 5: Enhanced logging
          this.logger.error(
            `[ERROR] Type: ${errorType}, Status: ${response.status}, Key: ${this.keyManager.getCurrentKeyIndex() + 1}/${this.keyManager.getTotalKeys()}, Error: ${error.message}`
          );
          
          if (errorType === 'API_KEY_ERROR') {
            // Rotate key for API key errors
            this.keyManager.markCurrentKeyAsFailed(error);
            this.logger.warn(`[KEY ROTATION] Rotating from Key ${this.keyManager.getCurrentKeyIndex() + 1} due to: ${errorType}`);
            lastError = error;
            continue;
          } else if (errorType === 'FORMAT_ERROR') {
            // Don't rotate for format errors - these are code bugs
            this.logger.error(`[FORMAT ERROR] Not rotating keys - this is a request format issue`);
            throw error;
          } else if (errorType === 'TRANSIENT_ERROR') {
            // For transient errors, retry with same key (will be handled by retry loop)
            this.logger.warn(`[TRANSIENT ERROR] Retrying with same key`);
            lastError = error;
            continue;
          } else {
            // Unknown errors - throw immediately
            this.logger.error(`[UNKNOWN ERROR] Throwing immediately`);
            throw error;
          }
        }

        const data = await response.json() as any;

        // Handle native Anthropic endpoint response (when using native endpoint)
        if (useNativeAnthropicEndpoint && useTools) {
          this.keyManager.markCurrentKeyAsSuccessful();
          // PHASE 5: Log successful API call
          this.logger.log(`[SUCCESS] API call completed with Key ${this.keyManager.getCurrentKeyIndex() + 1}`);
          return this.formatNativeAnthropicResponse(data);
        }

        // Handle OpenAI-compatible response format
        if (useTools && data.choices) {
          this.keyManager.markCurrentKeyAsSuccessful();
          // PHASE 5: Log successful API call
          this.logger.log(`[SUCCESS] API call completed with Key ${this.keyManager.getCurrentKeyIndex() + 1}`);
          return this.formatOpenAIResponse(data);
        }

        // Handle native Bytez response format (non-tool, non-Anthropic)
        if (data.error) {
          // PHASE 2: Use smart error classification
          const errorStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
          const error = new Error(`Bytez error: ${errorStr}`);
          const errorType = this.classifyError(0, data, error);
          
          // PHASE 5: Enhanced logging
          this.logger.error(
            `[ERROR] Type: ${errorType}, Key: ${this.keyManager.getCurrentKeyIndex() + 1}/${this.keyManager.getTotalKeys()}, Error: ${errorStr}`
          );
          
          if (errorType === 'FORMAT_ERROR') {
            // Don't rotate keys for request format errors - these are code bugs
            this.logger.error(`[FORMAT ERROR] Not rotating keys - this is a request format issue`);
            throw error;
          } else if (errorType === 'API_KEY_ERROR') {
            // Rotate keys for API key errors
            this.keyManager.markCurrentKeyAsFailed(error);
            this.logger.warn(`[KEY ROTATION] Rotating from Key ${this.keyManager.getCurrentKeyIndex() + 1} due to: ${errorType}`);
            lastError = error;
            continue;
          } else {
            // For other errors, throw immediately
            throw error;
          }
        }

        if (!data.output || !data.output.content) {
          // This is likely a response format issue, not an API key issue
          const error = new Error('No output content in Bytez response');
          this.logger.error(`[RESPONSE FORMAT ERROR] ${JSON.stringify(data)}`);
          throw error;
        }

        // Mark key as successful
        this.keyManager.markCurrentKeyAsSuccessful();
        // PHASE 5: Log successful API call
        this.logger.log(`[SUCCESS] API call completed with Key ${this.keyManager.getCurrentKeyIndex() + 1}`);
        
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

    // Add system prompt as first message
    if (systemPrompt) {
      bytezMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

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
            // Tool results need to be added as content parts, not separate messages
            // They will be collected and added as a user message later
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
            
            // Add tool result as content part (Anthropic native format)
            contentParts.push({
              type: 'tool_result',
              tool_use_id: block.tool_use_id,
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

      if (message.role === Role.ASSISTANT) {
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
        // Check if this message contains tool results
        const hasToolResults = messageContentBlocks.some(b => b.type === MessageContentType.ToolResult);
        
        if (hasToolResults || (hasImage && contentParts.length > 0)) {
          // For tool results or images, use content parts array
          const validContentParts = contentParts.filter(part => {
            return part && typeof part === 'object' && part.type && 
              (part.type !== 'text' || part.text) && 
              (part.type !== 'image' || (part.source && (part.source.data || part.source.url))) &&
              (part.type !== 'tool_result' || part.tool_use_id);
          });

          if (validContentParts.length === 0 && textParts.length > 0) {
            // Fallback to text if no valid content parts but we have text
            bytezMessages.push({
              role: 'user',
              content: textParts.join('\n\n'),
            });
          } else if (validContentParts.length > 0) {
            bytezMessages.push({
              role: 'user',
              content: validContentParts,
            });
          }
        } else if (textParts.length > 0) {
          bytezMessages.push({
            role: 'user',
            content: textParts.join('\n\n'),
          });
        }
      }
    }

    if (bytezMessages.length === 0) {
      this.logger.error('formatMessagesForBytez produced EMPTY messages array!');
      throw new Error('Message formatting produced empty array');
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

  /**
   * PHASE 2: Smart error classification
   * Classifies errors to determine appropriate handling strategy
   */
  private classifyError(statusCode: number, errorData: any, error: Error): 'API_KEY_ERROR' | 'FORMAT_ERROR' | 'TRANSIENT_ERROR' | 'UNKNOWN_ERROR' {
    const errorStr = typeof errorData.error === 'string' 
      ? errorData.error 
      : JSON.stringify(errorData);
    const errorMessage = error.message.toLowerCase();

    // API_KEY_ERROR: Issues with the API key itself (rotate key)
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('tokens per minute') ||
      errorMessage.includes('tpm') ||
      errorMessage.includes('rpm') ||
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('insufficient') ||
      errorMessage.includes('exceeded') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('payment')
    ) {
      return 'API_KEY_ERROR';
    }

    // FORMAT_ERROR: Request format issues (don't rotate, throw immediately)
    if (
      statusCode === 400 ||
      errorStr.includes('invalid_request_error') ||
      errorStr.includes('Unexpected role') ||
      errorStr.includes('messages:') ||
      errorMessage.includes('invalid request') ||
      errorMessage.includes('bad request') ||
      errorMessage.includes('validation error') ||
      errorMessage.includes('missing required')
    ) {
      return 'FORMAT_ERROR';
    }

    // TRANSIENT_ERROR: Temporary issues (retry with backoff)
    if (
      statusCode >= 500 ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('gateway')
    ) {
      return 'TRANSIENT_ERROR';
    }

    // UNKNOWN_ERROR: Unclassified errors (throw immediately)
    return 'UNKNOWN_ERROR';
  }

  /**
   * PHASE 3: Validate Anthropic tool format
   * Ensures tools have input_schema (not parameters) before sending to API
   */
  private validateAnthropicTools(tools: any[]): void {
    for (const tool of tools) {
      if (!tool.name) {
        throw new Error('Tool missing required "name" field');
      }
      if (!tool.input_schema) {
        throw new Error(
          `Tool "${tool.name}" missing required "input_schema" field. ` +
          `Anthropic native API requires "input_schema", not "parameters".`
        );
      }
      if (tool.parameters) {
        this.logger.warn(
          `Tool "${tool.name}" has "parameters" field but should use "input_schema" for Anthropic native API`
        );
      }
    }
  }
}
