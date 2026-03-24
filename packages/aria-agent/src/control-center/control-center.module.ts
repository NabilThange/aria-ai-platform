import { Module, forwardRef } from '@nestjs/common';
import { ControlCenterController } from './control-center.controller';
import { ControlCenterService } from './control-center.service';
import { TasksModule } from '../tasks/tasks.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { SharedStateModule } from '../shared-state/shared-state.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [
    forwardRef(() => TasksModule),
    PrismaModule,
    RedisModule,
    SharedStateModule,
    ServicesModule,
  ],
  controllers: [ControlCenterController],
  providers: [ControlCenterService],
  exports: [ControlCenterService],
})
export class ControlCenterModule {}
