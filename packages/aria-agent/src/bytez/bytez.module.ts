import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BytezService } from './bytez.service';
import { BytezKeyManagerService } from './bytez-key-manager.service';

@Module({
  imports: [ConfigModule],
  providers: [BytezKeyManagerService, BytezService],
  exports: [BytezService],
})
export class BytezModule {}
