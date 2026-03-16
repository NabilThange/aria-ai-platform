import { SharedStateService } from '../../shared-state/shared-state.service';
import { Logger } from '@nestjs/common';

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

export interface ActionHistoryEntry {
  agent: string;
  action: string;
  result: 'success' | 'failure';
  timestamp: string;
  details?: any;
}

export abstract class BaseAgent {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly sharedState: SharedStateService,
    protected readonly agentName: string,
  ) {
    this.logger = new Logger(agentName);
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract run(input: any, taskId: string): Promise<AgentResult>;

  /**
   * Wrapper for run method with logging
   * This is used by orchestration service to track agent execution
   */
  async executeWithLogging(input: any, taskId: string): Promise<AgentResult> {
    const startTime = Date.now();
    this.logger.log(`🚀 [${this.agentName}] Starting execution for task ${taskId}`);
    this.logger.debug(`📥 [${this.agentName}] Input: ${JSON.stringify(input).substring(0, 200)}...`);
    
    try {
      const result = await this.run(input, taskId);
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.log(`✅ [${this.agentName}] Completed successfully in ${duration}ms`);
        if (result.tokensUsed) {
          this.logger.log(`💰 [${this.agentName}] Tokens used: ${result.tokensUsed}, Cost: $${result.cost?.toFixed(6) || 0}`);
        }
      } else {
        this.logger.error(`❌ [${this.agentName}] Failed after ${duration}ms: ${result.error}`);
      }
      
      this.logger.debug(`📤 [${this.agentName}] Output: ${JSON.stringify(result.data).substring(0, 200)}...`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`💥 [${this.agentName}] Exception after ${duration}ms: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read from shared state
   */
  protected async readState<T>(taskId: string, key: string): Promise<T | null> {
    return this.sharedState.get<T>(taskId, key);
  }

  /**
   * Write to shared state
   */
  protected async writeState(taskId: string, key: string, value: any): Promise<void> {
    await this.sharedState.set(taskId, key, value);
  }

  /**
   * Append to action history
   */
  protected async appendToHistory(taskId: string, entry: ActionHistoryEntry): Promise<void> {
    await this.sharedState.appendToArray(taskId, 'action_history', entry);
  }

  /**
   * Log cost for tracking
   */
  protected logCost(tokens: number, model: string): void {
    this.logger.log(`Cost: ${tokens} tokens on ${model}`);
  }
}
