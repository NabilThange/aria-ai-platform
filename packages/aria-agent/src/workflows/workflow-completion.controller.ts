import { Controller, Post, Param, Body, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Webhook payload for workflow completion
 */
export interface WorkflowCompletionPayload {
  success: boolean;
  message?: string;
  files?: string[];
  error?: string;
  metadata?: Record<string, any>;
  progress?: number;
  status?: string;
}

/**
 * Controller for receiving workflow completion webhooks
 * Used by external processes (like OpenCode) to notify when they're done
 */
@Controller('workflows/completion')
export class WorkflowCompletionController {
  private readonly logger = new Logger(WorkflowCompletionController.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Mark workflow as complete
   * POST /workflows/completion/:taskId/:workflowName
   * 
   * Example curl:
   * curl -X POST http://localhost:9991/workflows/completion/abc123/opencode-request \
   *   -H "Content-Type: application/json" \
   *   -d '{"success": true, "message": "Task completed", "files": ["/home/user/Desktop/file.pdf"]}'
   */
  @Post(':taskId/:workflowName')
  @HttpCode(HttpStatus.OK)
  async markComplete(
    @Param('taskId') taskId: string,
    @Param('workflowName') workflowName: string,
    @Body() payload: WorkflowCompletionPayload,
  ): Promise<{ received: true; timestamp: string }> {
    const timestamp = new Date().toISOString();
    
    this.logger.log(
      `📥 Webhook received: ${workflowName} (task: ${taskId}) - ${payload.success ? '✅ SUCCESS' : '❌ FAILED'}`,
    );
    
    if (payload.files && payload.files.length > 0) {
      this.logger.log(`   Files: ${payload.files.join(', ')}`);
    }
    
    if (payload.message) {
      this.logger.log(`   Message: ${payload.message}`);
    }
    
    if (payload.error) {
      this.logger.error(`   Error: ${payload.error}`);
    }

    // Emit event that workflow execution is waiting for
    const eventName = `workflow.${taskId}.${workflowName}.complete`;
    this.eventEmitter.emit(eventName, {
      ...payload,
      timestamp,
    });

    this.logger.debug(`   Event emitted: ${eventName}`);

    return { received: true, timestamp };
  }

  /**
   * Receive progress updates from workflow
   * POST /workflows/progress/:taskId/:workflowName
   * 
   * Example curl:
   * curl -X POST http://localhost:9991/workflows/progress/abc123/opencode-request \
   *   -H "Content-Type: application/json" \
   *   -d '{"progress": 50, "status": "Creating slides..."}'
   */
  @Post('/progress/:taskId/:workflowName')
  @HttpCode(HttpStatus.OK)
  async reportProgress(
    @Param('taskId') taskId: string,
    @Param('workflowName') workflowName: string,
    @Body() payload: { progress: number; status: string; metadata?: Record<string, any> },
  ): Promise<{ received: true; timestamp: string }> {
    const timestamp = new Date().toISOString();
    
    this.logger.log(
      `📊 Progress update: ${workflowName} (task: ${taskId}) - ${payload.progress}% - ${payload.status}`,
    );

    // Emit progress event
    const eventName = `workflow.${taskId}.${workflowName}.progress`;
    this.eventEmitter.emit(eventName, {
      ...payload,
      timestamp,
    });

    return { received: true, timestamp };
  }
}
