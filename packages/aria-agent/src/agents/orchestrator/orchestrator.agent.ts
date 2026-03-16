import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { BytezService } from '../../bytez/bytez.service';
import { GroqService } from '../../groq/groq.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import { ExecutionPlan, ExecutionStep } from './orchestrator.types';
import { ClarifiedTask } from '../clarifier/clarifier.types';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { AgentsService } from '../agents.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';

/**
 * OrchestratorAgent - Creates and manages execution plans
 * Model: User-selectable (default: Bytez Claude Opus 4.6)
 * Supports both Bytez and Groq providers for dynamic model selection
 * Runs 2-3x per task (plan + replan only)
 */
@Injectable()
export class OrchestratorAgent extends BaseAgent {
  private model = AGENT_MODELS.ORCHESTRATOR;

  constructor(
    sharedState: SharedStateService,
    private readonly bytezService: BytezService,
    private readonly groqService: GroqService,
    private readonly messagesService: MessagesService,
    private readonly agentsService: AgentsService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'OrchestratorAgent');
  }

  private getModel() {
    const config = this.agentsService.getAgentModel('ORCHESTRATOR');
    const selectedModel = config ? config : this.model;
    
    this.logger.log(`🎯 [ORCHESTRATOR] Model Selection:`);
    this.logger.log(`   - Config from AgentsService: ${config ? JSON.stringify(config) : 'NULL'}`);
    this.logger.log(`   - Fallback default: ${JSON.stringify(this.model)}`);
    this.logger.log(`   - SELECTED MODEL: ${selectedModel.model} (provider: ${selectedModel.provider})`);
    
    return selectedModel;
  }

  /**
   * Create an execution plan from clarified task
   * @param input - ClarifiedTask from Clarifier
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`📋 Creating execution plan for task ${taskId}`);

      const clarifiedTask = input as ClarifiedTask;
      this.logger.log(`   Goal: ${clarifiedTask.clarified_goal}`);
      this.logger.log(`   Type: ${clarifiedTask.task_type}`);
      this.logger.log(`   Constraints: ${clarifiedTask.constraints.length}`);

      // Determine if extended thinking is needed
      const useExtendedThinking = this.shouldUseExtendedThinking(clarifiedTask);

      if (useExtendedThinking) {
        this.logger.log('🧠 Using extended thinking for complex task');
      }

      // Build planning prompt
      const prompt = this.buildPlanningPrompt(clarifiedTask, useExtendedThinking);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'ORCHESTRATOR_AGENT', {
        systemPrompt: this.getSystemPrompt(useExtendedThinking),
        userPrompt: prompt,
        context: {
          goal: clarifiedTask.clarified_goal,
          taskType: clarifiedTask.task_type,
          constraintsCount: clarifiedTask.constraints.length,
          useExtendedThinking,
        },
      });

      // Call model service (Bytez or Groq) based on user selection
      const modelConfig = this.getModel();
      const response = await this.callModelService(
        this.getSystemPrompt(useExtendedThinking),
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
      this.browserLogger.logAgentResponse(taskId, 'ORCHESTRATOR_AGENT', {
        model: modelConfig.model,
        provider: modelConfig.provider,
        contentBlocks: response.contentBlocks || [],
        tokenUsage: response.tokenUsage || {},
      });

      // Parse execution plan
      const plan = this.parseExecutionPlan(response);

      // LOG ORCHESTRATOR OUTPUT
      this.logger.log(`🎯 [OrchestratorAgent] Generated plan:`);
      this.logger.log(`   Steps: ${plan.steps?.length || 0}`);
      this.logger.log(`   Complexity: ${plan.complexity}`);
      this.logger.log(`   Estimated duration: ${plan.estimated_duration_minutes} minutes`);
      if (plan.steps) {
        plan.steps.forEach((step, i) => {
          this.logger.log(`   Step ${i + 1}: [${step.type}] ${step.description.substring(0, 80)}...`);
        });
      }

      // Validate plan is not empty
      if (!plan.steps || plan.steps.length === 0) {
        throw new Error('Orchestrator generated empty plan - cannot proceed');
      }

      // Write to shared state
      await this.writeState(taskId, 'execution_plan', plan);

      // Save plan as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'ORCHESTRATOR',
        'plan',
        { plan: { steps: plan.steps } },
      );

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'ORCHESTRATOR',
        action: 'create_plan',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          steps_count: plan.steps.length,
          complexity: plan.complexity,
          estimated_duration: plan.estimated_duration_minutes,
        },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      const modelConfig5 = this.getModel();
      this.logCost(tokensUsed, modelConfig5.model);

      return {
        success: true,
        data: plan,
        tokensUsed,
        cost: this.calculateCost(tokensUsed),
      };
    } catch (error) {
      this.logger.error(`Planning failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create execution plan (convenience method for OrchestrationService)
   */
  async plan(clarifiedTask: ClarifiedTask, taskId: string): Promise<ExecutionPlan> {
    const result = await this.run(clarifiedTask, taskId);

    if (!result.success) {
      throw new Error(`Planning failed: ${result.error}`);
    }

    return result.data as ExecutionPlan;
  }

  /**
   * Replan after failure (triggered by Recovery escalation)
   */
  async replan(failedStep: ExecutionStep, taskId: string): Promise<ExecutionPlan | null> {
    try {
      this.logger.log(`Replanning after step ${failedStep.id} failed`);

      // Read context from shared state
      const taskGoal = await this.readState<ClarifiedTask>(taskId, 'task_goal');
      const failureLog = await this.readState<any[]>(taskId, 'failure_log');
      const actionHistory = await this.readState<any[]>(taskId, 'action_history');

      // Check if task should be cancelled
      const shouldCancel = await this.shouldCancelTask(taskId, failureLog || []);
      
      if (shouldCancel) {
        this.logger.warn(`Task ${taskId} should be cancelled - too many failures or unrecoverable error`);
        await this.writeState(taskId, 'orchestrator_recommendation', 'cancel');
        await this.writeState(taskId, 'cancellation_reason', 'Task deemed unrecoverable by Orchestrator');
        return null;
      }

      // Build replanning prompt
      const prompt = this.buildReplanningPrompt(
        taskGoal!,
        failedStep,
        failureLog || [],
        actionHistory || [],
      );

      // Call model service (Bytez or Groq) for replanning
      const modelConfig3 = this.getModel();
      const response = await this.callModelService(
        this.getSystemPrompt(),
        [
          {
            role: 'USER',
            content: [{ type: 'text', text: prompt }],
          },
        ] as any,
        modelConfig3.model,
        false,
      );

      // Parse new execution plan
      const newPlan = this.parseExecutionPlan(response);

      // Validate new plan
      if (!newPlan.steps || newPlan.steps.length === 0) {
        this.logger.warn('Replanning generated empty plan');
        return null;
      }

      // Write to shared state
      await this.writeState(taskId, 'execution_plan', newPlan);

      // Save replan as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'ORCHESTRATOR',
        'plan',
        { plan: { steps: newPlan.steps } },
      );

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'ORCHESTRATOR',
        action: 'replan',
        result: 'success',
        timestamp: new Date().toISOString(),
        details: {
          failed_step: failedStep.id,
          new_steps_count: newPlan.steps.length,
        },
      });

      const tokensUsed = response.tokenUsage?.totalTokens || 0;
      const modelConfig4 = this.getModel();
      this.logCost(tokensUsed, modelConfig4.model);

      return newPlan;
    } catch (error) {
      this.logger.error(`Replanning failed: ${error.message}`);
      return null;
    }
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
    // Groq models: openai/gpt-oss-*, meta-llama/llama-*
    // Bytez models: anthropic/*, google/*, qwen/*, etc.
    const isGroqModel = 
      model.includes('gpt-oss') || 
      model.includes('llama-') ||
      model.startsWith('openai/') ||
      model.startsWith('meta-llama/');
    
    if (isGroqModel) {
      this.logger.log(`🔧 Using Groq service for model: ${model}`);
      return await this.groqService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
      );
    } else {
      this.logger.log(`🔧 Using Bytez service for model: ${model}`);
      return await this.bytezService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
      );
    }
  }

  private getSystemPrompt(useExtendedThinking: boolean = false): string {
    return getAgentSystemPrompt('ORCHESTRATOR', { extended: useExtendedThinking });
  }

  private shouldUseExtendedThinking(clarifiedTask: ClarifiedTask): boolean {
    // Use extended thinking for:
    // 1. Mixed tasks (require coordination between web and desktop)
    // 2. Tasks with multiple constraints
    // 3. Tasks with complex goals (multiple actions, data transformations, etc.)
    
    if (clarifiedTask.task_type === 'mixed') {
      return true;
    }

    if (clarifiedTask.constraints.length >= 3) {
      return true;
    }

    // Check for complexity indicators in the goal
    const complexityIndicators = [
      'and then',
      'after that',
      'multiple',
      'all',
      'every',
      'compare',
      'analyze',
      'calculate',
      'transform',
      'combine',
      'merge',
    ];

    const goalLower = clarifiedTask.clarified_goal.toLowerCase();
    const hasComplexityIndicators = complexityIndicators.some(indicator => 
      goalLower.includes(indicator)
    );

    return hasComplexityIndicators;
  }

  private buildPlanningPrompt(clarifiedTask: ClarifiedTask, useExtendedThinking: boolean = false): string {
    const basePrompt = `Create an execution plan for this task:

**Goal**: ${clarifiedTask.clarified_goal}

**Task Type**: ${clarifiedTask.task_type}

**Constraints**: ${clarifiedTask.constraints.length > 0 ? clarifiedTask.constraints.join(', ') : 'None'}

**Assumptions**: ${clarifiedTask.assumptions.length > 0 ? clarifiedTask.assumptions.join(', ') : 'None'}`;

    if (useExtendedThinking) {
      return basePrompt + `

This is a complex task. Take time to think through:
- What are the critical decision points?
- Where could things go wrong?
- What's the most reliable sequence?
- How can we verify success at each step?
- Can any steps be combined to reduce context loss?

Create a detailed step-by-step plan. Respond with JSON only, following the exact schema in the system prompt.`;
    }

    return basePrompt + `

Create a detailed step-by-step plan. Respond with JSON only, following the exact schema in the system prompt.`;
  }

  private buildReplanningPrompt(
    taskGoal: ClarifiedTask,
    failedStep: ExecutionStep,
    failureLog: any[],
    actionHistory: any[],
  ): string {
    return `The original plan failed. Create a NEW plan to accomplish the goal.

**Original Goal**: ${taskGoal.clarified_goal}

**Failed Step**: ${failedStep.id} - ${failedStep.description}

**What Failed**:
${JSON.stringify(failureLog.slice(-3), null, 2)}

**What Succeeded**:
${JSON.stringify(actionHistory.filter(a => a.result === 'success'), null, 2)}

Create a COMPLETELY NEW plan that avoids the previous failure. Consider:
- What worked and what didn't
- Alternative approaches
- Simpler or more robust methods
- Different tools or techniques

Respond with JSON only, following the exact schema in the system prompt.`;
  }

  private parseExecutionPlan(response: any): ExecutionPlan {
    const content = response.contentBlocks?.[0]?.text || '';

    try {
      const parsed = extractJSON(content);

      // DEBUG: Log the structure we received
      this.logger.debug(`📋 Parsed plan structure: ${JSON.stringify({
        hasSteps: !!parsed.steps,
        hasPlan: !!parsed.plan,
        planIsArray: Array.isArray(parsed.plan),
        planHasSteps: parsed.plan?.steps ? true : false,
      })}`);

      // Normalize to ExecutionPlan format - accept various schema formats
      // Handle nested structures: { plan: { steps: [...] } } or { steps: [...] } or { plan: [...] }
      let stepsArray: any[] = [];
      
      if (parsed.steps && Array.isArray(parsed.steps)) {
        // Format: { steps: [...] }
        stepsArray = parsed.steps;
      } else if (parsed.plan && Array.isArray(parsed.plan)) {
        // Format: { plan: [...] }
        stepsArray = parsed.plan;
      } else if (parsed.plan && parsed.plan.steps && Array.isArray(parsed.plan.steps)) {
        // Format: { plan: { steps: [...] } }
        stepsArray = parsed.plan.steps;
      }
      
      const steps = stepsArray.map((s: any, i: number) => {
        // Infer type from multiple sources
        let stepType = s.type;
        
        // If type is missing, try to infer from description and context
        if (!stepType) {
          const description = (s.description || s.action || '').toLowerCase();
          // Fix: Guard against non-string fallback values
          const fallback = typeof s.fallback === 'string' ? s.fallback : '';
          const contextStr = typeof s.context === 'string' ? s.context : '';
          const context = (contextStr || fallback || '').toLowerCase();
          const combined = description + ' ' + context;
          
          // Web indicators (browser-based actions)
          const webIndicators = [
            'navigate', 'browser', 'web', 'url', 'website', 'search google',
            'search for', 'click button on', 'fill form', 'submit form',
            'web page', 'webpage', 'http', 'https', 'gmail.com', 'google.com',
            'wikipedia', 'youtube', 'facebook', 'twitter', 'linkedin',
            'open website', 'go to website', 'visit website', 'load page',
            'scroll page', 'click link', 'web element', 'web search'
          ];
          
          // Desktop indicators (OS-level actions)
          const desktopIndicators = [
            'terminal', 'command', 'file', 'folder', 'directory',
            'open chrome', 'open firefox', 'open application', 'launch app',
            'screenshot', 'desktop', 'window', 'click icon', 'type in',
            'paste in', 'keyboard', 'mouse', 'cursor', 'vnc', 'chromium'
          ];
          
          // Count matches for each type
          const webMatches = webIndicators.filter(indicator => combined.includes(indicator)).length;
          const desktopMatches = desktopIndicators.filter(indicator => combined.includes(indicator)).length;
          
          // Assign type based on matches
          if (webMatches > desktopMatches) {
            stepType = 'web';
            this.logger.warn(`⚠️  Step ${i + 1} missing type field - inferred as 'web' from description`);
          } else if (desktopMatches > webMatches) {
            stepType = 'desktop';
            this.logger.warn(`⚠️  Step ${i + 1} missing type field - inferred as 'desktop' from description`);
          } else {
            // Default to desktop if unclear, but log warning
            stepType = 'desktop';
            this.logger.warn(`⚠️  Step ${i + 1} missing type field - defaulting to 'desktop' (description: "${description.substring(0, 50)}...")`);
          }
        }
        
        // Validate type is correct
        if (stepType !== 'web' && stepType !== 'desktop') {
          this.logger.warn(`⚠️  Step ${i + 1} has invalid type "${stepType}" - defaulting to 'desktop'`);
          stepType = 'desktop';
        }
        
        return {
          id: s.id || s.step || `step_${i + 1}`,
          type: stepType as 'web' | 'desktop',
          description: s.description || s.action || '',
          success_criteria: s.success_criteria || s.expected_outcome || s.expected_output || '',
          context: s.context || s.fallback || '',
          depends_on: s.depends_on || [],
        };
      });

      const plan: ExecutionPlan = {
        steps,
        estimated_duration_minutes: parsed.estimated_duration_minutes || parsed.estimated_time || 5,
        complexity: parsed.complexity || 'simple',
      };

      // Validate we have at least one step
      if (!plan.steps || plan.steps.length === 0) {
        throw new Error('Execution plan must contain at least one step');
      }

      // Post-processing validation: Check for common misassignments
      plan.steps.forEach((step, i) => {
        const description = step.description.toLowerCase();
        
        // Check for obvious web tasks assigned to desktop
        if (step.type === 'desktop') {
          const webKeywords = ['search google', 'search for', 'navigate to', 'go to website', 'web search', 'google.com', 'wikipedia'];
          const hasWebKeyword = webKeywords.some(keyword => description.includes(keyword));
          
          if (hasWebKeyword) {
            this.logger.warn(`🔧 FIXING: Step ${i + 1} was assigned to DESKTOP but contains web keywords - changing to WEB`);
            this.logger.warn(`   Description: "${step.description}"`);
            step.type = 'web';
          }
        }
        
        // Check for web UI interactions wrongly assigned to desktop
        if (step.type === 'desktop') {
          const webUIKeywords = [
            'click button', 'click link', 'fill form', 'fill field', 'fill in',
            'submit form', 'enter text', 'type in field', 'select option',
            'check checkbox', 'click compose', 'click send', 'click submit',
            'press send', 'press submit', 'input text', 'enter email'
          ];
          
          const hasWebUIKeyword = webUIKeywords.some(keyword => description.includes(keyword));
          
          // Check if previous step was web navigation or if description mentions web page
          const previousStepWasWeb = i > 0 && plan.steps[i - 1].type === 'web';
          const mentionsWebPage = description.includes('page') || description.includes('website') || description.includes('browser');
          
          if (hasWebUIKeyword && (previousStepWasWeb || mentionsWebPage)) {
            this.logger.warn(`🔧 FIXING: Step ${i + 1} involves web UI interaction but was assigned to DESKTOP - changing to WEB`);
            this.logger.warn(`   Description: "${step.description}"`);
            this.logger.warn(`   Reason: Previous step was web navigation or description mentions web page`);
            step.type = 'web';
          }
        }
        
        // Check for obvious desktop tasks assigned to web
        if (step.type === 'web') {
          const desktopKeywords = ['open chrome', 'open chromium', 'open firefox', 'open terminal', 'run command', 'create file', 'terminal command'];
          const hasDesktopKeyword = desktopKeywords.some(keyword => description.includes(keyword));
          
          if (hasDesktopKeyword) {
            this.logger.warn(`🔧 FIXING: Step ${i + 1} was assigned to WEB but contains desktop keywords - changing to DESKTOP`);
            this.logger.warn(`   Description: "${step.description}"`);
            step.type = 'desktop';
          }
        }
      });

      return plan;
    } catch (error) {
      this.logger.error(`Failed to parse execution plan: ${error.message}`);
      this.logger.error(`Response content: ${content}`);

      // Cannot return a safe default for planning - must fail
      throw new Error(`Failed to parse execution plan: ${error.message}`);
    }
  }

  private calculateCost(tokens: number): number {
    // Bytez Claude Opus 4.6 pricing (approximate)
    // Input: $15 per 1M tokens, Output: $75 per 1M tokens
    // Average: ~$45 per 1M tokens
    const costPerToken = 45 / 1_000_000;
    return tokens * costPerToken;
  }

  /**
   * Determine if task should be cancelled based on failure patterns
   */
  private async shouldCancelTask(taskId: string, failureLog: any[]): Promise<boolean> {
    // Cancel if too many total failures
    if (failureLog.length >= 10) {
      this.logger.warn(`Task ${taskId} has ${failureLog.length} failures - recommending cancellation`);
      return true;
    }

    // Cancel if same step failed 4+ times
    const stepFailureCounts = new Map<string, number>();
    for (const failure of failureLog) {
      const count = stepFailureCounts.get(failure.step) || 0;
      stepFailureCounts.set(failure.step, count + 1);
    }

    for (const [step, count] of stepFailureCounts.entries()) {
      if (count >= 4) {
        this.logger.warn(`Step ${step} failed ${count} times - recommending cancellation`);
        return true;
      }
    }

    // Cancel if critical errors detected
    const criticalErrors = [
      'authentication failed',
      'permission denied',
      'not found',
      'invalid credentials',
      'access denied',
    ];

    const recentFailures = failureLog.slice(-3);
    for (const failure of recentFailures) {
      const errorLower = (failure.error || '').toLowerCase();
      if (criticalErrors.some(critical => errorLower.includes(critical))) {
        this.logger.warn(`Critical error detected: ${failure.error} - recommending cancellation`);
        return true;
      }
    }

    return false;
  }
}
