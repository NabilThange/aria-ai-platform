import { Module, Global } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BrowserLoggerService } from './browser-logger.service';
import { AgentLoggerService } from './agent-logger.service';

/**
 * LoggerModule - Provides logging services globally
 * Includes both BrowserLoggerService (for WebSocket logs) and AgentLoggerService (for structured agent logs)
 */
@Global()
@Module({
  imports: [EventEmitterModule],
  providers: [BrowserLoggerService, AgentLoggerService],
  exports: [BrowserLoggerService, AgentLoggerService],
})
export class CustomLoggerModule {}
