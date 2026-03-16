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
import { googleTools } from './google.tools';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuid } from 'uuid';
import { DEFAULT_MODEL } from './google.constants';
import { GoogleKeyManagerService } from './google-key-manager.service';

@Injectable()
export class GoogleService implements BytebotAgentService {
  private client: GoogleGenerativeAI;
  private readonly logger = new Logger(GoogleService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: GoogleKeyManagerService,
  ) {
    const totalKeys = this.keyManager.getTotalKeys();

    if (totalKeys === 0) {
      this.logger.warn(
        'No GOOGLE_API_KEY found. GoogleService will not work properly.',
      );
    } else {
      this.logger.log(`GoogleService initialized with ${totalKeys} API key(s)`);
    }

    // Initialize with first available key
    const apiKey = this.keyManager.getCurrentKey();
    this.client = new GoogleGenerativeAI(apiKey || 'dummy-key-for-initialization');
  }

  private updateGoogleClient(): void {
    const apiKey = this.keyManager.getCurrentKey();
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);
    }
  }

  /**
   * Convert OpenAI-format tools to Google's functionDeclarations format
   * OpenAI: [{ type: "function", function: { name, description, parameters } }]
   * Google: [{ functionDeclarations: [{ name, description, parameters }] }]
   */
  private convertToolsToGoogleFormat(tools: any[]): any[] {
    // If tools are already in Google format (have functionDeclarations), return as-is
    if (tools.length > 0 && tools[0].functionDeclarations) {
      return tools;
    }

    // Convert from OpenAI format to Google format
    const functionDeclarations = tools.map((tool) => {
      // Handle OpenAI format: { type: "function", function: {...} }
      if (tool.type === 'function' && tool.function) {
        return {
          name: tool.function.name,
          description: tool.function.description,
          parameters: tool.function.parameters || { type: 'object', properties: {} },
        };
      }
      
      // Handle direct format: { name, description, parameters }
      return {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters || { type: 'object', properties: {} },
      };
    });

    return [{ functionDeclarations }];
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
    useTools: boolean = true,
    signal?: AbortSignal,
    customTools?: any[],
  ): Promise<BytebotAgentResponse> {
    const maxRetries = this.keyManager.getTotalKeys();
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Update client with current key before each attempt
        this.updateGoogleClient();

        const googleMessages = this.formatMessagesForGoogle(messages);
        
        // Convert tools to Google format if customTools provided, otherwise use default googleTools
        const tools = customTools 
          ? this.convertToolsToGoogleFormat(customTools)
          : googleTools;

        this.logger.debug(`📤 Sending ${googleMessages.length} messages to Google (model: ${model})`);
        this.logger.debug(`   Using ${tools.length} tool groups`);

        const generationConfig: any = {
          temperature: 0.7,
          maxOutputTokens: 8192,
        };

        const modelInstance = this.client.getGenerativeModel({
          model,
          systemInstruction: systemPrompt,
          ...(useTools ? { tools } : {}),
        });

        const response = await modelInstance.generateContent({
          contents: googleMessages,
          generationConfig,
        });

        const result = response.response;

        if (!result) {
          throw new Error('No response from Google Gemini API');
        }

        this.logger.log(`📝 [GoogleService] Response received`);
        this.logger.log(`   Finish reason: ${result.candidates?.[0]?.finishReason}`);

        // Mark key as successful
        this.keyManager.markCurrentKeyAsSuccessful();

        return {
          contentBlocks: this.formatGoogleResponse(result),
          tokenUsage: {
            inputTokens: result.usageMetadata?.promptTokenCount || 0,
            outputTokens: result.usageMetadata?.candidatesTokenCount || 0,
            totalTokens: result.usageMetadata?.totalTokenCount || 0,
          },
        };
      } catch (error: any) {
        lastError = error;

        if (error.name === 'AbortError') {
          throw new BytebotAgentInterrupt();
        }

        // Always rotate on any API failure (matches Bytez behavior)
        this.keyManager.markCurrentKeyAsFailed(error);

        if (attempt === maxRetries - 1) {
          // All keys exhausted
          this.logger.error(
            `All Google API keys exhausted. Last error: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        this.logger.warn(
          `Google attempt ${attempt + 1}/${maxRetries} failed, trying next key: ${error.message}`,
        );
      }
    }

    // If we exhausted all retries
    throw lastError || new Error('All Google API keys failed');
  }

  private formatMessagesForGoogle(messages: Message[]): any[] {
    const googleMessages: any[] = [];

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
        }

        if (textParts.length > 0) {
          googleMessages.push({
            role: 'user',
            parts: [{ text: textParts.join('\n\n') }],
          });
        }
        continue;
      }

      // Handle regular message blocks
      const parts: any[] = [];
      const toolCalls: any[] = [];

      for (const block of messageContentBlocks) {
        switch (block.type) {
          case MessageContentType.Text:
            parts.push({ text: block.text });
            break;
          case MessageContentType.ToolUse:
            toolCalls.push({
              id: block.id,
              name: block.name,
              args: block.input,
            });
            break;
          case MessageContentType.ToolResult: {
            const content = block.content[0];
            const resultText =
              content.type === MessageContentType.Text
                ? content.text
                : JSON.stringify(content);

            parts.push({
              text: block.is_error
                ? `Error: ${resultText}`
                : resultText,
            });
            break;
          }
          case MessageContentType.Image:
            if (isImageContentBlock(block)) {
              const imageData = block.source?.data || '';
              const mediaType = block.source?.media_type || 'image/png';

              parts.push({
                inlineData: {
                  mimeType: mediaType,
                  data: imageData,
                },
              });
            }
            break;
          case MessageContentType.Thinking:
            parts.push({ text: `[Thinking: ${block.thinking}]` });
            break;
        }
      }

      if (message.role === Role.ASSISTANT) {
        const msgParts: any[] = [];

        if (parts.length > 0) {
          msgParts.push(...parts);
        }

        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            msgParts.push({
              functionCall: {
                name: toolCall.name,
                args: toolCall.args,
              },
            });
          }
        }

        if (msgParts.length > 0) {
          googleMessages.push({
            role: 'model',
            parts: msgParts,
          });
        }
      } else if (parts.length > 0) {
        googleMessages.push({
          role: 'user',
          parts,
        });
      }
    }

    return googleMessages;
  }

  private formatGoogleResponse(response: any): MessageContentBlock[] {
    const blocks: MessageContentBlock[] = [];

    if (!response.candidates || response.candidates.length === 0) {
      return blocks;
    }

    const candidate = response.candidates[0];

    if (!candidate.content || !candidate.content.parts) {
      return blocks;
    }

    for (const part of candidate.content.parts) {
      if (part.text) {
        blocks.push({
          type: MessageContentType.Text,
          text: part.text,
        } as TextContentBlock);
      }

      if (part.functionCall) {
        blocks.push({
          type: MessageContentType.ToolUse,
          id: uuid(),
          name: part.functionCall.name,
          input: part.functionCall.args || {},
        } as ToolUseContentBlock);
      }
    }

    return blocks;
  }
}
