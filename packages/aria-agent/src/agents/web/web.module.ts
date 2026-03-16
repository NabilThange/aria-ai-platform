import { Module, forwardRef } from '@nestjs/common';
import { WebAgent } from './web.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { GroqModule } from '../../groq/groq.module';
import { BytezModule } from '../../bytez/bytez.module';
import { GoogleModule } from '../../google/google.module';
import { PinchTabService } from '../../services/pinchtab.service';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { MessagesModule } from '../../messages/messages.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PerceptionModule } from '../perception/perception.module';

@Module({
  imports: [
    SharedStateModule,
    GroqModule,
    BytezModule,
    GoogleModule,
    AgentRegistryModule,
    EventEmitterModule,
    PerceptionModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [WebAgent, PinchTabService, BrowserLoggerService],
  exports: [WebAgent, PinchTabService],
})
export class WebModule {}
