import { Injectable, Logger } from '@nestjs/common';
import { PinchTabService } from './pinchtab.service';
import { DesktopService } from './desktop.service';
import { BrowserLoggerService } from '../logger/browser-logger.service';
import { MessagesService } from '../messages/messages.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowLoader } from '../workflows/workflow.loader';
import {
  WorkflowMetadata,
  WorkflowResult,
  WorkflowServices,
  WorkflowModule,
} from '../workflows/workflow.interface';
import * as path from 'path';
import * as fs from 'fs';
import { glob } from 'glob';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  private readonly workflowLoader: WorkflowLoader;
  private readonly workflowsDir: string;
  private readonly workflowCache = new Map<string, WorkflowModule>();
  private _workflowsLoaded = false;

  constructor(
    private readonly pinchTabService: PinchTabService,
    private readonly desktopService: DesktopService,
    private readonly browserLogger: BrowserLoggerService,
    private readonly messagesService: MessagesService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.workflowLoader = new WorkflowLoader();
    // When running from dist/services/workflow.service.js:
    // __dirname = /path/to/packages/aria-agent/dist/services
    // We want: /path/to/packages/aria-agent/workflows
    // So go up 2 levels from dist/services to package root, then into workflows
    this.workflowsDir = path.join(__dirname, '../../workflows');
    this.logger.log(`Workflows directory: ${this.workflowsDir}`);
  }

  private async ensureWorkflowsLoaded(): Promise<void> {
    if (this._workflowsLoaded) {
      return;
    }

    try {
      this.logger.log('Scanning for workflows to populate cache...');
      this.logger.log(`Workflows directory: ${this.workflowsDir}`);
      
      // Check if directory exists
      if (!fs.existsSync(this.workflowsDir)) {
        this.logger.error(`Workflows directory does not exist: ${this.workflowsDir}`);
        return;
      }
      
      // Find all compiled or source workflow files
      const jsPattern = path.join(this.workflowsDir, '**/*.workflow.js');
      const tsPattern = path.join(this.workflowsDir, '**/*.workflow.ts');
      
      let workflowFiles = await glob(jsPattern, { windowsPathsNoEscape: true });
      
      if (workflowFiles.length === 0) {
        this.logger.log('No .workflow.js files found, trying .workflow.ts files...');
        workflowFiles = await glob(tsPattern, { windowsPathsNoEscape: true });
      }
      
      this.logger.log(`Found ${workflowFiles.length} workflow files for caching.`);
      
      for (const filePath of workflowFiles) {
        try {
          const module = await this.workflowLoader.loadWorkflow(filePath);
          this.workflowCache.set(module.metadata.name, module);
          this.logger.log(`✅ Cached workflow: ${module.metadata.name}`);
        } catch (error) {
          this.logger.error(`❌ Failed to load workflow from ${filePath}: ${error.message}`);
          this.logger.error(error.stack);
        }
      }
      
      this._workflowsLoaded = true;
    } catch (error) {
      this.logger.error(`Failed to load workflows into cache: ${error.message}`);
      this.logger.error(error.stack);
    }
  }

  /**
   * List all available workflows
   */
  async listWorkflows(): Promise<WorkflowMetadata[]> {
    await this.ensureWorkflowsLoaded();
    return Array.from(this.workflowCache.values()).map(m => m.metadata);
  }

  /**
   * Read metadata for a specific workflow
   */
  async readWorkflow(name: string): Promise<WorkflowMetadata> {
    await this.ensureWorkflowsLoaded();
    const module = this.workflowCache.get(name);
    
    if (!module) {
      this.logger.error(`Failed to read workflow "${name}": Not found in cache`);
      throw new Error(`Workflow "${name}" not found or invalid`);
    }
    
    return module.metadata;
  }

  /**
   * Execute a workflow
   */
  async runWorkflow(
    name: string,
    vars: Record<string, any>,
    taskId: string,
  ): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.logger.log(`\n${'='.repeat(60)}`);
    this.logger.log(`[WORKFLOW EXECUTION] ${name}`);
    this.logger.log(`Task ID: ${taskId}`);
    this.logger.log(`Variables: ${JSON.stringify(vars)}`);
    this.logger.log(`${'='.repeat(60)}\n`);

    try {
      await this.ensureWorkflowsLoaded();
      const module = this.workflowCache.get(name);
      
      if (!module) {
        throw new Error(`Workflow "${name}" not found`);
      }
      
      // Validate variables
      this.workflowLoader.validateVariables(module.metadata.variables, vars);
      
      // Prepare services
      const services: WorkflowServices = {
        pinchTab: this.pinchTabService,
        desktop: this.desktopService,
        browserLogger: this.browserLogger,
        messagesService: this.messagesService,
        taskId: taskId,
        eventEmitter: this.eventEmitter,
      };
      
      // Execute workflow with timeout
      const timeout = module.metadata.timeout_ms;
      this.logger.log(`Executing workflow with ${timeout}ms timeout...`);
      
      const result = await Promise.race([
        module.execute(vars, services),
        this.createTimeout(timeout, name),
      ]);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.logger.log(`✅ Workflow "${name}" completed successfully in ${duration}ms`);
      } else {
        this.logger.error(`❌ Workflow "${name}" failed after ${duration}ms: ${result.message || result.error}`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`💥 Workflow "${name}" exception after ${duration}ms: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        message: `Workflow execution failed: ${error.message}`,
      };
    }
  }

  /**
   * Find workflow file path by name
   */
  private async findWorkflowPath(name: string): Promise<string> {
    // Try exact match first - .js (compiled) or .ts (source)
    const exactJsPath = path.join(this.workflowsDir, `${name}.workflow.js`);
    if (fs.existsSync(exactJsPath)) {
      return exactJsPath;
    }
    
    const exactTsPath = path.join(this.workflowsDir, `${name}.workflow.ts`);
    if (fs.existsSync(exactTsPath)) {
      return exactTsPath;
    }
    
    // Search in subdirectories - try .js first
    let pattern = path.join(this.workflowsDir, '**', `${name}.workflow.js`);
    let matches = await glob(pattern, { windowsPathsNoEscape: true });
    
    // If no .js files found, try .ts files
    if (matches.length === 0) {
      pattern = path.join(this.workflowsDir, '**', `${name}.workflow.ts`);
      matches = await glob(pattern, { windowsPathsNoEscape: true });
    }
    
    if (matches.length === 0) {
      throw new Error(`Workflow "${name}" not found`);
    }
    
    if (matches.length > 1) {
      this.logger.warn(`Multiple workflows found with name "${name}", using first match`);
    }
    
    return matches[0];
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number, workflowName: string): Promise<WorkflowResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Workflow "${workflowName}" timed out after ${ms}ms`));
      }, ms);
    });
  }
}
