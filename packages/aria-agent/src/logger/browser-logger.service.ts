import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * BrowserLoggerService - Emits detailed agent execution logs to browser console
 * Uses WebSocket events to send structured logs to connected clients
 */
@Injectable()
export class BrowserLoggerService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Log agent execution start with input details
   * System prompts are excluded to reduce token usage and WebSocket traffic
   */
  logAgentStart(taskId: string, agentName: string, input: {
    systemPrompt?: string;  // Optional, not logged
    userPrompt: string;
    context?: any;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'agent.start',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        // systemPrompt excluded - reduces token usage and WebSocket payload
        systemPromptLength: input.systemPrompt?.length || 0,  // Track size only
        userPrompt: input.userPrompt,
        context: input.context,
      },
    });
  }

  /**
   * Log agent LLM response with full output
   */
  logAgentResponse(taskId: string, agentName: string, response: {
    model: string;
    provider: string;
    contentBlocks: any[];
    tokenUsage: any;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'agent.response',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        model: response.model,
        provider: response.provider,
        contentBlocks: response.contentBlocks,
        tokenUsage: response.tokenUsage,
      },
    });
  }

  /**
   * Log tool call with exact syntax
   */
  logToolCall(taskId: string, agentName: string, toolCall: {
    name: string;
    input: any;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'tool.call',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        toolName: toolCall.name,
        toolInput: toolCall.input,
      },
    });
  }

  /**
   * Log tool result
   */
  logToolResult(taskId: string, agentName: string, result: {
    toolName: string;
    success: boolean;
    output?: any;
    error?: string;
    duration: number;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'tool.result',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        toolName: result.toolName,
        success: result.success,
        output: result.output,
        error: result.error,
        duration: result.duration,
      },
    });
  }

  /**
   * Log agent completion
   */
  logAgentComplete(taskId: string, agentName: string, result: {
    success: boolean;
    output: any;
    tokensUsed?: number;
    cost?: number;
    duration: number;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'agent.complete',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        success: result.success,
        output: result.output,
        tokensUsed: result.tokensUsed,
        cost: result.cost,
        duration: result.duration,
      },
    });
  }

  /**
   * Log agent error
   */
  logAgentError(taskId: string, agentName: string, error: {
    message: string;
    stack?: string;
  }) {
    this.eventEmitter.emit('browser.log', {
      taskId,
      type: 'agent.error',
      timestamp: new Date().toISOString(),
      data: {
        agentName,
        error: error.message,
        stack: error.stack,
      },
    });
  }
}
