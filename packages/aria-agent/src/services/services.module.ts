import { Module, forwardRef } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PinchTabService } from './pinchtab.service';
import { DesktopService } from './desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [EventEmitterModule, forwardRef(() => MessagesModule)],
  providers: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
  exports: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
})
export class ServicesModule {}
