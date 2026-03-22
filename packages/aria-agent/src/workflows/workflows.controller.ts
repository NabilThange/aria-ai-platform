import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkflowService } from '../services/workflow.service';
import { WorkflowMetadata, WorkflowResult } from './workflow.interface';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowService: WorkflowService) {}

  /**
   * List all available workflows
   * GET /workflows
   */
  @Get()
  async listWorkflows(): Promise<WorkflowMetadata[]> {
    return this.workflowService.listWorkflows();
  }

  /**
   * Get metadata for a specific workflow
   * GET /workflows/:name
   */
  @Get(':name')
  async getWorkflow(@Param('name') name: string): Promise<WorkflowMetadata> {
    return this.workflowService.readWorkflow(name);
  }

  /**
   * Execute a workflow
   * POST /workflows/:name/execute
   */
  @Post(':name/execute')
  @HttpCode(HttpStatus.OK)
  async executeWorkflow(
    @Param('name') name: string,
    @Body() body: { variables: Record<string, any>; taskId?: string },
  ): Promise<WorkflowResult> {
    const taskId = body.taskId || 'manual-execution';
    return this.workflowService.runWorkflow(name, body.variables, taskId);
  }
}
