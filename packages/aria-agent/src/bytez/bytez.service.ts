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

        // Use OpenAI-compatible endpoint for tool calling
        const endpoint = useTools 
          ? 'https://api.bytez.com/models/v2/openai/v1/chat/completions'
          : `${this.baseUrl}/${provider}/${modelName}`;

        const requestBody: any = {
          messages: bytezMessages,
          max_tokens: 8192,
        };

        // Add model for OpenAI-compatible endpoint
        if (useTools) {
          requestBody.model = model;
          requestBody.tools = this.getComputerUseTools();
          requestBody.tool_choice = 'auto';
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
          
          // Mark key as failed and try next one
          this.keyManager.markCurrentKeyAsFailed(error);
          lastError = error;
          continue;
        }

        const data = await response.json();

        // Handle OpenAI-compatible response format
        if (useTools && data.choices) {
          // Mark key as successful
          this.keyManager.markCurrentKeyAsSuccessful();
          return this.formatOpenAIResponse(data);
        }

        // Handle native Bytez response format
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
            // Bytez native image format
            contentParts.push({
              type: 'image',
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            });
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
            // Bytez native image format
            contentParts.push({
              type: 'image',
              url: `data:${block.source.media_type};base64,${block.source.data}`,
            });
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
        continue;
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
        if (hasImage && contentParts.length > 0) {
          bytezMessages.push({
            role: 'user',
            content: contentParts,
          });
        } else if (textParts.length > 0) {
          bytezMessages.push({
            role: 'user',
            content: textParts.join('\n\n'),
          });
        }
      }
    }

    return bytezMessages;
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
          name: 'computer_screenshot',
          description: 'Captures a screenshot of the current screen',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_left_click',
          description: 'Performs a left mouse click at the specified coordinates',
          parameters: {
            type: 'object',
            properties: {
              x: {
                type: 'number',
                description: 'X coordinate for the click',
              },
              y: {
                type: 'number',
                description: 'Y coordinate for the click',
              },
            },
            required: ['x', 'y'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_right_click',
          description: 'Performs a right mouse click at the specified coordinates',
          parameters: {
            type: 'object',
            properties: {
              x: {
                type: 'number',
                description: 'X coordinate for the click',
              },
              y: {
                type: 'number',
                description: 'Y coordinate for the click',
              },
            },
            required: ['x', 'y'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_double_click',
          description: 'Performs a double click at the specified coordinates',
          parameters: {
            type: 'object',
            properties: {
              x: {
                type: 'number',
                description: 'X coordinate for the double click',
              },
              y: {
                type: 'number',
                description: 'Y coordinate for the double click',
              },
            },
            required: ['x', 'y'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_type_text',
          description: 'Types a string of text character by character',
          parameters: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The text to type',
              },
              isSensitive: {
                type: 'boolean',
                description: 'Whether the text is sensitive (e.g., password)',
              },
            },
            required: ['text'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_type_keys',
          description: 'Types a sequence of keys (useful for keyboard shortcuts)',
          parameters: {
            type: 'object',
            properties: {
              keys: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of key names to press',
              },
            },
            required: ['keys'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_application',
          description: 'Opens or switches to an application',
          parameters: {
            type: 'object',
            properties: {
              application: {
                type: 'string',
                description: 'Name of the application to open',
              },
            },
            required: ['application'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'computer_scroll',
          description: 'Scrolls the screen',
          parameters: {
            type: 'object',
            properties: {
              direction: {
                type: 'string',
                enum: ['up', 'down', 'left', 'right'],
                description: 'Direction to scroll',
              },
              amount: {
                type: 'number',
                description: 'Amount to scroll',
              },
            },
            required: ['direction'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'set_task_status',
          description: 'Set the status of the current task. Use this when the task is completed, needs help, or has failed. ALWAYS call this as your final action.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['completed', 'failed', 'needs_help'],
                description: 'The status of the task',
              },
              description: {
                type: 'string',
                description: 'A brief description or summary of what was accomplished or what help is needed',
              },
            },
            required: ['status', 'description'],
          },
        },
      },
    ];
  }
}
