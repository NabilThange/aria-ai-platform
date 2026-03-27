import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { ClarifiedTask, ClarificationHistory } from './clarifier.types';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * ClarifierAgent - Conversational chatbot mode
 * Asks ONE question per round, receives full Q&A history each time.
 * Model: Groq GPT-OSS 20B (fast, user is waiting)
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
   * Clarify user intent through conversational Q&A
   * @param input - Raw user input string or object with userInput + history
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      const userInput = typeof input === 'string' ? input : (input.userInput || input);
      const history: ClarificationHistory = (typeof input === 'object' && input.history) ? input.history : [];

      this.logger.log(`📝 Clarifier round ${history.length + 1} for task ${taskId}`);
      this.logger.log(`   Original input: "${userInput.substring(0, 100)}"`);
      if (history.length > 0) {
        this.logger.log(`   History turns: ${history.length}`);
      }

      // Build prompt with full history
      const prompt = this.buildClarificationPrompt(userInput, history);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'CLARIFIER_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: { userInput: userInput.substring(0, 200), historyTurns: history.length },
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
      this.logger.log(`📝 [ClarifierAgent] Round ${history.length + 1} result:`);
      this.logger.log(`   Goal: ${clarifiedTask.clarified_goal}`);
      this.logger.log(`   Type: ${clarifiedTask.task_type}`);
      this.logger.log(`   Questions asked: ${clarifiedTask.questions_asked}`);

      if (clarifiedTask.questions_asked === 1 && clarifiedTask.question) {
        // Save the single question as a message
        await this.messagesService.createAgentActionMessage(
          taskId,
          'CLARIFIER',
          'question',
          {
            question: clarifiedTask.question.question,
            questionId: clarifiedTask.question.id,
            questionType: clarifiedTask.question.type,
            required: clarifiedTask.question.required,
            assumption: clarifiedTask.question.assumption,
          },
        );

        // Store the pending question in shared state so AgentProcessor can build history
        await this.sharedState.set(taskId, 'pending_clarification_question', clarifiedTask.question.question);
        this.logger.log(`   Question: ${clarifiedTask.question.question}`);
      } else {
        // No more questions — save thinking message
        await this.messagesService.createAgentActionMessage(
          taskId,
          'CLARIFIER',
          'thinking',
          {
            thinking: `Clarified task: ${clarifiedTask.clarified_goal} (Type: ${clarifiedTask.task_type})`,
          },
        );
        // Clear pending question since we're done clarifying
        await this.sharedState.set(taskId, 'pending_clarification_question', null);
      }

      // Write full clarified task to shared state
      await this.writeState(taskId, 'task_goal', clarifiedTask);

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'CLARIFIER',
        action: 'clarify_intent',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          round: history.length + 1,
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

  /**
   * Build the prompt including the full Q&A history so the LLM
   * can evaluate whether it has enough information.
   */
  private buildClarificationPrompt(userInput: string, history: ClarificationHistory): string {
    let prompt = `Original request: "${userInput}"\n`;

    if (history.length > 0) {
      prompt += `\nConversation so far:\n`;
      for (const turn of history) {
        prompt += `Q: ${turn.question}\nA: ${turn.answer}\n`;
      }
      prompt += `\nYou have asked ${history.length} question(s) so far (max 6 total). `;
      if (history.length >= 6) {
        prompt += `You have reached the maximum — you MUST set questions_asked = 0 and produce a clarified_goal now.\n`;
      } else {
        prompt += `Decide: do you have enough to proceed, or do you need one more answer?\n`;
      }
    } else {
      prompt += `\nThis is the first round. Analyze the request and decide: is it clear enough to act, or do you need to ask one question?\n`;
    }

    prompt += `\nRespond with JSON only, following the exact schema in the system prompt.`;
    return prompt;
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

      const questionsAsked = parsed.questions_asked ?? 0;
      
      // Enforce chatbot mode: only 0 or 1 question allowed
      if (questionsAsked !== 0 && questionsAsked !== 1) {
        this.logger.warn(`⚠️ Chatbot mode: questions_asked must be 0 or 1, got: ${questionsAsked}. Forcing to 1 and using first question only.`);
        parsed.questions_asked = 1;
      }

      // Validate question when questions_asked = 1
      if (questionsAsked === 1 || parsed.questions_asked === 1) {
        // Support both singular question and questions array (take first only)
        const q = parsed.question || (Array.isArray(parsed.questions) && parsed.questions.length > 0 ? parsed.questions[0] : null);
        
        if (!q || !q.id || !q.question || !q.type || typeof q.required !== 'boolean') {
          throw new Error('questions_asked = 1 but question object is missing or invalid');
        }
        if (!['text', 'choice', 'confirm'].includes(q.type)) {
          throw new Error('Invalid question type');
        }

        return {
          original_input: originalInput,
          clarified_goal: 'REQUIRES_USER_CLARIFICATION',
          constraints: parsed.constraints,
          assumptions: parsed.assumptions,
          task_type: parsed.task_type,
          questions_asked: 1,
          question: {
            id: q.id,
            question: q.question,
            type: q.type,
            choices: q.choices,
            required: q.required,
            assumption: q.assumption,
          },
        };
      }

      return {
        original_input: originalInput,
        clarified_goal: parsed.clarified_goal,
        constraints: parsed.constraints,
        assumptions: parsed.assumptions,
        task_type: parsed.task_type,
        questions_asked: 0,
      };
    } catch (error) {
      this.logger.error(`Failed to parse clarified task: ${error.message}`);
      this.logger.error(`Response content: ${content.substring(0, 500)}...`);

      // Return safe default — proceed without clarification on parse error
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
    const costPerToken = 0.10 / 1_000_000;
    return tokens * costPerToken;
  }
}
