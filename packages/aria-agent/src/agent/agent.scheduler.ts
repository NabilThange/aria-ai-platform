import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { AgentProcessor } from './agent.processor';
import { TaskStatus, Task, File } from '@prisma/client';
import { writeFile } from './agent.computer-use';
import { RedisService } from '../redis/redis.service';
import Redis from 'ioredis';

type TaskWithFiles = Task & { files: File[] };

@Injectable()
export class AgentScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AgentScheduler.name);
  private pubsubClient: Redis;

  constructor(
    private readonly tasksService: TasksService,
    private readonly agentProcessor: AgentProcessor,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    this.logger.log('AgentScheduler initialized');
    
    // Subscribe to Redis pub/sub for immediate task triggering
    this.pubsubClient = new Redis(this.redisService.getClient().options);
    
    this.pubsubClient.on('message', async (channel: string, taskId: string) => {
      if (channel === 'aria:tasks:pending') {
        this.logger.debug(`[PubSub] Received pending task event for task ID: ${taskId}`);
        await this.handlePendingTask(taskId);
      }
    });

    this.pubsubClient.on('error', (err: Error) => {
      this.logger.error(`Redis pub/sub error: ${err.message}`);
    });

    await this.pubsubClient.subscribe('aria:tasks:pending', (err, count) => {
      if (err) {
        this.logger.error(`Failed to subscribe to aria:tasks:pending: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to aria:tasks:pending channel (${count} subscriptions)`);
      }
    });

    // Run initial scan for any pending tasks
    await this.handleCron();
  }

  async onModuleDestroy() {
    this.logger.log('AgentScheduler shutting down');
    if (this.pubsubClient) {
      await this.pubsubClient.unsubscribe();
      await this.pubsubClient.quit();
    }
  }

  /**
   * Handle a single pending task (triggered by pub/sub event)
   */
  private async handlePendingTask(taskId: string): Promise<void> {
    try {
      if (this.agentProcessor.isRunning()) {
        this.logger.debug(`Agent processor is busy, task ${taskId} will be picked up by next cron cycle`);
        return;
      }

      // Fetch task with files included
      const task: TaskWithFiles | null = await this.tasksService.prisma.task.findUnique({
        where: { id: taskId },
        include: { files: true },
      });

      if (!task) {
        this.logger.warn(`Task ${taskId} not found`);
        return;
      }

      // Skip if task is already RUNNING
      if (task.status === TaskStatus.RUNNING) {
        this.logger.debug(`Task ${taskId} already RUNNING, skipping`);
        return;
      }

      // Skip if task is not PENDING
      if (task.status !== TaskStatus.PENDING) {
        this.logger.debug(`Task ${taskId} status is ${task.status}, not PENDING, skipping`);
        return;
      }

      // Write files if present
      if (task.files && task.files.length > 0) {
        this.logger.debug(`Task ID: ${taskId} has ${task.files.length} file(s), writing to desktop`);
        for (const file of task.files) {
          await writeFile({
            path: `/home/user/Desktop/${file.name}`,
            content: file.data,
          });
        }
      }

      // Mark as RUNNING and process
      await this.tasksService.update(taskId, {
        status: TaskStatus.RUNNING,
        executedAt: new Date(),
      });
      this.logger.debug(`[PubSub] Processing task ID: ${taskId}`);
      this.agentProcessor.processTask(taskId);
    } catch (error) {
      this.logger.error(`Error handling pending task ${taskId}:`, error);
    }
  }

  /**
   * Fallback cron job: runs every 30 minutes to catch any missed tasks
   * This is a safety net in case Redis pub/sub connection drops
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleCron() {
    this.logger.debug('[Cron] Running 30-minute safety net scan for pending tasks');
    
    const now = new Date();
    
    // Check for scheduled tasks that should be queued
    const scheduledTasks = await this.tasksService.findScheduledTasks();
    for (const scheduledTask of scheduledTasks) {
      if (scheduledTask.scheduledFor && scheduledTask.scheduledFor < now) {
        this.logger.debug(
          `[Cron] Task ID: ${scheduledTask.id} is scheduled for ${scheduledTask.scheduledFor}, queuing it`,
        );
        await this.tasksService.update(scheduledTask.id, {
          queuedAt: now,
        });
      }
    }

    // If processor is idle, find and process next task
    if (this.agentProcessor.isRunning()) {
      this.logger.debug('[Cron] Agent processor is busy, skipping task pickup');
      return;
    }

    const task = await this.tasksService.findNextTask();
    if (task) {
      if (task.status === TaskStatus.RUNNING) {
        this.logger.debug(`[Cron] Task ${task.id} already RUNNING, skipping`);
        return;
      }

      if (task.files && task.files.length > 0) {
        this.logger.debug(`[Cron] Task ID: ${task.id} has files, writing them to desktop`);
        for (const file of task.files) {
          await writeFile({
            path: `/home/user/Desktop/${file.name}`,
            content: file.data,
          });
        }
      }

      await this.tasksService.update(task.id, {
        status: TaskStatus.RUNNING,
        executedAt: new Date(),
      });
      this.logger.debug(`[Cron] Processing task ID: ${task.id}`);
      this.agentProcessor.processTask(task.id);
    }
  }
}
