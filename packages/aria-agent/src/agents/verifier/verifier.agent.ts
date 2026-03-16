import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { VERIFIER_SCHEMA, VerifierResult } from './verifier.schema';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * VerifierAgent - Validates action results with strict JSON output
 * Model: Groq GPT-OSS 20B (strict JSON guaranteed)
 * Runs 20-30x per task, must be fast and cheap
 */
@Injectable()
export class VerifierAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.VERIFIER;

  constructor(
    sharedState: SharedStateService,
    private readonly groqService: GroqService,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'VerifierAgent');
  }

  /**
   * Verify an action result
   * @param input - Action result to verify (screenshot, page state, etc.)
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      this.logger.log(`Verifying action for task ${taskId}`);

      // Build verification prompt
      const prompt = this.buildVerificationPrompt(input);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'VERIFIER_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: { actionResult: JSON.stringify(input).substring(0, 200) },
      });

      // Call Groq with strict JSON mode
      const response = await this.groqService.generateMessage(
        this.getSystemPrompt(),
        [
          {
            role: 'USER',
            content: [{ type: 'text', text: prompt }],
          },
        ] as any,
        this.model.model,
        false, // No tools needed
      );

      // LOG AGENT RESPONSE TO BROWSER
      this.browserLogger.logAgentResponse(taskId, 'VERIFIER_AGENT', {
        model: this.model.model,
        provider: 'groq',
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage || {},
      });

      // Parse verification result
      const verificationResult = this.parseVerificationResult(response);

      // LOG VERIFIER OUTPUT
      this.logger.log(`✅ [VerifierAgent] Verification result:`);
      this.logger.log(`   Action succeeded: ${verificationResult.action_succeeded}`);
      this.logger.log(`   Screen changed: ${verificationResult.screen_changed}`);
      this.logger.log(`   Error detected: ${verificationResult.error_detected}`);
      if (verificationResult.error_message) {
        this.logger.log(`   Error message: ${verificationResult.error_message}`);
      }
      this.logger.log(`   Retry recommended: ${verificationResult.retry_recommended}`);
      this.logger.log(`   Confidence: ${verificationResult.confidence}`);

      // Save verification as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'VERIFIER',
        'verify',
        { verification: verificationResult },
      );

      // Log to shared state
      await this.appendToHistory(taskId, {
        agent: 'VERIFIER',
        action: 'verify_action',
        result: verificationResult.action_succeeded ? 'success' : 'failure',
        timestamp: new Date().toISOString(),
        details: verificationResult,
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      this.logCost(tokensUsed, this.model.model);

      return {
        success: true,
        data: verificationResult,
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Verification failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }


  /**
   * Check an action result (convenience method for OrchestrationService)
   */
  async check(actionResult: any, taskId: string): Promise<VerifierResult> {
    const result = await this.run(actionResult, taskId);
    
    if (!result.success) {
      // Return default failure result if verification itself fails
      return {
        action_succeeded: false,
        screen_changed: false,
        error_detected: true,
        error_message: result.error || 'Verification failed',
        retry_recommended: true,
        confidence: 0.0,
      };
    }

    return result.data as VerifierResult;
  }

  private getSystemPrompt(): string {
    return getAgentSystemPrompt('VERIFIER');
  }

  private buildVerificationPrompt(input: any): string {
    return `Verify this action result:

${JSON.stringify(input, null, 2)}

Respond with JSON only, following the exact schema provided in the system prompt.`;
  }

  private parseVerificationResult(response: any): VerifierResult {
    // Extract JSON from response content
    const content = response.contentBlocks?.[0]?.text || '';
    
    try {
      const parsed = extractJSON(content);
      
      // Validate required fields
      if (
        typeof parsed.action_succeeded !== 'boolean' ||
        typeof parsed.screen_changed !== 'boolean' ||
        typeof parsed.error_detected !== 'boolean' ||
        typeof parsed.retry_recommended !== 'boolean' ||
        typeof parsed.confidence !== 'number'
      ) {
        throw new Error('Invalid verification result structure');
      }

      return parsed as VerifierResult;
    } catch (error) {
      this.logger.error(`Failed to parse verification result: ${error.message}`);
      this.logger.error(`Response content: ${content.substring(0, 500)}...`);
      
      // Return safe default
      return {
        action_succeeded: false,
        screen_changed: false,
        error_detected: true,
        error_message: 'Failed to parse verification result',
        retry_recommended: true,
        confidence: 0.0,
      };
    }
  }

  private calculateCost(tokens: number): number {
    // Groq GPT-OSS 20B pricing (approximate)
    // Input: $0.10 per 1M tokens, Output: $0.10 per 1M tokens
    const costPerToken = 0.10 / 1_000_000;
    return tokens * costPerToken;
  }
}
