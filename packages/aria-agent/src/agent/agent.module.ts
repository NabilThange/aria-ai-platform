import { Module, forwardRef } from '@nestjs/common';
import { TasksModule } from '../tasks/tasks.module';
import { MessagesModule } from '../messages/messages.module';
import { AgentProcessor } from './agent.processor';
import { ConfigModule } from '@nestjs/config';
import { AgentScheduler } from './agent.scheduler';
import { InputCaptureService } from './input-capture.service';
import { GroqModule } from '../groq/groq.module';
import { BytezModule } from '../bytez/bytez.module';
import { GoogleModule } from '../google/google.module';
import { SummariesModule } from 'src/summaries/summaries.modue';
import { AgentAnalyticsService } from './agent.analytics';
import { PinchTabService } from '../services/pinchtab.service';
import { OrchestrationModule } from '../orchestration/orchestration.module';
import { SharedStateModule } from '../shared-state/shared-state.module';
import { AgentsService } from '../agents/agents.service';
import { AgentsController } from '../agents/agents.controller';

@Module({
  imports: [
    ConfigModule,
    TasksModule,
    MessagesModule,
    SummariesModule,
    GroqModule,
    BytezModule,
    GoogleModule,
    OrchestrationModule,
    SharedStateModule,
  ],
  providers: [
    AgentProcessor,
    AgentScheduler,
    InputCaptureService,
    AgentAnalyticsService,
    PinchTabService,
    AgentsService,
  ],
  controllers: [AgentsController],
  exports: [AgentProcessor, AgentsService],
})
export class AgentModule {}
