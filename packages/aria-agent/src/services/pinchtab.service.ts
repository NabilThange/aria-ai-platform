import { Injectable, Logger } from '@nestjs/common';

export interface PinchTabInstance {
  id: string;
  url: string;
}

export interface PinchTabProfile {
  id: string;
  name: string;
  description?: string;
  useWhen?: string;
  running?: boolean;
  diskUsage?: number;
  createdAt?: string;
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
  kind: 'click' | 'fill' | 'type' | 'navigate' | 'submit' | 'scroll' | 'wait' | 'press' | 'hover' | 'focus' | 'select';
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
  private authToken: string | null = null;
  // Task-scoped instances: Map<taskId, { instance, tabId }>
  private taskInstances: Map<string, { instance: PinchTabInstance; tabId: string | null }> = new Map();
  
  // Legacy support (deprecated - will be removed)
  private currentInstance: PinchTabInstance | null = null;
  private currentTabId: string | null = null;

  constructor() {
    this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://aria-desktop:9867';
    this.authToken = process.env.PINCHTAB_AUTH_TOKEN || null;
    this.logger.log(`PinchTab base URL: ${this.baseUrl}`);
    if (this.authToken) {
      this.logger.log('PinchTab authentication token configured');
    } else {
      this.logger.warn('PinchTab authentication token not configured - will attempt to fetch from config');
    }
  }

