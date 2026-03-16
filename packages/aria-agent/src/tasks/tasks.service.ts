import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  Task,
  Role,
  Prisma,
  TaskStatus,
  TaskType,
  TaskPriority,
  File,
} from '@prisma/client';
import { AddTaskMessageDto } from './dto/add-task-message.dto';
import { TasksGateway } from './tasks.gateway';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SharedStateService } from '../shared-state/shared-state.service';
import { AgentsService } from '../agents/agents.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    readonly prisma: PrismaService,
    @Inject(forwardRef(() => TasksGateway))
    private readonly tasksGateway: TasksGateway,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly sharedStateService: SharedStateService,
    private readonly agentsService: AgentsService,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('TasksService initialized');
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    this.logger.log(
      `Creating new task with description: ${createTaskDto.description}`,
    );

    const task = await this.prisma.$transaction(async (prisma) => {
      // Create the task first
      this.logger.debug('Creating task record in database');
      
      // Get default model from agent configuration if not provided
      let taskModel = createTaskDto.model;
      if (!taskModel) {
        const orchestratorConfig = this.agentsService.getAgentModel('ORCHESTRATOR');
        if (orchestratorConfig) {
          taskModel = { 
            provider: orchestratorConfig.provider, 
            name: orchestratorConfig.model 
          };
          this.logger.log(`Using ORCHESTRATOR agent config: ${orchestratorConfig.model}`);
        } else {
          // Final fallback to hardcoded default
          taskModel = { provider: 'bytez', name: 'anthropic/claude-sonnet-4-6' };
          this.logger.warn('No agent config found, using hardcoded default model');
        }
      }
      
      const task = await prisma.task.create({
        data: {
          description: createTaskDto.description,
          type: createTaskDto.type || TaskType.IMMEDIATE,
          priority: createTaskDto.priority || TaskPriority.MEDIUM,
          status: TaskStatus.PENDING,
          createdBy: createTaskDto.createdBy || Role.USER,
          model: taskModel,
          ...(createTaskDto.scheduledFor
            ? { scheduledFor: createTaskDto.scheduledFor }
            : {}),
        },
      });
      this.logger.log(`Task created successfully with ID: ${task.id}`);

      let filesDescription = '';

      // Save files if provided
      if (createTaskDto.files && createTaskDto.files.length > 0) {
        this.logger.debug(
          `Saving ${createTaskDto.files.length} file(s) for task ID: ${task.id}`,
        );
        filesDescription += `\n`;

        const filePromises = createTaskDto.files.map((file) => {
          // Extract base64 data without the data URL prefix
          const base64Data = file.base64.includes('base64,')
            ? file.base64.split('base64,')[1]
            : file.base64;

          filesDescription += `\nFile ${file.name} written to desktop.`;

          return prisma.file.create({
            data: {
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              data: base64Data,
              taskId: task.id,
            },
          });
        });

        await Promise.all(filePromises);
        this.logger.debug(`Files saved successfully for task ID: ${task.id}`);
      }

      // Create the initial system message
      this.logger.debug(`Creating initial message for task ID: ${task.id}`);
      await prisma.message.create({
        data: {
          content: [
            {
              type: 'text',
              text: `${createTaskDto.description} ${filesDescription}`,
            },
          ] as Prisma.InputJsonValue,
          role: Role.USER,
          taskId: task.id,
        },
      });
      this.logger.debug(`Initial message created for task ID: ${task.id}`);

      return task;
    });

    // Publish task.pending event to trigger scheduler
    if (task.status === TaskStatus.PENDING) {
      this.redisService.getClient().publish('aria:tasks:pending', task.id).catch(err => {
        this.logger.error(`Failed to publish task pending event: ${err.message}`);
      });
    }

    this.tasksGateway.emitTaskCreated(task);

    return task;
  }

  async findScheduledTasks(): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: {
        scheduledFor: {
          not: null,
        },
        queuedAt: null,
      },
      orderBy: [{ scheduledFor: 'asc' }],
    });
  }

  async findNextTask(): Promise<(Task & { files: File[] }) | null> {
    const task = await this.prisma.task.findFirst({
      where: {
        status: {
          in: [TaskStatus.RUNNING, TaskStatus.PENDING],
        },
      },
      orderBy: [
        { executedAt: 'asc' },
        { priority: 'desc' },
        { queuedAt: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        files: true,
      },
    });

    if (task) {
      this.logger.log(
        `Found existing task with ID: ${task.id}, and status ${task.status}. Resuming.`,
      );
    }

    return task;
  }

  async findAll(
    page = 1,
    limit = 10,
    statuses?: string[],
  ): Promise<{ tasks: Task[]; total: number; totalPages: number }> {
    this.logger.log(
      `Retrieving tasks - page: ${page}, limit: ${limit}, statuses: ${statuses?.join(',')}`,
    );

    const skip = (page - 1) * limit;

    const whereClause: Prisma.TaskWhereInput =
      statuses && statuses.length > 0
        ? { status: { in: statuses as TaskStatus[] } }
        : {};

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: whereClause,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);
    this.logger.debug(`Retrieved ${tasks.length} tasks out of ${total} total`);

    return { tasks, total, totalPages };
  }

  async findById(id: string): Promise<Task> {
    this.logger.log(`Retrieving task by ID: ${id}`);

    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          files: true,
        },
      });

      if (!task) {
        this.logger.warn(`Task with ID: ${id} not found`);
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      this.logger.debug(`Retrieved task with ID: ${id}`);
      return task;
    } catch (error: any) {
      this.logger.error(`Error retrieving task ID: ${id} - ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    this.logger.log(`Updating task with ID: ${id}`);
    this.logger.debug(`Update data: ${JSON.stringify(updateTaskDto)}`);

    const existingTask = await this.findById(id);

    if (!existingTask) {
      this.logger.warn(`Task with ID: ${id} not found for update`);
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    let updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
    });

    // Publish task.pending event if transitioning to PENDING
    if (updateTaskDto.status === TaskStatus.PENDING) {
      this.redisService.getClient().publish('aria:tasks:pending', id).catch(err => {
        this.logger.error(`Failed to publish task pending event: ${err.message}`);
      });
    }

    if (updateTaskDto.status === TaskStatus.COMPLETED) {
      this.eventEmitter.emit('task.completed', { taskId: id });
    } else if (updateTaskDto.status === TaskStatus.FAILED) {
      this.eventEmitter.emit('task.failed', { taskId: id });
    }

    this.logger.log(`Successfully updated task ID: ${id}`);
    this.logger.debug(`Updated task: ${JSON.stringify(updatedTask)}`);

    this.tasksGateway.emitTaskUpdate(id, updatedTask);

    return updatedTask;
  }

  async delete(id: string): Promise<Task> {
    this.logger.log(`Deleting task with ID: ${id}`);

    const deletedTask = await this.prisma.task.delete({
      where: { id },
    });

    this.logger.log(`Successfully deleted task ID: ${id}`);

    this.tasksGateway.emitTaskDeleted(id);

    return deletedTask;
  }

  async addTaskMessage(taskId: string, addTaskMessageDto: AddTaskMessageDto) {
    const task = await this.findById(taskId);
    if (!task) {
      this.logger.warn(`Task with ID: ${taskId} not found for guiding`);
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const message = await this.prisma.message.create({
      data: {
        content: [{ type: 'text', text: addTaskMessageDto.message }],
        role: Role.USER,
        taskId,
      },
    });

    this.tasksGateway.emitNewMessage(taskId, message);
    
    // If task is paused for clarification (NEEDS_HELP + USER control), automatically resume
    if (task.status === TaskStatus.NEEDS_HELP && task.control === Role.USER) {
      this.logger.log(`User provided message during clarification, automatically resuming task ${taskId}`);
      await this.resume(taskId);
    }
    
    return task;
  }

  async resume(taskId: string): Promise<Task> {
    this.logger.log(`Resuming task ID: ${taskId}`);

    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    if (task.control !== Role.USER) {
      throw new BadRequestException(`Task ${taskId} is not under user control`);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        control: Role.ASSISTANT,
        status: TaskStatus.RUNNING,
      },
    });

    try {
      await fetch(
        `${this.configService.get<string>('ARIA_DESKTOP_BASE_URL')}/input-tracking/stop`,
        { method: 'POST' },
      );
    } catch (error) {
      this.logger.error('Failed to stop input tracking', error);
    }

    // Broadcast resume event so AgentProcessor can react
    this.eventEmitter.emit('task.resume', { taskId });

    this.logger.log(`Task ${taskId} resumed`);
    this.tasksGateway.emitTaskUpdate(taskId, updatedTask);

    return updatedTask;
  }

  async takeOver(taskId: string): Promise<Task> {
    this.logger.log(`Taking over control for task ID: ${taskId}`);

    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    if (task.control !== Role.ASSISTANT) {
      throw new BadRequestException(
        `Task ${taskId} is not under agent control`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        control: Role.USER,
      },
    });

    try {
      await fetch(
        `${this.configService.get<string>('ARIA_DESKTOP_BASE_URL')}/input-tracking/start`,
        { method: 'POST' },
      );
    } catch (error) {
      this.logger.error('Failed to start input tracking', error);
    }

    // Broadcast takeover event so AgentProcessor can react
    this.eventEmitter.emit('task.takeover', { taskId });

    this.logger.log(`Task ${taskId} takeover initiated`);
    this.tasksGateway.emitTaskUpdate(taskId, updatedTask);

    return updatedTask;
  }

  async cancel(taskId: string): Promise<Task> {
    this.logger.log(`Cancelling task ID: ${taskId}`);

    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    if (
      task.status === TaskStatus.COMPLETED ||
      task.status === TaskStatus.FAILED ||
      task.status === TaskStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Task ${taskId} is already completed, failed, or cancelled`,
      );
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: TaskStatus.CANCELLED,
      },
    });

    // Broadcast cancel event so AgentProcessor can cancel processing
    this.eventEmitter.emit('task.cancel', { taskId });
    
    // Cleanup task-scoped resources (PinchTab instances, etc.)
    this.eventEmitter.emit('task.cleanup', { taskId });

    this.logger.log(`Task ${taskId} cancelled and marked as failed`);
    this.tasksGateway.emitTaskUpdate(taskId, updatedTask);

    return updatedTask;
  }

  async getSharedState(taskId: string): Promise<Record<string, any>> {
    this.logger.log(`Retrieving shared state for task ID: ${taskId}`);

    // Verify task exists
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    try {
      const state = await this.sharedStateService.getTaskState(taskId);
      this.logger.debug(`Retrieved ${Object.keys(state).length} keys from shared state for task ${taskId}`);
      return state;
    } catch (error) {
      this.logger.error(`Error retrieving shared state for task ${taskId}:`, error);
      throw error;
    }
  }

  async getClarificationSession(taskId: string): Promise<any> {
    this.logger.log(`Retrieving clarification session for task ID: ${taskId}`);

    // Verify task exists
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    try {
      const session = await this.sharedStateService.get(taskId, 'clarification_session');
      return session || { status: 'not_started' };
    } catch (error) {
      this.logger.error(`Error retrieving clarification session for task ${taskId}:`, error);
      throw error;
    }
  }

  async submitClarificationAnswer(
    taskId: string,
    questionId: string,
    answer: string,
  ): Promise<any> {
    this.logger.log(`Submitting clarification answer for task ${taskId}, question ${questionId}`);

    // Verify task exists
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    try {
      // Get current session
      const session = await this.sharedStateService.get<any>(taskId, 'clarification_session');
      if (!session) {
        throw new BadRequestException('No clarification session found');
      }

      // Add answer
      const existingAnswerIndex = session.answers.findIndex(
        (a: any) => a.questionId === questionId,
      );
      if (existingAnswerIndex >= 0) {
        session.answers[existingAnswerIndex].answer = answer;
      } else {
        session.answers.push({ questionId, answer });
      }

      // Check if all questions are answered
      if (session.answers.length === session.questions.length) {
        session.status = 'completed';
        // Emit event to resume task processing
        this.eventEmitter.emit('clarification.completed', { taskId });
      }

      // Save updated session
      await this.sharedStateService.set(taskId, 'clarification_session', session);

      return session;
    } catch (error) {
      this.logger.error(`Error submitting clarification answer for task ${taskId}:`, error);
      throw error;
    }
  }

  async skipClarification(taskId: string): Promise<any> {
    this.logger.log(`Skipping clarification for task ${taskId}`);

    // Verify task exists
    const task = await this.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    try {
      // Get current session
      const session = await this.sharedStateService.get<any>(taskId, 'clarification_session');
      if (session) {
        session.status = 'skipped';
        await this.sharedStateService.set(taskId, 'clarification_session', session);
      }

      // Emit event to resume task processing
      this.eventEmitter.emit('clarification.skipped', { taskId });

      return { status: 'skipped' };
    } catch (error) {
      this.logger.error(`Error skipping clarification for task ${taskId}:`, error);
      throw error;
    }
  }
}
