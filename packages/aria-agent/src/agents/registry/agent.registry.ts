import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { AgentRole } from '../base/agent.types';
import { BaseAgent } from '../base/base.agent';

/**
 * AgentRegistry manages agent lookup and instantiation
 * Provides centralized access to all agents in the system
 */
@Injectable()
export class AgentRegistry implements OnModuleInit {
  private readonly logger = new Logger(AgentRegistry.name);
  private agentMap: Map<AgentRole, BaseAgent> = new Map();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    this.logger.log('AgentRegistry initialized');
    // Agents will be registered when their modules are created
  }

  /**
   * Register an agent instance
   */
  register(role: AgentRole, agent: BaseAgent): void {
    if (this.agentMap.has(role)) {
      this.logger.warn(`Agent ${role} is already registered, overwriting`);
    }
    this.agentMap.set(role, agent);
    this.logger.log(`Registered agent: ${role}`);
  }

  /**
   * Get an agent by role
   */
  getAgent(role: AgentRole): BaseAgent {
    const agent = this.agentMap.get(role);
    if (!agent) {
      throw new Error(`Agent ${role} not found in registry`);
    }
    return agent;
  }

  /**
   * Check if an agent is registered
   */
  hasAgent(role: AgentRole): boolean {
    return this.agentMap.has(role);
  }

  /**
   * Get all registered agent roles
   */
  getRegisteredAgents(): AgentRole[] {
    return Array.from(this.agentMap.keys());
  }

  /**
   * Unregister an agent (for testing/cleanup)
   */
  unregister(role: AgentRole): void {
    this.agentMap.delete(role);
    this.logger.log(`Unregistered agent: ${role}`);
  }

  /**
   * Clear all registered agents (for testing)
   */
  clear(): void {
    this.agentMap.clear();
    this.logger.log('Cleared all registered agents');
  }
}
