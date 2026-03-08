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
import { openRouterTools } from './openrouter.tools';
import { v4 as uuid } from 'uuid';
import { DEFAULT_MODEL } from './openrouter.constants';

@Injectable()
export class OpenRouterService implements BytebotAgentService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1';
  private readonly logger = new Logger(OpenRouterService.name);

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTER_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn(
        'OPENROUTER_API_KEY is not set. OpenRouterService will not work properly.',
      );
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    try {
      const openRouterMessages = this.formatMessagesForOpenRouter(messages);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://bytebot.ai',
          'X-Title': 'Bytebot Agent',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...openRouterMessages,
          ],
          tools: useTools ? openRouterTools : undefined,
          tool_choice: useTools ? 'auto' : undefined,
          temperature: 0.7,
          max_tokens: 8192,
        }),
        signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new Error('No choice found in response');
      }

      const message = choice.message;

      if (!message) {
        throw new Error('No message found in choice');
      }

      return {
        contentBlocks: this.formatOpenRouterResponse(message),
        tokenUsage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new BytebotAgentInterrupt();
      }
      this.logger.error(
        `Error sending message to OpenRouter: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private formatMessagesForOpenRouter(messages: Message[]): any[] {
    const openRouterMessages: any[] = [];

    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      // Handle user action blocks
      if (
        messageContentBlocks.every((block) => isUserActionContentBlock(block))
      ) {
        const userActionContentBlocks = messageContentBlocks.flatMap(
          (block) => block.content,
        );
        const textParts: string[] = [];

        for (const block of userActionContentBlocks) {
          if (isComputerToolUseContentBlock(block)) {
            textParts.push(
              `User performed action: ${block.name}\n${JSON.stringify(block.input, null, 2)}`,
            );
          }
          // Note: Image handling depends on model support
        }

        if (textParts.length > 0) {
          openRouterMessages.push({
            role: 'user',
            content: textParts.join('\n\n'),
          });
        }
        continue;
      }

      // Handle regular message blocks
      const textParts: string[] = [];
      const toolCalls: any[] = [];

      for (const block of messageContentBlocks) {
        switch (block.type) {
          case MessageContentType.Text:
            textParts.push(block.text);
            break;
          case MessageContentType.ToolUse:
            toolCalls.push({
              id: block.id,
              type: 'function',
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
            });
            break;
          case MessageContentType.ToolResult: {
            const content = block.content[0];
            const resultText =
              content.type === MessageContentType.Text
                ? content.text
                : JSON.stringify(content);

            openRouterMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: block.is_error
                ? `Error: ${resultText}`
                : resultText,
            });
            break;
          }
          case MessageContentType.Image:
            // Skip images for now, model-dependent
            break;
          case MessageContentType.Thinking:
            textParts.push(`[Thinking: ${block.thinking}]`);
            break;
        }
      }

      if (message.role === Role.ASSISTANT) {
        const msg: any = {
          role: 'assistant',
        };

        if (textParts.length > 0) {
          msg.content = textParts.join('\n\n');
        }

        if (toolCalls.length > 0) {
          msg.tool_calls = toolCalls;
        }

        openRouterMessages.push(msg);
      } else if (textParts.length > 0) {
        openRouterMessages.push({
          role: 'user',
          content: textParts.join('\n\n'),
        });
      }
    }

    return openRouterMessages;
  }

  private formatOpenRouterResponse(message: any): MessageContentBlock[] {
    const blocks: MessageContentBlock[] = [];

    if (message.content) {
      blocks.push({
        type: MessageContentType.Text,
        text: message.content,
      } as TextContentBlock);
    }

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        blocks.push({
          type: MessageContentType.ToolUse,
          id: toolCall.id || uuid(),
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        } as ToolUseContentBlock);
      }
    }

    return blocks;
  }
}
