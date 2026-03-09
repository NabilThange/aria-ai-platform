// Planning system types for frontend

export enum PlanStatus {
  PLANNING = 'PLANNING',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum Strategy {
  TERMINAL = 'TERMINAL',
  GUI = 'GUI',
  HYBRID = 'HYBRID',
  BROWSER = 'BROWSER',
}

export enum StepType {
  TERMINAL = 'TERMINAL',
  GUI = 'GUI',
  BROWSER = 'BROWSER',
  WAIT = 'WAIT',
  VERIFY = 'VERIFY',
}

export enum StepStatus {
  PENDING = 'PENDING',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export interface PlanStep {
  id: string;
  pathId: string;
  order: number;
  action: string;
  description: string;
  type: StepType;
  command?: string;
  screenshot: boolean;
  verification?: string;
  estimatedTokens: number;
  checkpoint: boolean;
  dependencies: string[];
  status: StepStatus;
  executedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
}

export interface ExecutionPath {
  id: string;
  planId: string;
  name: string;
  description: string;
  strategy: Strategy;
  estimatedTokens: number;
  estimatedDuration: number;
  successProbability: number;
  pros: string[];
  cons: string[];
  order: number;
  createdAt: string;
  steps: PlanStep[];
}

export interface Plan {
  id: string;
  taskId: string;
  taskDescription: string;
  status: PlanStatus;
  selectedPathId?: string;
  createdAt: string;
  updatedAt: string;
  paths: ExecutionPath[];
}

export interface ExecutionProgress {
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  progress: number;
}
