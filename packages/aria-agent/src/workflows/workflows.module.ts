import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
import { WorkflowService } from '../services/workflow.service';
import { PinchTabService } from '../services/pinchtab.service';
import { DesktopService } from '../services/desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule],
  controllers: [WorkflowsController],
  providers: [WorkflowService, PinchTabService, DesktopService, BrowserLoggerService],
  exports: [WorkflowService],
})
export class WorkflowsModule {}
