import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { BytezService } from '../../bytez/bytez.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { RecoveryStrategy } from './recovery.types';
import { ExecutionStep } from '../orchestrator/orchestrator.types';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { AgentsService } from '../agents.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * RecoveryAgent - Generates alternative strategies after failures
 * Model: User-selectable (default: Bytez Claude Sonnet 4.6)
 * Supports both Bytez and Groq providers for dynamic model selection
 * Runs on 2nd failure attempt (escalation ladder)
 */
@Injectable()
export class RecoveryAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.RECOVERY;

  constructor(
    sharedState: SharedStateService,
    private readonly bytezService: BytezService,
    private readonly groqService: GroqService,
    private readonly messagesService: MessagesService,
    private readonly agentsService: AgentsService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'RecoveryAgent');
  }

  private getModel() {
    const config = this.agentsService.getAgentModel('RECOVERY');
    const selectedModel = config ? config : this.model;
    
    this.logger.log(`🎯 [RECOVERY] Model Selection:`);
    this.logger.log(`   - Config from AgentsService: ${config ? JSON.stringify(config) : 'NULL'}`);
    this.logger.log(`   - Fallback default: ${JSON.stringify(this.model)}`);
    this.logger.log(`   - SELECTED MODEL: ${selectedModel.model} (provider: ${selectedModel.provider})`);
    
    return selectedModel;
  }

  /**
   * Generate recovery strategy for failed step
   * @param input - Failed ExecutionStep
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`Generating recovery strategy for task ${taskId}`);

      const failedStep = input as ExecutionStep;

      // Read context from shared state
      const failureLog = await this.readState<any[]>(taskId, 'failure_log');
      const actionHistory = await this.readState<any[]>(taskId, 'action_history');
      const previousStrategies = await this.readState<RecoveryStrategy[]>(
        taskId,
        'recovery_strategies_history',
      );

      // Build recovery prompt
      const prompt = this.buildRecoveryPrompt(
        failedStep,
        failureLog || [],
        actionHistory || [],
        previousStrategies || [],
      );

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'RECOVERY_AGENT', {
        systemPrompt: this.getSystemPrompt(),
        userPrompt: prompt,
        context: {
          failedStepId: failedStep.id,
          failedStepDescription: failedStep.description,
          failureCount: failureLog?.length || 0,
        },
      });

      // Call model service (Bytez or Groq) for recovery strategy
      const modelConfig = this.getModel();
      const response = await this.callModelService(
        this.getSystemPrompt(),
        [
          {
            role: 'USER',
            content: [{ type: 'text', text: prompt }],
          },
        ] as any,
        modelConfig.model,
        false, // No tools needed
      );

      // LOG AGENT RESPONSE TO BROWSER
      this.browserLogger.logAgentResponse(taskId, 'RECOVERY_AGENT', {
        model: modelConfig.model,
        provider: modelConfig.provider,
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage || {},
      });

      // Parse recovery strategy
      const strategy = this.parseRecoveryStrategy(response);

      // LOG RECOVERY OUTPUT
      this.logger.log(`🔄 [RecoveryAgent] Generated strategy:`);
      this.logger.log(`   Strategy: ${strategy.strategy}`);
      this.logger.log(`   Avoid: ${strategy.avoid.join(', ')}`);
      this.logger.log(`   Approach: ${strategy.approach}`);
      this.logger.log(`   Alternatives: ${strategy.alternatives.length}`);
      strategy.alternatives.forEach((alt, i) => {
        this.logger.log(`     ${i + 1}. ${alt.strategy} (score: ${alt.score})`);
      });

      // Write to shared state for Web/Desktop agents to read
      await this.writeState(taskId, 'recovery_strategy', strategy);

      // Save recovery strategy as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'RECOVERY',
        'recovery',
        { strategy },
      );

      // Keep history of all strategies
      await this.sharedState.appendToArray(taskId, 'recovery_strategies_history', strategy);

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'RECOVERY',
        action: 'generate_strategy',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          failed_step: failedStep.id,
          strategy: strategy.strategy,
          alternatives_count: strategy.alternatives.length,
        },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      const modelConfig2 = this.getModel();
      this.logCost(tokensUsed, modelConfig2.model);

      return {
        success: true,
        data: strategy,
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Recovery strategy generation failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate recovery strategy (convenience method for OrchestrationService)
   */
  async strategize(failedStep: ExecutionStep, taskId: string): Promise<RecoveryStrategy | null> {
    const result = await this.run(failedStep, taskId);

    if (!result.success) {
      this.logger.warn(`Recovery strategy generation failed: ${result.error}`);
      return null;
    }

    return result.data as RecoveryStrategy;
  }

  /**
   * Call the appropriate model service based on model provider
   * Supports both Bytez and Groq providers for dynamic model selection
   */
  private async callModelService(
    systemPrompt: string,
    messages: any[],
    model: string,
    useTools: boolean,
  ): Promise<any> {
    // Determine provider from model string
    const isGroqModel = 
      model.includes('gpt-oss') || 
      model.includes('llama-') ||
      model.startsWith('openai/') ||
      model.startsWith('meta-llama/');
    
    // Recovery agent typically runs once per failure, always send system prompt
    const isFirstMessage = true;
    
    if (isGroqModel) {
      this.logger.log(`🔧 Using Groq service for model: ${model}`);
      return await this.groqService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        undefined, // No custom tools
        { isFirstMessage }, // NEW: Always send system prompt for recovery
      );
    } else {
      this.logger.log(`🔧 Using Bytez service for model: ${model}`);
      return await this.bytezService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        undefined, // No custom tools
        { isFirstMessage }, // NEW: Always send system prompt for recovery
      );
    }
  }

  private getSystemPrompt(): string {
    return getAgentSystemPrompt('RECOVERY');
  }

  private buildRecoveryPrompt(
    failedStep: ExecutionStep,
    failureLog: any[],
    actionHistory: any[],
    previousStrategies: RecoveryStrategy[],
  ): string {
    // Get recent failures for this step
    const stepFailures = failureLog.filter(f => f.step === failedStep.id).slice(-3);

    // Get what has worked so far
    const successfulActions = actionHistory.filter(a => a.result === 'success').slice(-5);

    // Get previously tried strategies
    const triedStrategies = previousStrategies.map(s => s.strategy);

    return `A step has failed multiple times. Generate a recovery strategy.

**Failed Step**: ${failedStep.id}
**Description**: ${failedStep.description}
**Success Criteria**: ${failedStep.success_criteria}
**Type**: ${failedStep.type}

**Recent Failures**:
${JSON.stringify(stepFailures, null, 2)}

**What Has Worked**:
${JSON.stringify(successfulActions, null, 2)}

**Previously Tried Strategies**:
${triedStrategies.length > 0 ? triedStrategies.join('\n- ') : 'None'}

Analyze the failure pattern and generate alternative strategies. Consider:
- Why did the original approach fail?
- What assumptions might be wrong?
- Is there a simpler way to achieve the same goal?
- Can we use different tools or methods?
- Should we break this into smaller steps?

Respond with JSON only, following the exact schema in the system prompt.`;
  }

  private parseRecoveryStrategy(response: any): RecoveryStrategy {
    const content = response.contentBlocks?.[0]?.text || '';

    try {
      const parsed = extractJSON(content);

      // Handle if model returned { strategies: [...] } instead of flat structure
      if (parsed.strategies && Array.isArray(parsed.strategies)) {
        this.logger.warn('Model returned strategies array, extracting first strategy');
        const firstStrategy = parsed.strategies[0];
        
        return {
          strategy: firstStrategy.name || firstStrategy.strategy || 'Alternative approach',
          avoid: firstStrategy.avoid || [],
          approach: firstStrategy.approach || firstStrategy.description || '',
          alternatives: parsed.strategies.slice(1).map((s: any, i: number) => ({
            strategy: s.name || s.strategy || `Alternative ${i + 2}`,
            score: s.score || s.confidence || 0.5,
            reasoning: s.reasoning || s.rationale || '',
          })),
        };
      }

      // Validate required fields for standard format
      if (
        typeof parsed.strategy !== 'string' ||
        !Array.isArray(parsed.avoid) ||
        typeof parsed.approach !== 'string' ||
        !Array.isArray(parsed.alternatives)
      ) {
        throw new Error('Invalid recovery strategy structure');
      }

      // Validate alternatives
      for (const alt of parsed.alternatives) {
        if (
          typeof alt.strategy !== 'string' ||
          typeof alt.score !== 'number' ||
          typeof alt.reasoning !== 'string'
        ) {
          throw new Error(`Invalid alternative structure: ${JSON.stringify(alt)}`);
        }
      }

      return parsed as RecoveryStrategy;
    } catch (error) {
      this.logger.error(`Failed to parse recovery strategy: ${error.message}`);
      this.logger.error(`Response content: ${content.substring(0, 500)}...`);

      // Return safe default strategy
      return {
        strategy: 'Retry with slight variation',
        avoid: ['Exact same approach as before'],
        approach: 'Try the same action but with a small delay or different timing',
        alternatives: [
          {
            strategy: 'Use alternative tool or method',
            score: 0.7,
            reasoning: 'Different tool might handle edge cases better',
          },
          {
            strategy: 'Break into smaller steps',
            score: 0.6,
            reasoning: 'Smaller steps are easier to verify and debug',
          },
        ],
      };
    }
  }

  private calculateCost(tokens: number): number {
    // Bytez Claude Sonnet 4.6 pricing (approximate)
    // Input: $3 per 1M tokens, Output: $15 per 1M tokens
    // Average: ~$9 per 1M tokens
    const costPerToken = 9 / 1_000_000;
    return tokens * costPerToken;
  }
}
