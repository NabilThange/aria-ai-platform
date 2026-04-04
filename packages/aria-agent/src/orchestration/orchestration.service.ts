import {
  BadRequestException,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SharedStateService } from '../shared-state/shared-state.service';
import { ExecutionPlan, ExecutionStep } from '../agents/orchestrator/orchestrator.types';
import { ClarifierAgent } from '../agents/clarifier/clarifier.agent';
import { OrchestratorAgent } from '../agents/orchestrator/orchestrator.agent';
import { WebAgent } from '../agents/web/web.agent';
import { DesktopAgent } from '../agents/desktop/desktop.agent';
import { WorkflowAgent } from '../agents/workflow/workflow.agent';
import { VerifierAgent } from '../agents/verifier/verifier.agent';
import { RecoveryAgent } from '../agents/recovery/recovery.agent';
import { ReporterAgent } from '../agents/reporter/reporter.agent';
import { TaskLogger } from '../logger/task-logger';
import { AgentLoggerService } from '../logger/agent-logger.service';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatus } from '@prisma/client';
import { PinchTabService } from '../services/pinchtab.service';
import { WorkflowService } from '../services/workflow.service';
import { MessagesService } from '../messages/messages.service';
import {
  WorkflowMetadata,
  WorkflowUserStep,
  WorkflowVariable,
} from '../workflows/workflow.interface';

/**
 * OrchestrationService - Raw sequential pipeline for multi-agent orchestration
 * No framework - just plain NestJS service with async/await
 * 
 * Pipeline: Clarifier → Orchestrator → Web/Desktop/Workflow → Verifier loop → Reporter
 * EventEmitter2 is used ONLY for UI notifications, NOT for agent handoffs
 */
