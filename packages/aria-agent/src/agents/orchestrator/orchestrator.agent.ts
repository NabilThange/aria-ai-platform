import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { BytezService } from '../../bytez/bytez.service';
import { GroqService } from '../../groq/groq.service';
import { GoogleService } from '../../google/google.service';
import { OpenRouterService } from '../../openrouter/openrouter.service';
import { AGENT_MODELS } from '../../config/agents.config';
import { getAgentSystemPrompt } from '../../config/system-prompts.config';
import {
  ExecutionPlan,
  ExecutionStep,
  OrchestratorPlanResult,
  WorkflowSelectionContext,
} from './orchestrator.types';
import { ClarifiedTask } from '../clarifier/clarifier.types';
import { extractJSON } from '../../utils/json.util';
import { MessagesService } from '../../messages/messages.service';
import { AgentsService } from '../agents.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { WorkflowService } from '../../services/workflow.service';
import { workflowTools } from '../../groq/workflow.tools';
import { MessageContentType } from '@bytebot/shared';
import { Role } from '@prisma/client';
import {
  WorkflowMetadata,
  WorkflowUserStep,
  WorkflowVariable,
} from '../../workflows/workflow.interface';

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
    private readonly googleService: GoogleService,
    private readonly openrouterService: OpenRouterService,
    private readonly messagesService: MessagesService,
    private readonly agentsService: AgentsService,
    private readonly browserLogger: BrowserLoggerService,
    private readonly workflowService: WorkflowService,
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

      const existingWorkflowContext =
        await this.readState<WorkflowSelectionContext | null>(
          taskId,
          'workflow_selection_context',
        );

      // Build planning prompt
      const prompt = this.buildPlanningPrompt(
        clarifiedTask,
        existingWorkflowContext,
        useExtendedThinking,
      );

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

      // Initialize conversation history for ReAct loop
      const conversationMessages: any[] = [
        {
          role: 'USER',
          content: [{ type: 'text', text: prompt }],
        },
      ];

      // ===== REMOVED: AUTO-INJECT WORKFLOW CONTEXT =====
      // REASON: Auto-injection adds 3,600+ tokens and causes Groq TPM limit errors
      // The orchestrator has list_workflows() tool available - let it call the tool instead
      // This reduces initial token count from ~12,791 to ~9,191 tokens
      this.logger.log(`\n🔧 [PRE-PLANNING] Orchestrator will use list_workflows() tool to fetch workflows on-demand`);
      // ===== END REMOVAL =====

      // ReAct loop: THOUGHT → ACTION → OBSERVATION → THOUGHT...
      const MAX_ITERATIONS = 10;
      let iteration = 0;
      let planGenerated = false;
      let finalResponse: any = null;
      const planningContext: { selectedWorkflow?: WorkflowSelectionContext } =
        {};
      
      // Get model config to determine tool format
      const modelConfig = this.getModel();

      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`[ORCHESTRATOR REACT LOOP STARTED]`);
      this.logger.log(`${'='.repeat(80)}\n`);

      while (!planGenerated && iteration < MAX_ITERATIONS) {
        iteration++;
        this.logger.log(`\n${'-'.repeat(80)}`);
        this.logger.log(`[ITERATION ${iteration}/${MAX_ITERATIONS}]`);
        this.logger.log(`${'-'.repeat(80)}`);

        // ===== SYSTEM PROMPT OPTIMIZATION =====
        // ===== SYSTEM PROMPT OPTIMIZATION =====
        // Only send system prompt on first iteration to save tokens
        // Fix C provides workflow decision hints in tool results, so orchestrator
        // has workflow context even without system prompt on subsequent iterations
        const isFirstMessage = iteration === 1;
        // ===== END OPTIMIZATION =====

        // Call model service with accumulated conversation history
        const response = await this.callModelService(
          this.getSystemPrompt(useExtendedThinking),
          conversationMessages,
          modelConfig.model,
          true, // Enable tools for workflow discovery
          taskId, // Pass taskId for tool execution
          modelConfig, // Pass model config for tool format detection
          isFirstMessage, // Only send system prompt on first iteration
          planningContext,
        );

        // Check if response contains a plan (text content with JSON)
        const textContent = response.contentBlocks
          ?.filter((block: any) => block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');

        // Log thinking if present
        if (textContent && textContent.trim()) {
          this.logger.log(`\n💭 THOUGHT (Iteration ${iteration}):`);
          this.logger.log(textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''));
        }

        // Check if plan is generated (response contains JSON with "steps" field)
        if (textContent && (textContent.includes('"steps"') || textContent.includes("'steps'"))) {
          this.logger.log(`\n✅ Plan generated in iteration ${iteration}`);
          planGenerated = true;
          finalResponse = response;
          break;
        }

        // If no more tool calls and no plan, force plan generation
        const hasToolCalls = response.contentBlocks?.some((block: any) => block.type === 'tool_use');
        if (!hasToolCalls && !planGenerated) {
          this.logger.log(`\n⚠️  No tool calls and no plan - forcing plan generation`);
          planGenerated = true;
          finalResponse = response;
          break;
        }

        // Continue loop if there are tool calls (handled by callModelService recursively)
        this.logger.log(`   Continuing ReAct loop...`);
      }

      if (!finalResponse) {
        throw new Error(`Orchestrator exceeded ${MAX_ITERATIONS} iterations without generating a plan`);
      }

      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`[ORCHESTRATOR REACT LOOP COMPLETED]`);
      this.logger.log(`   Total iterations: ${iteration}`);
      this.logger.log(`${'='.repeat(80)}\n`);

      // LOG AGENT RESPONSE TO BROWSER
      this.browserLogger.logAgentResponse(taskId, 'ORCHESTRATOR_AGENT', {
        model: modelConfig.model,
        provider: modelConfig.provider,
        contentBlocks: finalResponse.contentBlocks || [],
        tokenUsage: finalResponse.tokenUsage || {},
      });

      // Parse execution plan
      const parsedPlan = this.parseExecutionPlan(
        finalResponse,
        planningContext.selectedWorkflow || existingWorkflowContext || undefined,
      );
      const enrichedPlan = await this.enrichPlanWithWorkflowDisplaySteps(
        parsedPlan,
      );
      const planningResult = await this.validateWorkflowPlan(
        enrichedPlan,
        clarifiedTask,
        taskId,
      );

      if (planningResult.kind === 'needs_clarification') {
        await this.messagesService.createAgentActionMessage(
          taskId,
          'ORCHESTRATOR',
          'question',
          {
            question: planningResult.clarification.question?.question,
            questionId: planningResult.clarification.question?.id,
            questionType: planningResult.clarification.question?.type,
            required: planningResult.clarification.question?.required,
          },
        );
        await this.sharedState.set(
          taskId,
          'pending_clarification_question',
          planningResult.clarification.question?.question || null,
        );
        await this.sharedState.set(
          taskId,
          'workflow_selection_context',
          planningResult.workflow_context,
        );

        return {
          success: true,
          data: planningResult,
          tokensUsed: finalResponse.tokenUsage?.totalTokens || 0,
          cost: this.calculateCost(finalResponse.tokenUsage?.totalTokens || 0),
        };
      }

      const plan = planningResult.plan;

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
      await this.sharedState.set(taskId, 'pending_clarification_question', null);
      await this.sharedState.set(
        taskId,
        'workflow_selection_context',
        this.buildWorkflowSelectionContextFromPlan(plan),
      );

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

      const tokensUsed = finalResponse.tokenUsage?.totalTokens || 0;
      this.logCost(tokensUsed, modelConfig.model);

      return {
        success: true,
        data: planningResult,
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
  async plan(
    clarifiedTask: ClarifiedTask,
    taskId: string,
  ): Promise<OrchestratorPlanResult> {
    const result = await this.run(clarifiedTask, taskId);

    if (!result.success) {
      throw new Error(`Planning failed: ${result.error}`);
    }

    return result.data as OrchestratorPlanResult;
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
      const parsedPlan = this.parseExecutionPlan(response);
      const newPlan = await this.enrichPlanWithWorkflowDisplaySteps(parsedPlan);

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
    taskId?: string,
    modelConfig?: any, // Model config for tool format detection
    isFirstMessage: boolean = false, // NEW: Only send system prompt on first message
    planningContext?: { selectedWorkflow?: WorkflowSelectionContext },
  ): Promise<any> {
    // Use provider from modelConfig if available, otherwise infer from model string
    const provider = modelConfig?.provider || this.inferProviderFromModel(model);
    
    let response: any;
    
    // Import workflow tools - get both OpenAI and Anthropic formats
    const { workflowTools } = await import('../../groq/workflow.tools');
    const { anthropicWorkflowTools } = await import('../../bytez/anthropic-workflow.tools');
    
    // Determine which tool format to use
    // For Anthropic models via Bytez, use Anthropic format (input_schema)
    // For all other models (Groq, Google, etc.), use OpenAI format (parameters)
    const isAnthropicModel = model.startsWith('anthropic/');
    const toolsToUse = isAnthropicModel ? anthropicWorkflowTools : workflowTools;
    
    if (provider === 'groq') {
      this.logger.log(`🔧 Using Groq service for model: ${model}`);
      response = await this.groqService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        workflowTools, // Groq always uses OpenAI format
        { isFirstMessage }, // NEW: Pass optimization flag
      );
    } else if (provider === 'google') {
      this.logger.log(`🔧 Using Google service for model: ${model}`);
      response = await this.googleService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        workflowTools, // Google uses OpenAI format
        { isFirstMessage }, // NEW: Pass optimization flag
      );
    } else if (provider === 'openrouter') {
      this.logger.log(`🔧 Using OpenRouter service for model: ${model}`);
      response = await this.openrouterService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        workflowTools, // OpenRouter uses OpenAI format
        { isFirstMessage }, // NEW: Pass optimization flag
      );
    } else {
      this.logger.log(`🔧 Using Bytez service for model: ${model} (tool format: ${isAnthropicModel ? 'Anthropic' : 'OpenAI'})`);
      response = await this.bytezService.generateMessage(
        systemPrompt,
        messages,
        model,
        useTools,
        undefined, // No abort signal
        toolsToUse, // Use appropriate tool format
        { isFirstMessage }, // NEW: Pass optimization flag
      );
    }
    
    // Handle tool calls if present
    // Extract tool calls from contentBlocks
    const toolCalls = response.contentBlocks
      ?.filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        input: block.input,
      })) || [];
    
    if (useTools && toolCalls.length > 0 && taskId) {
      this.logger.log(`🔧 Processing ${toolCalls.length} tool calls...`);
      
      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall: any) => {
          // Log tool call to browser UI
          this.browserLogger.logToolCall(taskId, 'ORCHESTRATOR', {
            name: toolCall.name,
            input: toolCall.input,
          });
          
          const startTime = Date.now();
          let result: any;
          let success = true;
          let error: string | undefined;
          
          try {
            result = await this.executeToolCall(toolCall, taskId);
          } catch (err: any) {
            success = false;
            error = err.message;
            result = null;
          }
          
          const duration = Date.now() - startTime;
          
          // Log tool result to browser UI
          this.browserLogger.logToolResult(taskId, 'ORCHESTRATOR', {
            toolName: toolCall.name,
            success,
            output: result,
            error,
            duration,
          });
          
          if (!success) {
            throw new Error(error);
          }

          if (
            toolCall.name === 'use_workflow' &&
            result?.workflow_name &&
            planningContext
          ) {
            planningContext.selectedWorkflow = {
              workflow_name: result.workflow_name,
              workflow_vars: result.workflow_vars || {},
            };
          }
          
          return result;
        })
      );
      
      // Add assistant message with tool calls to conversation
      const assistantMessage = {
        role: 'ASSISTANT',
        content: response.contentBlocks || [],
      };
      messages.push(assistantMessage);
      
      // Add user message with tool results to conversation
      const toolResultContent = toolCalls.map((toolCall: any, index: number) => ({
        type: 'tool_result',
        tool_use_id: toolCall.id,
        content: [{ type: 'text', text: JSON.stringify(toolResults[index]) }],
      }));
      
      const userMessage = {
        role: 'USER',
        content: toolResultContent,
      };
      messages.push(userMessage);
      
      // Log tool results for debugging
      this.logger.log(`\n📊 OBSERVATION (Tool Results):`);
      toolResults.forEach((result, index) => {
        const resultStr = JSON.stringify(result);
        this.logger.log(`   ${toolCalls[index].name}: ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
      });
      
      // ===== MESSAGE HISTORY TRUNCATION =====
      // Keep conversation history manageable to reduce token usage
      // Keep first 2 messages (initial prompt + workflow context) and last 10 messages
      const MAX_MESSAGES = 12;
      if (messages.length > MAX_MESSAGES) {
        const firstMessages = messages.slice(0, 2); // Keep initial prompt + workflow context
        const recentMessages = messages.slice(-(MAX_MESSAGES - 2)); // Keep last 10 messages
        messages.splice(0, messages.length, ...firstMessages, ...recentMessages);
        this.logger.log(`   🔄 Truncated conversation history: ${messages.length} messages (kept first 2 + last 10)`);
      }
      // ===== END TRUNCATION =====
      
      // Recursive call with accumulated conversation history
      return await this.callModelService(
        systemPrompt,
        messages,
        model,
        useTools,
        taskId,
        modelConfig,
        false,
        planningContext,
      ); // Subsequent calls: isFirstMessage=false
    }
    
    return response;
  }
  
  /**
   * Execute a tool call from the LLM
   */
  private async executeToolCall(toolCall: any, taskId: string): Promise<any> {
    const { name, input } = toolCall;
    
    this.logger.log(`🔧 Executing tool: ${name}`);
    this.logger.debug(`   Input: ${JSON.stringify(input)}`);
    
    try {
      switch (name) {
        case 'list_workflows':
          const workflows = await this.workflowService.listWorkflows();
          this.logger.log(`   Found ${workflows.length} workflows`);
          
          // Calculate total size of workflow descriptions
          const workflowsJson = JSON.stringify(workflows);
          const estimatedTokens = Math.ceil(workflowsJson.length / 4); // Rough token estimate
          
          this.logger.log(`\n${'='.repeat(80)}`);
          this.logger.log(`[WORKFLOW LIST SIZE ANALYSIS]`);
          this.logger.log(`${'='.repeat(80)}`);
          this.logger.log(`📊 Workflow Data Size:`);
          this.logger.log(`   Total workflows: ${workflows.length}`);
          this.logger.log(`   JSON size: ${(workflowsJson.length / 1024).toFixed(2)} KB`);
          this.logger.log(`   Estimated tokens: ~${estimatedTokens.toLocaleString()}`);
          this.logger.log(`\n📋 Individual Workflow Sizes:`);
          
          workflows.forEach((w, i) => {
            const wJson = JSON.stringify(w);
            const wTokens = Math.ceil(wJson.length / 4);
            this.logger.log(`   ${i + 1}. ${w.name}: ${wTokens} tokens (${(wJson.length / 1024).toFixed(2)} KB)`);
          });
          
          this.logger.log(`\n⚠️  CONTEXT IMPACT:`);
          if (estimatedTokens > 5000) {
            this.logger.warn(`   ⚠️  LARGE PAYLOAD: ${estimatedTokens} tokens will be added to next LLM call`);
          } else if (estimatedTokens > 2000) {
            this.logger.warn(`   ⚠️  MODERATE PAYLOAD: ${estimatedTokens} tokens (may approach TPM limits)`);
          } else {
            this.logger.log(`   ✅ SAFE PAYLOAD: ${estimatedTokens} tokens (within safe limits)`);
          }
          this.logger.log(`${'='.repeat(80)}\n`);
          await this.persistImportantWorkflowToolResult(
            taskId,
            'list_workflows',
            workflows,
          );
          // Return the compressed workflows array
          return workflows;
        
        case 'read_workflow':
          const workflowName = input.name;
          this.logger.log(`   Reading workflow: ${workflowName}`);
          
          const workflowDetails = await this.workflowService.readWorkflow(workflowName);
          
          // Log size of full workflow details
          const detailsJson = JSON.stringify(workflowDetails);
          const detailsTokens = Math.ceil(detailsJson.length / 4);
          this.logger.log(`   Workflow details: ${detailsTokens} tokens (${(detailsJson.length / 1024).toFixed(2)} KB)`);
          await this.persistImportantWorkflowToolResult(
            taskId,
            `read_workflow:${workflowName}`,
            workflowDetails,
          );
          return workflowDetails;
          
        case 'use_workflow':
          // Store workflow usage intent - will be included in execution plan
          this.logger.log(`   Workflow "${input.name}" will be added to execution plan`);
          const workflowIntentResult = {
            success: true,
            message: `Workflow "${input.name}" will be executed with variables: ${JSON.stringify(input.variables)}`,
            workflow_name: input.name,
            workflow_vars: input.variables,
          };
          await this.persistImportantWorkflowToolResult(
            taskId,
            `use_workflow:${input.name}`,
            workflowIntentResult,
          );
          return workflowIntentResult;
          
        default:
          this.logger.warn(`   Unknown tool: ${name}`);
          return { error: `Unknown tool: ${name}` };
      }
    } catch (error) {
      this.logger.error(`   Tool execution failed: ${error.message}`);
      return { error: error.message };
    }
  }

  private async persistImportantWorkflowToolResult(
    taskId: string,
    toolUseId: string,
    result: any,
  ): Promise<void> {
    await this.messagesService.create({
      taskId,
      role: Role.ASSISTANT,
      content: [
        {
          type: MessageContentType.ToolResult,
          tool_use_id: toolUseId,
          content: [
            {
              type: MessageContentType.Text,
              text: JSON.stringify(result, null, 2),
            } as any,
          ],
        } as any,
      ],
    });
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

  private buildPlanningPrompt(
    clarifiedTask: ClarifiedTask,
    workflowContext: WorkflowSelectionContext | null = null,
    useExtendedThinking: boolean = false,
  ): string {
    const basePrompt = `Create an execution plan for this task:

**Goal**: ${clarifiedTask.clarified_goal}

**Task Type**: ${clarifiedTask.task_type}

**Constraints**: ${clarifiedTask.constraints.length > 0 ? clarifiedTask.constraints.join(', ') : 'None'}

**Assumptions**: ${clarifiedTask.assumptions.length > 0 ? clarifiedTask.assumptions.join(', ') : 'None'}`;

    const workflowContextPrompt = workflowContext
      ? `

**Existing Workflow Context**:
- Previously selected workflow: ${workflowContext.workflow_name}
- Known workflow variables: ${JSON.stringify(workflowContext.workflow_vars)}
- Missing workflow variables already requested: ${workflowContext.missing_vars?.join(', ') || 'None'}
- If the user's latest clarification answers the missing values, continue with this same workflow and output a canonical workflow step.`
      : '';

    const workflowDisciplinePrompt = `

**Workflow Planning Discipline**:
- If you intend to use any workflow, call read_workflow(name) before use_workflow(name).
- Do not invent workflow variable names. Copy the exact variable names from read_workflow(name).
- Do not plan a workflow from list_workflows() alone.`;

    const leadGenWorkflowPrompt = this.shouldPreferFreelancerResearchEmail(
      clarifiedTask,
    )
      ? `

**Workflow Preference**:
- Prefer freelancer-research-email for local business research + spreadsheet + email tasks like this.
- Avoid chaining deep-research + opencode-request + send-email-n8n when freelancer-research-email already fits.`
      : '';

    if (useExtendedThinking) {
      return (
        basePrompt +
        workflowContextPrompt +
        workflowDisciplinePrompt +
        leadGenWorkflowPrompt +
        `

This is a complex task. Take time to think through:
- What are the critical decision points?
- Where could things go wrong?
- What's the most reliable sequence?
- How can we verify success at each step?
- Can any steps be combined to reduce context loss?

Create a detailed step-by-step plan. Respond with JSON only, following the exact schema in the system prompt.`
      );
    }

    return (
      basePrompt +
      workflowContextPrompt +
      workflowDisciplinePrompt +
      leadGenWorkflowPrompt +
      `

Create a detailed step-by-step plan. Respond with JSON only, following the exact schema in the system prompt.`
    );
  }

  private shouldPreferFreelancerResearchEmail(
    clarifiedTask: ClarifiedTask,
  ): boolean {
    const combinedText = [
      clarifiedTask.original_input,
      clarifiedTask.clarified_goal,
      ...(clarifiedTask.constraints || []),
      ...(clarifiedTask.assumptions || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const mentionsBusinessResearch =
      /\bcoffee shop|coffee shops|business|businesses|freelancer|lead\b/.test(
        combinedText,
      );
    const mentionsLocation =
      /\bmumbai\b|\bin\s+[a-z]/.test(combinedText);
    const wantsSpreadsheet =
      /\bexcel\b|\bspreadsheet\b|\bcsv\b/.test(combinedText);
    const wantsDelivery = /\bemail\b|\bsend\b/.test(combinedText);

    return (
      mentionsBusinessResearch &&
      mentionsLocation &&
      wantsSpreadsheet &&
      wantsDelivery
    );
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

  private parseExecutionPlan(
    response: any,
    selectedWorkflow?: WorkflowSelectionContext,
  ): ExecutionPlan {
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
      // Handle nested structures: { plan: { steps: [...] } } or { steps: [...] } or { plan: [...] } or { execution_plan: [...] }
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
      } else if (parsed.execution_plan && Array.isArray(parsed.execution_plan)) {
        // Format: { execution_plan: [...] }
        stepsArray = parsed.execution_plan;
      }
      
      const steps = stepsArray.map((rawStep: any, i: number) => {
        const s = this.normalizeWorkflowIntentStep(rawStep, selectedWorkflow);
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
          
          // FIX 2: Check for workflow indicators FIRST (highest priority)
          const workflowIndicators = [
            'workflow', 'execute workflow', 'run workflow', 'use workflow',
            'use the workflow', 'execute the workflow', 'run the workflow'
          ];
          
          const hasWorkflowIndicator = workflowIndicators.some(indicator => combined.includes(indicator));
          const hasWorkflowVars = !!(s.workflow_vars || s.variables);
          const hasWorkflowName = !!(s.workflow_name);
          
          if (hasWorkflowIndicator || hasWorkflowVars || hasWorkflowName) {
            stepType = 'workflow';
            this.logger.log(`🔍 [FIX 2] Step ${i + 1} inferred as 'workflow' (indicator: ${hasWorkflowIndicator}, vars: ${hasWorkflowVars}, name: ${hasWorkflowName})`);
          }
          
          // Web indicators (browser-based actions) - check only if not workflow
          if (!stepType) {
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
        }
        
        // Validate type is correct
        if (stepType !== 'web' && stepType !== 'desktop' && stepType !== 'workflow') {
          this.logger.warn(`⚠️  Step ${i + 1} has invalid type "${stepType}" - defaulting to 'desktop'`);
          stepType = 'desktop';
        }
        
        // Build base step
        const step: ExecutionStep = {
          id: s.id || s.step || `step_${i + 1}`,
          type: stepType as 'web' | 'desktop' | 'workflow',
          description: s.description || s.action || '',
          success_criteria: s.success_criteria || s.expected_outcome || s.expected_output || '',
          context: s.context || s.fallback || '',
          depends_on: s.depends_on || [],
          display_steps: Array.isArray(s.display_steps) ? s.display_steps : undefined,
        };
        
        // Add workflow-specific fields if this is a workflow step
        if (stepType === 'workflow') {
          step.workflow_name = s.workflow_name;
          step.workflow_vars = s.workflow_vars || s.variables || {};
        }
        
        return step;
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

  private normalizeWorkflowIntentStep(
    rawStep: any,
    selectedWorkflow?: WorkflowSelectionContext,
  ): any {
    const description = String(rawStep?.description || rawStep?.action || '');
    const selectedWorkflowName = selectedWorkflow?.workflow_name;
    const nestedInput =
      rawStep?.workflow ||
      rawStep?.arguments ||
      rawStep?.params ||
      rawStep?.parameters ||
      rawStep?.input ||
      rawStep?.tool_input ||  // FIX 4: Add tool_input to nested input sources
      {};
    const useWorkflowIntent =
      rawStep?.tool === 'use_workflow' ||
      rawStep?.action === 'use_workflow' ||
      rawStep?.method === 'use_workflow' ||
      rawStep?.command === 'use_workflow';

    // FIX 1: Check for workflow_vars or variables field (strong indicator it's a workflow step)
    const hasWorkflowVars = !!(
      rawStep?.workflow_vars ||
      rawStep?.variables ||
      rawStep?.tool_input?.variables ||  // FIX 4: Check tool_input.variables
      nestedInput?.workflow_vars ||
      nestedInput?.variables
    );

    const explicitWorkflowName =
      typeof rawStep?.workflow_name === 'string'
        ? rawStep.workflow_name
        : typeof rawStep?.workflow_id === 'string'
          ? rawStep.workflow_id
        : typeof rawStep?.workflow?.name === 'string'
          ? rawStep.workflow.name
          : typeof rawStep?.tool_input?.name === 'string' && useWorkflowIntent  // FIX 4: Check tool_input.name
            ? rawStep.tool_input.name
            : typeof nestedInput?.workflow_name === 'string'
              ? nestedInput.workflow_name
              : typeof nestedInput?.workflow_id === 'string'
                ? nestedInput.workflow_id
                : typeof nestedInput?.name === 'string' && useWorkflowIntent
                  ? nestedInput.name
            : typeof rawStep?.name === 'string' &&
                (useWorkflowIntent ||
                  rawStep?.type === 'workflow' ||
                  hasWorkflowVars)
              ? rawStep.name
              : undefined;

    // FIX 1: Extract workflow name from description using regex pattern
    let descriptionWorkflowName: string | undefined = undefined;
    if (!explicitWorkflowName && description) {
      // Pattern: "use/execute/run [the] <workflow-name> workflow"
      const workflowPattern = /(?:use|execute|run)\s+(?:the\s+)?([a-z0-9-]+)\s+workflow/i;
      const match = description.match(workflowPattern);
      if (match && match[1]) {
        descriptionWorkflowName = match[1];
        this.logger.log(`🔍 [FIX 1] Detected workflow name from description: "${descriptionWorkflowName}"`);
      }
    }

    const fallbackWorkflowName =
      selectedWorkflowName &&
      (useWorkflowIntent ||
        description.toLowerCase().includes(selectedWorkflowName.toLowerCase()) ||
        /selected workflow/i.test(description))
        ? selectedWorkflowName
        : undefined;

    const workflowName = explicitWorkflowName || descriptionWorkflowName || fallbackWorkflowName;

    if (!workflowName) {
      this.logger.debug(
        `Workflow normalization skipped for step "${rawStep?.id || rawStep?.step || 'unknown'}"`,
      );
      return rawStep;
    }

    this.logger.debug(
      `Workflow normalization applied for step "${rawStep?.id || rawStep?.step || 'unknown'}": ${workflowName}`,
    );

    // FIX 4: Extract variables from all possible locations including tool_input
    const extractedVars = {
      ...(selectedWorkflow?.workflow_name === workflowName
        ? selectedWorkflow?.workflow_vars || {}
        : {}),
      ...(rawStep?.tool_input?.variables || {}),  // FIX 4: Extract from tool_input.variables
      ...(nestedInput?.workflow_vars ||
        nestedInput?.variables ||
        rawStep?.workflow_vars ||
        rawStep?.variables ||
        rawStep?.workflow?.variables ||
        {}),
    };

    this.logger.log(
      `🔍 [FIX 4] Extracted workflow variables for "${workflowName}": ${JSON.stringify(extractedVars)}`,
    );

    return {
      ...rawStep,
      type: 'workflow',
      workflow_name: workflowName,
      workflow_vars: extractedVars,
    };
  }

  private async validateWorkflowPlan(
    plan: ExecutionPlan,
    clarifiedTask: ClarifiedTask,
    taskId: string,
  ): Promise<OrchestratorPlanResult> {
    const storedWorkflowContext =
      await this.readState<WorkflowSelectionContext | null>(
        taskId,
        'workflow_selection_context',
      );

    const validatedSteps = await Promise.all(
      plan.steps.map(async (step) => {
        if (step.type !== 'workflow' || !step.workflow_name) {
          return step;
        }

        let metadata: WorkflowMetadata;
        try {
          metadata = await this.workflowService.readWorkflow(step.workflow_name);
        } catch (error) {
          this.logger.warn(
            `Workflow validation failed because "${step.workflow_name}" could not be loaded: ${error.message}`,
          );
          return this.buildUnknownWorkflowClarificationResult(
            clarifiedTask,
            step,
            error.message,
          );
        }

        const mergedVars = this.mergeWorkflowVariables(
          storedWorkflowContext?.workflow_name === step.workflow_name
            ? storedWorkflowContext.workflow_vars
            : undefined,
          step.workflow_vars,
        );

        const resolvedVars = { ...mergedVars };
        metadata.variables.forEach((variable) => {
          const hasValue =
            resolvedVars[variable.name] !== undefined &&
            resolvedVars[variable.name] !== null &&
            resolvedVars[variable.name] !== '';

          if (!hasValue && variable.default !== undefined) {
            resolvedVars[variable.name] = variable.default;
          }
        });

        const invalidVars = metadata.variables
          .filter((variable) => resolvedVars[variable.name] !== undefined)
          .filter((variable) =>
            !this.isWorkflowVariableTypeValid(
              resolvedVars[variable.name],
              variable.type,
            ),
          );

        const missingVars = metadata.variables
          .filter((variable) => variable.required)
          .filter((variable) => {
            const hasValue =
              resolvedVars[variable.name] !== undefined &&
              resolvedVars[variable.name] !== null &&
              resolvedVars[variable.name] !== '';
            return !hasValue;
          });

        if (invalidVars.length > 0) {
          return this.buildInvalidWorkflowVariableClarificationResult(
            clarifiedTask,
            step,
            metadata,
            resolvedVars,
            invalidVars.map((variable) => ({
              name: variable.name,
              type: variable.type,
              description: variable.description,
            })),
          );
        }

        if (missingVars.length > 0) {
          return this.buildWorkflowClarificationResult(
            clarifiedTask,
            step,
            metadata,
            resolvedVars,
            missingVars.map((variable) => variable.name),
          );
        }

        // Re-interpolate display steps with the final resolved variables
        const displaySteps = step.display_steps
          ? this.interpolateWorkflowDisplaySteps(step.display_steps, resolvedVars)
          : undefined;

        return {
          ...step,
          description: this.buildWorkflowExecutionSummary(
            metadata.name,
            resolvedVars,
          ),
          workflow_vars: resolvedVars,
          workflow_var_definitions: this.cloneWorkflowVariableDefinitions(
            metadata.variables,
          ),
          display_steps: displaySteps,
        };
      }),
    );

    const clarificationResult = validatedSteps.find(
      (step): step is Exclude<OrchestratorPlanResult, { kind: 'plan' }> =>
        (step as OrchestratorPlanResult).kind === 'needs_clarification',
    );

    if (clarificationResult) {
      return clarificationResult;
    }

    return {
      kind: 'plan',
      plan: {
        ...plan,
        steps: validatedSteps as ExecutionStep[],
      },
    };
  }

  private buildWorkflowClarificationResult(
    clarifiedTask: ClarifiedTask,
    step: ExecutionStep,
    metadata: WorkflowMetadata,
    workflowVars: Record<string, any>,
    missingVars: string[],
  ): OrchestratorPlanResult {
    const missingVarDescriptions = metadata.variables
      .filter((variable) => missingVars.includes(variable.name))
      .map((variable) => `${variable.name}: ${variable.description}`);
    const knownValuesSummary = this.describeKnownWorkflowValues(
      workflowVars,
      missingVars,
    );

    const questionText =
      missingVars.length === 1
        ? `I can use the ${metadata.name} workflow, but I still need ${missingVars[0]}. ${missingVarDescriptions[0]}. ${knownValuesSummary} What should I use?`
        : `I can use the ${metadata.name} workflow, but I still need these required inputs: ${missingVarDescriptions.join('; ')}. ${knownValuesSummary} Please provide them so I can finish the plan.`;

    return {
      kind: 'needs_clarification',
      clarification: {
        original_input: clarifiedTask.original_input,
        clarified_goal: 'REQUIRES_USER_CLARIFICATION',
        constraints: clarifiedTask.constraints,
        assumptions: clarifiedTask.assumptions,
        task_type: clarifiedTask.task_type,
        questions_asked: 1,
        question: {
          id: 'workflow_missing_vars',
          question: questionText,
          type: 'text',
          required: true,
        },
      },
      workflow_context: {
        workflow_name: step.workflow_name!,
        workflow_vars: workflowVars,
        missing_vars: missingVars,
      },
    };
  }

  private buildUnknownWorkflowClarificationResult(
    clarifiedTask: ClarifiedTask,
    step: ExecutionStep,
    errorMessage: string,
  ): OrchestratorPlanResult {
    return {
      kind: 'needs_clarification',
      clarification: {
        original_input: clarifiedTask.original_input,
        clarified_goal: 'REQUIRES_USER_CLARIFICATION',
        constraints: clarifiedTask.constraints,
        assumptions: clarifiedTask.assumptions,
        task_type: clarifiedTask.task_type,
        questions_asked: 1,
        question: {
          id: 'workflow_not_found',
          question: `I tried to plan this with the workflow "${step.workflow_name}", but that workflow is not available right now. ${errorMessage}. Please restate the task details so I can pick the correct workflow.`,
          type: 'text',
          required: true,
        },
      },
      workflow_context: {
        workflow_name: step.workflow_name!,
        workflow_vars: step.workflow_vars || {},
      },
    };
  }

  private buildInvalidWorkflowVariableClarificationResult(
    clarifiedTask: ClarifiedTask,
    step: ExecutionStep,
    metadata: WorkflowMetadata,
    workflowVars: Record<string, any>,
    invalidVars: Array<{ name: string; type: string; description: string }>,
  ): OrchestratorPlanResult {
    const invalidDescriptions = invalidVars.map(
      (variable) =>
        `${variable.name} is currently ${this.describeWorkflowValue(
          workflowVars[variable.name],
        )} but should be a ${variable.type} (${variable.description})`,
    );
    const knownValuesSummary = this.describeKnownWorkflowValues(
      workflowVars,
      invalidVars.map((variable) => variable.name),
    );

    return {
      kind: 'needs_clarification',
      clarification: {
        original_input: clarifiedTask.original_input,
        clarified_goal: 'REQUIRES_USER_CLARIFICATION',
        constraints: clarifiedTask.constraints,
        assumptions: clarifiedTask.assumptions,
        task_type: clarifiedTask.task_type,
        questions_asked: 1,
        question: {
          id: 'workflow_invalid_vars',
          question: `I can use the ${metadata.name} workflow, but these values need to be corrected: ${invalidDescriptions.join('; ')}. ${knownValuesSummary} Please provide the corrected value${invalidVars.length > 1 ? 's' : ''}.`,
          type: 'text',
          required: true,
        },
      },
      workflow_context: {
        workflow_name: step.workflow_name!,
        workflow_vars: workflowVars,
        missing_vars: invalidVars.map((variable) => variable.name),
      },
    };
  }

  private isWorkflowVariableTypeValid(
    value: any,
    expectedType: 'string' | 'number' | 'boolean' | 'object',
  ): boolean {
    if (value === null || value === undefined) {
      return true;
    }

    if (expectedType === 'object') {
      return typeof value === 'object' && !Array.isArray(value);
    }

    return typeof value === expectedType;
  }

  private mergeWorkflowVariables(
    storedWorkflowVars?: Record<string, any>,
    stepWorkflowVars?: Record<string, any>,
  ): Record<string, any> {
    const mergedVars = {
      ...(storedWorkflowVars || {}),
    };

    Object.entries(stepWorkflowVars || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      mergedVars[key] = value;
    });

    return mergedVars;
  }

  private buildWorkflowSelectionContextFromPlan(
    plan: ExecutionPlan,
  ): WorkflowSelectionContext | null {
    const workflowStep = plan.steps.find(
      (step) => step.type === 'workflow' && step.workflow_name,
    );

    if (!workflowStep?.workflow_name) {
      return null;
    }

    return {
      workflow_name: workflowStep.workflow_name,
      workflow_vars: workflowStep.workflow_vars || {},
    };
  }

  private describeKnownWorkflowValues(
    workflowVars: Record<string, any>,
    excludedKeys: string[],
  ): string {
    const knownValues = Object.entries(workflowVars)
      .filter(
        ([key, value]) =>
          !excludedKeys.includes(key) &&
          value !== undefined &&
          value !== null &&
          value !== '',
      )
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`);

    if (knownValues.length === 0) {
      return '';
    }

    return `Known so far: ${knownValues.join(', ')}.`;
  }

  private describeWorkflowValue(value: any): string {
    if (value === undefined) {
      return 'undefined';
    }

    if (value === null) {
      return 'null';
    }

    return JSON.stringify(value);
  }

  private async enrichPlanWithWorkflowDisplaySteps(
    plan: ExecutionPlan,
  ): Promise<ExecutionPlan> {
    const workflowMetadataCache = new Map<string, WorkflowMetadata | null>();

    const steps = await Promise.all(
      plan.steps.map(async (step) => {
        if (step.type !== 'workflow' || !step.workflow_name) {
          return step;
        }

        const metadata = await this.getWorkflowMetadataForDisplay(
          step.workflow_name,
          workflowMetadataCache,
        );

        if (!metadata) {
          return step;
        }

        const displaySteps =
          metadata.user_steps && metadata.user_steps.length > 0
            ? this.interpolateWorkflowDisplaySteps(metadata.user_steps, step.workflow_vars || {})
            : undefined;

        return {
          ...step,
          description: this.buildWorkflowExecutionSummary(
            metadata.name,
            step.workflow_vars || {},
          ),
          display_steps: displaySteps && displaySteps.length > 0 ? displaySteps : undefined,
          workflow_var_definitions: this.cloneWorkflowVariableDefinitions(
            metadata.variables,
          ),
        };
      }),
    );

    return {
      ...plan,
      steps,
    };
  }

  /**
   * Interpolate workflow display steps with actual variable values
   * @param userSteps - Original user steps from workflow metadata
   * @param workflowVars - Actual variable values
   * @returns Interpolated display steps
   */
  private interpolateWorkflowDisplaySteps(
    userSteps: WorkflowUserStep[],
    workflowVars: Record<string, any>,
  ): WorkflowUserStep[] {
    return this.sortWorkflowDisplaySteps(
      userSteps.map((step) => ({
        ...step,
        title: step.titleTemplate
          ? this.interpolateTemplate(step.titleTemplate, workflowVars)
          : step.title,
        description: step.descriptionTemplate
          ? this.interpolateTemplate(step.descriptionTemplate, workflowVars)
          : step.description,
      })),
    );
  }

  /**
   * Interpolate a template string with variable values
   * @param template - Template string with {variableName} placeholders
   * @param vars - Variable values
   * @returns Interpolated string
   */
  private interpolateTemplate(
    template: string,
    vars: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      const value = vars[varName];
      if (value === undefined || value === null) {
        return match; // Keep placeholder if variable not found
      }
      return String(value);
    });
  }

  private async getWorkflowMetadataForDisplay(
    workflowName: string,
    cache: Map<string, WorkflowMetadata | null>,
  ): Promise<WorkflowMetadata | null> {
    if (cache.has(workflowName)) {
      return cache.get(workflowName) ?? null;
    }

    try {
      const metadata = await this.workflowService.readWorkflow(workflowName);
      cache.set(workflowName, metadata);
      return metadata;
    } catch (error) {
      this.logger.warn(
        `Unable to load workflow metadata for display steps (${workflowName}): ${error.message}`,
      );
      cache.set(workflowName, null);
      return null;
    }
  }

  private cloneWorkflowVariableDefinitions(
    variables: WorkflowVariable[],
  ): WorkflowVariable[] {
    return variables.map((variable) => ({ ...variable }));
  }

  private sortWorkflowDisplaySteps(
    userSteps: WorkflowUserStep[],
  ): WorkflowUserStep[] {
    return userSteps
      .map((step, originalIndex) => ({ step, originalIndex }))
      .sort((left, right) => {
        const leftNumber = left.step.step_number;
        const rightNumber = right.step.step_number;

        if (leftNumber !== undefined && rightNumber !== undefined) {
          return leftNumber - rightNumber;
        }

        if (leftNumber !== undefined) {
          return -1;
        }

        if (rightNumber !== undefined) {
          return 1;
        }

        return left.originalIndex - right.originalIndex;
      })
      .map(({ step }) => step);
  }

  private buildWorkflowExecutionSummary(
    workflowName: string,
    workflowVars: Record<string, any> = {},
  ): string {
    const providedEntries = Object.entries(workflowVars).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    );

    if (providedEntries.length === 0) {
      return `Run ${workflowName} workflow.`;
    }

    const renderedEntries = providedEntries.map(
      ([key, value]) => `${key} ${this.describeWorkflowValue(value)}`,
    );

    if (renderedEntries.length === 1) {
      return `Run ${workflowName} workflow with ${renderedEntries[0]}.`;
    }

    return `Run ${workflowName} workflow with ${this.joinDisplayNames(renderedEntries)}.`;
  }

  private joinDisplayNames(names: string[]): string {
    if (names.length === 1) {
      return names[0];
    }

    if (names.length === 2) {
      return `${names[0]} and ${names[1]}`;
    }

    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  }

  private ensureSentence(text: string): string {
    const normalizedText = text.trim();

    if (!normalizedText) {
      return 'Execute the workflow and produce the expected result.';
    }

    return /[.!?]$/.test(normalizedText)
      ? normalizedText
      : `${normalizedText}.`;
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

  /**
   * Infer provider from model string for backward compatibility
   * Used when modelConfig.provider is not available
   */
  private inferProviderFromModel(model: string): string {
    // Groq models: openai/gpt-oss-*, meta-llama/llama-*
    if (
      model.includes('gpt-oss') || 
      model.includes('llama-') ||
      model.startsWith('openai/') ||
      model.startsWith('meta-llama/')
    ) {
      return 'groq';
    }
    
    // Google models: gemini-*
    if (model.startsWith('gemini-') || model.includes('gemini')) {
      return 'google';
    }
    
    // OpenRouter models: typically have :free suffix or nvidia/ prefix
    if (model.includes(':free') || model.startsWith('nvidia/')) {
      return 'openrouter';
    }
    
    // Default to Bytez for anthropic/*, qwen/*, etc.
    return 'bytez';
  }
}
