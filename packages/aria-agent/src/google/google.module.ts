import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleService } from './google.service';
import { GoogleKeyManagerService } from './google-key-manager.service';

@Module({
  imports: [ConfigModule],
  providers: [GoogleKeyManagerService, GoogleService],
  exports: [GoogleService],
})
export class GoogleModule {}
