import { Module, forwardRef } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { MessagesModule } from '../messages/messages.module';
import { AgentProcessor } from './agent.processor';
import { ConfigModule } from '@nestjs/config';
import { AgentScheduler } from './agent.scheduler';
import { InputCaptureService } from './input-capture.service';
import { GoogleModule } from '../google/google.module';
import { GroqModule } from '../groq/groq.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { BytezModule } from '../bytez/bytez.module';
import { SummariesModule } from 'src/summaries/summaries.modue';
import { AgentAnalyticsService } from './agent.analytics';
import { PlannerModule } from '../planner/planner.module';

@Module({
  imports: [
    ConfigModule,
    TasksModule,
    MessagesModule,
    SummariesModule,
    GoogleModule,
    GroqModule,
    OpenRouterModule,
    BytezModule,
    forwardRef(() => PlannerModule),
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
