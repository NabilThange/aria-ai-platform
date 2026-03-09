import { TasksService } from '../tasks/tasks.service';
import { MessagesService } from '../messages/messages.service';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import {
  Message,
  Role,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  PlanStatus,
} from '@prisma/client';
import {
  isComputerToolUseContentBlock,
  isSetTaskStatusToolUseBlock,
  isCreateTaskToolUseBlock,
  SetTaskStatusToolUseBlock,
} from '@bytebot/shared';

import {
  MessageContentBlock,
  MessageContentType,
  ToolResultContentBlock,
  TextContentBlock,
} from '@bytebot/shared';
import { InputCaptureService } from './input-capture.service';
import { OnEvent } from '@nestjs/event-emitter';
import { GoogleService } from '../google/google.service';
import { GroqService } from '../groq/groq.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { BytezService } from '../bytez/bytez.service';
import {
  BytebotAgentModel,
  BytebotAgentService,
  BytebotAgentResponse,
} from './agent.types';
import {
  getAgentSystemPrompt,
  SUMMARIZATION_SYSTEM_PROMPT,
} from './agent.constants';
import { SummariesService } from '../summaries/summaries.service';
import { handleComputerToolUse } from './agent.computer-use';
import { PlannerService } from '../planner/planner.service';

@Injectable()
export class AgentProcessor {
  private readonly logger = new Logger(AgentProcessor.name);
  private currentTaskId: string | null = null;
  private isProcessing = false;
  private abortController: AbortController | null = null;
  private services: Record<string, BytebotAgentService> = {};

  constructor(
    private readonly tasksService: TasksService,
    private readonly messagesService: MessagesService,
    private readonly summariesService: SummariesService,
    private readonly googleService: GoogleService,
    private readonly groqService: GroqService,
    private readonly openRouterService: OpenRouterService,
    private readonly bytezService: BytezService,
    private readonly inputCaptureService: InputCaptureService,
    @Inject(forwardRef(() => PlannerService))
    private readonly plannerService: PlannerService,
  ) {
    this.services = {
      google: this.googleService,
      groq: this.groqService,
      openrouter: this.openRouterService,
      bytez: this.bytezService,
    };
    this.logger.log('AgentProcessor initialized');
  }

  /**
   * Check if the processor is currently processing a task
   */
  isRunning(): boolean {
    return this.isProcessing;
  }

