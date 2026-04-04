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
import { GroqKeyManagerService } from './groq-key-manager.service';
import { MockLlmService } from '../mock/mock-llm.service';


@Injectable()
export class GroqService implements BytebotAgentService {
  private groq: Groq;
  private readonly logger = new Logger(GroqService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly keyManager: GroqKeyManagerService,
    private readonly mockLlmService: MockLlmService,
  ) {
    const totalKeys = this.keyManager.getTotalKeys();
    
    if (totalKeys === 0) {
      this.logger.warn(
        'No GROQ_API_KEY found. GroqService will not work properly.',
      );
    } else {
      this.logger.log(`GroqService initialized with ${totalKeys} API key(s)`);
    }

    // Initialize with first available key
    const apiKey = this.keyManager.getCurrentKey();
    this.groq = new Groq({
      apiKey: apiKey || 'dummy-key-for-initialization',
    });
  }

  private updateGroqClient(): void {
    const apiKey = this.keyManager.getCurrentKey();
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    }
  }

  async generateMessage(
    systemPrompt: string,
    messages: Message[],
    model: string = DEFAULT_MODEL.name,
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
    
    const maxRetries = this.keyManager.getTotalKeys();
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Update client with current key before each attempt
        this.updateGroqClient();

        const groqMessages = this.formatMessagesForGroq(messages);

        // Use custom tools if provided, otherwise use default groqTools
        // CRITICAL: Only load tools if useTools is true
        const tools = useTools ? (customTools || groqTools) : [];

        // ===== SYSTEM PROMPT OPTIMIZATION =====
        // Only include system prompt on first message or if explicitly requested
        const shouldIncludeSystemPrompt = options?.skipSystemPrompt === false || 
                                          options?.isFirstMessage === true || 
                                          options?.isFirstMessage === undefined; // Default: include (backward compatible)
        
        if (!shouldIncludeSystemPrompt) {
          this.logger.log(`🚀 [OPTIMIZATION] Skipping system prompt (conversation continuation)`);
          this.logger.log(`   Saved: ~${this.estimateTextTokens(systemPrompt)} tokens (${systemPrompt.length} chars)`);
        }
        // ===== END SYSTEM PROMPT OPTIMIZATION =====

        // ===== TOKEN COUNTING & TPM LIMIT TRACKING =====
        const estimatedTokens = shouldIncludeSystemPrompt 
          ? this.estimateTokenCount(systemPrompt, groqMessages, tools)
          : this.estimateTokenCount('', groqMessages, tools); // Exclude system prompt from count
        const modelLimits = this.getModelLimits(model);
        
        const contextUsagePercent = (estimatedTokens / modelLimits.contextWindow) * 100;
        const tpmUsagePercent = (estimatedTokens / modelLimits.tpmLimit) * 100;
        
        // ===== PRE-FLIGHT VALIDATION =====
        // Reject requests that exceed 90% of TPM limit to prevent 413 errors
        const TPM_SAFETY_THRESHOLD = 0.9; // 90% of limit
        const maxSafeTokens = Math.floor(modelLimits.tpmLimit * TPM_SAFETY_THRESHOLD);
        
        if (estimatedTokens > maxSafeTokens) {
          const errorMsg = `Request too large: ${estimatedTokens} tokens exceeds safe limit of ${maxSafeTokens} (90% of ${modelLimits.tpmLimit} TPM limit for ${model})`;
          this.logger.error(`❌ PRE-FLIGHT VALIDATION FAILED: ${errorMsg}`);
          this.logger.error(`   Estimated tokens: ${estimatedTokens}`);
          this.logger.error(`   TPM limit: ${modelLimits.tpmLimit}`);
          this.logger.error(`   Safe threshold (90%): ${maxSafeTokens}`);
          this.logger.error(`   Overflow: ${estimatedTokens - maxSafeTokens} tokens`);
          
          // Provide actionable error message
          throw new Error(
            `${errorMsg}. ` +
            `Suggestions: (1) Reduce message history, (2) Remove unnecessary tools, (3) Use a model with higher TPM limit, or (4) Split into multiple requests.`
          );
        }
        // ===== END PRE-FLIGHT VALIDATION =====
        
        // Only log at INFO if approaching limits or exceeding them
        if (estimatedTokens > modelLimits.contextWindow) {
          this.logger.error(`❌ CONTEXT OVERFLOW: ${estimatedTokens} > ${modelLimits.contextWindow} (${contextUsagePercent.toFixed(1)}%) - Request will FAIL`);
        } else if (estimatedTokens > modelLimits.tpmLimit) {
          this.logger.error(`❌ TPM OVERFLOW: ${estimatedTokens} > ${modelLimits.tpmLimit} (${tpmUsagePercent.toFixed(1)}%) - Request will FAIL with 413`);
        } else if (contextUsagePercent > 80 || tpmUsagePercent > 80) {
          this.logger.warn(`⚠️  ${model}: ${estimatedTokens} tokens (context: ${contextUsagePercent.toFixed(1)}%, TPM: ${tpmUsagePercent.toFixed(1)}%)`);
        } else {
          // Normal usage - log at DEBUG level only
          this.logger.debug(`${model}: ${estimatedTokens} tokens (context: ${contextUsagePercent.toFixed(1)}%, TPM: ${tpmUsagePercent.toFixed(1)}%)`);
        }
        
        // Detailed breakdown - ALWAYS log for debugging TPM issues
        this.logger.log(`\n${'='.repeat(80)}`);
        this.logger.log(`[GROQ API CALL DEBUG]`);
        this.logger.log(`${'='.repeat(80)}`);
        this.logger.log(`Model: ${model}`);
        this.logger.log(`Use Tools: ${useTools}`);
        this.logger.log(`Tools Count: ${tools.length}`);
        this.logger.log(`\n📊 TOKEN BREAKDOWN:`);
        this.logger.log(`   System Prompt: ${shouldIncludeSystemPrompt ? this.estimateTextTokens(systemPrompt) : 0} tokens (${shouldIncludeSystemPrompt ? systemPrompt.length : 0} chars) ${!shouldIncludeSystemPrompt ? '✅ SKIPPED' : ''}`);
        this.logger.log(`   Messages: ${this.estimateMessagesTokens(groqMessages)} tokens`);
        this.logger.log(`   Tools: ${this.estimateToolsTokens(tools)} tokens`);
        this.logger.log(`   TOTAL ESTIMATED: ${estimatedTokens} tokens`);
        if (shouldIncludeSystemPrompt) {
          this.logger.log(`\n📝 SYSTEM PROMPT (first 500 chars):`);
          this.logger.log(systemPrompt.substring(0, 500));
          this.logger.log(`\n📝 SYSTEM PROMPT (last 500 chars):`);
          this.logger.log(systemPrompt.substring(Math.max(0, systemPrompt.length - 500)));
        } else {
          this.logger.log(`\n✅ SYSTEM PROMPT SKIPPED (conversation continuation)`);
        }
        this.logger.log(`\n📨 USER MESSAGES (${groqMessages.length} total):`);
        groqMessages.forEach((msg, idx) => {
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          this.logger.log(`   Message ${idx + 1} (${msg.role}): ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);
        });
        if (useTools && tools.length > 0) {
          this.logger.log(`\n🔧 TOOLS (${tools.length} total):`);
          tools.forEach((tool: any, idx) => {
            this.logger.log(`   ${idx + 1}. ${tool.function.name}`);
          });
        }
        this.logger.log(`${'='.repeat(80)}\n`);
        // ===== END TOKEN COUNTING =====

        // DEBUG: Log final message structure
        this.logger.debug(`📤 Sending ${groqMessages.length} messages to Groq (model: ${model})`);
        if (useTools) {
          this.logger.debug(`   Using ${tools.length} tools: ${tools.map((t: any) => t.function.name).join(', ')}`);
        } else {
          this.logger.debug(`   No tools (useTools=false)`);
        }
        groqMessages.forEach((msg, idx) => {
          const isArray = Array.isArray(msg.content);
          const hasImage = isArray && msg.content.some((c: any) => c.type === 'image_url');
          this.logger.debug(`   Message ${idx + 1}: role=${msg.role}, content=${isArray ? 'array' : 'string'}, hasImage=${hasImage}`);
        });

        // 🔍 CRITICAL DEBUG: Log the ACTUAL payload being sent to Groq
        const actualPayload: any = {
          model,
          messages: shouldIncludeSystemPrompt 
            ? [{ role: 'system', content: systemPrompt }, ...groqMessages]
            : groqMessages,
          tools: useTools ? tools : undefined,
          tool_choice: useTools ? ('auto' as const) : undefined,
          temperature: 0.7,
          max_tokens: 8192,
        };

        // Calculate actual payload size
        const payloadJson = JSON.stringify(actualPayload);
        const payloadSizeKB = (payloadJson.length / 1024).toFixed(2);
        const actualPayloadTokens = Math.ceil(payloadJson.length / 4); // Rough estimate: 1 token ≈ 4 chars

        this.logger.log(`\n${'🔍'.repeat(40)}`);
        this.logger.log(`[ACTUAL GROQ PAYLOAD DEBUG]`);
        this.logger.log(`${'🔍'.repeat(40)}`);
        this.logger.log(`📦 Payload Size: ${payloadSizeKB} KB (${payloadJson.length} chars)`);
        this.logger.log(`📊 Estimated Payload Tokens: ${actualPayloadTokens}`);
        this.logger.log(`📝 System Prompt Length: ${systemPrompt.length} chars`);
        this.logger.log(`📨 Messages Count: ${groqMessages.length}`);
        this.logger.log(`🔧 Tools Count: ${tools.length}`);
        
        // Log each message's actual size
        groqMessages.forEach((msg, idx) => {
          const msgJson = JSON.stringify(msg);
          const msgSizeKB = (msgJson.length / 1024).toFixed(2);
          this.logger.log(`   Message ${idx + 1} size: ${msgSizeKB} KB (${msgJson.length} chars)`);
        });

        // Log tools size if present
        if (useTools && tools.length > 0) {
          const toolsJson = JSON.stringify(tools);
          const toolsSizeKB = (toolsJson.length / 1024).toFixed(2);
          this.logger.log(`🔧 Tools JSON Size: ${toolsSizeKB} KB (${toolsJson.length} chars)`);
        }

        // Write full payload to a temp file for inspection
        this.logger.log(`\n💾 Writing full payload to: /tmp/groq-payload-debug.json`);
        try {
          const fs = require('fs');
          fs.writeFileSync('/tmp/groq-payload-debug.json', JSON.stringify(actualPayload, null, 2));
          this.logger.log(`✅ Payload written successfully`);
        } catch (err) {
          this.logger.warn(`⚠️  Could not write payload file: ${err.message}`);
        }
        this.logger.log(`${'🔍'.repeat(40)}\n`);

        const response = await this.groq.chat.completions.create(
          actualPayload,
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

        // LOG ACTUAL RESPONSE CONTENT
        this.logger.log(`📝 [GroqService] Response content:`);
        this.logger.log(`   Message content: ${message.content || '(empty)'}`);
        if (message.tool_calls) {
          this.logger.log(`   Tool calls: ${JSON.stringify(message.tool_calls, null, 2)}`);
        }

        // Mark key as successful
        this.keyManager.markCurrentKeyAsSuccessful();

        return {
          contentBlocks: this.formatGroqResponse(message),
          tokenUsage: {
            inputTokens: response.usage?.prompt_tokens || 0,
            outputTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
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
            `All Groq API keys exhausted. Last error: ${error.message}`,
            error.stack,
          );
          throw error;
        }

        this.logger.warn(
          `Groq attempt ${attempt + 1}/${maxRetries} failed, trying next key: ${error.message}`,
        );
      }
    }

    // If we exhausted all retries
    throw lastError || new Error('All Groq API keys failed');
  }

  private formatMessagesForGroq(messages: Message[]): any[] {
    const groqMessages: any[] = [];

    for (const message of messages) {
      const messageContentBlocks = message.content as MessageContentBlock[];

      // DEBUG: Log message structure
      const hasImage = messageContentBlocks.some((block) => isImageContentBlock(block));
      const textBlockCount = messageContentBlocks.filter((block) => block.type === MessageContentType.Text).length;
      this.logger.debug(`📨 Formatting message - Role: ${message.role}, Text blocks: ${textBlockCount}, Has image: ${hasImage}`);

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
      const imageParts: any[] = [];
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
            // Groq vision models (Llama 4 Scout, Llama 4 Maverick) support images
            // Format: { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } }
            if (isImageContentBlock(block)) {
              const imageData = block.source?.data || '';
              const mediaType = block.source?.media_type || 'image/png';
              
              imageParts.push({
                type: 'image_url',
                image_url: {
                  url: `data:${mediaType};base64,${imageData}`,
                },
              });
            }
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
      } else if (imageParts.length > 0) {
        // User message with images - use content array format
        const contentArray: any[] = [];
        
        // Add text first if present
        if (textParts.length > 0) {
          contentArray.push({
            type: 'text',
            text: textParts.join('\n\n'),
          });
        }
        
        // Add all images
        contentArray.push(...imageParts);
        
        groqMessages.push({
          role: 'user',
          content: contentArray,
        });
      } else if (textParts.length > 0) {
        // User message with only text
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

  /**
   * Get model limits (context window, TPM, RPM) for a given Groq model
   * Based on Groq's free tier limits: https://console.groq.com/docs/rate-limits
   */
  private getModelLimits(model: string): { contextWindow: number; tpmLimit: number; rpmLimit: number } {
    // Groq free tier TPM limits (as of 2024)
    const limits: Record<string, { contextWindow: number; tpmLimit: number; rpmLimit: number }> = {
      // Llama models
      'meta-llama/llama-4-scout': { contextWindow: 128000, tpmLimit: 15000, rpmLimit: 30 },
      'meta-llama/llama-4-maverick': { contextWindow: 128000, tpmLimit: 15000, rpmLimit: 30 },
      'meta-llama/llama-3.3-70b-versatile': { contextWindow: 128000, tpmLimit: 15000, rpmLimit: 30 },
      'meta-llama/llama-3.1-70b-versatile': { contextWindow: 128000, tpmLimit: 15000, rpmLimit: 30 },
      'meta-llama/llama-3.1-8b-instant': { contextWindow: 128000, tpmLimit: 20000, rpmLimit: 30 },
      
      // OpenAI-compatible models on Groq
      'openai/gpt-oss-120b': { contextWindow: 32768, tpmLimit: 8000, rpmLimit: 30 },
      'openai/gpt-oss-20b': { contextWindow: 32768, tpmLimit: 8000, rpmLimit: 30 },  // Updated: Groq lowered from 15000 to 8000
      
      // Mixtral models
      'mistralai/mixtral-8x7b-32768': { contextWindow: 32768, tpmLimit: 15000, rpmLimit: 30 },
      
      // Gemma models
      'google/gemma-7b-it': { contextWindow: 8192, tpmLimit: 15000, rpmLimit: 30 },
      'google/gemma2-9b-it': { contextWindow: 8192, tpmLimit: 15000, rpmLimit: 30 },
    };

    // Return specific limits or default conservative limits
    return limits[model] || { contextWindow: 32768, tpmLimit: 8000, rpmLimit: 30 };
  }

  /**
   * Estimate token count for text using improved approximation
   * 
   * IMPORTANT: This is still an approximation. For 100% accuracy, use tiktoken library.
   * 
   * Groq's actual tokenization (based on official docs):
   * - Base: ~1 token per 4 characters (English text)
   * - JSON overhead: +20-30% (quotes, colons, brackets, escaping)
   * - Tool schemas: +25-35% (complex nested structures)
   * 
   * The 4-char rule underestimates by 2-3x for JSON payloads.
   * 
   * @param text - Text to estimate tokens for
   * @param multiplier - Overhead multiplier (1.0 = no overhead, 1.3 = +30% overhead)
   * @returns Estimated token count
   */
  private estimateTextTokens(text: string, multiplier: number = 1.0): number {
    const baseTokens = Math.ceil(text.length / 4); // 1 token ≈ 4 characters
    return Math.ceil(baseTokens * multiplier);
  }

  /**
   * Estimate token count for messages array
   */
  private estimateMessagesTokens(messages: any[]): number {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        // Plain text messages
        total += this.estimateTextTokens(msg.content, 1.0);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            // Text content in structured messages
            total += this.estimateTextTokens(part.text, 1.0);
          } else if (part.type === 'image_url') {
            // Images typically cost ~85-170 tokens depending on size
            total += 150; // Conservative estimate
          }
        }
      }
      
      // Tool calls add overhead (JSON structure)
      if (msg.tool_calls) {
        for (const toolCall of msg.tool_calls) {
          const toolCallJson = JSON.stringify(toolCall);
          total += this.estimateTextTokens(toolCallJson, 1.3); // +30% for JSON overhead
        }
      }
    }
    
    // Add message structure overhead (role, content wrappers)
    const messageOverhead = Math.ceil(total * 0.15); // +15% for message structure
    return total + messageOverhead;
  }

  /**
   * Estimate token count for tools definitions
   * Tool schemas have significant JSON overhead
   */
  private estimateToolsTokens(tools: any[]): number {
    if (!tools || tools.length === 0) return 1; // Empty tools array
    
    const toolsJson = JSON.stringify(tools);
    // Tools have heavy JSON structure overhead (+30%)
    return this.estimateTextTokens(toolsJson, 1.3);
  }

  /**
   * Estimate total token count for entire request
   */
  private estimateTokenCount(systemPrompt: string, messages: any[], tools: any[]): number {
    const systemTokens = this.estimateTextTokens(systemPrompt, 1.0); // System prompt is plain text
    const messageTokens = this.estimateMessagesTokens(messages);
    const toolTokens = this.estimateToolsTokens(tools);
    
    // Add overhead for request formatting (~10% overhead for top-level structure)
    const overhead = Math.ceil((systemTokens + messageTokens + toolTokens) * 0.1);
    
    return systemTokens + messageTokens + toolTokens + overhead;
  }
}