@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly clarifier: ClarifierAgent,
    private readonly orchestrator: OrchestratorAgent,
    private readonly webAgent: WebAgent,
    private readonly desktopAgent: DesktopAgent,
    private readonly workflowAgent: WorkflowAgent,
    private readonly verifier: VerifierAgent,
    private readonly recovery: RecoveryAgent,
    private readonly reporter: ReporterAgent,
    private readonly sharedState: SharedStateService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pinchTabService: PinchTabService,
    private readonly workflowService: WorkflowService,
    private readonly agentLogger: AgentLoggerService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {
    // Listen for task cleanup events
    this.eventEmitter.on('task.cleanup', async (payload: { taskId: string }) => {
      await this.cleanupTaskResources(payload.taskId);
    });

    // Listen for plan approval events
    this.eventEmitter.on('plan.approved', async (payload: { taskId: string; approvedPlan: any[] }) => {
      this.logger.log(`Plan approved event received for task ${payload.taskId}`);
      await this.approvePlan(payload.taskId, payload.approvedPlan);
    });
  }

  async run(userInput: string, taskId: string, taskModel?: any): Promise<void> {
    const log = new TaskLogger(OrchestrationService.name, taskId, 'ORCHESTRATOR');
    const startTime = Date.now();

    // Use AgentLoggerService for structured user request logging
    this.agentLogger.logUserRequest({
      taskId,
      userInput,
      timestamp: new Date().toISOString(),
    });

    log.info({ event: 'orchestration.started', inputLength: userInput.length, model: taskModel?.name }, 'Multi-agent orchestration started');

    try {
      if (taskModel) {
        await this.sharedState.set(taskId, 'task_model', taskModel);
        log.debug({ event: 'task_model.stored', model: taskModel.name, provider: taskModel.provider }, 'Task model stored');
      }

      await this.onStart(taskId);

      // Phase 1: Clarification
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 1: CLARIFICATION]`);
      this.logger.log(`Agent: CLARIFIER`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'clarification', agent: 'CLARIFIER' }, 'Phase 1: Clarification');
      this.emitStatus(taskId, 'clarifying', 'CLARIFIER');

      // Load accumulated Q&A history from shared state (built up over multiple rounds)
      const clarificationHistory = await this.sharedState.get<any[]>(taskId, 'clarification_history') || [];
      
      this.logger.log(`Input to Clarifier: "${userInput}" (history turns: ${clarificationHistory.length})`);
      const clarified = await this.clarifier.run({ userInput, history: clarificationHistory }, taskId);
      this.logger.log(`Output from Clarifier:`);
      this.logger.log(JSON.stringify(clarified.data, null, 2));
      this.logger.log(`Tokens Used: ${clarified.tokensUsed || 0} | Cost: $${(clarified.cost || 0).toFixed(6)}`);
      
      await this.sharedState.set(taskId, 'task_goal', clarified.data);

      const clarifiedTask = clarified.data as any;
      if (clarifiedTask.questions_asked === 1 && clarifiedTask.clarified_goal?.startsWith('REQUIRES_USER_CLARIFICATION')) {
        // Task needs clarification - question is already saved as a message by ClarifierAgent
        await this.sharedState.set(taskId, 'status', 'needs_clarification');
        this.emitStatus(taskId, 'needs_clarification', null);
        
        log.warn({ 
          event: 'task.paused', 
          reason: 'clarification_needed', 
          round: clarificationHistory.length + 1,
          question: clarifiedTask.question?.question,
        }, `Task paused — waiting for user answer (round ${clarificationHistory.length + 1})`);
        
        this.logger.warn(`[!] CLARIFICATION NEEDED (round ${clarificationHistory.length + 1}): ${clarifiedTask.question?.question}`);
        this.logger.log(`[PAUSED] Task paused - waiting for user response in chat\n`);
        
        // Update task status to NEEDS_HELP and take over control
        await this.tasksService.update(taskId, {
          status: TaskStatus.NEEDS_HELP,
        });
        await this.tasksService.takeOver(taskId);
        
        return;
      }

      // Phase 2: Planning
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 2: PLANNING]`);
      this.logger.log(`Agent: ORCHESTRATOR`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'planning', agent: 'ORCHESTRATOR' }, 'Phase 2: Planning');
      this.emitStatus(taskId, 'planning', 'ORCHESTRATOR');
      
      this.logger.log(`Input to Orchestrator: Clarified goal`);
      const planningResult = await this.orchestrator.plan(clarified.data, taskId);

      if (planningResult.kind === 'needs_clarification') {
        await this.sharedState.set(taskId, 'status', 'needs_clarification');
        this.emitStatus(taskId, 'needs_clarification', null);

        log.warn({
          event: 'task.paused',
          reason: 'workflow_clarification_needed',
          question: planningResult.clarification.question?.question,
          workflow: planningResult.workflow_context.workflow_name,
        }, 'Task paused - workflow clarification required before approval');

        this.logger.warn(
          `[!] WORKFLOW CLARIFICATION NEEDED: ${planningResult.clarification.question?.question}`,
        );
        this.logger.log(`[PAUSED] Task paused - waiting for user response in chat\n`);

        await this.tasksService.update(taskId, {
          status: TaskStatus.NEEDS_HELP,
        });
        await this.tasksService.takeOver(taskId);

        return;
      }

      const plan = planningResult.plan;
      this.logger.log(`Output from Orchestrator: Execution plan created`);

      if (!plan?.steps?.length) {
        throw new Error('Orchestrator returned empty plan - cannot proceed');
      }

      const webSteps = plan.steps.filter(s => s.type === 'web').length;
      const desktopSteps = plan.steps.filter(s => s.type === 'desktop').length;
      const workflowSteps = plan.steps.filter(s => s.type === 'workflow').length;
      
      this.logger.log(`Plan Summary:`);
      this.logger.log(`   Total Steps: ${plan.steps.length}`);
      this.logger.log(`   Web Steps: ${webSteps}`);
      this.logger.log(`   Desktop Steps: ${desktopSteps}`);
      this.logger.log(`\nExecution Steps:`);
      plan.steps.forEach((step, i) => {
        this.logger.log(`   ${i + 1}. [${step.type.toUpperCase()}] ${step.id}: ${step.description}`);
      });
      
      log.info({
        event: 'plan.created',
        totalSteps: plan.steps.length,
        webSteps,
        desktopSteps,
        workflowSteps,
        steps: plan.steps.map((s, i) => ({ index: i + 1, id: s.id, type: s.type, description: s.description })),
      }, `Execution plan created with ${plan.steps.length} steps`);

      await this.sharedState.set(taskId, 'execution_plan', plan.steps);

      // The plan message is created in orchestrator.agent.ts, no need to duplicate here

      // Check if auto-approval is enabled via env variable OR if it's a simple 1-step non-workflow plan
      const isEnvAutoApprove = process.env.AUTO_APPROVE_PLAN === 'true';
      const isSimplePlan = plan.steps.length === 1 && plan.complexity === 'simple';
      const hasWorkflowStep = workflowSteps > 0;
      const autoApprovePlan =
        isEnvAutoApprove || (isSimplePlan && !hasWorkflowStep);
      
      // DEBUG: Log the approval decision
      this.logger.log(`\n[APPROVAL CHECK] AUTO_APPROVE_PLAN=${process.env.AUTO_APPROVE_PLAN}, isEnvAutoApprove=${isEnvAutoApprove}, steps=${plan.steps.length}, complexity=${plan.complexity}, isSimplePlan=${isSimplePlan}, hasWorkflowStep=${hasWorkflowStep}, autoApprovePlan=${autoApprovePlan}`);
      
      if (autoApprovePlan) {
        // AUTO-APPROVE: Skip user approval and proceed directly to execution
        if (isSimplePlan && !isEnvAutoApprove) {
          this.logger.log(`\n[AUTO-APPROVED] Simple 1-step plan auto-approved - proceeding to execution...`);
        } else {
          this.logger.log(`\n[AUTO-APPROVED] Plan auto-approved via env settings - proceeding to execution...`);
        }
        log.info({ event: 'plan.auto_approved', totalSteps: plan.steps.length, isSimplePlan }, 'Plan auto-approved - proceeding to execution');
        
        // Continue to Phase 3 (Execution) without pausing
        // The execution code below will run immediately
      } else {
        // PAUSE FOR USER APPROVAL
        this.logger.log(`\n[PAUSED] Waiting for user to approve or edit plan...`);
        await this.sharedState.set(taskId, 'status', 'awaiting_plan_approval');
        this.emitStatus(taskId, 'awaiting_plan_approval', null);
        
        // Update task status to NEEDS_HELP (reusing existing status for UI compatibility)
        await this.tasksService.update(taskId, {
          status: TaskStatus.NEEDS_HELP,
        });
        
        log.info({ event: 'plan.awaiting_approval', totalSteps: plan.steps.length }, 'Plan awaiting user approval');
        
        // Exit here - execution will resume when user approves via approvePlan()
        return;
      }

      // Phase 3: Execution (will be reached via approvePlan() method)
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 3: EXECUTION]`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'execution' }, 'Phase 3: Execution');
      let stepIndex = 0;
      while (stepIndex < plan.steps.length) {
        // CHECK MANUAL CONTROL: Pause if operator has stopped the agent
        await this.waitForManualControlRelease(taskId);
        
        const step = plan.steps[stepIndex];
        await this.sharedState.set(taskId, 'current_step', step.id);

        this.logger.log(`\n${'.'.repeat(80)}`);
        this.logger.log(`[STEP ${stepIndex + 1}/${plan.steps.length}] ${step.id}`);
        this.logger.log(
          `Agent: ${
            step.type === 'workflow'
              ? 'WORKFLOW_AGENT'
              : step.type === 'web'
                ? 'WEB_AGENT'
                : 'DESKTOP_AGENT'
          }`,
        );
        this.logger.log(`Description: ${step.description}`);
        this.logger.log(`Success Criteria: ${step.success_criteria}`);
        if (step.context) {
          this.logger.log(`Context: ${JSON.stringify(step.context)}`);
        }
        this.logger.log(`${'.'.repeat(80)}`);

        const stepLog = new TaskLogger(OrchestrationService.name, taskId, step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP'));
        stepLog.info({ event: 'step.started', stepId: step.id, stepIndex: stepIndex + 1, totalSteps: plan.steps.length, stepType: step.type, description: step.description }, `Step ${stepIndex + 1}/${plan.steps.length} started`);

        let attempts = 0;
        let success = false;
        let replanRequested = false;

        while (!success && attempts < 4 && !replanRequested) {
          attempts++;
          const agentName = step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP');
          const attemptStart = Date.now();

          this.logger.log(`\n   [Attempt ${attempts}/4]`);
          this.logger.log(`   Executing with ${agentName}_AGENT...`);

          this.emitStatus(taskId, 'executing', agentName);
          stepLog.debug({ event: 'step.attempt', stepId: step.id, attempt: attempts, maxAttempts: 4, agent: agentName }, `Attempt ${attempts}/4`);

          let result: any;
          
          // Handle workflow steps
          if (step.type === 'workflow') {
            this.logger.log(`   Executing WORKFLOW: ${step.workflow_name}`);
            this.emitStatus(taskId, 'executing_workflow', step.workflow_name || 'unknown');
            
            const workflowResult = await this.workflowService.runWorkflow(
              step.workflow_name!,
              step.workflow_vars!,
              taskId
            );
            
            // Convert workflow result to agent result format
            result = {
              action: workflowResult.success ? 'workflow_completed' : 'workflow_failed',
              details: workflowResult.data || {},
              error: workflowResult.error,
              message: workflowResult.message,
            };
            
            this.logger.log(`   WORKFLOW Output:`);
            this.logger.log(`      Success: ${workflowResult.success}`);
            this.logger.log(`      Message: ${workflowResult.message}`);
            if (workflowResult.data) {
              this.logger.log(`      Data: ${JSON.stringify(workflowResult.data).substring(0, 200)}...`);
            }
          } else {
            // Handle regular web/desktop steps
            result = step.type === 'web'
              ? await this.webAgent.execute(step, taskId)
              : await this.desktopAgent.execute(step, taskId);
          }

          this.logger.log(`   ${agentName}_AGENT Output:`);
          this.logger.log(`      Action: ${result.action}`);
          if (result.details) {
            this.logger.log(`      Details: ${JSON.stringify(result.details).substring(0, 200)}...`);
          }
          if ((result as any).tokensUsed) {
            this.logger.log(`      Tokens: ${(result as any).tokensUsed} | Cost: $${((result as any).cost || 0).toFixed(6)}`);
          }

          this.logger.log(`\n   Verifying with VERIFIER_AGENT...`);
          this.emitStatus(taskId, 'verifying', 'VERIFIER');
          const verification = await this.verifier.check(result, taskId);
          
          this.logger.log(`   VERIFIER_AGENT Output:`);
          this.logger.log(`      Success: ${verification.action_succeeded}`);
          if (verification.error_message) {
            this.logger.log(`      Error: ${verification.error_message}`);
          }

          if (verification.action_succeeded) {
            success = true;
            this.logger.log(`\n   [OK] Step ${stepIndex + 1} COMPLETED successfully in ${Date.now() - attemptStart}ms`);
            await this.sharedState.appendToArray(taskId, 'action_history', {
              agent: agentName, action: result.action, result: 'success',
              timestamp: new Date().toISOString(), details: result.details,
            });
            stepLog.canonical({ event: 'step.completed', stepId: step.id, attempt: attempts, durationMs: Date.now() - attemptStart, outcome: 'success' });
          } else {
            this.logger.warn(`\n   [FAIL] Step ${stepIndex + 1} FAILED on attempt ${attempts}`);
            this.logger.warn(`      Error: ${verification.error_message}`);
            
            stepLog.warn({ event: 'step.attempt_failed', stepId: step.id, attempt: attempts, error: verification.error_message }, `Step attempt failed`);
            await this.sharedState.appendToArray(taskId, 'failure_log', {
              step: step.id, attempt: attempts, error: verification.error_message, timestamp: new Date().toISOString(),
            });

            if (attempts === 1) {
              this.logger.warn(`   [L1] ESCALATION L1: Retrying with different approach...`);
              stepLog.warn({ event: 'escalation.retry', stepId: step.id, level: 1 }, 'Escalation L1: retrying with different approach');
              continue;
            } else if (attempts === 2) {
              this.logger.warn(`   [L2] ESCALATION L2: Calling RECOVERY_AGENT...`);
              stepLog.warn({ event: 'escalation.recovery', stepId: step.id, level: 2 }, 'Escalation L2: calling RECOVERY agent');
              this.emitStatus(taskId, 'recovering', 'RECOVERY');
              const recoveryResult = await this.recovery.strategize(step, taskId);
              if (recoveryResult) {
                this.logger.log(`   RECOVERY_AGENT Output:`);
                this.logger.log(`      Strategy: ${recoveryResult?.strategy || 'N/A'}`);
              }
            } else if (attempts === 3) {
              this.logger.warn(`   [L3] ESCALATION L3: Requesting ORCHESTRATOR replan...`);
              stepLog.warn({ event: 'escalation.replan', stepId: step.id, level: 3 }, 'Escalation L3: requesting ORCHESTRATOR replan');
              this.emitStatus(taskId, 'replanning', 'ORCHESTRATOR');
              const newPlan = await this.orchestrator.replan(step, taskId);
              if (newPlan?.steps?.length) {
this.logger.log(`   [OK] Replan successful - restarting with ${newPlan!.steps.length} new steps`);
                plan.steps = newPlan!.steps;
                stepIndex = -1;
                replanRequested = true;
                log.info({ event: 'replan.success', newStepCount: newPlan!.steps.length }, 'Replan successful — restarting from step 1');
                break;
              } else {
                this.logger.error(`   [FAIL] Replan failed - returned empty plan`);
                stepLog.error({ event: 'replan.failed', stepId: step.id }, 'Replan returned empty plan');
              }
            } else if (attempts === 4) {
              this.logger.error(`   [L4] ESCALATION L4: Max attempts exhausted - TASK FAILED`);
              stepLog.error({ event: 'step.exhausted', stepId: step.id, attempts }, 'Step failed after max attempts', new Error(verification.error_message || 'Unknown error'));
              await this.notifyUser(taskId, step, verification.error_message || 'Unknown error');
              throw new Error(`Task ${taskId} failed after 4 attempts on step ${step.id}: ${verification.error_message || 'Unknown error'}`);
            }
          }
        }
        stepIndex++;
      }

      // Phase 4: Reporting
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 4: REPORTING]`);
      this.logger.log(`Agent: REPORTER`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'reporting', agent: 'REPORTER' }, 'Phase 4: Reporting');
      this.emitStatus(taskId, 'reporting', 'REPORTER');
      
      this.logger.log(`Input to Reporter: Full task state from Redis`);
      const reportResult = await this.reporter.summarize(taskId);
      this.logger.log(`Output from Reporter: Summary generated`);
      
      this.emitStatus(taskId, 'completed', null);
      await this.onComplete(taskId);

      const totalDuration = Date.now() - startTime;
      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`[ORCHESTRATION COMPLETED] Task ID: ${taskId}`);
      this.logger.log(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      this.logger.log(`${'='.repeat(80)}\n`);

      log.canonical({
        event: 'orchestration.completed',
        durationMs: totalDuration,
        outcome: 'success',
        model: taskModel?.name,
      });

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      this.logger.error(`\n${'='.repeat(80)}`);
      this.logger.error(`[ORCHESTRATION FAILED] Task ID: ${taskId}`);
      this.logger.error(`Total Duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(2)}s)`);
      this.logger.error(`Error: ${(error as Error).message}`);
      this.logger.error(`${'='.repeat(80)}\n`);
      
      log.canonical({
        event: 'orchestration.failed',
        durationMs: totalDuration,
        outcome: 'failure',
        error: { message: (error as Error).message, stack: (error as Error).stack },
      });
      this.emitStatus(taskId, 'failed', null);
      await this.onFail(taskId, error as Error);
      throw error;
    }
  }


  private async notifyUser(taskId: string, step: any, error: string): Promise<void> {
    await this.sharedState.set(taskId, 'status', 'needs_help');
    await this.sharedState.set(taskId, 'error', {
      step: step.id,
      message: error,
      timestamp: new Date().toISOString(),
    });
    this.emitStatus(taskId, 'needs_help', null);
  }

  private emitStatus(taskId: string, status: string, activeAgent: string | null): void {
    this.eventEmitter.emit('task.status', {
      taskId,
      status,
      activeAgent,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Lifecycle hook: Called when task execution starts
   */
  private async onStart(taskId: string): Promise<void> {
    this.logger.log({ event: 'task.lifecycle.start', taskId }, `Task ${taskId} started`);
    await this.sharedState.set(taskId, 'status', 'running');
    await this.sharedState.set(taskId, 'start_time', new Date().toISOString());
    this.eventEmitter.emit('task.lifecycle.start', { taskId });
  }

  /**
   * Lifecycle hook: Called when task execution completes successfully
   */
  private async onComplete(taskId: string): Promise<void> {
    this.logger.log({ event: 'task.lifecycle.complete', taskId }, `Task ${taskId} completed`);
    await this.sharedState.set(taskId, 'status', 'completed');
    await this.sharedState.set(taskId, 'end_time', new Date().toISOString());
    this.eventEmitter.emit('task.lifecycle.complete', { taskId });
    
    // Cleanup task-scoped resources
    await this.cleanupTaskResources(taskId);
  }

  /**
   * Lifecycle hook: Called when task execution fails
   */
  private async onFail(taskId: string, error: Error): Promise<void> {
    this.logger.error(
      { event: 'task.lifecycle.fail', taskId, error: { message: error.message, stack: error.stack } },
      `Task ${taskId} failed`,
    );
    await this.sharedState.set(taskId, 'status', 'failed');
    await this.sharedState.set(taskId, 'end_time', new Date().toISOString());
    await this.sharedState.set(taskId, 'error', { message: error.message, stack: error.stack, timestamp: new Date().toISOString() });
    this.eventEmitter.emit('task.lifecycle.fail', { taskId, error: error.message });
    
    // Cleanup task-scoped resources
    await this.cleanupTaskResources(taskId);
  }

  /**
   * Cleanup task-scoped resources (PinchTab instances, etc.)
   */
  private async cleanupTaskResources(taskId: string): Promise<void> {
    try {
      this.logger.log(`Cleaning up resources for task ${taskId}`);
      
      // Cleanup PinchTab instance
      await this.pinchTabService.cleanupTask(taskId);
      
      this.logger.log(`Resource cleanup completed for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to cleanup resources for task ${taskId}: ${error.message}`);
      // Don't throw - cleanup is best-effort
    }
  }

  /**
   * Resume execution after user approves/edits plan
   * @param taskId - Task ID
   * @param approvedPlan - User-approved/edited plan steps
   */
  async approvePlan(taskId: string, approvedPlan: any[]): Promise<void> {
    const log = new TaskLogger(OrchestrationService.name, taskId, 'ORCHESTRATOR');
    
    this.logger.log(`\n${'='.repeat(80)}`);
    this.logger.log(`[PLAN APPROVED] Task ID: ${taskId}`);
    this.logger.log(`Approved Steps: ${approvedPlan.length}`);
    this.logger.log(`${'='.repeat(80)}\n`);
    
    log.info({ event: 'plan.approved', stepCount: approvedPlan.length }, 'User approved plan - resuming execution');
    
    try {
      const validatedPlan = await this.validateApprovedPlan(approvedPlan);

      // Update shared state with approved plan
      await this.sharedState.set(taskId, 'execution_plan', validatedPlan);
      await this.sharedState.set(taskId, 'status', 'running');
      
      // Update task status back to IN_PROGRESS
      await this.tasksService.update(taskId, {
        status: TaskStatus.RUNNING,
      });
      
      // Phase 3: Execution
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 3: EXECUTION]`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'execution' }, 'Phase 3: Execution');
      
      const plan = { steps: validatedPlan };
      let stepIndex = 0;
      
      while (stepIndex < plan.steps.length) {
        // CHECK MANUAL CONTROL: Pause if operator has stopped the agent
        await this.waitForManualControlRelease(taskId);
        
        const step = plan.steps[stepIndex];
        await this.sharedState.set(taskId, 'current_step', step.id);

        this.logger.log(`\n${'.'.repeat(80)}`);
        this.logger.log(`[STEP ${stepIndex + 1}/${plan.steps.length}] ${step.id}`);
        this.logger.log(
          `Agent: ${
            step.type === 'workflow'
              ? 'WORKFLOW_AGENT'
              : step.type === 'web'
                ? 'WEB_AGENT'
                : 'DESKTOP_AGENT'
          }`,
        );
        this.logger.log(`Description: ${step.description}`);
        this.logger.log(`Success Criteria: ${step.success_criteria}`);
        if (step.context) {
          this.logger.log(`Context: ${JSON.stringify(step.context)}`);
        }
        this.logger.log(`${'.'.repeat(80)}`);

        const stepLog = new TaskLogger(OrchestrationService.name, taskId, step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP'));
        stepLog.info({ event: 'step.started', stepId: step.id, stepIndex: stepIndex + 1, totalSteps: plan.steps.length, stepType: step.type, description: step.description }, `Step ${stepIndex + 1}/${plan.steps.length} started`);

        let attempts = 0;
        let success = false;
        let replanRequested = false;

        while (!success && attempts < 4 && !replanRequested) {
          attempts++;
          const agentName = step.type === 'workflow' ? 'WORKFLOW' : (step.type === 'web' ? 'WEB' : 'DESKTOP');
          const attemptStart = Date.now();

          this.logger.log(`\n   [Attempt ${attempts}/4]`);
          this.logger.log(`   Executing with ${agentName}_AGENT...`);

          this.emitStatus(taskId, 'executing', agentName);
          stepLog.debug({ event: 'step.attempt', stepId: step.id, attempt: attempts, maxAttempts: 4, agent: agentName }, `Attempt ${attempts}/4`);

          let result: any;
          
          // Read recovery strategy if this is a retry (attempt 2+)
          let recoveryStrategy: any = null;
          if (attempts >= 2) {
            recoveryStrategy = await this.sharedState.get(taskId, 'recovery_strategy');
            if (recoveryStrategy && recoveryStrategy.strategy) {
              this.logger.log(`   📋 Using recovery strategy: ${recoveryStrategy.strategy.substring(0, 100)}...`);
            }
          }
          
          // Read previous step results for context passing
          const previousResults: any[] = await this.sharedState.get(taskId, 'step_results') || [];
          const recentResults = previousResults.slice(-3); // Keep only last 3 step results
          
          if (recentResults.length > 0) {
            this.logger.log(`   📊 Passing ${recentResults.length} previous step results to agent`);
          }
          
          // Handle workflow steps - delegate to Workflow Agent
          if (step.type === 'workflow') {
            this.logger.log(`   Executing WORKFLOW: ${step.workflow_name}`);
            this.emitStatus(taskId, 'executing_workflow', step.workflow_name || 'unknown');
            
            // Call Workflow Agent to handle workflow execution
            const workflowAgentResult = await this.workflowAgent.run(step, taskId);
            
            // Convert workflow agent result to action result format
            result = {
              action: workflowAgentResult.success ? 'workflow_completed' : 'workflow_failed',
              details: workflowAgentResult.data || {},
              error: workflowAgentResult.error,
              message: workflowAgentResult.data?.message,
            };
            
            this.logger.log(`   WORKFLOW_AGENT Output:`);
            this.logger.log(`      Success: ${workflowAgentResult.success}`);
            if (workflowAgentResult.data) {
              this.logger.log(`      Data: ${JSON.stringify(workflowAgentResult.data).substring(0, 200)}...`);
            }
            if (workflowAgentResult.error) {
              this.logger.log(`      Error: ${workflowAgentResult.error}`);
            }
          } else {
            // Handle regular web/desktop steps
            // Note: Recovery strategy is already available in shared state and will be read by agents if needed
            result = step.type === 'web'
              ? await this.webAgent.execute(step, taskId)
              : await this.desktopAgent.execute(step, taskId);
          }

          this.logger.log(`   ${agentName}_AGENT Output:`);
          this.logger.log(`      Action: ${result.action}`);
          if (result.details) {
            this.logger.log(`      Details: ${JSON.stringify(result.details).substring(0, 200)}...`);
          }
          if ((result as any).tokensUsed) {
            this.logger.log(`      Tokens: ${(result as any).tokensUsed} | Cost: ${((result as any).cost || 0).toFixed(6)}`);
          }

          this.logger.log(`\n   Verifying with VERIFIER_AGENT...`);
          this.emitStatus(taskId, 'verifying', 'VERIFIER');
          const verification = await this.verifier.check(result, taskId);
          
          this.logger.log(`   VERIFIER_AGENT Output:`);
          this.logger.log(`      Success: ${verification.action_succeeded}`);
          if (verification.error_message) {
            this.logger.log(`      Error: ${verification.error_message}`);
          }

          if (verification.action_succeeded) {
            success = true;
            this.logger.log(`\n   [OK] Step ${stepIndex + 1} COMPLETED successfully in ${Date.now() - attemptStart}ms`);
            
            // Save step result for passing to next agents
            await this.sharedState.appendToArray(taskId, 'step_results', {
              stepId: step.id,
              stepIndex: stepIndex + 1,
              agent: agentName,
              action: result.action,
              details: result.details,
              timestamp: new Date().toISOString(),
            });
            
            await this.sharedState.appendToArray(taskId, 'action_history', {
              agent: agentName, action: result.action, result: 'success',
              timestamp: new Date().toISOString(), details: result.details,
            });
            stepLog.canonical({ event: 'step.completed', stepId: step.id, attempt: attempts, durationMs: Date.now() - attemptStart, outcome: 'success' });
          } else {
            this.logger.warn(`\n   [FAIL] Step ${stepIndex + 1} FAILED on attempt ${attempts}`);
            this.logger.warn(`      Error: ${verification.error_message}`);
            
            stepLog.warn({ event: 'step.attempt_failed', stepId: step.id, attempt: attempts, error: verification.error_message }, `Step attempt failed`);
            await this.sharedState.appendToArray(taskId, 'failure_log', {
              step: step.id, attempt: attempts, error: verification.error_message, timestamp: new Date().toISOString(),
            });

            if (attempts === 1) {
              this.logger.warn(`   [L1] ESCALATION L1: Retrying with different approach...`);
              stepLog.warn({ event: 'escalation.retry', stepId: step.id, level: 1 }, 'Escalation L1: retrying with different approach');
              continue;
            } else if (attempts === 2) {
              this.logger.warn(`   [L2] ESCALATION L2: Calling RECOVERY_AGENT...`);
              stepLog.warn({ event: 'escalation.recovery', stepId: step.id, level: 2 }, 'Escalation L2: calling RECOVERY agent');
              this.emitStatus(taskId, 'recovering', 'RECOVERY');
              const recoveryResult = await this.recovery.strategize(step, taskId);
              if (recoveryResult) {
                this.logger.log(`   RECOVERY_AGENT Output:`);
                this.logger.log(`      Strategy: ${recoveryResult?.strategy || 'N/A'}`);
                
                // Store recovery strategy for next attempt (limit to 200 chars to avoid context bloat)
                const limitedStrategy = {
                  strategy: recoveryResult.strategy?.substring(0, 200),
                  avoid: recoveryResult.avoid,
                  approach: recoveryResult.approach?.substring(0, 200),
                };
                await this.sharedState.set(taskId, 'recovery_strategy', limitedStrategy);
              }
            } else if (attempts === 3) {
              this.logger.warn(`   [L3] ESCALATION L3: Requesting ORCHESTRATOR replan...`);
              stepLog.warn({ event: 'escalation.replan', stepId: step.id, level: 3 }, 'Escalation L3: requesting ORCHESTRATOR replan');
              this.emitStatus(taskId, 'replanning', 'ORCHESTRATOR');
              const newPlan = await this.orchestrator.replan(step, taskId);
              if (newPlan?.steps?.length) {
this.logger.log(`   [OK] Replan successful - restarting with ${newPlan!.steps.length} new steps`);
                plan.steps = newPlan!.steps;
                stepIndex = -1;
                replanRequested = true;
                log.info({ event: 'replan.success', newStepCount: newPlan!.steps.length }, 'Replan successful — restarting from step 1');
                break;
              } else {
                this.logger.error(`   [FAIL] Replan failed - returned empty plan`);
                stepLog.error({ event: 'replan.failed', stepId: step.id }, 'Replan returned empty plan');
              }
            } else if (attempts === 4) {
              this.logger.error(`   [L4] ESCALATION L4: Max attempts exhausted - TASK FAILED`);
              stepLog.error({ event: 'step.exhausted', stepId: step.id, attempts }, 'Step failed after max attempts', new Error(verification.error_message || 'Unknown error'));
              await this.notifyUser(taskId, step, verification.error_message || 'Unknown error');
              throw new Error(`Task ${taskId} failed after 4 attempts on step ${step.id}: ${verification.error_message || 'Unknown error'}`);
            }
          }
        }
        stepIndex++;
      }

      // Phase 4: Reporting
      this.logger.log(`\n${'-'.repeat(80)}`);
      this.logger.log(`[PHASE 4: REPORTING]`);
      this.logger.log(`Agent: REPORTER`);
      this.logger.log(`${'-'.repeat(80)}`);
      log.info({ event: 'phase.started', phase: 'reporting', agent: 'REPORTER' }, 'Phase 4: Reporting');
      this.emitStatus(taskId, 'reporting', 'REPORTER');
      
      this.logger.log(`Input to Reporter: Full task state from Redis`);
      const reportResult = await this.reporter.summarize(taskId);
      this.logger.log(`Output from Reporter: Summary generated`);
      
      this.emitStatus(taskId, 'completed', null);
      await this.onComplete(taskId);

      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`[ORCHESTRATION COMPLETED] Task ID: ${taskId}`);
      this.logger.log(`${'='.repeat(80)}\n`);

      log.canonical({
        event: 'orchestration.completed',
        outcome: 'success',
      });

    } catch (error) {
      this.logger.error(`\n${'='.repeat(80)}`);
      this.logger.error(`[ORCHESTRATION FAILED] Task ID: ${taskId}`);
      this.logger.error(`Error: ${(error as Error).message}`);
      this.logger.error(`${'='.repeat(80)}\n`);
      
      log.canonical({
        event: 'orchestration.failed',
        outcome: 'failure',
        error: { message: (error as Error).message, stack: (error as Error).stack },
      });
      this.emitStatus(taskId, 'failed', null);
      await this.onFail(taskId, error as Error);
      throw error;
    }
  }

  private async validateApprovedPlan(
    approvedPlan: any[],
  ): Promise<ExecutionStep[]> {
    const validatedSteps = await Promise.all(
      approvedPlan.map(async (rawStep) => {
        const step = rawStep as ExecutionStep;
        if (step.type !== 'workflow' || !step.workflow_name) {
          return step;
        }

        const metadata = await this.workflowService.readWorkflow(step.workflow_name);
        const resolvedVars = this.applyWorkflowDefaults(
          metadata.variables,
          step.workflow_vars || {},
        );

        const missingVars = metadata.variables
          .filter((variable) => variable.required)
          .filter((variable) => !this.hasWorkflowValue(resolvedVars[variable.name]));

        if (missingVars.length > 0) {
          throw new BadRequestException(
            `Workflow "${step.workflow_name}" is missing required input(s): ${missingVars
              .map((variable) => variable.name)
              .join(', ')}`,
          );
        }

        const invalidVars = metadata.variables.filter(
          (variable) =>
            resolvedVars[variable.name] !== undefined &&
            !this.isWorkflowVariableTypeValid(
              resolvedVars[variable.name],
              variable.type,
            ),
        );

        if (invalidVars.length > 0) {
          throw new BadRequestException(
            `Workflow "${step.workflow_name}" has invalid input type(s): ${invalidVars
              .map((variable) => `${variable.name} should be ${variable.type}`)
              .join(', ')}`,
          );
        }

        const displaySteps = this.resolveWorkflowDisplaySteps(
          step,
          metadata,
          resolvedVars,
        );

        return {
          ...step,
          description: this.buildWorkflowExecutionSummary(
            step.workflow_name,
            resolvedVars,
          ),
          workflow_vars: resolvedVars,
          display_steps:
            displaySteps && displaySteps.length > 0 ? displaySteps : undefined,
          workflow_var_definitions: this.cloneWorkflowVariableDefinitions(
            metadata.variables,
          ),
        };
      }),
    );

    return validatedSteps;
  }

  private applyWorkflowDefaults(
    variables: WorkflowVariable[],
    workflowVars: Record<string, any>,
  ): Record<string, any> {
    const resolvedVars = { ...(workflowVars || {}) };

    variables.forEach((variable) => {
      if (
        !this.hasWorkflowValue(resolvedVars[variable.name]) &&
        variable.default !== undefined
      ) {
        resolvedVars[variable.name] = variable.default;
      }
    });

    return resolvedVars;
  }

  private hasWorkflowValue(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }

  private resolveWorkflowDisplaySteps(
    step: ExecutionStep,
    metadata: WorkflowMetadata,
    workflowVars: Record<string, any>,
  ): WorkflowUserStep[] | undefined {
    const sourceSteps =
      metadata.user_steps && metadata.user_steps.length > 0
        ? metadata.user_steps
        : step.display_steps;

    if (!sourceSteps || sourceSteps.length === 0) {
      return undefined;
    }

    return this.interpolateWorkflowDisplaySteps(sourceSteps, workflowVars);
  }

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

  private interpolateTemplate(
    template: string,
    vars: Record<string, any>,
  ): string {
    return template.replace(/\{(\w+)\}/g, (match, varName) => {
      const value = vars[varName];
      if (value === undefined || value === null) {
        return match;
      }

      return String(value);
    });
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

  private isWorkflowVariableTypeValid(
    value: any,
    expectedType: WorkflowVariable['type'],
  ): boolean {
    if (value === undefined || value === null) {
      return true;
    }

    if (expectedType === 'object') {
      return typeof value === 'object' && !Array.isArray(value);
    }

    return typeof value === expectedType;
  }

  private buildWorkflowExecutionSummary(
    workflowName: string,
    workflowVars: Record<string, any>,
  ): string {
    const renderedEntries = Object.entries(workflowVars)
      .filter(([, value]) => this.hasWorkflowValue(value))
      .map(([key, value]) => `${key} ${JSON.stringify(value)}`);

    if (renderedEntries.length === 0) {
      return `Run ${workflowName} workflow.`;
    }

    if (renderedEntries.length === 1) {
      return `Run ${workflowName} workflow with ${renderedEntries[0]}.`;
    }

    if (renderedEntries.length === 2) {
      return `Run ${workflowName} workflow with ${renderedEntries[0]} and ${renderedEntries[1]}.`;
    }

    return `Run ${workflowName} workflow with ${renderedEntries
      .slice(0, -1)
      .join(', ')}, and ${renderedEntries[renderedEntries.length - 1]}.`;
  }

  /**
   * Wait for manual control to be released before continuing execution
   * Polls Redis every 2 seconds to check if operator has released control
   */
  private async waitForManualControlRelease(taskId: string): Promise<void> {
    const manualControl = await this.sharedState.get<boolean>(taskId, 'manual_control');
    
    if (!manualControl) {
      return; // Not in manual control, continue execution
    }
    
    this.logger.log(`\n[PAUSED] Manual control active - agent execution paused`);
    this.logger.log(`Waiting for operator to release control...`);
    
    // Poll every 2 seconds until manual control is released
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const stillInManualControl = await this.sharedState.get<boolean>(taskId, 'manual_control');
      
      if (!stillInManualControl) {
        this.logger.log(`[RESUMED] Manual control released - resuming agent execution\n`);
        return;
      }
      
      // Check if task was cancelled while paused
      const task = await this.tasksService.findById(taskId);
      if (task.status === TaskStatus.CANCELLED) {
        throw new Error(`Task ${taskId} was cancelled during manual control`);
      }
    }
  }
}
