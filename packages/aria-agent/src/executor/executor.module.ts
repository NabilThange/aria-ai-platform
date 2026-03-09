import { Module, forwardRef } from '@nestjs/common';
import { ExecutorService } from './executor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TasksModule)],
  providers: [ExecutorService],
  exports: [ExecutorService],
})
export class ExecutorModule {}
