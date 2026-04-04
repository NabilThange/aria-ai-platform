import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageContentBlock,
  MessageContentType,
  TextContentBlock,
  ToolUseContentBlock,
} from '@bytebot/shared';
import {
  BytebotAgentService,
  BytebotAgentInterrupt,
  BytebotAgentResponse,
} from '../agent/agent.types';
import { Message, Role } from '@prisma/client';
import { v4 as uuid } from 'uuid';
import { DEFAULT_MODEL, OPENROUTER_BASE_URL } from './openrouter.constants';
import { OpenRouterKeyManagerService } from './openrouter-key-manager.service';
import { MockLlmService } from '../mock/mock-llm.service';

@Injectable()
export class OpenRouterService implements BytebotAgentService {
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: OpenRouterKeyManagerService,
    private readonly mockLlmService: MockLlmService,
  ) {
    const totalKeys = this.keyManager.getTotalKeys();

    if (totalKeys === 0) {
      this.logger.warn(
        'No OPENROUTER_API_KEY found. OpenRouterService will not work properly.',
      );
    } else {
      this.logger.log(`OpenRouterService initialized with ${totalKeys} API key(s)`);
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
    customTools?: any[],
    options?: {
      isFirstMessage?: boolean;
      conversationId?: string;
      skipSystemPrompt?: boolean;
    },
  ): Promise<BytebotAgentResponse> {
    if (this.mockLlmService.isMockTask(messages)) {
      return this.mockLlmService.handleMockTask(systemPrompt, messages, model);
    }

    const maxRetries = this.keyManager.getTotalKeys();
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const apiKey = this.keyManager.getCurrentKey();

        if (!apiKey) {
          throw new Error('No valid OpenRouter API key available');
        }

        // ===== SYSTEM PROMPT OPTIMIZATION =====
        const shouldIncludeSystemPrompt =
          options?.skipSystemPrompt === false ||
          options?.isFirstMessage === true ||
          options?.isFirstMessage === undefined;

        if (!shouldIncludeSystemPrompt) {
          this.logger.log(`🚀 [OPTIMIZATION] Skipping system prompt (conversation continuation)`);
          this.logger.log(`   Saved: ~${Math.ceil(systemPrompt.length / 4)} tokens (${systemPrompt.length} chars)`);
        }
        // ===== END SYSTEM PROMPT OPTIMIZATION =====

        const openrouterMessages = this.formatMessagesForOpenRouter(
          messages,
          shouldIncludeSystemPrompt ? systemPrompt : '',
        );

        // Use custom tools if provided (OpenAI format)
        const tools = useTools && customTools ? customTools : undefined;

        this.logger.debug(`📤 Sending ${openrouterMessages.length} messages to OpenRouter (model: ${model})`);
        if (tools) {
          this.logger.debug(`   Using ${tools.length} tools`);
        }

        // Build request body
        const requestBody: any = {
          model,
          messages: openrouterMessages,
          temperature: 0.7,
          max_tokens: 8192,
        };

        if (tools && tools.length > 0) {
          requestBody.tools = tools;
        }

        // Make API request
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://aria-agent.com', // Optional: for rankings
            'X-Title': 'ARIA Multi-Agent System', // Optional: for rankings
          },
          body: JSON.stringify(requestBody),
          signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
        }

        const result: any = await response.json();

        if (!result.choices || result.choices.length === 0) {
          throw new Error('No response from OpenRouter API');
        }

        this.logger.log(`📝 [OpenRouterService] Response received`);
        this.logger.log(`   Finish reason: ${result.choices[0].finish_reason}`);

        // Mark key as successful
        this.keyManager.markCurrentKeyAsSuccessful();

        return {
          contentBlocks: this.formatOpenRouterResponse(result.choices[0].message),
          tokenUsage: {
            inputTokens: result.usage?.prompt_tokens || 0,
            outputTokens: result.usage?.completion_tokens || 0,
            totalTokens: result.usage?.total_tokens || 0,
          },
        };
      } catch (error: any) {
        lastError = error;

        if (error.name === 'AbortError') {
          throw new BytebotAgentInterrupt();
        }

        // Rotate key on any API failure
        this.keyManager.markCurrentKeyAsFailed(error);

        if (attempt === maxRetries - 1) {
          this.logger.error(
            `All OpenRouter API keys exhausted. Last error: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        this.logger.warn(
          `OpenRouter attempt ${attempt + 1}/${maxRetries} failed, trying next key: ${error.message}`,
        );
      }
    }

    throw lastError || new Error('All OpenRouter API keys failed');
  }

  /**
   * Format messages for OpenRouter (OpenAI-compatible format)
   */
  private formatMessagesForOpenRouter(messages: Message[], systemPrompt: string): any[] {
    const formattedMessages: any[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      formattedMessages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Convert messages to OpenAI format
    for (const message of messages) {
      const role = message.role === Role.ASSISTANT ? 'assistant' : 'user';
      const content = message.content as MessageContentBlock[];

      // Handle different content types
      if (Array.isArray(content)) {
        const formattedContent: any[] = [];

        for (const block of content) {
          if (block.type === MessageContentType.Text) {
            formattedContent.push({
              type: 'text',
              text: (block as TextContentBlock).text,
            });
          } else if (block.type === MessageContentType.Image) {
            // OpenRouter supports images in OpenAI format
            const imageBlock = block as any;
            formattedContent.push({
              type: 'image_url',
              image_url: {
                url: `data:${imageBlock.source.media_type};base64,${imageBlock.source.data}`,
              },
            });
          } else if (block.type === MessageContentType.ToolUse) {
            // Tool calls in OpenAI format
            const toolBlock = block as ToolUseContentBlock;
            if (!formattedMessages[formattedMessages.length - 1]?.tool_calls) {
              formattedMessages.push({
                role: 'assistant',
                content: null,
                tool_calls: [],
              });
            }
            formattedMessages[formattedMessages.length - 1].tool_calls.push({
              id: toolBlock.id,
              type: 'function',
              function: {
                name: toolBlock.name,
                arguments: JSON.stringify(toolBlock.input),
              },
            });
            continue;
          } else if (block.type === MessageContentType.ToolResult) {
            // Tool results in OpenAI format
            const toolResultBlock = block as any;
            formattedMessages.push({
              role: 'tool',
              tool_call_id: toolResultBlock.tool_use_id,
              content: JSON.stringify(toolResultBlock.content),
            });
            continue;
          }
        }

        if (formattedContent.length > 0) {
          formattedMessages.push({
            role,
            content: formattedContent.length === 1 && formattedContent[0].type === 'text'
              ? formattedContent[0].text
              : formattedContent,
          });
        }
      } else {
        // Simple text message
        formattedMessages.push({
          role,
          content: String(content),
        });
      }
    }

    return formattedMessages;
  }

  /**
   * Format OpenRouter response to our internal format
   */
  private formatOpenRouterResponse(message: any): MessageContentBlock[] {
    const blocks: MessageContentBlock[] = [];

    // Handle text content
    if (message.content) {
      blocks.push({
        type: MessageContentType.Text,
        text: message.content,
      } as TextContentBlock);
    }

    // Handle tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const toolCall of message.tool_calls) {
        blocks.push({
          type: MessageContentType.ToolUse,
          id: toolCall.id || uuid(),
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments || '{}'),
        } as ToolUseContentBlock);
      }
    }

    return blocks;
  }
}
