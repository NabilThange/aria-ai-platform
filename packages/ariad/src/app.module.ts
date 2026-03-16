import { Module } from '@nestjs/common';
import { ComputerUseModule } from './computer-use/computer-use.module';
import { InputTrackingModule } from './input-tracking/input-tracking.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AriaMcpModule } from './mcp';
import { LoggerModule } from 'nestjs-pino';
import { pinoLoggerConfig } from './logger/logger.config';

@Module({
  imports: [
    LoggerModule.forRoot(pinoLoggerConfig),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ComputerUseModule,
    InputTrackingModule,
    AriaMcpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
