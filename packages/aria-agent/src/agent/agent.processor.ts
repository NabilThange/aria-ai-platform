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
import { GroqService } from '../groq/groq.service';
import { BytezService } from '../bytez/bytez.service';
import { GoogleService } from '../google/google.service';
import { SharedStateService } from '../shared-state/shared-state.service';
import {
  BytebotAgentModel,
  BytebotAgentService,
  BytebotAgentResponse,
} from './agent.types';
import { SUMMARIZATION_SYSTEM_PROMPT, getAgentSystemPrompt } from '../config/system-prompts.config';
import { SummariesService } from '../summaries/summaries.service';
import { handleComputerToolUse } from './agent.computer-use';
import { PinchTabService } from '../services/pinchtab.service';
import { ConfigService } from '@nestjs/config';
import { OrchestrationService } from '../orchestration/orchestration.service';

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
    private readonly groqService: GroqService,
    private readonly bytezService: BytezService,
    private readonly googleService: GoogleService,
    private readonly inputCaptureService: InputCaptureService,
    private readonly pinchTabService: PinchTabService,
    private readonly configService: ConfigService,
    private readonly orchestrationService: OrchestrationService,
    private readonly sharedStateService: SharedStateService,
  ) {
    this.services = {
      groq: this.groqService,
      bytez: this.bytezService,
      google: this.googleService,
    };
    this.logger.log('AgentProcessor initialized (Multi-Agent System)');
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
  async handleTaskResume({ taskId }: { taskId: string }) {
    this.logger.log(`Task resume event received for task ID: ${taskId}`);
    
    // Check if this task was paused for clarification
    const status = await this.sharedStateService.get<string>(taskId, 'status');
    
    if (status === 'needs_clarification') {
      // Task was paused for clarification, restart orchestration
      this.logger.log(`Restarting orchestration for task ${taskId} with user's clarification response`);
      
      const task = await this.tasksService.findById(taskId);
      if (!task) {
        this.logger.error(`Task ${taskId} not found`);
        return;
      }
      
      // Get the latest user message (the clarification response)
      const messages = await this.messagesService.findAll(taskId, { limit: 10, page: 1 });
      const latestUserMessage = messages.reverse().find(m => m.role === 'USER');
      
      let inputWithClarification = task.description;
      if (latestUserMessage && latestUserMessage.content) {
        // Extract text from message content (content is a JSON array)
        const contentArray = Array.isArray(latestUserMessage.content) 
          ? latestUserMessage.content 
          : [];
        
        const textContent = contentArray
          .filter((block: any) => block && typeof block === 'object' && block.type === 'text')
          .map((block: any) => block.text)
          .join('\n');
        
        if (textContent) {
          inputWithClarification = `${task.description}\n\nUser clarification: ${textContent}`;
          this.logger.log(`Appending user clarification: "${textContent}"`);
        }
      }
      
      // Clear the clarification status
      await this.sharedStateService.set(taskId, 'status', 'running');
      
      // Restart orchestration with clarified input
      try {
        await this.orchestrationService.run(inputWithClarification, taskId, task.model);
        
        // Check final status
        const finalStatus = await this.sharedStateService.get<string>(taskId, 'status');
        
        if (finalStatus === 'needs_clarification') {
          this.logger.log(`Task ${taskId} needs more clarification`);
          await this.tasksService.update(taskId, {
            status: TaskStatus.NEEDS_HELP,
          });
        } else {
          // Mark task as completed
          await this.tasksService.update(taskId, {
            status: TaskStatus.COMPLETED,
          });
          this.logger.log(`Task ${taskId} completed after resume`);
        }
      } catch (error) {
        this.logger.error(`Task ${taskId} failed after resume: ${error.message}`);
        await this.tasksService.update(taskId, {
          status: TaskStatus.FAILED,
        });
      }
    } else if (this.currentTaskId === taskId && this.isProcessing) {
      // Normal resume during active processing
      this.abortController = new AbortController();
      void this.runIteration(taskId);
    }
  }

  @OnEvent('task.cancel')
  async handleTaskCancel({ taskId }: { taskId: string }) {
    this.logger.log(`Task cancel event received for task ID: ${taskId}`);

    await this.stopProcessing();
  }

  @OnEvent('clarification.completed')
  async handleClarificationCompleted({ taskId }: { taskId: string }) {
    this.logger.log(`Clarification completed event received for task ID: ${taskId}`);
    
    // Get the clarification answer from shared state
    const session = await this.sharedStateService.get<any>(taskId, 'clarification_session');
    if (!session || !session.answers || session.answers.length === 0) {
      this.logger.warn(`No clarification answers found for task ${taskId}`);
      return;
    }
    
    // Get the user's answer
    const answer = session.answers[0].answer;
    this.logger.log(`User clarification answer: ${answer}`);
    
    // Resume task processing with the clarified input
    // Append the answer to the original task description
    const task = await this.tasksService.findById(taskId);
    if (!task) {
      this.logger.error(`Task ${taskId} not found`);
      return;
    }
    
    const clarifiedInput = `${task.description}\n\nUser clarification: ${answer}`;
    this.logger.log(`Resuming task ${taskId} with clarified input`);
    
    // Update task status to RUNNING
    await this.tasksService.update(taskId, {
      status: TaskStatus.RUNNING,
    });
    
    // Restart orchestration with clarified input
    try {
      await this.orchestrationService.run(clarifiedInput, taskId, task.model);
      
      // Check if task needs more clarification
      const taskStatus = await this.sharedStateService.get<string>(taskId, 'status');
      
      if (taskStatus === 'needs_clarification') {
        this.logger.log(`Task ${taskId} needs more clarification`);
        await this.tasksService.update(taskId, {
          status: TaskStatus.NEEDS_HELP,
        });
      } else {
        // Mark task as completed
        await this.tasksService.update(taskId, {
          status: TaskStatus.COMPLETED,
        });
        this.logger.log(`Task ${taskId} completed after clarification`);
      }
    } catch (error) {
      this.logger.error(`Task ${taskId} failed after clarification: ${error.message}`);
      await this.tasksService.update(taskId, {
        status: TaskStatus.FAILED,
      });
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

    // Ensure task is in RUNNING status before proceeding
    if (task.status !== TaskStatus.RUNNING) {
      await this.tasksService.update(taskId, {
        status: TaskStatus.RUNNING,
      });
    }

    // Delegate to multi-agent orchestration system
    this.logger.log(`Delegating task ${taskId} to multi-agent orchestration system`);
    
    try {
      // Delegate to OrchestrationService
      await this.orchestrationService.run(task.description, taskId, task.model);
      
      // Check if task needs clarification (orchestration service returns early in this case)
      const taskStatus = await this.sharedStateService.get<string>(taskId, 'status');
      
      if (taskStatus === 'needs_clarification') {
        // Task is paused for clarification - don't mark as completed
        this.logger.log(`Task ${taskId} paused for user clarification`);
        await this.tasksService.update(taskId, {
          status: TaskStatus.NEEDS_HELP, // Use NEEDS_HELP status for clarification
        });
      } else {
        // Mark task as completed
        await this.tasksService.update(taskId, {
          status: TaskStatus.COMPLETED,
        });
        
        this.logger.log(`Multi-agent orchestration completed for task ${taskId}`);
      }
    } catch (error) {
      this.logger.error(`Multi-agent orchestration failed for task ${taskId}:`, error);
      
      // Mark task as failed
      await this.tasksService.update(taskId, {
        status: TaskStatus.FAILED,
      });
    }
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

      agentResponse = await service.generateMessage(
        getAgentSystemPrompt(),
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
          const result = await handleComputerToolUse(block, this.logger, this.pinchTabService);
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
