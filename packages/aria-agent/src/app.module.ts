import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SummariesModule } from './summaries/summaries.modue';
import { LoggerModule } from 'nestjs-pino';
import { pinoLoggerConfig } from './logger/logger.config';
import { WorkflowsModule } from './workflows/workflows.module';
import { MockLlmModule } from './mock/mock-llm.module';
import { ControlCenterModule } from './control-center/control-center.module';
// import { FirebaseModule } from './firebase/firebase.module'; // Disabled for deployment

@Module({
  imports: [
    LoggerModule.forRoot(pinoLoggerConfig),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // FirebaseModule, // Disabled for deployment
    AgentModule,
    TasksModule,
    MessagesModule,
    SummariesModule,
    WorkflowsModule,
    ControlCenterModule,
    PrismaModule,
    MockLlmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
