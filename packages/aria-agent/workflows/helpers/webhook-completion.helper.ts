import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowLogger } from '../../src/workflows/workflow-logger.helper';

/**
 * Webhook completion result
 */
export interface WebhookCompletionResult {
  success: boolean;
  message?: string;
  files?: string[];
  error?: string;
  metadata?: Record<string, any>;
  finalScreenshot?: string;
  completionMethod: 'webhook' | 'vision-fallback' | 'timeout';
}

/**
 * Wait for webhook completion notification
 * Returns a promise that resolves when the webhook is received
 */
export async function waitForWebhookCompletion(
  taskId: string,
  workflowName: string,
  eventEmitter: EventEmitter2,
  logger: WorkflowLogger,
  timeoutMs: number = 300000, // 5 minutes default
): Promise<WebhookCompletionResult> {
  console.log(`🔔 Waiting for webhook completion (max ${timeoutMs / 1000}s)...`);
  console.log(`   Event: workflow.${taskId}.${workflowName}.complete`);

  return new Promise((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Webhook not received within ${timeoutMs / 1000} seconds`));
    }, timeoutMs);

    const eventName = `workflow.${taskId}.${workflowName}.complete`;
    
    // Listen for completion webhook
    const completionHandler = async (payload: any) => {
      console.log(`✅ Webhook received! Success: ${payload.success}`);
      cleanup();
      
      // Take final screenshot for confirmation
      // Note: desktop service should be passed separately if needed
      
      resolve({
        success: payload.success,
        message: payload.message,
        files: payload.files,
        error: payload.error,
        metadata: payload.metadata,
        completionMethod: 'webhook',
      });
    };

    // Listen for progress updates (optional, just for logging)
    const progressEventName = `workflow.${taskId}.${workflowName}.progress`;
    const progressHandler = (payload: any) => {
      console.log(`📊 Progress: ${payload.progress}% - ${payload.status}`);
      logger.think(`⚙️ ${payload.status} (${payload.progress}%)`).catch(err => {
        console.error('Failed to log progress:', err);
      });
    };

    eventEmitter.once(eventName, completionHandler);
    eventEmitter.on(progressEventName, progressHandler);

    function cleanup() {
      clearTimeout(timeoutHandle);
      eventEmitter.removeListener(eventName, completionHandler);
      eventEmitter.removeListener(progressEventName, progressHandler);
    }
  });
}

/**
 * Generate webhook instructions for OpenCode prompt
 * These instructions tell OpenCode to curl the completion endpoint when done
 */
export function generateWebhookInstructions(
  taskId: string,
  workflowName: string,
  backendUrl: string = 'http://localhost:9991',
): string {
  return `

═══════════════════════════════════════════════════════════════════════════
CRITICAL: COMPLETION NOTIFICATION (YOU MUST DO THIS!)
═══════════════════════════════════════════════════════════════════════════

After completing ALL tasks (including sending emails), you MUST notify the system
by running this exact command in the terminal:

curl -X POST ${backendUrl}/workflows/completion/${taskId}/${workflowName} \\
  -H "Content-Type: application/json" \\
  -d '{"success": true, "message": "Task completed successfully", "files": ["/home/user/Desktop/yourfile.ext"]}'

IMPORTANT DETAILS:
1. Replace "/home/user/Desktop/yourfile.ext" with the ACTUAL file paths you created
2. If you created multiple files, list them all: "files": ["/path/to/file1.pdf", "/path/to/file2.pptx"]
3. This command tells the system you are DONE - do NOT skip this step!
4. Run this as the ABSOLUTE LAST STEP after everything else is complete

If you encounter an error and cannot complete the task, use this command instead:

curl -X POST ${backendUrl}/workflows/completion/${taskId}/${workflowName} \\
  -H "Content-Type: application/json" \\
  -d '{"success": false, "error": "Description of what went wrong"}'

OPTIONAL: You can send progress updates while working (not required):

curl -X POST ${backendUrl}/workflows/progress/${taskId}/${workflowName} \\
  -H "Content-Type: application/json" \\
  -d '{"progress": 50, "status": "Creating slides..."}'

═══════════════════════════════════════════════════════════════════════════
REMEMBER: The curl command at the end is MANDATORY - the system is waiting for it!
═══════════════════════════════════════════════════════════════════════════
`;
}
