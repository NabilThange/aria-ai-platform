import { Logger } from '@nestjs/common';
import { WorkflowModule, WorkflowMetadata, WorkflowVariable } from './workflow.interface';
import * as path from 'path';

export class WorkflowLoader {
  private readonly logger = new Logger(WorkflowLoader.name);

  /**
   * Load a workflow module dynamically
   */
  async loadWorkflow(workflowPath: string): Promise<WorkflowModule> {
    try {
      this.logger.log(`Loading workflow from: ${workflowPath}`);
      
      // Dynamic import of TypeScript or JavaScript module
      const module = await import(workflowPath);
      
      this.logger.log(`Module imported, checking structure...`);
      this.logger.log(`Module keys: ${Object.keys(module).join(', ')}`);
      
      // Validate module structure
      if (!module.metadata) {
        throw new Error('Workflow module missing metadata export');
      }
      
      if (!module.execute || typeof module.execute !== 'function') {
        throw new Error('Workflow module missing execute function export');
      }
      
      // Validate metadata
      this.validateMetadata(module.metadata);
      
      this.logger.log(`✅ Successfully loaded workflow: ${module.metadata.name}`);
      
      return {
        metadata: module.metadata,
        execute: module.execute,
      };
    } catch (error) {
      this.logger.error(`Failed to load workflow from ${workflowPath}: ${error.message}`);
      this.logger.error(error.stack);
      throw error;
    }
  }

  /**
   * Validate workflow metadata structure
   */
  validateMetadata(metadata: any): boolean {
    if (!metadata.name || typeof metadata.name !== 'string') {
      throw new Error('Workflow metadata missing or invalid "name" field');
    }
    
    if (!metadata.description || typeof metadata.description !== 'string') {
      throw new Error('Workflow metadata missing or invalid "description" field');
    }
    
    if (!metadata.version || typeof metadata.version !== 'string') {
      throw new Error('Workflow metadata missing or invalid "version" field');
    }
    
    if (typeof metadata.timeout_ms !== 'number' || metadata.timeout_ms <= 0) {
      throw new Error('Workflow metadata missing or invalid "timeout_ms" field');
    }
    
    if (!Array.isArray(metadata.variables)) {
      throw new Error('Workflow metadata missing or invalid "variables" field (must be array)');
    }
    
    // Validate each variable
    metadata.variables.forEach((variable: any, index: number) => {
      if (!variable.name || typeof variable.name !== 'string') {
        throw new Error(`Variable at index ${index} missing or invalid "name" field`);
      }
      
      if (!['string', 'number', 'boolean', 'object'].includes(variable.type)) {
        throw new Error(`Variable "${variable.name}" has invalid type: ${variable.type}`);
      }
      
      if (typeof variable.required !== 'boolean') {
        throw new Error(`Variable "${variable.name}" missing or invalid "required" field`);
      }
      
      if (!variable.description || typeof variable.description !== 'string') {
        throw new Error(`Variable "${variable.name}" missing or invalid "description" field`);
      }
    });
    
    return true;
  }

  /**
   * Validate variables provided match workflow schema
   */
  validateVariables(
    schema: WorkflowVariable[],
    vars: Record<string, any>,
  ): void {
    // Check required variables are present
    const requiredVars = schema.filter(v => v.required);
    for (const requiredVar of requiredVars) {
      if (!(requiredVar.name in vars)) {
        throw new Error(`Required variable "${requiredVar.name}" is missing`);
      }
    }
    
    // Check variable types
    for (const [key, value] of Object.entries(vars)) {
      const varSchema = schema.find(v => v.name === key);
      if (!varSchema) {
        this.logger.warn(`Unknown variable "${key}" provided (not in schema)`);
        continue;
      }
      
      const actualType = typeof value;
      if (varSchema.type === 'object' && actualType !== 'object') {
        throw new Error(`Variable "${key}" expected type "object", got "${actualType}"`);
      } else if (varSchema.type !== 'object' && actualType !== varSchema.type) {
        throw new Error(`Variable "${key}" expected type "${varSchema.type}", got "${actualType}"`);
      }
    }
  }
}
