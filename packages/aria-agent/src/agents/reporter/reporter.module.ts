import { Module, forwardRef } from '@nestjs/common';
import { ReporterAgent } from './reporter.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { GroqModule } from '../../groq/groq.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { MessagesModule } from '../../messages/messages.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    SharedStateModule,
    GroqModule,
    NotificationsModule,
    AgentRegistryModule,
    EventEmitterModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [ReporterAgent, BrowserLoggerService],
  exports: [ReporterAgent],
})
export class ReporterModule {}
