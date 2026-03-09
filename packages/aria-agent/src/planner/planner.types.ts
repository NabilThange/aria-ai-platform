import { Strategy, StepType, PlanStatus, StepStatus } from '@prisma/client';

export interface CreatePlanInput {
  taskId: string;
  taskDescription: string;
  model: {
    provider: string;
    name: string;
    title: string;
  };
}

export interface ExecutionPathData {
  name: string;
  description: string;
  strategy: Strategy;
  estimatedTokens: number;
  estimatedDuration: number;
  successProbability: number;
  pros: string[];
  cons: string[];
  steps: PlanStepData[];
}

export interface PlanStepData {
  action: string;
  description: string;
  type: StepType;
  command?: string;
  screenshot: boolean;
  verification?: string;
  estimatedTokens: number;
  checkpoint: boolean;
  dependencies: string[];
}

export interface ExecutionContext {
  planId: string;
  pathId: string;
  currentStepId: string | null;
  completedSteps: string[];
  checkpoints: CheckpointData[];
  variables: Record<string, any>;
}

export interface CheckpointData {
  id: string;
  stepId: string;
  timestamp: Date;
  screenshot?: string;
  state: Record<string, any>;
}

export interface PlanGenerationResponse {
  paths: ExecutionPathData[];
}
