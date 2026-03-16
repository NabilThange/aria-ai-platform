import { Module } from '@nestjs/common';
import { PerceptionAgent } from './perception.agent';
import { SharedStateModule } from '../../shared-state/shared-state.module';
import { GroqModule } from '../../groq/groq.module';
import { AgentRegistryModule } from '../registry/agent-registry.module';

@Module({
  imports: [SharedStateModule, GroqModule, AgentRegistryModule],
  providers: [PerceptionAgent],
  exports: [PerceptionAgent],
})
export class PerceptionModule {}
