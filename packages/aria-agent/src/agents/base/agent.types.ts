/**
 * Agent types, enums, and interfaces for multi-agent system
 */

export enum AgentRole {
  CLARIFIER = 'CLARIFIER',
  ORCHESTRATOR = 'ORCHESTRATOR',
  WEB = 'WEB',
  DESKTOP = 'DESKTOP',
  WORKFLOW = 'WORKFLOW',
  PERCEPTION = 'PERCEPTION',
  VERIFIER = 'VERIFIER',
  RECOVERY = 'RECOVERY',
  REPORTER = 'REPORTER',
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

export interface ActionHistoryEntry {
  agent: string;
  action: string;
  result: 'success' | 'failure';
  timestamp: string;
  details?: any;
}

export interface AgentExecutionMetadata {
  agentName: string;
  startTime: string;
  endTime?: string;
  tokensUsed?: number;
  cost?: number;
  result: 'success' | 'failure' | 'in_progress';
  error?: string;
}

export interface AgentModelConfig {
  provider: 'groq' | 'bytez';
  model: string;
  description: string;
  userSelectable?: boolean;
  strictJson?: boolean;
  fallback?: string;
}
