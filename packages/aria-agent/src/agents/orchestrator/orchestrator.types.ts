import {
  WorkflowUserStep,
  WorkflowVariable,
} from '../../workflows/workflow.interface';
import { ClarifiedTask } from '../clarifier/clarifier.types';

/**
 * OrchestratorAgent Output Schema
 * Section 9.7 of architecture document
 */

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimated_duration_minutes: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ExecutionStep {
  id: string;                 // "step_1", "step_2", etc.
  type: 'web' | 'desktop' | 'workflow';
  description: string;        // what to do: "Navigate to Gmail and click Compose"
  success_criteria: string;   // how Verifier knows it worked: "Compose window is visible"
  context?: string;           // extra info the agent needs
  depends_on?: string[];      // IDs of steps that must complete first
  
  // Workflow-specific fields (only used when type === 'workflow')
  workflow_name?: string;     // Name of workflow to execute
  workflow_vars?: Record<string, any>;  // Variables to pass to workflow
  display_steps?: WorkflowUserStep[];   // UI-only workflow display steps
  workflow_var_definitions?: WorkflowVariable[]; // UI-safe workflow input schema
}

export interface WorkflowSelectionContext {
  workflow_name: string;
  workflow_vars: Record<string, any>;
  missing_vars?: string[];
}

export interface WorkflowClarificationResult {
  kind: 'needs_clarification';
  clarification: ClarifiedTask;
  workflow_context: WorkflowSelectionContext;
}

export interface WorkflowPlanReadyResult {
  kind: 'plan';
  plan: ExecutionPlan;
}

export type OrchestratorPlanResult =
  | WorkflowPlanReadyResult
  | WorkflowClarificationResult;
