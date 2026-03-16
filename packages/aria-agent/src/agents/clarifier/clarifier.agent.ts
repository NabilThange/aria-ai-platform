import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { ClarifiedTask } from './clarifier.types';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * ClarifierAgent - Resolves user intent ambiguity via Q&A
 * Model: Groq GPT-OSS 20B (fast, user is waiting)
 * Runs once at the start of each task
 */
@Injectable()
export class ClarifierAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.CLARIFIER;

  constructor(
    sharedState: SharedStateService,
    private readonly groqService: GroqService,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'ClarifierAgent');
  }

  /**
   * Clarify user intent through Q&A
   * @param input - Raw user input string
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`📝 Analyzing user input for task ${taskId}`);

      const userInput = typeof input === 'string' ? input : input.userInput;
      this.logger.log(`   Input: "${userInput.substring(0, 100)}..."`);

      // Build clarification prompt
      const prompt = this.buildClarificationPrompt(userInput);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'CLARIFIER_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: { userInput: userInput.substring(0, 200) },
      });

      // Call Groq for clarification
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
      this.browserLogger.logAgentResponse(taskId, 'CLARIFIER_AGENT', {
        model: this.model.model,
        provider: 'groq',
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage || {},
      });

      // Parse clarified task
      const clarifiedTask = this.parseClarifiedTask(response, userInput);

      // LOG CLARIFIER OUTPUT
      this.logger.log(`📝 [ClarifierAgent] Clarified task:`);
      this.logger.log(`   Goal: ${clarifiedTask.clarified_goal}`);
      this.logger.log(`   Type: ${clarifiedTask.task_type}`);
      this.logger.log(`   Constraints: ${clarifiedTask.constraints.length}`);
      this.logger.log(`   Assumptions: ${clarifiedTask.assumptions.length}`);
      this.logger.log(`   Questions asked: ${clarifiedTask.questions_asked}`);

      // Save clarification as message
      if (clarifiedTask.questions_asked > 0 && clarifiedTask.clarified_goal?.startsWith('REQUIRES_USER_CLARIFICATION:')) {
        // Save question
        const question = clarifiedTask.clarified_goal.replace('REQUIRES_USER_CLARIFICATION:', '').trim();
        await this.messagesService.createAgentActionMessage(
          taskId,
          'CLARIFIER',
          'question',
          { question },
        );
      } else {
        // Save thinking/clarification
        await this.messagesService.createAgentActionMessage(
          taskId,
          'CLARIFIER',
          'thinking',
          {
            thinking: `Clarified task: ${clarifiedTask.clarified_goal} (Type: ${clarifiedTask.task_type})`,
          },
        );
      }

      // Write to shared state
      await this.writeState(taskId, 'task_goal', clarifiedTask);

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'CLARIFIER',
        action: 'clarify_intent',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          questions_asked: clarifiedTask.questions_asked,
          task_type: clarifiedTask.task_type,
        },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      this.logCost(tokensUsed, this.model.model);

      return {
        success: true,
        data: clarifiedTask,
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Clarification failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private getSystemPrompt(): string {
    return getAgentSystemPrompt('CLARIFIER');
  }

  private buildClarificationPrompt(userInput: string): string {
    return `Analyze this user request and clarify the intent:

"${userInput}"

Respond with JSON only, following the exact schema in the system prompt.`;
  }

  private parseClarifiedTask(response: any, originalInput: string): ClarifiedTask {
    const content = response.contentBlocks?.[0]?.text || '';

    try {
      const parsed = extractJSON(content);

      // Validate required fields
      if (
        typeof parsed.clarified_goal !== 'string' ||
        !Array.isArray(parsed.constraints) ||
        !Array.isArray(parsed.assumptions) ||
        !['web', 'desktop', 'mixed'].includes(parsed.task_type)
      ) {
        throw new Error('Invalid clarified task structure');
      }

      return {
        original_input: originalInput,
        clarified_goal: parsed.clarified_goal,
        constraints: parsed.constraints,
        assumptions: parsed.assumptions,
        task_type: parsed.task_type,
        questions_asked: parsed.questions_asked || 0,
      };
    } catch (error) {
      this.logger.error(`Failed to parse clarified task: ${error.message}`);
      this.logger.error(`Response content: ${content.substring(0, 500)}...`);

      // Return safe default
      return {
        original_input: originalInput,
        clarified_goal: originalInput,
        constraints: [],
        assumptions: ['User input taken as-is due to parsing error'],
        task_type: 'mixed',
        questions_asked: 0,
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
