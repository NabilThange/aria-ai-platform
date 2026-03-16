import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GoogleKeyConfig {
  key: string;
  failureCount: number;
  lastFailure?: Date;
  isDisabled: boolean;
}

@Injectable()
export class GoogleKeyManagerService {
  private readonly logger = new Logger(GoogleKeyManagerService.name);
  private keys: GoogleKeyConfig[] = [];
  private currentKeyIndex = 0;
  private readonly maxFailuresBeforeDisable = 3;
  private readonly reEnableAfterMinutes = 30;

  constructor(private readonly configService: ConfigService) {
    this.loadKeys();
  }

  private loadKeys(): void {
    const keys: GoogleKeyConfig[] = [];
    let keyIndex = 1;

    // Try to load numbered keys first (GOOGLE_API_KEY_1, GOOGLE_API_KEY_2, etc.)
    while (true) {
      const key = this.configService.get<string>(`GOOGLE_API_KEY_${keyIndex}`);
      if (!key) break;

      keys.push({
        key,
        failureCount: 0,
        isDisabled: false,
      });
      keyIndex++;
    }

    // Fallback to single GOOGLE_API_KEY if no numbered keys found
    if (keys.length === 0) {
      const singleKey = this.configService.get<string>('GOOGLE_API_KEY');
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
      this.logger.warn('No GOOGLE_API_KEY found. GoogleService will not work properly.');
    } else {
      this.logger.log(`Loaded ${this.keys.length} Google API key(s)`);
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
    this.logger.error('All Google API keys are disabled due to failures');
    return null;
  }

  /**
   * Mark the current key as failed and rotate to the next one
   */
  markCurrentKeyAsFailed(error?: any): void {
    if (this.keys.length === 0) return;

    const currentKey = this.keys[this.currentKeyIndex];
    currentKey.failureCount++;
    currentKey.lastFailure = new Date();

    const keyLabel = `Key ${this.currentKeyIndex + 1}`;
    this.logger.warn(
      `${keyLabel} failed (${currentKey.failureCount}/${this.maxFailuresBeforeDisable} failures). Error: ${error?.message || 'Unknown'}`,
    );

    // Disable key if it has failed too many times
    if (currentKey.failureCount >= this.maxFailuresBeforeDisable) {
      currentKey.isDisabled = true;
      this.logger.error(
        `${keyLabel} has been disabled after ${this.maxFailuresBeforeDisable} failures. ` +
        `It will be re-enabled after ${this.reEnableAfterMinutes} minutes.`,
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

    const currentKey = this.keys[this.currentKeyIndex];
    if (currentKey.failureCount > 0) {
      this.logger.log(`Key ${this.currentKeyIndex + 1} succeeded, resetting failure count`);
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
        this.logger.log(`Rotated to Key ${this.currentKeyIndex + 1}`);
        return;
      }
      
      // If we've checked all keys and they're all disabled
      if (this.currentKeyIndex === startIndex) {
        this.logger.error('All keys are disabled, staying on current key');
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
          this.logger.log(
            `Key ${i + 1} has been re-enabled after ${this.reEnableAfterMinutes} minutes`,
          );
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
