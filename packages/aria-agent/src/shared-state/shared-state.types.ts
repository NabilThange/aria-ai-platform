/**
 * Shared state schema types for multi-agent communication
 * All keys are namespaced as task:{taskId}:{key}
 * All keys have 24-hour TTL (86400 seconds)
 */

export interface ActionHistoryEntry {
  agent: string;
  action: string;
  result: 'success' | 'failure';
  timestamp: string;
  details?: any;
}

export interface FailureLogEntry {
  step: string;
  attempt: number;
  error: string;
  timestamp: string;
}

export interface ExecutionStep {
  id: string;
  type: 'web' | 'desktop';
  description: string;
  details?: any;
}

export interface TaskError {
  step: string;
  message: string;
  timestamp: string;
}

/**
 * Common shared state keys used across agents
 */
export const SharedStateKeys = {
  TASK_GOAL: 'task_goal',
  CURRENT_STEP: 'current_step',
  ACTION_HISTORY: 'action_history',
  FAILURE_LOG: 'failure_log',
  DOWNLOADED_FILES: 'downloaded_files',
  STATUS: 'status',
  ERROR: 'error',
  RECOVERY_STRATEGY: 'recovery_strategy',
  COST_TRACKING: 'cost_tracking',
} as const;
