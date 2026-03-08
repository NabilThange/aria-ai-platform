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
import { groqTools } from './groq.tools';
import Groq from 'groq-sdk';
import { v4 as uuid } from 'uuid';
import { DEFAULT_MODEL } from './groq.constants';

@Injectable()
export class GroqService implements BytebotAgentService {
  private readonly groq: Groq;
  private readonly logger = new Logger(GroqService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY is not set. GroqService will not work properly.',
      );
    }

    this.groq = new Groq({
      apiKey: apiKey || 'dummy-key-for-initialization',
    });
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
  ): Promise<BytebotAgentResponse> {
    try {
      const groqMessages = this.formatMessagesForGroq(messages);

      const response = await this.groq.chat.completions.create(
        {
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...groqMessages,
          ],
          tools: useTools ? groqTools : undefined,
          tool_choice: useTools ? 'auto' : undefined,
          temperature: 0.7,
          max_tokens: 8192,
        },
        { signal },
      );

      const choice = response.choices?.[0];

      if (!choice) {
        throw new Error('No choice found in response');
      }

      const message = choice.message;

      if (!message) {
        throw new Error('No message found in choice');
      }

      return {
        contentBlocks: this.formatGroqResponse(message),
        tokenUsage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new BytebotAgentInterrupt();
      }
      this.logger.error(
        `Error sending message to Groq: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private formatMessagesForGroq(messages: Message[]): any[] {
    const groqMessages: any[] = [];

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
          // Note: Groq doesn't support images in the same way, so we skip them
        }

        if (textParts.length > 0) {
          groqMessages.push({
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

            groqMessages.push({
              role: 'tool',
              tool_call_id: block.tool_use_id,
              content: block.is_error
                ? `Error: ${resultText}`
                : resultText,
            });
            break;
          }
          case MessageContentType.Image:
            // Groq doesn't support images in most models, skip
            break;
          case MessageContentType.Thinking:
            // Include thinking as text
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

        groqMessages.push(msg);
      } else if (textParts.length > 0) {
        groqMessages.push({
          role: 'user',
          content: textParts.join('\n\n'),
        });
      }
    }

    return groqMessages;
  }

  private formatGroqResponse(message: any): MessageContentBlock[] {
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
