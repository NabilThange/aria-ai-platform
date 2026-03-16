import { Module, forwardRef } from '@nestjs/common';
import { VerifierAgent } from './verifier.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { GroqModule } from '../../groq/groq.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { MessagesModule } from '../../messages/messages.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    SharedStateModule,
    GroqModule,
    AgentRegistryModule,
    EventEmitterModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [VerifierAgent, BrowserLoggerService],
  exports: [VerifierAgent],
})
export class VerifierModule {}
