import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AGENT_MODELS } from '../config/agents.config';
import { GROQ_MODELS } from '../groq/groq.constants';
import { BYTEZ_MODELS } from '../bytez/bytez.constants';
import { GOOGLE_MODELS } from '../google/google.constants';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentConfig {
  name: string;
  provider: string;
  model: string;
  description: string;
}

@Injectable()
export class AgentsService implements OnModuleInit {
  private readonly logger = new Logger(AgentsService.name);
  private agentConfigs: Map<string, AgentConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Initialize with configurations from database or defaults
    await this.initializeDefaultConfigs();
  }

  private async initializeDefaultConfigs() {
    try {
      // Try to load from database first
      const savedConfigs = await this.prisma.agentConfig.findMany();
      
      if (savedConfigs.length > 0) {
        this.logger.log(`Loading ${savedConfigs.length} agent configurations from database`);
        savedConfigs.forEach((config) => {
          this.agentConfigs.set(config.name, {
            name: config.name,
            provider: config.provider,
            model: config.model,
            description: config.description,
          });
        });
      } else {
        // Fall back to defaults from AGENT_MODELS
        this.logger.log('No saved configurations found, using defaults from AGENT_MODELS');
        Object.entries(AGENT_MODELS).forEach(([name, config]) => {
          this.agentConfigs.set(name, {
            name,
            provider: config.provider,
            model: config.model,
            description: config.description,
          });
        });
      }
    } catch (error) {
      this.logger.error('Failed to load agent configurations from database, using defaults', error);
      // Fall back to defaults on error
      Object.entries(AGENT_MODELS).forEach(([name, config]) => {
        this.agentConfigs.set(name, {
          name,
          provider: config.provider,
          model: config.model,
          description: config.description,
        });
      });
    }
  }

  getAgentConfigs() {
    const agents = Array.from(this.agentConfigs.values());
    return {
      agents,
      availableModels: {
        groq: GROQ_MODELS,
        bytez: BYTEZ_MODELS,
        google: GOOGLE_MODELS,
      },
    };
  }

  async updateAgentConfigs(agents: AgentConfig[]) {
    this.logger.log(`Updating ${agents.length} agent configurations`);
    
    for (const agent of agents) {
      if (this.agentConfigs.has(agent.name)) {
        // Update in-memory
        this.agentConfigs.set(agent.name, agent);
        
        try {
          // Persist to database
          await this.prisma.agentConfig.upsert({
            where: { name: agent.name },
            update: {
              provider: agent.provider,
              model: agent.model,
              description: agent.description,
            },
            create: {
              name: agent.name,
              provider: agent.provider,
              model: agent.model,
              description: agent.description,
            },
          });
          
          this.logger.log(`✅ Updated ${agent.name} to use model: ${agent.model} (provider: ${agent.provider}) - persisted to database`);
        } catch (error) {
          this.logger.error(`Failed to persist ${agent.name} configuration to database`, error);
        }
      }
    }

    // Log current state of all configs
    this.logger.log(`📊 Current Agent Configurations:`);
    this.agentConfigs.forEach((config, name) => {
      this.logger.log(`   - ${name}: ${config.model} (${config.provider})`);
    });

    return {
      success: true,
      message: 'Agent configurations updated successfully',
      agents: Array.from(this.agentConfigs.values()),
    };
  }

  getAgentModel(agentName: string): { provider: string; model: string } | null {
    const config = this.agentConfigs.get(agentName);
    
    this.logger.debug(`🔍 getAgentModel('${agentName}'):`);
    this.logger.debug(`   - Found in map: ${config ? 'YES' : 'NO'}`);
    if (config) {
      this.logger.debug(`   - Returning: ${config.model} (${config.provider})`);
    }
    
    if (!config) {
      return null;
    }
    return {
      provider: config.provider,
      model: config.model,
    };
  }
}
