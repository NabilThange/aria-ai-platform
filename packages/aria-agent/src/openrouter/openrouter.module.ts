import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenRouterService } from './openrouter.service';
import { OpenRouterKeyManagerService } from './openrouter-key-manager.service';

@Module({
  imports: [ConfigModule],
  providers: [OpenRouterService, OpenRouterKeyManagerService],
  exports: [OpenRouterService],
})
export class OpenRouterModule {}
