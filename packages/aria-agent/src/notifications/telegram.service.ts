import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * TelegramService - Sends notifications via Telegram Bot API
 * Used by ReporterAgent to send task summaries
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.chatId = this.configService.get<string>('TELEGRAM_CHAT_ID', '');
    this.enabled = !!this.botToken && !!this.chatId;

    if (!this.enabled) {
      this.logger.warn('Telegram notifications disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
    } else {
      this.logger.log('Telegram notifications enabled');
    }
  }

  /**
   * Send a message via Telegram
   */
  async sendMessage(text: string): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug('Telegram disabled, skipping notification');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: this.truncateMessage(text),
          parse_mode: 'Markdown',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error: ${error}`);
      }

      this.logger.log('Telegram notification sent successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram notification: ${error.message}`);
      return false;
    }
  }


  /**
   * Send a task summary notification
   */
  async sendTaskSummary(taskId: string, summary: string, status: string): Promise<boolean> {
    const statusEmoji = this.getStatusEmoji(status);
    
    const message = `${statusEmoji} *Task ${taskId}*\n\n${summary}\n\n_Status: ${status}_`;
    
    return this.sendMessage(message);
  }

  /**
   * Send a task failure notification
   */
  async sendTaskFailure(taskId: string, error: string): Promise<boolean> {
    const message = `❌ *Task ${taskId} Failed*\n\n\`\`\`\n${error}\n\`\`\``;
    
    return this.sendMessage(message);
  }

  /**
   * Check if Telegram is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  private getStatusEmoji(status: string): string {
    const emojiMap: Record<string, string> = {
      completed: '✅',
      failed: '❌',
      needs_help: '⚠️',
      running: '🔄',
    };
    
    return emojiMap[status.toLowerCase()] || '📋';
  }

  private truncateMessage(text: string, maxLength: number = 4096): string {
    // Telegram message limit is 4096 characters
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength - 3) + '...';
  }
}
