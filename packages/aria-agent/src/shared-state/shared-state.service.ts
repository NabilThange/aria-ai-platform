import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * SharedStateService manages task-scoped state in Redis
 * All keys are namespaced as task:{taskId}:{key}
 * All keys have 24-hour TTL (PAT-006)
 */
@Injectable()
export class SharedStateService {
  private readonly logger = new Logger(SharedStateService.name);
  private readonly TTL_SECONDS = 86400; // 24 hours

  constructor(private readonly redisService: RedisService) {}

  /**
   * Generate namespaced key: task:{taskId}:{key}
   */
  private getKey(taskId: string, key: string): string {
    return `task:${taskId}:${key}`;
  }

  /**
   * Get value from shared state
   */
  async get<T>(taskId: string, key: string): Promise<T | null> {
    const namespacedKey = this.getKey(taskId, key);
    try {
      const value = await this.redisService.getClient().get(namespacedKey);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`Error getting key ${namespacedKey}:`, error);
      throw error;
    }
  }

  /**
   * Set value in shared state with 24-hour TTL
   */
  async set(taskId: string, key: string, value: any): Promise<void> {
    const namespacedKey = this.getKey(taskId, key);
    try {
      const serialized = JSON.stringify(value);
      await this.redisService.getClient().set(
        namespacedKey,
        serialized,
        'EX',
        this.TTL_SECONDS,
      );
    } catch (error) {
      this.logger.error(`Error setting key ${namespacedKey}:`, error);
      throw error;
    }
  }

  /**
   * Delete value from shared state
   */
  async delete(taskId: string, key: string): Promise<void> {
    const namespacedKey = this.getKey(taskId, key);
    try {
      await this.redisService.getClient().del(namespacedKey);
    } catch (error) {
      this.logger.error(`Error deleting key ${namespacedKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if key exists
   */
  async exists(taskId: string, key: string): Promise<boolean> {
    const namespacedKey = this.getKey(taskId, key);
    try {
      const result = await this.redisService.getClient().exists(namespacedKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Error checking existence of key ${namespacedKey}:`, error);
      throw error;
    }
  }

  /**
   * Append item to array in shared state
   * If array doesn't exist, creates it
   */
  async appendToArray<T>(taskId: string, key: string, item: T): Promise<void> {
    const namespacedKey = this.getKey(taskId, key);
    try {
      const existing = await this.get<T[]>(taskId, key);
      const array = existing || [];
      array.push(item);
      await this.set(taskId, key, array);
    } catch (error) {
      this.logger.error(`Error appending to array ${namespacedKey}:`, error);
      throw error;
    }
  }

  /**
   * Get array from shared state
   */
  async getArray<T>(taskId: string, key: string): Promise<T[]> {
    const value = await this.get<T[]>(taskId, key);
    return value || [];
  }

  /**
   * Delete all keys for a task (cleanup)
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      const pattern = `task:${taskId}:*`;
      const keys = await this.redisService.getClient().keys(pattern);
      
      if (keys.length > 0) {
        await this.redisService.getClient().del(...keys);
        this.logger.log(`Deleted ${keys.length} keys for task ${taskId}`);
      }
    } catch (error) {
      this.logger.error(`Error deleting task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all keys for a task (debugging)
   */
  async getTaskKeys(taskId: string): Promise<string[]> {
    try {
      const pattern = `task:${taskId}:*`;
      const keys = await this.redisService.getClient().keys(pattern);
      // Remove namespace prefix for cleaner output
      return keys.map(key => key.replace(`task:${taskId}:`, ''));
    } catch (error) {
      this.logger.error(`Error getting keys for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Get all state for a task (debugging/reporting)
   */
  async getTaskState(taskId: string): Promise<Record<string, any>> {
    try {
      const keys = await this.getTaskKeys(taskId);
      const state: Record<string, any> = {};
      
      for (const key of keys) {
        state[key] = await this.get(taskId, key);
      }
      
      return state;
    } catch (error) {
      this.logger.error(`Error getting state for task ${taskId}:`, error);
      throw error;
    }
  }
}
