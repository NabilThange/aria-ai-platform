import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * ReporterAgent - Generates human-readable summaries and sends notifications
 * Model: Groq GPT-OSS 20B (fast, cheap, zero reasoning needed)
 * Reads full shared state and creates summary
 */
@Injectable()
export class ReporterAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.REPORTER;

  constructor(
    sharedState: SharedStateService,
    private readonly groqService: GroqService,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'ReporterAgent');
  }

  /**
   * Generate summary for a completed task
   * @param input - Not used (reads from shared state)
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`Generating summary for task ${taskId}`);

      // Read full task state
      const taskState = await this.sharedState.getTaskState(taskId);

      // Build summary prompt
      const prompt = this.buildSummaryPrompt(taskState);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'REPORTER_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: { status: taskState.status || 'Unknown' },
      });

      // Call Groq for summary generation
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
      this.browserLogger.logAgentResponse(taskId, 'REPORTER_AGENT', {
        model: this.model.model,
        provider: 'groq',
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage || {},
      });

      // Extract summary text
      const summary = this.extractSummary(response);

      // Count completed steps
      const executionPlan = taskState.execution_plan;
      const actionHistory = taskState.action_history || [];
      const stepsCompleted = actionHistory.filter((a: any) => a.result === 'success').length;
      const totalSteps = executionPlan?.steps?.length || 0;

      // Write summary to shared state
      await this.writeState(taskId, 'task_summary', summary);

      // Save report as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'REPORTER',
        'report',
        {
          report: {
            summary,
            steps_completed: stepsCompleted,
            total_steps: totalSteps,
          },
        },
      );

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'REPORTER',
        action: 'generate_summary',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: { summaryLength: summary.length },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      this.logCost(tokensUsed, this.model.model);

      return {
        success: true,
        data: { summary },
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Summary generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Summarize a task (convenience method for OrchestrationService)
   */
  async summarize(taskId: string): Promise<string> {
    const result = await this.run(null, taskId);
    
    if (!result.success) {
      return 'Failed to generate summary';
    }

    return result.data.summary;
  }

  private getSystemPrompt(): string {
    return getAgentSystemPrompt('REPORTER');
  }


  private buildSummaryPrompt(taskState: Record<string, any>): string {
    const {
      task_goal,
      execution_plan,
      action_history,
      failure_log,
      status,
      error,
    } = taskState;

    return `Generate a summary for this task execution:

**Task Goal:**
${task_goal || 'Not specified'}

**Execution Plan:**
${JSON.stringify(execution_plan, null, 2)}

**Action History:**
${JSON.stringify(action_history, null, 2)}

**Failures:**
${failure_log ? JSON.stringify(failure_log, null, 2) : 'None'}

**Final Status:**
${status || 'Unknown'}

**Error (if any):**
${error ? JSON.stringify(error, null, 2) : 'None'}

Create a clear, human-readable summary of what happened.`;
  }

  private extractSummary(response: any): string {
    const content = response.contentBlocks?.[0]?.text || '';
    return content.trim();
  }

  private calculateCost(tokens: number): number {
    // Groq GPT-OSS 20B pricing (approximate)
    // Input: $0.10 per 1M tokens, Output: $0.10 per 1M tokens
    const costPerToken = 0.10 / 1_000_000;
    return tokens * costPerToken;
  }
}
