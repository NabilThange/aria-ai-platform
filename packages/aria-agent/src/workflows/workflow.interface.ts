import { PinchTabService } from '../services/pinchtab.service';
import { DesktopService } from '../services/desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { MessagesService } from '../messages/messages.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
  messagesService: MessagesService; // For creating thinking messages
  taskId: string; // Add taskId for logging context
  eventEmitter: EventEmitter2; // For webhook-based completion detection
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
