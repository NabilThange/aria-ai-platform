import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { PinchTabService } from './pinchtab.service';
import { DesktopService } from './desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule],
  providers: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
  exports: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
})
export class ServicesModule {}
