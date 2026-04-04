import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OpenRouterKeyConfig {
  key: string;
  failureCount: number;
  lastFailure?: Date;
  isDisabled: boolean;
}

@Injectable()
export class OpenRouterKeyManagerService {
  private readonly logger = new Logger(OpenRouterKeyManagerService.name);
  private keys: OpenRouterKeyConfig[] = [];
  private currentKeyIndex = 0;
  private readonly maxFailuresBeforeDisable = 3;
  private readonly reEnableAfterMinutes = 30;

  constructor(private readonly configService: ConfigService) {
    this.loadKeys();
  }

  private loadKeys(): void {
    const keys: OpenRouterKeyConfig[] = [];
    let keyIndex = 1;

    // Try to load numbered keys first (OPENROUTER_API_KEY_1, OPENROUTER_API_KEY_2, etc.)
    while (true) {
      const key = this.configService.get<string>(`OPENROUTER_API_KEY_${keyIndex}`);
      if (!key) break;

      keys.push({
        key,
        failureCount: 0,
        isDisabled: false,
      });
      keyIndex++;
    }

    // Fallback to single OPENROUTER_API_KEY if no numbered keys found
    if (keys.length === 0) {
      const singleKey = this.configService.get<string>('OPENROUTER_API_KEY');
      if (singleKey) {
        keys.push({
          key: singleKey,
          failureCount: 0,
          isDisabled: false,
        });
      }
    }

    this.keys = keys;

    if (this.keys.length === 0) {
      this.logger.warn('No OPENROUTER_API_KEY found. OpenRouterService will not work properly.');
    } else {
      this.logger.log(`Loaded ${this.keys.length} OpenRouter API key(s)`);
    }
  }

  /**
   * Get the current active API key
   */
  getCurrentKey(): string | null {
    if (this.keys.length === 0) {
      return null;
    }

    // Re-enable keys that have been disabled for long enough
    this.checkAndReEnableKeys();

    // Find the next available key starting from current index
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentKeyIndex + i) % this.keys.length;
      const keyConfig = this.keys[index];

      if (!keyConfig.isDisabled) {
        this.currentKeyIndex = index;
        return keyConfig.key;
      }
    }

    // All keys are disabled
    this.logger.error('All OpenRouter API keys are disabled');
    return null;
  }

  /**
   * Get current key index (1-based for logging)
   */
  getCurrentKeyIndex(): number {
    return this.currentKeyIndex + 1;
  }

  /**
   * Get total number of keys
   */
  getTotalKeys(): number {
    return this.keys.length;
  }

  /**
   * Mark the current key as failed and rotate to next key
   */
  markCurrentKeyAsFailed(error: any): void {
    if (this.keys.length === 0) return;

    const keyConfig = this.keys[this.currentKeyIndex];
    keyConfig.failureCount++;
    keyConfig.lastFailure = new Date();

    this.logger.warn(
      `OpenRouter API key ${this.currentKeyIndex + 1}/${this.keys.length} failed (${keyConfig.failureCount}/${this.maxFailuresBeforeDisable}): ${error.message}`,
    );

    // Disable key if it has failed too many times
    if (keyConfig.failureCount >= this.maxFailuresBeforeDisable) {
      keyConfig.isDisabled = true;
      this.logger.error(
        `OpenRouter API key ${this.currentKeyIndex + 1}/${this.keys.length} disabled after ${keyConfig.failureCount} failures`,
      );
    }

    // Rotate to next key
    this.rotateToNextKey();
  }

  /**
   * Mark the current key as successful (reset failure count)
   */
  markCurrentKeyAsSuccessful(): void {
    if (this.keys.length === 0) return;

    const keyConfig = this.keys[this.currentKeyIndex];
    if (keyConfig.failureCount > 0) {
      this.logger.log(
        `OpenRouter API key ${this.currentKeyIndex + 1}/${this.keys.length} recovered (was ${keyConfig.failureCount} failures)`,
      );
      keyConfig.failureCount = 0;
    }
  }

  /**
   * Rotate to the next available key
   */
  private rotateToNextKey(): void {
    const startIndex = this.currentKeyIndex;
    
    do {
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
      
      if (!this.keys[this.currentKeyIndex].isDisabled) {
        this.logger.log(
          `Rotated to OpenRouter API key ${this.currentKeyIndex + 1}/${this.keys.length}`,
        );
        return;
      }
    } while (this.currentKeyIndex !== startIndex);

    this.logger.error('All OpenRouter API keys are disabled');
  }

  /**
   * Re-enable keys that have been disabled for long enough
   */
  private checkAndReEnableKeys(): void {
    const now = new Date();
    
    for (let i = 0; i < this.keys.length; i++) {
      const keyConfig = this.keys[i];
      
      if (keyConfig.isDisabled && keyConfig.lastFailure) {
        const minutesSinceFailure = 
          (now.getTime() - keyConfig.lastFailure.getTime()) / (1000 * 60);
        
        if (minutesSinceFailure >= this.reEnableAfterMinutes) {
          keyConfig.isDisabled = false;
          keyConfig.failureCount = 0;
          this.logger.log(
            `Re-enabled OpenRouter API key ${i + 1}/${this.keys.length} after ${Math.floor(minutesSinceFailure)} minutes`,
          );
        }
      }
    }
  }
}
