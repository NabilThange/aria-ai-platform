import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { ControlCenterService } from './control-center.service';
import { ExecuteToolDto } from './dto/execute-tool.dto';

@Controller('control/tasks')
export class ControlCenterController {
  private readonly logger = new Logger(ControlCenterController.name);

  constructor(private readonly controlCenterService: ControlCenterService) {}

  @Post(':taskId/execute-tool')
  async executeTool(
    @Param('taskId') taskId: string,
    @Body() executeToolDto: ExecuteToolDto,
  ) {
    this.logger.log(`Manual tool execution requested for task ${taskId}: ${executeToolDto.toolName}`);
    return this.controlCenterService.executeTool(taskId, executeToolDto);
  }

  @Post(':taskId/stop-agent')
  async stopAgent(@Param('taskId') taskId: string) {
    this.logger.log(`Stop agent requested for task ${taskId}`);
    return this.controlCenterService.stopAgent(taskId);
  }

  @Post(':taskId/resume-agent')
  async resumeAgent(@Param('taskId') taskId: string) {
    this.logger.log(`Resume agent requested for task ${taskId}`);
    return this.controlCenterService.resumeAgent(taskId);
  }

  @Get(':taskId/operator-state')
  async getOperatorState(@Param('taskId') taskId: string) {
    return this.controlCenterService.getOperatorState(taskId);
  }

  @Post(':taskId/update-status')
  async updateTaskStatus(
    @Param('taskId') taskId: string,
    @Body() body: { status: string },
  ) {
    this.logger.log(`Update task status requested for task ${taskId}: ${body.status}`);
    return this.controlCenterService.updateTaskStatus(taskId, body.status);
  }
}
