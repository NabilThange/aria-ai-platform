import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentResult } from '../base/base.agent';
import { SharedStateService } from '../../shared-state/shared-state.service';
import { WorkflowService } from '../../services/workflow.service';
import { ExecutionStep } from '../orchestrator/orchestrator.types';
import { MessagesService } from '../../messages/messages.service';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { AGENT_MODELS } from '../../config/agents.config';

/**
 * WorkflowAgent - Executes pre-built workflows
 * Model: Groq GPT-OSS-20B (fast, no reasoning needed)
 * 
 * Responsibilities:
 * - Receive workflow assignment from Orchestrator
 * - Load and validate workflow
 * - Fill in workflow variables from context
 * - Execute workflow
 * - Return result to Orchestrator
 * 
 * Does NOT:
 * - Decide which workflow to use (Orchestrator's job)
 * - Do anything outside of running assigned workflow
 */
@Injectable()
export class WorkflowAgent extends BaseAgent {
  private readonly model = AGENT_MODELS.WORKFLOW;

  constructor(
    sharedState: SharedStateService,
    private readonly workflowService: WorkflowService,
    private readonly messagesService: MessagesService,
    private readonly browserLogger: BrowserLoggerService,
  ) {
    super(sharedState, 'WorkflowAgent');
  }

  /**
   * Execute a workflow step
   * @param input - ExecutionStep from Orchestrator with workflow_name and workflow_vars
   * @param taskId - Task ID for shared state access
   */
  async run(input: any, taskId: string): Promise<AgentResult> {
    try {
      this.logger.log(`🔧 Executing workflow step for task ${taskId}`);

      const step = input as ExecutionStep;

      // Validate step has workflow information
      if (!step.workflow_name) {
        throw new Error('Workflow step missing workflow_name field');
      }

      this.logger.log(`   Workflow: ${step.workflow_name}`);
      this.logger.log(`   Variables: ${JSON.stringify(step.workflow_vars || {})}`);

      // LOG AGENT START TO BROWSER
      this.browserLogger.logAgentStart(taskId, 'WORKFLOW_AGENT', {
        systemPrompt: 'Workflow Agent - Executes pre-built workflows',
        userPrompt: `Execute workflow: ${step.workflow_name}`,
        context: {
          workflowName: step.workflow_name,
          workflowVars: step.workflow_vars || {},
          stepDescription: step.description,
        },
      });

      // Read workflow metadata to understand what variables are needed
      const metadata = await this.workflowService.readWorkflow(step.workflow_name);
      this.logger.log(`   Workflow metadata loaded: ${metadata.description}`);
      this.logger.log(`   Required variables: ${metadata.variables.filter(v => v.required).map(v => v.name).join(', ')}`);

      // Prepare variables - merge provided vars with context from shared state
      const variables = await this.prepareVariables(
        step.workflow_name,
        step.workflow_vars || {},
        metadata.variables,
        taskId,
      );

      this.logger.log(`   Final variables: ${JSON.stringify(variables)}`);

      // Execute workflow
      const startTime = Date.now();
      const result = await this.workflowService.runWorkflow(
        step.workflow_name,
        variables,
        taskId,
      );
      const duration = Date.now() - startTime;

      // LOG AGENT RESPONSE TO BROWSER
      this.browserLogger.logAgentResponse(taskId, 'WORKFLOW_AGENT', {
        model: this.model.model,
        provider: this.model.provider,
        contentBlocks: [{
          type: 'workflow_result',
          workflowName: step.workflow_name,
          success: result.success,
          duration,
          result: result.data,
          error: result.error,
        }],
        tokenUsage: { totalTokens: 0 }, // Workflows don't use tokens
      });

      // Save workflow result as message
      await this.messagesService.createAgentActionMessage(
        taskId,
        'WORKFLOW',
        'workflow_execution',
        {
          workflow_name: step.workflow_name,
          variables,
          result: result.data,
          success: result.success,
          error: result.error,
        },
      );

      // Log to action history
      await this.appendToHistory(taskId, {
        agent: 'WORKFLOW',
        action: `execute_workflow:${step.workflow_name}`,
        result: result.success ? 'success' : 'failure',
        timestamp: new Date().toISOString(),
        details: {
          workflow_name: step.workflow_name,
          duration,
          variables,
          result: result.data,
          error: result.error,
        },
      });

      if (!result.success) {
        this.logger.error(`❌ Workflow execution failed: ${result.error || result.message}`);
        return {
          success: false,
          error: result.error || result.message || 'Workflow execution failed',
        };
      }

      this.logger.log(`✅ Workflow executed successfully in ${duration}ms`);

      return {
        success: true,
        data: {
          workflow_name: step.workflow_name,
          result: result.data,
          message: result.message,
          duration,
        },
        tokensUsed: 0, // Workflows don't use LLM tokens
        cost: 0,
      };
    } catch (error) {
      this.logger.error(`Workflow step execution failed: ${error.message}`);
      this.logger.error(error.stack);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Prepare workflow variables by filling in missing values from context
   * @param workflowName - Name of the workflow
   * @param providedVars - Variables provided in the step
   * @param requiredVars - Variable definitions from workflow metadata
   * @param taskId - Task ID for shared state access
   */
  private async prepareVariables(
    workflowName: string,
    providedVars: Record<string, any>,
    requiredVars: any[],
    taskId: string,
  ): Promise<Record<string, any>> {
    const variables = { ...providedVars };

    // Check for missing required variables
    for (const varDef of requiredVars) {
      if (varDef.required && !(varDef.name in variables)) {
        // Try to fill from shared state or context
        const contextValue = await this.tryFillFromContext(varDef.name, taskId);
        
        if (contextValue !== null) {
          this.logger.log(`   Filled variable "${varDef.name}" from context: ${contextValue}`);
          variables[varDef.name] = contextValue;
        } else if (varDef.default !== undefined) {
          this.logger.log(`   Using default value for "${varDef.name}": ${varDef.default}`);
          variables[varDef.name] = varDef.default;
        } else {
          throw new Error(
            `Missing required variable "${varDef.name}" for workflow "${workflowName}". ` +
            `Description: ${varDef.description}`,
          );
        }
      }
    }

    return variables;
  }

  /**
   * Try to fill a variable from shared state or context
   * @param varName - Variable name to fill
   * @param taskId - Task ID for shared state access
   */
  private async tryFillFromContext(
    varName: string,
    taskId: string,
  ): Promise<any> {
    // Try common context keys
    const contextKeys = [
      varName, // Direct match
      `workflow_${varName}`, // Prefixed
      `context_${varName}`, // Prefixed
    ];

    for (const key of contextKeys) {
      const value = await this.readState(taskId, key);
      if (value !== null) {
        return value;
      }
    }

    // Try to extract from task goal or clarified task
    const taskGoal = await this.readState<any>(taskId, 'task_goal');
    if (taskGoal) {
      // Check if variable name matches any field in task goal
      if (varName in taskGoal) {
        return taskGoal[varName];
      }
    }

    return null;
  }
}
