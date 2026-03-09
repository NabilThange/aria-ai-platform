import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleService } from '../google/google.service';
import { GroqService } from '../groq/groq.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { BytezService } from '../bytez/bytez.service';
import { PlannerGateway } from './planner.gateway';
import {
  CreatePlanInput,
  ExecutionPathData,
  PlanGenerationResponse,
} from './planner.types';
import { buildPlanPrompt } from './planner.prompts';
import { Plan, PlanStatus } from '@prisma/client';
import { BytebotAgentService } from '../agent/agent.types';
import { Role } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private services: Record<string, BytebotAgentService> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleService: GoogleService,
    private readonly groqService: GroqService,
    private readonly openRouterService: OpenRouterService,
    private readonly bytezService: BytezService,
    private readonly plannerGateway: PlannerGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.services = {
      google: this.googleService,
      groq: this.groqService,
      openrouter: this.openRouterService,
      bytez: this.bytezService,
    };
  }

  /**
   * Create a new plan for a task
   */
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    this.logger.log(`Creating plan for task: ${input.taskId}`);
    this.logger.log(`Input received: ${JSON.stringify(input, null, 2)}`);

    // Validate model object
    if (!input.model || !input.model.provider || !input.model.name) {
      throw new Error('Invalid model object. Expected { provider, name, title }');
    }

    // Create plan record with PLANNING status
    const plan = await this.prisma.plan.create({
      data: {
        taskId: input.taskId,
        taskDescription: input.taskDescription,
        status: PlanStatus.PLANNING,
      },
    });

    // Emit planning started event
    this.plannerGateway.emitPlanUpdate(plan.id, plan);

    try {
      // Generate execution paths using LLM
      const paths = await this.generateExecutionPaths(
        input.taskDescription,
        input.model,
      );

      // Save paths to database
      for (let i = 0; i < paths.length; i++) {
        const pathData = paths[i];
        await this.createExecutionPath(plan.id, pathData, i);
      }

      // Update plan status to PENDING (awaiting user approval)
      const updatedPlan = await this.prisma.plan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.PENDING },
        include: {
          paths: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      this.logger.log(`Plan created successfully: ${plan.id}`);
      this.plannerGateway.emitPlanUpdate(plan.id, updatedPlan);

      return updatedPlan;
    } catch (error) {
      this.logger.error(`Error creating plan: ${error.message}`, error.stack);

      // Update plan status to FAILED
      await this.prisma.plan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Generate execution paths using LLM
   */
  private async generateExecutionPaths(
    taskDescription: string,
    model: { provider: string; name: string },
  ): Promise<ExecutionPathData[]> {
    this.logger.log('Generating execution paths with LLM');

    const service = this.services[model.provider];
    if (!service) {
      throw new Error(`Unknown model provider: ${model.provider}`);
    }

    const prompt = buildPlanPrompt(taskDescription);

    const response = await service.generateMessage(
      '', // No system prompt needed, it's in the user message
      [
        {
          id: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: '',
          summaryId: null,
          role: Role.USER,
          content: [
            {
              type: 'text' as any,
              text: prompt,
            },
          ],
        },
      ],
      model.name,
      false, // No tools
      new AbortController().signal,
    );

    // Extract text from response
    const textBlock = response.contentBlocks.find(
      (block: any) => block.type === 'text',
    );
    if (!textBlock) {
      throw new Error('No text response from LLM');
    }

    // Parse JSON response
    const jsonMatch = (textBlock as any).text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }

    const planResponse: PlanGenerationResponse = JSON.parse(jsonMatch[0]);

    this.logger.log(`Generated ${planResponse.paths.length} execution paths`);
    
    // Log each path with details
    planResponse.paths.forEach((path, index) => {
      this.logger.log(`\n=== PATH ${index + 1}: ${path.name} ===`);
      this.logger.log(`Strategy: ${path.strategy}`);
      this.logger.log(`Estimated Tokens: ${path.estimatedTokens}`);
      this.logger.log(`Estimated Duration: ${path.estimatedDuration}`);
      this.logger.log(`Success Probability: ${path.successProbability}%`);
      this.logger.log(`Pros: ${path.pros.join(', ')}`);
      this.logger.log(`Cons: ${path.cons.join(', ')}`);
      this.logger.log(`Steps (${path.steps.length}):`);
      path.steps.forEach((step, stepIndex) => {
        this.logger.log(`  ${stepIndex + 1}. ${step.action}`);
        if (step.command) {
          this.logger.log(`     Command: ${step.command}`);
        }
      });
    });

    return planResponse.paths;
  }

  /**
   * Create an execution path with steps
   */
  private async createExecutionPath(
    planId: string,
    pathData: ExecutionPathData,
    order: number,
  ): Promise<void> {
    const path = await this.prisma.executionPath.create({
      data: {
        planId,
        name: pathData.name,
        description: pathData.description,
        strategy: pathData.strategy,
        estimatedTokens: pathData.estimatedTokens,
        estimatedDuration: pathData.estimatedDuration,
        successProbability: pathData.successProbability,
        pros: pathData.pros,
        cons: pathData.cons,
        order,
      },
    });

    // Create steps
    for (let i = 0; i < pathData.steps.length; i++) {
      const stepData = pathData.steps[i];
      await this.prisma.planStep.create({
        data: {
          pathId: path.id,
          order: i,
          action: stepData.action,
          description: stepData.description,
          type: stepData.type,
          command: stepData.command,
          screenshot: stepData.screenshot,
          verification: stepData.verification,
          estimatedTokens: stepData.estimatedTokens,
          checkpoint: stepData.checkpoint,
          dependencies: stepData.dependencies,
        },
      });
    }
  }

  /**
   * Get plan by ID with all related data
   */
  async getPlanById(planId: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        task: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    return plan;
  }

  /**
   * Get plan by task ID
   */
  async getPlanByTaskId(taskId: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { taskId },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Approve a plan and select an execution path
   */
  async approvePlan(planId: string, pathId: string): Promise<Plan> {
    this.logger.log(`Approving plan ${planId} with path ${pathId}`);

    // Verify path belongs to plan
    const path = await this.prisma.executionPath.findFirst({
      where: {
        id: pathId,
        planId,
      },
      include: {
        steps: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!path) {
      throw new NotFoundException(
        `Path ${pathId} not found in plan ${planId}`,
      );
    }

    // Log the selected path details
    this.logger.log(`\n=== USER SELECTED PATH: ${path.name} ===`);
    this.logger.log(`Strategy: ${path.strategy}`);
    this.logger.log(`Estimated Tokens: ${path.estimatedTokens}`);
    this.logger.log(`Steps to execute (${path.steps.length}):`);
    path.steps.forEach((step, index) => {
      this.logger.log(`  ${index + 1}. ${step.action}`);
      if (step.command) {
        this.logger.log(`     Command: ${step.command}`);
      }
    });

    // Update plan
    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        status: PlanStatus.APPROVED,
        selectedPathId: pathId,
      },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        task: true,
      },
    });

    this.plannerGateway.emitPlanUpdate(planId, updatedPlan);

    // Emit event to trigger task execution
    this.logger.log(`Emitting plan.approved event for task ${updatedPlan.taskId}`);
    this.eventEmitter.emit('plan.approved', {
      planId,
      taskId: updatedPlan.taskId,
    });

    return updatedPlan;
  }

  /**
   * Update a step in a plan
   */
  async updateStep(
    stepId: string,
    updates: {
      action?: string;
      description?: string;
      command?: string;
    },
  ): Promise<void> {
    await this.prisma.planStep.update({
      where: { id: stepId },
      data: updates,
    });

    // Get plan ID to emit update
    const step = await this.prisma.planStep.findUnique({
      where: { id: stepId },
      include: {
        path: {
          select: { planId: true },
        },
      },
    });

    if (step) {
      const plan = await this.getPlanById(step.path.planId);
      this.plannerGateway.emitPlanUpdate(plan.id, plan);
    }
  }

  /**
   * Cancel a plan
   */
  async cancelPlan(planId: string): Promise<Plan> {
    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: { status: PlanStatus.CANCELLED },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    this.plannerGateway.emitPlanUpdate(planId, updatedPlan);

    return updatedPlan;
  }
}
