import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BytezKeyConfig {
  key: string;
  failureCount: number;
  lastFailure?: Date;
  isDisabled: boolean;
}

@Injectable()
export class BytezKeyManagerService {
  private readonly logger = new Logger(BytezKeyManagerService.name);
  private keys: BytezKeyConfig[] = [];
  private currentKeyIndex = 0;
  private readonly maxFailuresBeforeDisable = 3;
  private readonly reEnableAfterMinutes = 30;

  constructor(private readonly configService: ConfigService) {
    this.loadKeys();
  }

  private loadKeys(): void {
    const keys: BytezKeyConfig[] = [];
    let keyIndex = 1;

    // Try to load numbered keys first (BYTEZ_API_KEY_1, BYTEZ_API_KEY_2, etc.)
    while (true) {
      const key = this.configService.get<string>(`BYTEZ_API_KEY_${keyIndex}`);
      if (!key) break;

      keys.push({
        key,
        failureCount: 0,
        isDisabled: false,
      });
      keyIndex++;
    }

    // Fallback to single BYTEZ_API_KEY if no numbered keys found
    if (keys.length === 0) {
      const singleKey = this.configService.get<string>('BYTEZ_API_KEY');
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
      this.logger.warn('No BYTEZ_API_KEY found. BytezService will not work properly.');
    } else {
      this.logger.log(`Loaded ${this.keys.length} Bytez API key(s)`);
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
    this.logger.error('All Bytez API keys are disabled due to failures');
    return null;
  }

  /**
   * Mark the current key as failed and rotate to the next one
   * Detects API key errors (rate limits, quota, invalid key) and immediately rotates
   */
  markCurrentKeyAsFailed(error?: any): void {
    if (this.keys.length === 0) return;

    const currentKey = this.keys[this.currentKeyIndex];
    const keyLabel = `Key ${this.currentKeyIndex + 1}`;
    
    // Detect API key-related errors
    const errorMessage = error?.message?.toLowerCase() || '';
    const isApiKeyError = 
      errorMessage.includes('rate limit') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('tokens per minute') ||
      errorMessage.includes('tpm') ||
      errorMessage.includes('rpm') ||
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('insufficient') ||
      errorMessage.includes('exceeded') ||
      errorMessage.includes('billing') ||
      errorMessage.includes('payment');

    if (isApiKeyError) {
      currentKey.isDisabled = true;
      currentKey.lastFailure = new Date();
      this.logger.error(
        `${keyLabel} DISABLED: ${error?.message || 'API key error'}. Re-enabled after ${this.reEnableAfterMinutes}min.`,
      );
    } else {
      currentKey.failureCount++;
      currentKey.lastFailure = new Date();

      if (currentKey.failureCount >= this.maxFailuresBeforeDisable) {
        currentKey.isDisabled = true;
        this.logger.error(
          `${keyLabel} disabled after ${this.maxFailuresBeforeDisable} failures. Re-enabled after ${this.reEnableAfterMinutes}min.`,
        );
      }
    }

    this.rotateToNextKey();
  }

  /**
   * Mark the current key as successful (reset failure count)
   */
  markCurrentKeyAsSuccessful(): void {
    if (this.keys.length === 0) return;

    const currentKey = this.keys[this.currentKeyIndex];
    if (currentKey.failureCount > 0) {
      currentKey.failureCount = 0;
      currentKey.lastFailure = undefined;
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
        this.logger.log(`[STATE CHANGE] API Key Rotated: Key ${startIndex + 1} -> Key ${this.currentKeyIndex + 1}`);
        return;
      }
      
      if (this.currentKeyIndex === startIndex) {
        this.logger.error('All keys disabled');
        return;
      }
    } while (true);
  }

  /**
   * Check if any disabled keys should be re-enabled
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
          keyConfig.lastFailure = undefined;
          this.logger.log(`[STATE CHANGE] Key ${i + 1} re-enabled after ${this.reEnableAfterMinutes}min`);
        }
      }
    }
  }

  /**
   * Get status of all keys (for debugging/monitoring)
   */
  getKeysStatus(): Array<{
    index: number;
    isActive: boolean;
    isDisabled: boolean;
    failureCount: number;
    lastFailure?: Date;
  }> {
    return this.keys.map((keyConfig, index) => ({
      index: index + 1,
      isActive: index === this.currentKeyIndex,
      isDisabled: keyConfig.isDisabled,
      failureCount: keyConfig.failureCount,
      lastFailure: keyConfig.lastFailure,
    }));
  }

  /**
   * Get total number of keys
   */
  getTotalKeys(): number {
    return this.keys.length;
  }
}
