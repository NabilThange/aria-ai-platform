import { Module, forwardRef } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowCompletionController } from './workflow-completion.controller';
import { WorkflowService } from '../services/workflow.service';
import { PinchTabService } from '../services/pinchtab.service';
import { DesktopService } from '../services/desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [EventEmitterModule, forwardRef(() => MessagesModule)],
  controllers: [WorkflowsController, WorkflowCompletionController],
  providers: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
  exports: [WorkflowService],
})
export class WorkflowsModule {}
