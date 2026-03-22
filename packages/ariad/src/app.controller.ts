import { Controller, Get, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('/api/pinchtab-config')
  async getPinchTabConfig() {
    try {
      // Read PinchTab config from user's home directory
      const configPath = path.join(process.env.HOME || '/home/user', '.pinchtab', 'config.json');
      
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configContent);
        
        // Return only the server section with token
        return {
          server: {
            token: config?.server?.token || null,
            bind: config?.server?.bind || null,
            port: config?.server?.port || null,
          },
        };
      }
      
      this.logger.warn('PinchTab config file not found');
      return { server: { token: null } };
    } catch (error) {
      this.logger.error(`Failed to read PinchTab config: ${error.message}`);
      return { server: { token: null } };
    }
  }
}
