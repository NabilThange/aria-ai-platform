import { Module, Global } from '@nestjs/common';
import { AgentRegistry } from './agent.registry';

@Global()
@Module({
  providers: [AgentRegistry],
  exports: [AgentRegistry],
})
export class AgentRegistryModule {}
