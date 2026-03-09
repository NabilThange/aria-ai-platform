import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentModule } from './agent/agent.module';
import { TasksModule } from './tasks/tasks.module';
import { MessagesModule } from './messages/messages.module';
import { GoogleModule } from './google/google.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SummariesModule } from './summaries/summaries.modue';
import { PlannerModule } from './planner/planner.module';
import { ExecutorModule } from './executor/executor.module';
// import { FirebaseModule } from './firebase/firebase.module'; // Disabled for deployment

@Module({
  imports: [
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
    GoogleModule,
    PrismaModule,
    PlannerModule,
    ExecutorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
