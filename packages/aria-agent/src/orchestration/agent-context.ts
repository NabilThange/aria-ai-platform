import { SharedStateService } from '../shared-state/shared-state.service';
import { ActionHistoryEntry } from '../agents/base/base.agent';

/**
 * AgentContext - Wrapper class that passes sharedState + taskId + currentStep to every agent call
 * Prevents agents from needing to know about Redis directly
 * 
 * Each agent receives an AgentContext instance instead of raw SharedStateService
 */
export class AgentContext {
  constructor(
    private readonly sharedState: SharedStateService,
    private readonly taskId: string,
    private currentStepId?: string,
  ) {}

  /**
   * Get the task ID
   */
  getTaskId(): string {
    return this.taskId;
  }

  /**
   * Get the current step ID
   */
  getCurrentStepId(): string | undefined {
    return this.currentStepId;
  }

  /**
   * Set the current step ID
   */
  setCurrentStepId(stepId: string): void {
    this.currentStepId = stepId;
  }

  /**
   * Read from shared state (scoped to this task)
   */
  async read<T>(key: string): Promise<T | null> {
    return this.sharedState.get<T>(this.taskId, key);
  }

  /**
   * Write to shared state (scoped to this task)
   */
  async write(key: string, value: any): Promise<void> {
    await this.sharedState.set(this.taskId, key, value);
  }

  /**
   * Delete from shared state (scoped to this task)
   */
  async delete(key: string): Promise<void> {
    await this.sharedState.delete(this.taskId, key);
  }

  /**
   * Check if key exists (scoped to this task)
   */
  async exists(key: string): Promise<boolean> {
    return this.sharedState.exists(this.taskId, key);
  }

  /**
   * Append to array in shared state (scoped to this task)
   */
  async appendToArray<T>(key: string, item: T): Promise<void> {
    await this.sharedState.appendToArray(this.taskId, key, item);
  }

  /**
   * Get array from shared state (scoped to this task)
   */
  async getArray<T>(key: string): Promise<T[]> {
    return this.sharedState.getArray<T>(this.taskId, key);
  }

  /**
   * Append to action history (convenience method)
   */
  async logAction(entry: ActionHistoryEntry): Promise<void> {
    await this.sharedState.appendToArray(this.taskId, 'action_history', entry);
  }

  /**
   * Get action history (convenience method)
   */
  async getActionHistory(): Promise<ActionHistoryEntry[]> {
    return this.sharedState.getArray<ActionHistoryEntry>(this.taskId, 'action_history');
  }

  /**
   * Get all state for this task (debugging)
   */
  async getAllState(): Promise<Record<string, any>> {
    return this.sharedState.getTaskState(this.taskId);
  }
}
