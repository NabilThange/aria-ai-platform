import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BytezService } from './bytez.service';

@Module({
  imports: [ConfigModule],
  providers: [BytezService],
  exports: [BytezService],
})
export class BytezModule {}
