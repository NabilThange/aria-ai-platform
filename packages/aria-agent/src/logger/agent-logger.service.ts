import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * AgentLogger - Structured logging for agent execution with clear visual separators
 * Focuses on critical information: user requests, agent execution, and outputs
 * Reduces noise from repetitive metadata and processing details
 */
@Injectable()
export class AgentLoggerService {
  private readonly logger = new Logger('AgentExecution');

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Log new user request with full context
   */
  logUserRequest(data: {
    taskId: string;
    userInput: string;
    sessionId?: string;
    timestamp?: string;
  }) {
    const timestamp = data.timestamp || new Date().toISOString();
    
    this.logger.log('\n' + '='.repeat(80));
    this.logger.log('NEW USER REQUEST');
    this.logger.log('='.repeat(80));
    this.logger.log(`Timestamp: ${timestamp}`);
    this.logger.log(`Task ID: ${data.taskId}`);
    if (data.sessionId) {
      this.logger.log(`Session ID: ${data.sessionId}`);
    }
    this.logger.log(`User Input: ${data.userInput}`);
    this.logger.log('='.repeat(80) + '\n');
  }

  /**
   * Log agent execution start with input details
   */
  logAgentExecution(data: {
    taskId: string;
    agentName: string;
    systemPrompt: string;
    userPrompt: string;
    redisContext?: string;
    otherContext?: Record<string, any>;
    inputTokens?: number;
  }) {
    this.logger.log('\n' + '-'.repeat(80));
    this.logger.log(`AGENT FIRED: ${data.agentName}`);
    this.logger.log('-'.repeat(80));
    this.logger.log(`Task ID: ${data.taskId}`);
    
    // System prompt preview (first 20 + last 20 chars)
    const sysPrompt = data.systemPrompt || '';
    if (sysPrompt.length > 50) {
      this.logger.log(`System Prompt: ${sysPrompt.substring(0, 20)}...${sysPrompt.substring(sysPrompt.length - 20)} (${sysPrompt.length} chars)`);
    } else {
      this.logger.log(`System Prompt: ${sysPrompt}`);
    }
    
    // User prompt (full, no truncation)
    this.logger.log(`User Prompt: ${data.userPrompt}`);
    
    // Redis context (first 90 chars)
    if (data.redisContext) {
      const redisPreview = data.redisContext.length > 90 
        ? data.redisContext.substring(0, 90) + `... (${data.redisContext.length} chars total)`
        : data.redisContext;
      this.logger.log(`Redis Context: ${redisPreview}`);
    }
    
    // Other context (first 30 chars of each)
    if (data.otherContext) {
      Object.entries(data.otherContext).forEach(([key, value]) => {
        const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
        const preview = valueStr.length > 30 
          ? valueStr.substring(0, 30) + `... (${valueStr.length} chars)`
          : valueStr;
        this.logger.log(`${key}: ${preview}`);
      });
    }
    
    if (data.inputTokens) {
      this.logger.log(`Input Token Count: ${data.inputTokens}`);
    }
    
    this.logger.log('-'.repeat(80) + '\n');
  }

  /**
   * Log agent output with complete, untruncated response
   */
  logAgentOutput(data: {
    taskId: string;
    agentName: string;
    rawOutput: string;
    outputTokens?: number;
    executionTime?: number;
    status: 'success' | 'error';
    error?: string;
  }) {
    this.logger.log('\n' + '<'.repeat(80));
    this.logger.log(`AGENT RESPONSE: ${data.agentName}`);
    this.logger.log('<'.repeat(80));
    this.logger.log(`Task ID: ${data.taskId}`);
    this.logger.log(`Status: ${data.status.toUpperCase()}`);
    
    if (data.status === 'success') {
      this.logger.log(`Raw Output: ${data.rawOutput}`);
    } else {
      this.logger.log(`Error: ${data.error || 'Unknown error'}`);
    }
    
    if (data.outputTokens) {
      this.logger.log(`Output Token Count: ${data.outputTokens}`);
    }
    
    if (data.executionTime) {
      this.logger.log(`Execution Time: ${data.executionTime}ms`);
    }
    
    this.logger.log('<'.repeat(80) + '\n');
  }

  /**
   * Log critical errors with full context
   */
  logError(data: {
    taskId?: string;
    agentName?: string;
    errorType: string;
    errorMessage: string;
    stackTrace?: string;
  }) {
    this.logger.error('\n' + '!'.repeat(80));
    this.logger.error('ERROR');
    this.logger.error('!'.repeat(80));
    if (data.taskId) {
      this.logger.error(`Task ID: ${data.taskId}`);
    }
    if (data.agentName) {
      this.logger.error(`Agent: ${data.agentName}`);
    }
    this.logger.error(`Error Type: ${data.errorType}`);
    this.logger.error(`Error Message: ${data.errorMessage}`);
    if (data.stackTrace) {
      this.logger.error(`Stack Trace:\n${data.stackTrace}`);
    }
    this.logger.error('!'.repeat(80) + '\n');
  }

  /**
   * Log key state changes (API key rotation, agent switches, etc.)
   */
  logStateChange(data: {
    changeType: string;
    details: string;
    taskId?: string;
  }) {
    this.logger.log(`[STATE CHANGE] ${data.changeType}: ${data.details}${data.taskId ? ` (Task: ${data.taskId})` : ''}`);
  }

  /**
   * Log tool execution (concise format)
   */
  logToolExecution(data: {
    taskId: string;
    agentName: string;
    toolName: string;
    success: boolean;
    duration: number;
    error?: string;
  }) {
    const status = data.success ? '✓' : '✗';
    const msg = `[TOOL] ${status} ${data.toolName} (${data.duration}ms)${data.error ? ` - ${data.error}` : ''}`;
    
    if (data.success) {
      this.logger.debug(msg);
    } else {
      this.logger.warn(msg);
    }
  }
}
