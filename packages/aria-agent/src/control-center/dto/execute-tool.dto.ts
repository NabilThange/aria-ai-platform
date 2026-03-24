import { IsString, IsObject, IsEnum } from 'class-validator';

export enum AgentType {
  WEB = 'WEB',
  DESKTOP = 'DESKTOP',
  WORKFLOW = 'WORKFLOW',
}

export class ExecuteToolDto {
  @IsString()
  toolName: string;

  @IsObject()
  parameters: Record<string, any>;

  @IsEnum(AgentType)
  agentName: AgentType;
}
