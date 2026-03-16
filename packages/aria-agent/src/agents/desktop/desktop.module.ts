import { Module, forwardRef } from '@nestjs/common';
import { DesktopAgent } from './desktop.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { BytezModule } from '../../bytez/bytez.module';
import { GroqModule } from '../../groq/groq.module';
import { PerceptionModule } from '../perception/perception.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { TasksModule } from '../../tasks/tasks.module';
import { MessagesModule } from '../../messages/messages.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    SharedStateModule,
    BytezModule,
    GroqModule,
    PerceptionModule,
    AgentRegistryModule,
    TasksModule,
    EventEmitterModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [DesktopAgent, BrowserLoggerService],
  exports: [DesktopAgent],
})
export class DesktopModule {}
