import { Global, Module } from '@nestjs/common';
import { MockLlmService } from './mock-llm.service';

@Global()
@Module({
  providers: [MockLlmService],
  exports: [MockLlmService],
})
export class MockLlmModule {}
