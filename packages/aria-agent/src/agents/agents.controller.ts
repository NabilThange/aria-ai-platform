import { Controller, Get, Put, Body, Logger } from '@nestjs/common';
import { AgentsService, AgentConfig } from './agents.service';

@Controller('agents')
export class AgentsController {
  private readonly logger = new Logger(AgentsController.name);

  constructor(private readonly agentsService: AgentsService) {}

  @Get('config')
  async getAgentConfigs(): Promise<{
    agents: AgentConfig[];
    availableModels: { groq: any[]; bytez: any[]; google: any[] };
  }> {
    this.logger.log('Fetching agent configurations');
    return this.agentsService.getAgentConfigs();
  }

  @Put('config')
  async updateAgentConfigs(
    @Body() body: { agents: AgentConfig[] },
  ): Promise<{
    success: boolean;
    message: string;
    agents: AgentConfig[];
  }> {
    this.logger.log('Updating agent configurations');
    return this.agentsService.updateAgentConfigs(body.agents);
  }
}
