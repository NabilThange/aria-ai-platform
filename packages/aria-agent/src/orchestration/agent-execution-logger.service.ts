import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AgentExecutionLogger - Logs agent execution metadata to PostgreSQL
 * Tracks agent_name, start_time, end_time, cost, result for each agent execution
 */
@Injectable()
export class AgentExecutionLoggerService {
  private readonly logger = new Logger(AgentExecutionLoggerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start logging an agent execution
   * Returns the execution record that should be completed later
   */
  async startExecution(
    taskId: string,
    agentName: string,
  ): Promise<AgentExecutionRecord> {
    const record: AgentExecutionRecord = {
      agentName,
      startTime: new Date().toISOString(),
      result: 'in_progress',
    };

    try {
      // Get current executions array
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { agentExecutions: true },
      });

      const executions = (task?.agentExecutions as any[]) || [];
      executions.push(record);

      // Update task with new execution
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          agentExecutions: executions,
          activeAgent: agentName,
        },
      });

      this.logger.log(`Started execution for ${agentName} on task ${taskId}`);
      return record;
    } catch (error) {
      this.logger.error(`Failed to start execution log for ${agentName}:`, error);
      throw error;
    }
  }

  /**
   * Complete an agent execution with success
   */
  async completeExecution(
    taskId: string,
    agentName: string,
    tokensUsed?: number,
    cost?: number,
  ): Promise<void> {
    try {
      await this.updateExecution(taskId, agentName, {
        endTime: new Date().toISOString(),
        tokensUsed,
        cost,
        result: 'success',
      });

      this.logger.log(`Completed execution for ${agentName} on task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to complete execution log for ${agentName}:`, error);
      throw error;
    }
  }


  /**
   * Fail an agent execution with error
   */
  async failExecution(
    taskId: string,
    agentName: string,
    error: string,
    tokensUsed?: number,
    cost?: number,
  ): Promise<void> {
    try {
      await this.updateExecution(taskId, agentName, {
        endTime: new Date().toISOString(),
        tokensUsed,
        cost,
        result: 'failure',
        error,
      });

      this.logger.log(`Failed execution for ${agentName} on task ${taskId}: ${error}`);
    } catch (err) {
      this.logger.error(`Failed to log execution failure for ${agentName}:`, err);
      throw err;
    }
  }

  /**
   * Update the most recent execution for an agent
   */
  private async updateExecution(
    taskId: string,
    agentName: string,
    updates: Partial<AgentExecutionRecord>,
  ): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { agentExecutions: true, totalCost: true },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const executions = (task.agentExecutions as any[]) || [];
    
    // Find the most recent execution for this agent
    const index = executions.findLastIndex((e: any) => e.agentName === agentName);
    
    if (index === -1) {
      throw new Error(`No execution found for agent ${agentName} on task ${taskId}`);
    }

    // Update the execution record
    executions[index] = {
      ...executions[index],
      ...updates,
    };

    // Calculate total cost if cost is provided
    let totalCost = task.totalCost || 0;
    if (updates.cost !== undefined) {
      totalCost += updates.cost;
    }

    // Update task
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        agentExecutions: executions,
        totalCost,
        activeAgent: updates.result === 'success' || updates.result === 'failure' ? null : undefined,
      },
    });
  }

  /**
   * Get all executions for a task
   */
  async getExecutions(taskId: string): Promise<AgentExecutionRecord[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { agentExecutions: true },
    });

    return (task?.agentExecutions as unknown as AgentExecutionRecord[]) || [];
  }

  /**
   * Get total cost for a task
   */
  async getTotalCost(taskId: string): Promise<number> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { totalCost: true },
    });

    return task?.totalCost || 0;
  }
}

/**
 * Agent execution record structure
 */
export interface AgentExecutionRecord {
  agentName: string;
  startTime: string;
  endTime?: string;
  tokensUsed?: number;
  cost?: number;
  result: 'success' | 'failure' | 'in_progress';
  error?: string;
}