  /**
   * Get the current task ID being processed
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId;
  }

  @OnEvent('task.takeover')
  handleTaskTakeover({ taskId }: { taskId: string }) {
    this.logger.log(`Task takeover event received for task ID: ${taskId}`);

    // If the agent is still processing this task, abort any in-flight operations
    if (this.currentTaskId === taskId && this.isProcessing) {
      this.abortController?.abort();
    }

    // Always start capturing user input so that emitted actions are received
    this.inputCaptureService.start(taskId);
  }

  @OnEvent('task.resume')
  handleTaskResume({ taskId }: { taskId: string }) {
    if (this.currentTaskId === taskId && this.isProcessing) {
      this.logger.log(`Task resume event received for task ID: ${taskId}`);
      this.abortController = new AbortController();

      void this.runIteration(taskId);
    }
  }

  @OnEvent('task.cancel')
  async handleTaskCancel({ taskId }: { taskId: string }) {
    this.logger.log(`Task cancel event received for task ID: ${taskId}`);

    await this.stopProcessing();
  }

  @OnEvent('plan.approved')
  async handlePlanApproved({ planId, taskId }: { planId: string; taskId: string }) {
    this.logger.log(`\n========================================`);
    this.logger.log(`PLAN APPROVED EVENT RECEIVED`);
    this.logger.log(`Plan ID: ${planId}`);
    this.logger.log(`Task ID: ${taskId}`);
    this.logger.log(`========================================\n`);

    // Start processing the task now that the plan is approved
    if (!this.isProcessing) {
      this.logger.log(`Agent is not currently processing, starting task execution`);
      this.processTask(taskId);
    } else {
      this.logger.warn(`Agent is already processing task ${this.currentTaskId}, cannot start ${taskId}`);
    }
  }

  async processTask(taskId: string) {
    this.logger.log(`Starting processing for task ID: ${taskId}`);

    if (this.isProcessing) {
      this.logger.warn('AgentProcessor is already processing another task');
      return;
    }

    // Check if task has planning enabled
    const task = await this.tasksService.findById(taskId);
    
    if (task.planningEnabled) {
      this.logger.log(`Task ${taskId} has planning enabled, checking for plan`);
      
      // Check if plan exists
      const existingPlan = await this.plannerService.getPlanByTaskId(taskId);
      
      if (!existingPlan) {
        // Create plan and keep task in PENDING status
        this.logger.log(`Creating plan for task ${taskId}`);
        try {
          await this.plannerService.createPlan({
            taskId,
            taskDescription: task.description,
            model: task.model as any,
          });
          
          // Update task status back to PENDING to wait for plan approval
          await this.tasksService.update(taskId, {
            status: TaskStatus.PENDING,
          });
          
          this.logger.log(`Plan created for task ${taskId}, waiting for approval`);
          return; // Wait for plan approval before processing
        } catch (error) {
          this.logger.error(`Failed to create plan for task ${taskId}:`, error);
          await this.tasksService.update(taskId, {
            status: TaskStatus.FAILED,
          });
          return;
        }
      } else if (existingPlan.status === PlanStatus.PENDING) {
        this.logger.log(`Plan exists for task ${taskId} but is pending approval`);
        
        // Update task status back to PENDING if it's not already
        if (task.status !== TaskStatus.PENDING) {
          await this.tasksService.update(taskId, {
            status: TaskStatus.PENDING,
          });
        }
        
        return; // Wait for approval
      } else if (existingPlan.status === PlanStatus.APPROVED || existingPlan.status === PlanStatus.EXECUTING) {
        // Plan is approved, proceed with normal agent execution
        // The agent will use the plan as context to guide its actions
        this.logger.log(`Plan approved for task ${taskId}, proceeding with agent execution`);
        // Continue to normal agent execution below
      } else if (existingPlan.status === PlanStatus.PLANNING) {
        this.logger.warn(`Plan for task ${taskId} is still being generated, waiting`);
        return;
      } else if (existingPlan.status === PlanStatus.FAILED) {
        // Plan failed, mark task as failed
        this.logger.log(`Plan failed for task ${taskId}, marking task as failed`);
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
        return;
      } else if (existingPlan.status === PlanStatus.CANCELLED) {
        // Plan cancelled, mark task as cancelled
        this.logger.log(`Plan cancelled for task ${taskId}, marking task as cancelled`);
        await this.tasksService.update(taskId, {
          status: TaskStatus.CANCELLED,
        });
        return;
      } else {
        this.logger.warn(`Plan for task ${taskId} has unexpected status ${existingPlan.status}`);
        return;
      }
    }

    // Ensure task is in RUNNING status before proceeding
    if (task.status !== TaskStatus.RUNNING) {
      await this.tasksService.update(taskId, {
        status: TaskStatus.RUNNING,
      });
    }

    this.isProcessing = true;
    this.currentTaskId = taskId;
    this.abortController = new AbortController();

    // Kick off the first iteration without blocking the caller
    void this.runIteration(taskId);
  }

  /**
   * Runs a single iteration of task processing and schedules the next
   * iteration via setImmediate while the task remains RUNNING.
   */
  private async runIteration(taskId: string): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    try {
      const task: Task = await this.tasksService.findById(taskId);

      if (task.status !== TaskStatus.RUNNING) {
        this.logger.log(
          `Task processing completed for task ID: ${taskId} with status: ${task.status}`,
        );
        this.isProcessing = false;
        this.currentTaskId = null;
        return;
      }

      this.logger.log(`Processing iteration for task ID: ${taskId}`);

      // Refresh abort controller for this iteration to avoid accumulating
      // "abort" listeners on a single AbortSignal across iterations.
      this.abortController = new AbortController();

      const latestSummary = await this.summariesService.findLatest(taskId);
      const unsummarizedMessages =
        await this.messagesService.findUnsummarized(taskId);
      const messages = [
        ...(latestSummary
          ? [
              {
                id: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                taskId,
                summaryId: null,
                role: Role.USER,
                content: [
                  {
                    type: MessageContentType.Text,
                    text: latestSummary.content,
                  },
                ],
              },
            ]
          : []),
        ...unsummarizedMessages,
      ];
      this.logger.debug(
        `Sending ${messages.length} messages to LLM for processing`,
      );

      const model = task.model as unknown as BytebotAgentModel;
      let agentResponse: BytebotAgentResponse;

      const service = this.services[model.provider];
      if (!service) {
        this.logger.warn(
          `No service found for model provider: ${model.provider}`,
        );
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
        this.isProcessing = false;
        this.currentTaskId = null;
        return;
      }

      // Check if task has an approved plan and inject it into the system prompt
      let systemPrompt = getAgentSystemPrompt(); // Get fresh prompt with current date/time
      if (task.planningEnabled) {
        const plan = await this.plannerService.getPlanByTaskId(taskId);
        if (plan && plan.status === PlanStatus.APPROVED && plan.selectedPathId) {
          // Fetch full plan with paths and steps
          const fullPlan = await this.plannerService.getPlanById(plan.id);
          const selectedPath = (fullPlan as any).paths?.find((p: any) => p.id === plan.selectedPathId);
          if (selectedPath) {
            this.logger.log(`Injecting approved plan into system prompt for task ${taskId}`);
            
            // Build plan context
            const planContext = `

## APPROVED EXECUTION PLAN

You have an approved execution plan for this task. Follow these steps:

**Strategy:** ${selectedPath.strategy}
**Estimated Duration:** ${selectedPath.estimatedDuration} seconds
**Estimated Tokens:** ${selectedPath.estimatedTokens}

**Steps to execute:**
${selectedPath.steps.map((step: any, idx: number) => `
${idx + 1}. ${step.action}
   Description: ${step.description}
   Type: ${step.type}
   ${step.command ? `Command: ${step.command}` : ''}
   ${step.verification ? `Verification: ${step.verification}` : ''}
`).join('\n')}

**IMPORTANT:** Execute these steps using your computer control tools. Take screenshots to verify each step. Mark the task as completed when all steps are done successfully.
`;
            
            systemPrompt = getAgentSystemPrompt() + planContext;
          }
        }
      }

      agentResponse = await service.generateMessage(
        systemPrompt,
        messages,
        model.name,
        true,
        this.abortController.signal,
      );

      const messageContentBlocks = agentResponse.contentBlocks;

      this.logger.debug(
        `Received ${messageContentBlocks.length} content blocks from LLM`,
      );

      if (messageContentBlocks.length === 0) {
        this.logger.warn(
          `Task ID: ${taskId} received no content blocks from LLM, marking as failed`,
        );
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
        this.isProcessing = false;
        this.currentTaskId = null;
        return;
      }

      await this.messagesService.create({
        content: messageContentBlocks,
        role: Role.ASSISTANT,
        taskId,
      });

      // Calculate if we need to summarize based on token usage
      const contextWindow = model.contextWindow || 200000; // Default to 200k if not specified
      const contextThreshold = contextWindow * 0.75;
      const shouldSummarize =
        agentResponse.tokenUsage.totalTokens >= contextThreshold;

      if (shouldSummarize) {
        try {
          // After we've successfully generated a response, we can summarize the unsummarized messages
          const summaryResponse = await service.generateMessage(
            SUMMARIZATION_SYSTEM_PROMPT,
            [
              ...messages,
              {
                id: '',
                createdAt: new Date(),
                updatedAt: new Date(),
                taskId,
                summaryId: null,
                role: Role.USER,
                content: [
                  {
                    type: MessageContentType.Text,
                    text: 'Respond with a summary of the messages above. Do not include any additional information.',
                  },
                ],
              },
            ],
            model.name,
            false,
            this.abortController.signal,
          );

          const summaryContentBlocks = summaryResponse.contentBlocks;

          this.logger.debug(
            `Received ${summaryContentBlocks.length} summary content blocks from LLM`,
          );
          const summaryContent = summaryContentBlocks
            .filter(
              (block: MessageContentBlock) =>
                block.type === MessageContentType.Text,
            )
            .map((block: TextContentBlock) => block.text)
            .join('\n');

          const summary = await this.summariesService.create({
            content: summaryContent,
            taskId,
          });

          await this.messagesService.attachSummary(taskId, summary.id, [
            ...messages.map((message) => {
              return message.id;
            }),
          ]);

          this.logger.log(
            `Generated summary for task ${taskId} due to token usage (${agentResponse.tokenUsage.totalTokens}/${contextWindow})`,
          );
        } catch (error: any) {
          this.logger.error(
            `Error summarizing messages for task ID: ${taskId}`,
            error.stack,
          );
        }
      }

      this.logger.debug(
        `Token usage for task ${taskId}: ${agentResponse.tokenUsage.totalTokens}/${contextWindow} (${Math.round((agentResponse.tokenUsage.totalTokens / contextWindow) * 100)}%)`,
      );

      const generatedToolResults: ToolResultContentBlock[] = [];

      let setTaskStatusToolUseBlock: SetTaskStatusToolUseBlock | null = null;

      for (const block of messageContentBlocks) {
        if (isComputerToolUseContentBlock(block)) {
          const result = await handleComputerToolUse(block, this.logger);
          generatedToolResults.push(result);
        }

        if (isCreateTaskToolUseBlock(block)) {
          const type = block.input.type?.toUpperCase() as TaskType;
          const priority = block.input.priority?.toUpperCase() as TaskPriority;

          await this.tasksService.create({
            description: block.input.description,
            type,
            createdBy: Role.ASSISTANT,
            ...(block.input.scheduledFor && {
              scheduledFor: new Date(block.input.scheduledFor),
            }),
            model: task.model,
            priority,
          });

          generatedToolResults.push({
            type: MessageContentType.ToolResult,
            tool_use_id: block.id,
            content: [
              {
                type: MessageContentType.Text,
                text: 'The task has been created',
              },
            ],
          });
        }

        if (isSetTaskStatusToolUseBlock(block)) {
          setTaskStatusToolUseBlock = block;

          generatedToolResults.push({
            type: MessageContentType.ToolResult,
            tool_use_id: block.id,
            is_error: block.input.status === 'failed',
            content: [
              {
                type: MessageContentType.Text,
                text: block.input.description,
              },
            ],
          });
        }
      }

      if (generatedToolResults.length > 0) {
        await this.messagesService.create({
          content: generatedToolResults,
          role: Role.USER,
          taskId,
        });
      }

      // Update the task status after all tool results have been generated if we have a set task status tool use block
      if (setTaskStatusToolUseBlock) {
        switch (setTaskStatusToolUseBlock.input.status) {
          case 'completed':
            await this.tasksService.update(taskId, {
              status: TaskStatus.COMPLETED,
              completedAt: new Date(),
            });
            break;
          case 'needs_help':
            await this.tasksService.update(taskId, {
              status: TaskStatus.NEEDS_HELP,
            });
            break;
        }
      }

      // Schedule the next iteration without blocking
      if (this.isProcessing) {
        setImmediate(() => this.runIteration(taskId));
      }
    } catch (error: any) {
      if (error?.name === 'BytebotAgentInterrupt') {
        this.logger.warn(`Processing aborted for task ID: ${taskId}`);
      } else {
        this.logger.error(
          `Error during task processing iteration for task ID: ${taskId} - ${error.message}`,
          error.stack,
        );
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
        this.isProcessing = false;
        this.currentTaskId = null;
      }
    }
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.logger.log(`Stopping execution of task ${this.currentTaskId}`);

    // Signal any in-flight async operations to abort
    this.abortController?.abort();

    await this.inputCaptureService.stop();

    this.isProcessing = false;
    this.currentTaskId = null;
  }
}
