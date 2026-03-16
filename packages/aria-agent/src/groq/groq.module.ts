import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GroqService } from './groq.service';
import { GroqKeyManagerService } from './groq-key-manager.service';

@Module({
  imports: [ConfigModule],
  providers: [GroqKeyManagerService, GroqService],
  exports: [GroqService],
})
export class GroqModule {}
