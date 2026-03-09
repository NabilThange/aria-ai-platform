import { Controller, Post, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ExecutorService } from './executor.service';

@Controller('plans')
export class ExecutorController {
  constructor(private readonly executorService: ExecutorService) {}

  @Post(':id/execute')
  @HttpCode(HttpStatus.OK)
  async executePlan(@Param('id') id: string) {
    return this.executorService.executePlan(id);
  }
}
