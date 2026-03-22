import { Module, forwardRef } from '@nestjs/common';
import { OrchestratorAgent } from './orchestrator.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { BytezModule } from '../../bytez/bytez.module';
import { GroqModule } from '../../groq/groq.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { MessagesModule } from '../../messages/messages.module';
import { AgentModule } from '../../agent/agent.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServicesModule } from '../../services/services.module';

@Module({
  imports: [
    SharedStateModule,
    BytezModule,
    GroqModule,
    AgentRegistryModule,
    EventEmitterModule,
    ServicesModule,
    forwardRef(() => MessagesModule),
    forwardRef(() => AgentModule),
  ],
  providers: [OrchestratorAgent, BrowserLoggerService],
  exports: [OrchestratorAgent],
})
export class OrchestratorModule {}
