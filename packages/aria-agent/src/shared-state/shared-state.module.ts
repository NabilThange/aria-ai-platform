import { Module, Global } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { SharedStateService } from './shared-state.service';

@Global()
@Module({
  imports: [RedisModule],
  providers: [SharedStateService],
  exports: [SharedStateService],
})
export class SharedStateModule {}
