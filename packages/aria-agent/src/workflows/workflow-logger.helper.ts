import { BrowserLoggerService } from '../logger/browser-logger.service';
import { MessagesService } from '../messages/messages.service';

/**
 * Helper class to wrap workflow tool calls with logging
 * This enables frontend visibility of individual workflow tool executions
 */
export class WorkflowLogger {
  constructor(
    private readonly browserLogger: BrowserLoggerService,
    private readonly taskId: string,
    private readonly workflowName: string,
    private readonly messagesService?: MessagesService,
  ) {}

  /**
   * Emit a natural, conversational AI thinking message
   * Makes the workflow feel alive by narrating what it's doing
   * @param thinking - Natural language description of what the AI is thinking/doing
   */
  async think(thinking: string): Promise<void> {
    if (this.messagesService) {
      await this.messagesService.createAgentActionMessage(
        this.taskId,
        'WORKFLOW',
        'thinking',
        { thinking }
      );
    }
  }

  /**
   * Wrap a tool call with logging
   * @param toolName - Name of the tool being called (e.g., 'launchApplication', 'type', 'screenshot')
   * @param toolInput - Input parameters for the tool
   * @param toolFn - The actual tool function to execute
   * @returns The result of the tool function
   */
  async logToolCall<T>(
    toolName: string,
    toolInput: any,
    toolFn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();

    // Log tool call start
    this.browserLogger.logToolCall(this.taskId, `WORKFLOW:${this.workflowName}`, {
      name: toolName,
      input: toolInput,
    });

    try {
      // Execute the tool
      const result = await toolFn();
      const duration = Date.now() - startTime;

      // Log successful result
      this.browserLogger.logToolResult(this.taskId, `WORKFLOW:${this.workflowName}`, {
        toolName,
        success: true,
        output: result,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Log error result
      this.browserLogger.logToolResult(this.taskId, `WORKFLOW:${this.workflowName}`, {
        toolName,
        success: false,
        error: error.message,
        duration,
      });

      throw error; // Re-throw to maintain workflow error handling
    }
  }
}
