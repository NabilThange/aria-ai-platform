import { Injectable, Logger } from '@nestjs/common';

export interface PinchTabInstance {
  id: string;
  url: string;
}

export interface PinchTabSnapshot {
  html: string;
  elements: Array<{
    ref: string;
    tag: string;
    text?: string;
    attributes?: Record<string, string>;
  }>;
}

export interface PinchTabAction {
  kind: 'click' | 'fill' | 'type' | 'navigate' | 'submit' | 'scroll' | 'wait' | 'press';
  ref?: string;
  value?: string;
  text?: string;  // For type action
  key?: string;   // For press action
  url?: string;
  direction?: 'up' | 'down';
  amount?: number;
  ms?: number;
}

@Injectable()
export class PinchTabService {
  private readonly logger = new Logger(PinchTabService.name);
  private baseUrl: string;
  // Task-scoped instances: Map<taskId, { instance, tabId }>
  private taskInstances: Map<string, { instance: PinchTabInstance; tabId: string | null }> = new Map();
  
  // Legacy support (deprecated - will be removed)
  private currentInstance: PinchTabInstance | null = null;
  private currentTabId: string | null = null;

  constructor() {
    this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://aria-desktop:9867';
    this.logger.log(`PinchTab base URL: ${this.baseUrl}`);
  }

