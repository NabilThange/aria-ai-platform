import { Module } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { MessagesModule } from '../messages/messages.module';
import { AgentProcessor } from './agent.processor';
import { ConfigModule } from '@nestjs/config';
import { AgentScheduler } from './agent.scheduler';
import { InputCaptureService } from './input-capture.service';
import { GoogleModule } from '../google/google.module';
import { SummariesModule } from 'src/summaries/summaries.modue';
import { AgentAnalyticsService } from './agent.analytics';

@Module({
  imports: [
    ConfigModule,
    TasksModule,
    MessagesModule,
    SummariesModule,
    GoogleModule,
  ],
  providers: [
    AgentProcessor,
    AgentScheduler,
    InputCaptureService,
    AgentAnalyticsService,
  ],
  exports: [AgentProcessor],
})
export class AgentModule {}
