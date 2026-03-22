import { Module, forwardRef } from '@nestjs/common';
import { WorkflowAgent } from './workflow.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { WorkflowService } from '../../services/workflow.service';
import { PinchTabService } from '../../services/pinchtab.service';
import { DesktopService } from '../../services/desktop.service';
import { AgentRegistryModule } from '../registry/agent-registry.module';
import { MessagesModule } from '../../messages/messages.module';
import { BrowserLoggerService } from '../../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    SharedStateModule,
    AgentRegistryModule,
    EventEmitterModule,
    forwardRef(() => MessagesModule),
  ],
  providers: [
    WorkflowAgent,
    WorkflowService,
    PinchTabService,
    DesktopService,
    BrowserLoggerService,
  ],
  exports: [WorkflowAgent],
})
export class WorkflowModule {}
