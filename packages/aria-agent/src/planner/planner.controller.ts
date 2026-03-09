import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PlannerService } from './planner.service';
import { ExecutorService } from '../executor/executor.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ApprovePlanDto } from './dto/approve-plan.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Controller('plans')
export class PlannerController {
  constructor(
    private readonly plannerService: PlannerService,
    @Inject(forwardRef(() => ExecutorService))
    private readonly executorService: ExecutorService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    console.log('=== CREATE PLAN REQUEST ===');
    console.log('DTO received:', JSON.stringify(createPlanDto, null, 2));
    console.log('DTO type:', typeof createPlanDto);
    console.log('DTO keys:', Object.keys(createPlanDto));
    
    try {
      const result = await this.plannerService.createPlan(createPlanDto);
      console.log('Plan created successfully:', result.id);
      return result;
    } catch (error: any) {
      console.error('Error in createPlan controller:', error.message, error.stack);
      throw error;
    }
  }

  @Get(':id')
  async getPlan(@Param('id') id: string) {
    return this.plannerService.getPlanById(id);
  }

  @Get('task/:taskId')
  async getPlanByTaskId(@Param('taskId') taskId: string) {
    return this.plannerService.getPlanByTaskId(taskId);
  }

  @Put(':id/approve')
  async approvePlan(
    @Param('id') id: string,
    @Body() approvePlanDto: ApprovePlanDto,
  ) {
    const approvedPlan = await this.plannerService.approvePlan(
      id,
      approvePlanDto.pathId,
    );

    // DO NOT automatically execute - let the agent handle it
    // The agent will see the APPROVED status and proceed with execution
    // using its computer control tools with the plan as context

    return approvedPlan;
  }

  @Put(':id/cancel')
  async cancelPlan(@Param('id') id: string) {
    return this.plannerService.cancelPlan(id);
  }

  @Put('steps/:stepId')
  async updateStep(
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    return this.plannerService.updateStep(stepId, updateStepDto);
  }
}

