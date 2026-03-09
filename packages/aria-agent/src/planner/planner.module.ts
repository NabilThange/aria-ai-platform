import { Module, forwardRef } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { PlannerGateway } from './planner.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksModule } from '../tasks/tasks.module';
import { GoogleModule } from '../google/google.module';
import { GroqModule } from '../groq/groq.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { BytezModule } from '../bytez/bytez.module';
import { ExecutorModule } from '../executor/executor.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TasksModule),
    GoogleModule,
    GroqModule,
    OpenRouterModule,
    BytezModule,
    forwardRef(() => ExecutorModule),
  ],
  controllers: [PlannerController],
  providers: [PlannerService, PlannerGateway],
  exports: [PlannerService],
})
export class PlannerModule {}