  /**
   * Fetch authentication token from PinchTab config file
   */
  private async fetchAuthToken(): Promise<string | null> {
    try {
      // Try to read token from PinchTab config
      const configUrl = `${this.baseUrl.replace(':9867', ':9990')}/api/pinchtab-config`;
      this.logger.debug(`Attempting to fetch PinchTab token from: ${configUrl}`);
      
      const response = await fetch(configUrl, {
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        const config: any = await response.json();
        if (config?.server?.token) {
          this.logger.log('Successfully fetched PinchTab authentication token from config');
          return config.server.token as string;
        }
      }
    } catch (error: any) {
      this.logger.debug(`Could not fetch token from config: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Ensure authentication token is available
   */
  private async ensureAuthToken(): Promise<void> {
    if (!this.authToken) {
      this.authToken = await this.fetchAuthToken();
      if (!this.authToken) {
        this.logger.warn('PinchTab authentication token not available - requests may fail');
      }
    }
  }

  /**
   * Make HTTP request to PinchTab with retry logic
   */
  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    data?: any,
    retries: number = 3,
    timeoutMs: number = 10000, // Allow custom timeout, default 10s
  ): Promise<any> {
    // Ensure we have auth token before making requests
    await this.ensureAuthToken();

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication token if available
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const options: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeoutMs), // Use custom timeout
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.debug(`Request attempt ${attempt}/${retries}: ${method} ${url} (timeout: ${timeoutMs}ms)`);
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
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
        const data = await this.request('POST', '/instances/start', { 
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
      const maxWait = 30; // 30 seconds max (increased from 10s to handle slow PinchTab startup)
      const pollInterval = 2000; // Poll every 2 seconds (increased from 1s)
      
      for (let i = 0; i < maxWait; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        // Instance is ready when we can successfully list tabs
        try {
          await this.request('GET', `/instances/${instance.id}/tabs`, undefined, 1);
          this.logger.log(`Instance is ready after ${(i + 1) * pollInterval / 1000}s!`);
          break;
        } catch (error) {
          const elapsed = (i + 1) * pollInterval / 1000;
          this.logger.debug(`Instance not ready yet (${elapsed}s elapsed, status may be "starting")...`);
          
          if (i === maxWait - 1) {
            this.logger.warn(`Instance may not be fully ready after ${elapsed}s, proceeding anyway...`);
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
      this.logger.debug(`Navigating to ${url} (timeout: 20s for search engines)`);
      const data = await this.request('POST', `/instances/${id}/tabs/open`, {
        url,
      }, 3, 20000); // 20 second timeout for slow search engines

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
      // Use 30-second timeout for snapshots (search engines can be slow)
      const response = await this.request('GET', `/tabs/${tid}/snapshot?filter=${filter}`, undefined, 3, 30000);

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
      const data = await this.request('POST', '/instances/start', { 
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

  // ============================================================================
  // PHASE 1: PROFILE MANAGEMENT
  // ============================================================================

  /**
   * Create a named persistent profile
   * @param name - Profile name
   * @param description - Optional description
   * @param useWhen - Optional usage context
   */
  async createProfile(name: string, description?: string, useWhen?: string): Promise<{ id: string; name: string }> {
    try {
      this.logger.log(`Creating profile: ${name}`);
      const body: any = { name };
      if (description) body.description = description;
      if (useWhen) body.useWhen = useWhen;

      const data = await this.request('POST', '/profiles', body);
      
      this.logger.log(`Profile created: ${data.id} (${data.name})`);
      return {
        id: data.id,
        name: data.name,
      };
    } catch (error) {
      this.logger.error(`Failed to create profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all persistent profiles (excludes temp ones)
   */
  async listProfiles(): Promise<PinchTabProfile[]> {
    try {
      this.logger.debug('Listing profiles');
      const data = await this.request('GET', '/profiles');
      
      // Handle both array response and object with profiles array
      const profiles = Array.isArray(data) ? data : (data.profiles || []);
      
      this.logger.debug(`Found ${profiles.length} profiles`);
      return profiles;
    } catch (error) {
      this.logger.error(`Failed to list profiles: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get one profile by id or name
   * @param idOrName - Profile ID or name
   */
  async getProfile(idOrName: string): Promise<PinchTabProfile> {
    try {
      this.logger.debug(`Getting profile: ${idOrName}`);
      const data = await this.request('GET', `/profiles/${idOrName}`);
      
      return data;
    } catch (error) {
      this.logger.error(`Failed to get profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start instance using a specific profile (THE KEY METHOD for persistence)
   * @param profileId - Profile ID to use
   * @param mode - 'headed' or 'headless'
   */
  async startInstanceWithProfile(profileId: string, mode: 'headed' | 'headless' = 'headless'): Promise<PinchTabInstance> {
    try {
      this.logger.log(`Starting instance with profile: ${profileId} (${mode})`);
      
      // PinchTab API uses 'headless' boolean, not 'mode' string
      const headless = mode === 'headless';
      
      const data = await this.request('POST', `/profiles/${profileId}/start`, {
        headless,
      });

      const instance: PinchTabInstance = {
        id: data.id,
        url: data.url || '',
      };

      this.logger.log(`Instance started with profile: ${instance.id}`);
      
      // Wait for instance to be fully ready (status: "starting" -> "ready")
      this.logger.log('Waiting for instance to be ready...');
      const maxWait = 30; // 30 seconds max (increased to handle slow PinchTab startup)
      const pollInterval = 2000; // Poll every 2 seconds
      
      for (let i = 0; i < maxWait; i++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        // Instance is ready when we can successfully list tabs
        try {
          await this.request('GET', `/instances/${instance.id}/tabs`, undefined, 1);
          this.logger.log(`Instance is ready after ${(i + 1) * pollInterval / 1000}s!`);
          break;
        } catch (error) {
          const elapsed = (i + 1) * pollInterval / 1000;
          this.logger.debug(`Instance not ready yet (${elapsed}s elapsed, status may be "starting")...`);
          
          if (i === maxWait - 1) {
            this.logger.warn(`Instance may not be fully ready after ${elapsed}s, proceeding anyway...`);
          }
        }
      }
      
      return instance;
    } catch (error) {
      this.logger.error(`Failed to start instance with profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stop instance by profile
   * @param profileId - Profile ID
   */
  async stopInstanceByProfile(profileId: string): Promise<void> {
    try {
      this.logger.log(`Stopping instance by profile: ${profileId}`);
      await this.request('POST', `/profiles/${profileId}/stop`);
      
      this.logger.log(`Instance stopped for profile: ${profileId}`);
    } catch (error) {
      this.logger.error(`Failed to stop instance by profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a profile has a running instance
   * @param profileId - Profile ID
   */
  async getProfileInstance(profileId: string): Promise<{ running: boolean; id?: string; port?: string }> {
    try {
      this.logger.debug(`Checking profile instance: ${profileId}`);
      const data = await this.request('GET', `/profiles/${profileId}/instance`);
      
      return {
        running: data.running || false,
        id: data.id,
        port: data.port,
      };
    } catch (error) {
      this.logger.error(`Failed to get profile instance: ${error.message}`);
      // Return not running on error
      return { running: false };
    }
  }

  // ============================================================================
  // PHASE 2: MISSING ACTIONS (hover, focus, select)
  // ============================================================================

  /**
   * Hover over an element
   */
  async hover(ref: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'hover', ref }, tabId, taskId);
  }

  /**
   * Focus an element
   */
  async focus(ref: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'focus', ref }, tabId, taskId);
  }

  /**
   * Select a dropdown option
   */
  async select(ref: string, value: string, tabId?: string, taskId?: string): Promise<{ success: boolean; message?: string }> {
    return this.action({ kind: 'select', ref, value }, tabId, taskId);
  }

  // ============================================================================
  // PHASE 2: MISSING READ ENDPOINTS
  // ============================================================================

  /**
   * Extract full page text (token-efficient, ~800 tokens vs 10k for screenshot)
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async getPageText(tabId?: string, taskId?: string): Promise<string> {
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
      this.logger.debug(`Getting page text for tab: ${tid}`);
      const data = await this.request('GET', `/tabs/${tid}/text`);
      
      // Handle both string response and object with text property
      return typeof data === 'string' ? data : (data.text || '');
    } catch (error) {
      this.logger.error(`Failed to get page text: ${error.message}`);
      throw error;
    }
  }

  /**
   * Take a screenshot
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async takeScreenshot(tabId?: string, taskId?: string): Promise<Buffer | string> {
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
      this.logger.debug(`Taking screenshot for tab: ${tid}`);
      const data = await this.request('GET', `/tabs/${tid}/screenshot`);
      
      // Return the screenshot data (could be base64 string or buffer)
      return data.screenshot || data;
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run JavaScript in the page context
   * @param script - JavaScript code to execute
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async evalJavaScript(script: string, tabId?: string, taskId?: string): Promise<any> {
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
      this.logger.debug(`Evaluating JavaScript in tab: ${tid}`);
      const data = await this.request('POST', `/tabs/${tid}/eval`, { script });
      
      return data.result !== undefined ? data.result : data;
    } catch (error) {
      this.logger.error(`Failed to evaluate JavaScript: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find elements by text or selector
   * @param query - Search query (text or selector)
   * @param tabId - Tab ID (optional, will use task tab if taskId provided)
   * @param taskId - Task ID for task-scoped operations (optional)
   */
  async findElements(query: string, tabId?: string, taskId?: string): Promise<any[]> {
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
      this.logger.debug(`Finding elements in tab: ${tid} with query: ${query}`);
      const data = await this.request('POST', `/tabs/${tid}/find`, { query });
      
      // Handle both array response and object with elements array
      return Array.isArray(data) ? data : (data.elements || []);
    } catch (error) {
      this.logger.error(`Failed to find elements: ${error.message}`);
      throw error;
    }
  }
}
