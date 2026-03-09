import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanStatus, StepStatus, StepType } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute an approved plan
   */
  async executePlan(planId: string): Promise<void> {
    this.logger.log(`Starting execution of plan: ${planId}`);

    try {
      // Get plan with selected path
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
        include: {
          paths: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });

      if (!plan || !plan.selectedPathId) {
        throw new Error('Plan not found or no path selected');
      }

      const selectedPath = plan.paths.find((p) => p.id === plan.selectedPathId);
      if (!selectedPath) {
        throw new Error('Selected path not found');
      }

      // Update plan status to EXECUTING
      await this.prisma.plan.update({
        where: { id: planId },
        data: { status: PlanStatus.EXECUTING },
      });

      this.logger.log(
        `Executing path: ${selectedPath.name} with ${selectedPath.steps.length} steps`,
      );

      // Execute steps in order
      for (const step of selectedPath.steps) {
        await this.executeStep(step);
      }

      // Mark plan as completed
      await this.prisma.plan.update({
        where: { id: planId },
        data: { status: PlanStatus.COMPLETED },
      });

      this.logger.log(`Plan ${planId} completed successfully`);
    } catch (error: any) {
      this.logger.error(
        `Error executing plan: ${error.message}`,
        error.stack,
      );

      // Mark plan as failed
      await this.prisma.plan.update({
        where: { id: planId },
        data: { status: PlanStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: any): Promise<void> {
    this.logger.log(`Executing step: ${step.action}`);

    try {
      // Update step status to EXECUTING
      await this.prisma.planStep.update({
        where: { id: step.id },
        data: {
          status: StepStatus.EXECUTING,
          executedAt: new Date(),
        },
      });

      switch (step.type) {
        case StepType.TERMINAL:
          await this.executeTerminalStep(step);
          break;
        case StepType.WAIT:
          await this.executeWaitStep(step);
          break;
        case StepType.VERIFY:
          this.logger.log(`Verification step: ${step.verification}`);
          break;
        default:
          this.logger.warn(`Unsupported step type: ${step.type}`);
      }

      // Mark step as completed
      await this.prisma.planStep.update({
        where: { id: step.id },
        data: {
          status: StepStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Step completed: ${step.action}`);
    } catch (error: any) {
      this.logger.error(`Step failed: ${error.message}`);

      // Mark step as failed
      await this.prisma.planStep.update({
        where: { id: step.id },
        data: {
          status: StepStatus.FAILED,
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Execute a terminal command step
   */
  private async executeTerminalStep(step: any): Promise<void> {
    if (!step.command) {
      throw new Error('Terminal step missing command');
    }

    this.logger.log(`Executing command: ${step.command}`);

    try {
      // Detect platform and adjust command execution
      const isWindows = process.platform === 'win32';
      
      const { stdout, stderr } = await execAsync(step.command, {
        shell: isWindows ? 'powershell.exe' : '/bin/bash',
        cwd: isWindows ? process.env.USERPROFILE : '/home/user',
        timeout: 30000, // 30 second timeout
      });

      this.logger.log(`Command output: ${stdout}`);
      if (stderr) {
        this.logger.warn(`Command stderr: ${stderr}`);
      }

      // Log successful execution
      this.logger.log(`Command executed successfully: ${step.command}`);
    } catch (error: any) {
      this.logger.error(`Command failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a wait step
   */
  private async executeWaitStep(step: any): Promise<void> {
    const duration = parseInt(step.command || '1000');
    this.logger.log(`Waiting for ${duration}ms`);
    await new Promise((resolve) => setTimeout(resolve, duration));
  }
}