  /**
   * Make HTTP request to PinchTab with retry logic
   */
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    data?: any,
    retries: number = 3,
  ): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Request attempt ${attempt}/${retries}: ${method} ${url}`);
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Request failed (attempt ${attempt}/${retries}): ${error.message}`);
        
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          this.logger.debug(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`PinchTab request failed after ${retries} attempts to ${url}: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Initialize a new browser instance
   * @param profile - Profile name (default: 'default')
   * @param headed - Whether to show browser window (default: false)
   * @param taskId - Task ID for task-scoped instance management (optional)
   */
  async initInstance(profile: string = 'default', headed: boolean = false, taskId?: string): Promise<PinchTabInstance> {
    try {
      // First, check if PinchTab is available with retries
      this.logger.log('Checking PinchTab availability...');
      const maxHealthChecks = 5;
      let isReady = false;
      
      for (let i = 1; i <= maxHealthChecks; i++) {
        isReady = await this.isAvailable();
        if (isReady) {
          this.logger.log('PinchTab is ready');
          break;
        }
        
        if (i < maxHealthChecks) {
          this.logger.warn(`PinchTab not ready (attempt ${i}/${maxHealthChecks}), waiting 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      if (!isReady) {
        throw new Error(`PinchTab service is not available at ${this.baseUrl} after ${maxHealthChecks} attempts. Please ensure the PinchTab container is running.`);
      }

      const mode = headed ? 'headed' : 'headless';
      // Use task-scoped profile name if taskId provided
      const instanceProfile = taskId ? `${profile}-task-${taskId}` : profile;
      this.logger.log(`Initializing PinchTab instance with profile: ${instanceProfile}, mode: ${mode}`);
      
      let instance: PinchTabInstance;
      
      try {
        const data = await this.request('POST', '/instances/launch', { 
          name: instanceProfile,
          mode: mode,
        });

        instance = {
          id: data.id,
          url: data.url || '',
        };

        this.logger.log(`PinchTab instance created: ${instance.id} (${mode} mode)`);
      } catch (launchError) {
        // If 409 conflict, try to reuse existing instance
        if (launchError.message.includes('409')) {
          this.logger.warn(`Instance "${instanceProfile}" already exists (409 Conflict), attempting to reuse it`);
          
          try {
            const instances = await this.listInstances();
            const existing = instances.find((inst: any) => 
              inst.name === instanceProfile || 
              inst.id.includes(instanceProfile) ||
              inst.status === 'ready'
            );
            
            if (existing) {
              instance = {
                id: existing.id,
                url: existing.url || '',
              };
              this.logger.log(`Reusing existing instance: ${instance.id}`);
            } else {
              throw new Error(`Instance "${instanceProfile}" exists but could not be found in instance list`);
            }
          } catch (listError) {
            this.logger.error(`Failed to list instances: ${listError.message}`);
            throw launchError; // Throw original error
          }
        } else {
          throw launchError;
        }
      }
      
      // Store instance in task-scoped map if taskId provided
      if (taskId) {
        this.taskInstances.set(taskId, { instance, tabId: null });
        this.logger.log(`Instance ${instance.id} registered for task ${taskId}`);
      } else {
        // Legacy: store in global state
        this.currentInstance = instance;
      }
      
      // Wait for instance to be fully ready (status: "starting" -> "ready")
      this.logger.log('Waiting for instance to be ready...');
      const maxWait = 10; // 10 seconds max
      for (let i = 0; i < maxWait; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Instance is ready when we can successfully list tabs
        try {
          await this.request('GET', `/instances/${instance.id}/tabs`, undefined, 1);
          this.logger.log('Instance is ready!');
          break;
        } catch (error) {
          if (i === maxWait - 1) {
            this.logger.warn(`Instance may not be fully ready after ${maxWait}s, proceeding anyway...`);
          }
        }
      }
      
      return instance;
    } catch (error) {
      this.logger.error(`Failed to initialize PinchTab instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Navigate to a URL (opens a new tab)
   * @param url - URL to navigate to
   * @param instanceId - Instance ID (optional, will use task instance if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async navigate(url: string, instanceId?: string, taskId?: string): Promise<string> {
    let id = instanceId;
    
    // If taskId provided, use task-scoped instance
    if (taskId && !id) {
      const taskData = this.taskInstances.get(taskId);
      if (taskData) {
        id = taskData.instance.id;
      }
    }
    
    // Fallback to legacy currentInstance
    if (!id) {
      id = this.currentInstance?.id;
    }
    
    if (!id) throw new Error('No PinchTab instance available');

    try {
      this.logger.debug(`Navigating to ${url}`);
      const data = await this.request('POST', `/instances/${id}/tabs/open`, {
        url,
      });

      // Store the tab ID for subsequent operations
      const tabId = data.tabId || data.id;
      if (!tabId) {
        throw new Error('Failed to get tab ID from navigation response');
      }
      
      // Store in task-scoped map if taskId provided
      if (taskId) {
        this.setTaskTabId(taskId, tabId);
      } else {
        // Legacy: store in global state
        this.currentTabId = tabId;
      }
      
      this.logger.debug(`Tab opened with ID: ${tabId}`);
      return tabId;
    } catch (error) {
      this.logger.error(`Navigation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get structured snapshot of current page
   * @param filter - Filter type ('all' or 'interactive')
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async snapshot(
    filter: 'all' | 'interactive' = 'interactive',
    tabId?: string,
    taskId?: string,
  ): Promise<PinchTabSnapshot> {
    let tid: string | null | undefined = tabId;
    
    // If taskId provided, use task-scoped tab
    if (taskId && !tid) {
      tid = this.getTaskTabId(taskId);
    }
    
    // Fallback to legacy currentTabId
    if (!tid) {
      tid = this.currentTabId;
    }
    
    if (!tid) throw new Error('No PinchTab tab available');

    try {
      this.logger.debug(`Getting snapshot with filter: ${filter}`);
      const response = await this.request('GET', `/tabs/${tid}/snapshot?filter=${filter}`);

      return response;
    } catch (error) {
      this.logger.error(`Snapshot failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute an action on the page
   * @param action - Action to execute
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async action(
    action: PinchTabAction,
    tabId?: string,
    taskId?: string,
  ): Promise<{ success: boolean; message?: string }> {
    let tid: string | null | undefined = tabId;
    
    // If taskId provided, use task-scoped tab
    if (taskId && !tid) {
      tid = this.getTaskTabId(taskId);
    }
    
    // Fallback to legacy currentTabId
    if (!tid) {
      tid = this.currentTabId;
    }
    
    if (!tid) throw new Error('No PinchTab tab available');

    try {
      this.logger.debug(`Executing action: ${action.kind}`);
      const response = await this.request('POST', `/tabs/${tid}/action`, action);

      return response;
    } catch (error) {
      this.logger.error(`Action failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Click an element by reference
   */
  async click(ref: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'click', ref }, tabId, taskId);
  }

  /**
   * Fill a form field (⚠️ DEPRECATED - Use type() instead, fill doesn't work)
   */
  async fill(ref: string, value: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'fill', ref, value }, tabId, taskId);
  }

  /**
   * Type text into an element (✅ WORKS - Use this instead of fill)
   */
  async type(ref: string, text: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'type', ref, text }, tabId, taskId);
  }

  /**
   * Press a keyboard key
   */
  async press(key: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'press', key }, tabId, taskId);
  }

  /**
   * Submit a form
   */
  async submit(ref: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'submit', ref }, tabId, taskId);
  }

  /**
   * Scroll the page
   */
  async scroll(
    direction: 'up' | 'down',
    amount: number = 3,
    tabId?: string,
    taskId?: string,
  ): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'scroll', direction, amount }, tabId, taskId);
  }

  /**
   * Wait for a duration
   */
  async wait(ms: number): Promise<{ success: boolean; message?: string }> {
    await new Promise((resolve) => setTimeout(resolve, ms));
    return { success: true };
  }

  /**
   * Close an instance
   */
  async closeInstance(instanceId?: string): Promise<void> {
    const id = instanceId || this.currentInstance?.id;
    if (!id) return;

    try {
      this.logger.log(`Closing PinchTab instance: ${id}`);
      await this.request('DELETE', `/instances/${id}`);
      if (this.currentInstance?.id === id) {
        this.currentInstance = null;
      }
    } catch (error) {
      this.logger.error(`Failed to close instance: ${error.message}`);
    }
  }

  /**
   * Get current instance
   */
  getCurrentInstance(): PinchTabInstance | null {
    return this.currentInstance;
  }

  /**
   * Get instance for a specific task
   */
  getTaskInstance(taskId: string): PinchTabInstance | null {
    return this.taskInstances.get(taskId)?.instance || null;
  }

  /**
   * Get current tab ID for a specific task
   */
  getTaskTabId(taskId: string): string | null {
    return this.taskInstances.get(taskId)?.tabId || null;
  }

  /**
   * Set tab ID for a specific task
   */
  setTaskTabId(taskId: string, tabId: string): void {
    const taskData = this.taskInstances.get(taskId);
    if (taskData) {
      taskData.tabId = tabId;
      this.taskInstances.set(taskId, taskData);
    }
  }

  /**
   * Register a PinchTab instance for a specific task
   * This ensures the instance can be retrieved in subsequent iterations
   */
  registerTaskInstance(taskId: string, instance: PinchTabInstance): void {
    this.taskInstances.set(taskId, { instance, tabId: null });
    this.logger.log(`Instance ${instance.id} registered for task ${taskId}`);
  }

  /**
   * Cleanup task-scoped instance (called when task completes/fails/cancels)
   */
  async cleanupTask(taskId: string): Promise<void> {
    const taskData = this.taskInstances.get(taskId);
    if (!taskData) {
      this.logger.debug(`No instance found for task ${taskId}, skipping cleanup`);
      return;
    }

    try {
      this.logger.log(`Cleaning up PinchTab instance for task ${taskId}: ${taskData.instance.id}`);
      await this.closeInstance(taskData.instance.id);
      this.taskInstances.delete(taskId);
      this.logger.log(`Task ${taskId} cleanup completed`);
    } catch (error) {
      this.logger.error(`Failed to cleanup task ${taskId}: ${error.message}`);
      // Still remove from map even if cleanup failed
      this.taskInstances.delete(taskId);
    }
  }

  /**
   * Check if PinchTab is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request('GET', '/health', undefined, 1); // Single attempt for health check
      return true;
    } catch (error) {
      this.logger.debug(`Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<{ status: string; message?: string }> {
    try {
      const data = await this.request('GET', '/health', undefined, 1);
      return { status: 'healthy', ...data };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  /**
   * List all instances
   */
  async listInstances(): Promise<any[]> {
    try {
      const data = await this.request('GET', '/instances');
      return data.instances || data || [];
    } catch (error) {
      this.logger.error(`Failed to list instances: ${error.message}`);
      throw error;
    }
  }

  /**
   * Launch a new instance (alternative to initInstance with more control)
   */
  async launchInstance(name: string, mode: 'headed' | 'headless' = 'headless'): Promise<PinchTabInstance> {
    try {
      this.logger.log(`Launching new instance: ${name} (${mode})`);
      const data = await this.request('POST', '/instances/launch', { 
        name,
        mode,
      });

      const instance: PinchTabInstance = {
        id: data.id,
        url: data.url || '',
      };

      this.logger.log(`Instance launched: ${instance.id}`);
      return instance;
    } catch (error) {
      // If 409 conflict, try to list instances and return existing one
      if (error.message.includes('409')) {
        this.logger.warn(`Instance "${name}" already exists, attempting to reuse it`);
        try {
          const instances = await this.listInstances();
          const existing = instances.find((inst: any) => inst.name === name || inst.id.includes(name));
          if (existing) {
            this.logger.log(`Reusing existing instance: ${existing.id}`);
            return {
              id: existing.id,
              url: existing.url || '',
            };
          }
        } catch (listError) {
          this.logger.error(`Failed to list instances: ${listError.message}`);
        }
      }
      
      this.logger.error(`Failed to launch instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop an instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    try {
      this.logger.log(`Stopping instance: ${instanceId}`);
      // Use POST instead of DELETE - PinchTab API expects POST for stop operations
      await this.request('POST', `/instances/${instanceId}/stop`);
      
      if (this.currentInstance?.id === instanceId) {
        this.currentInstance = null;
        this.currentTabId = null;
      }
      
      // Clean up task-scoped instances
      for (const [taskId, taskData] of this.taskInstances.entries()) {
        if (taskData.instance.id === instanceId) {
          this.taskInstances.delete(taskId);
          this.logger.log(`Removed task instance mapping for task ${taskId}`);
        }
      }
      
      this.logger.log(`Instance stopped: ${instanceId}`);
    } catch (error) {
      this.logger.error(`Failed to stop instance: ${error.message}`);
      throw error;
    }
  }

  /**
   * List tabs in an instance
   */
  async listTabs(instanceId?: string): Promise<any[]> {
    const id = instanceId || this.currentInstance?.id;
    if (!id) throw new Error('No instance available');
    
    try {
      this.logger.debug(`Listing tabs for instance: ${id}`);
      const data = await this.request('GET', `/instances/${id}/tabs`);
      return data.tabs || data || [];
    } catch (error) {
      this.logger.error(`Failed to list tabs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Switch to a different tab
   */
  async switchTab(tabId: string): Promise<void> {
    this.logger.log(`Switching to tab: ${tabId}`);
    this.currentTabId = tabId;
  }

  /**
   * Get current tab ID
   */
  getCurrentTabId(): string | null {
    return this.currentTabId;
  }

  /**
   * Set current instance (for switching between instances)
   */
  setCurrentInstance(instanceId: string): void {
    this.currentInstance = { id: instanceId, url: '' };
    this.currentTabId = null;
  }
}
