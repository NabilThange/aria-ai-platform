import { PinchTabService } from '../services/pinchtab.service';
import { DesktopService } from '../services/desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';

/**
 * Workflow metadata - exported from each .workflow.ts file
 */
export interface WorkflowMetadata {
  name: string;
  description: string;
  version: string;
  timeout_ms: number;
  variables: WorkflowVariable[];
}

/**
 * Variable definition for workflow
 */
export interface WorkflowVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
  default?: any;
}

/**
 * Services available to workflows
 */
export interface WorkflowServices {
  pinchTab: PinchTabService;
  desktop: DesktopService;
  browserLogger: BrowserLoggerService;
  taskId: string; // Add taskId for logging context
}

/**
 * Result returned by workflow execution
 */
export interface WorkflowResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Workflow module structure (what we import from .workflow.ts files)
 */
export interface WorkflowModule {
  metadata: WorkflowMetadata;
  execute: (
    variables: Record<string, any>,
    services: WorkflowServices,
  ) => Promise<WorkflowResult>;
}
