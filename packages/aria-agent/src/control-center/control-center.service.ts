import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SharedStateService } from '../shared-state/shared-state.service';
import { TasksService } from '../tasks/tasks.service';
import { ExecuteToolDto, AgentType } from './dto/execute-tool.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PinchTabService } from '../services/pinchtab.service';
import { DesktopService } from '../services/desktop.service';
import { WorkflowService } from '../services/workflow.service';
import { TaskLogger } from '../logger/task-logger';
import { TasksGateway } from '../tasks/tasks.gateway';
import { BrowserLoggerService } from '../logger/browser-logger.service';

@Injectable()
export class ControlCenterService {
  private readonly logger = new Logger(ControlCenterService.name);

  constructor(
    private readonly sharedStateService: SharedStateService,
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
    private readonly eventEmitter: EventEmitter2,
    private readonly pinchTabService: PinchTabService,
    private readonly desktopService: DesktopService,
    private readonly workflowService: WorkflowService,
    @Inject(forwardRef(() => TasksGateway))
    private readonly tasksGateway: TasksGateway,
    private readonly browserLoggerService: BrowserLoggerService,
  ) {}

  async executeTool(taskId: string, executeToolDto: ExecuteToolDto) {
    const log = new TaskLogger(ControlCenterService.name, taskId, 'OPERATOR');
    log.info({ event: 'control.execute_tool', tool: executeToolDto.toolName, agent: executeToolDto.agentName }, 'Executing tool manually');
    
    // Verify task exists
    const task = await this.tasksService.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    const startTime = Date.now();

    try {
      // Emit tool.call event to display in chat
      this.browserLoggerService.logToolCall(taskId, 'OPERATOR', {
        name: executeToolDto.toolName,
        input: executeToolDto.parameters,
      });

      let result: any;

      // Execute tool based on agent type
      switch (executeToolDto.agentName) {
        case AgentType.WEB:
          result = await this.executeWebTool(taskId, executeToolDto.toolName, executeToolDto.parameters);
          break;
        
        case AgentType.DESKTOP:
          result = await this.executeDesktopTool(taskId, executeToolDto.toolName, executeToolDto.parameters);
          break;
        
        case AgentType.WORKFLOW:
          result = await this.executeWorkflowTool(taskId, executeToolDto.toolName, executeToolDto.parameters);
          break;
        
        default:
          throw new Error(`Unknown agent type: ${executeToolDto.agentName}`);
      }

      const duration = Date.now() - startTime;

      // Emit tool.result event to display in chat
      this.browserLoggerService.logToolResult(taskId, 'OPERATOR', {
        toolName: executeToolDto.toolName,
        success: true,
        output: result,
        duration,
      });

      // Log action to shared state
      await this.logOperatorAction(taskId, executeToolDto.toolName, executeToolDto.parameters, result);

      // Emit operator action via WebSocket (for operator-specific events)
      this.tasksGateway.emitOperatorAction(taskId, {
        toolName: executeToolDto.toolName,
        parameters: executeToolDto.parameters,
        result,
        timestamp: new Date().toISOString(),
      });

      log.info({ event: 'control.execute_tool_success', tool: executeToolDto.toolName, duration }, 'Tool executed successfully');

      return {
        success: true,
        taskId,
        toolName: executeToolDto.toolName,
        agentName: executeToolDto.agentName,
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Emit tool.result event with error to display in chat
      this.browserLoggerService.logToolResult(taskId, 'OPERATOR', {
        toolName: executeToolDto.toolName,
        success: false,
        error: error.message,
        duration,
      });

      log.error({ event: 'control.execute_tool_error', tool: executeToolDto.toolName, error: error.message, duration }, 'Tool execution failed');
      throw error;
    }
  }

  private async executeWebTool(taskId: string, toolName: string, parameters: Record<string, any>): Promise<any> {
    this.logger.debug(`Executing web tool: ${toolName}`);

    // Map tool names to PinchTab service methods
    switch (toolName) {
      case 'pinchtab_navigate':
        return await this.pinchTabService.navigate(parameters.url, undefined, taskId);
      
      case 'pinchtab_click':
        return await this.pinchTabService.click(parameters.selector, undefined, taskId);
      
      case 'pinchtab_type':
        return await this.pinchTabService.type(parameters.selector, parameters.text, undefined, taskId);
      
      case 'pinchtab_screenshot':
        return await this.pinchTabService.takeScreenshot(undefined, taskId);
      
      case 'pinchtab_scroll':
        return await this.pinchTabService.scroll(parameters.direction, parameters.amount || 3, undefined, taskId);
      
      case 'pinchtab_extract':
        // Extract is done via snapshot
        const snapshot = await this.pinchTabService.snapshot('all', undefined, taskId);
        const element = snapshot.elements.find(el => el.ref === parameters.selector);
        return { text: element?.text || '', element };
      
      default:
        throw new Error(`Unknown web tool: ${toolName}`);
    }
  }

  private async executeDesktopTool(taskId: string, toolName: string, parameters: Record<string, any>): Promise<any> {
    this.logger.debug(`Executing desktop tool: ${toolName} with action: ${parameters.action}`);

    // Desktop tools use the unified "computer" tool with action parameter
    switch (parameters.action) {
      case 'click':
        const [x, y] = parameters.coordinate;
        return await this.desktopService.click(x, y);
      
      case 'type':
        return await this.desktopService.typeText(parameters.text);
      
      case 'key':
        return await this.desktopService.pressKeys([parameters.text]);
      
      case 'terminal_command':
        // Terminal commands are executed via desktop service
        // Note: This requires the ariad service to support terminal commands
        throw new Error('Terminal commands not yet implemented in control center');
      
      case 'application':
        return await this.desktopService.launchApplication(parameters.application as any);
      
      default:
        throw new Error(`Unknown desktop action: ${parameters.action}`);
    }
  }

  private async executeWorkflowTool(taskId: string, toolName: string, parameters: Record<string, any>): Promise<any> {
    this.logger.debug(`Executing workflow: ${toolName}`);

    // Execute workflow with parameters as variables
    const result = await this.workflowService.runWorkflow(toolName, parameters, taskId);
    
    if (!result.success) {
      throw new Error(result.error || result.message || 'Workflow execution failed');
    }

    return result;
  }

  private async logOperatorAction(taskId: string, toolName: string, parameters: Record<string, any>, result: any): Promise<void> {
    // Get current action history
    const actionHistory = await this.sharedStateService.get<any[]>(taskId, 'action_history') || [];
    
    // Append operator action
    actionHistory.push({
      source: 'OPERATOR',
      timestamp: new Date().toISOString(),
      toolName,
      parameters,
      result,
    });

    // Save back to shared state
    await this.sharedStateService.set(taskId, 'action_history', actionHistory);
    
    this.logger.debug(`Logged operator action to shared state: ${toolName}`);
  }

  async stopAgent(taskId: string) {
    this.logger.log(`Stopping agent for task ${taskId}`);
    
    // Set manual control flags in Redis
    await this.sharedStateService.set(taskId, 'manual_control', true);
    await this.sharedStateService.set(taskId, 'operator_active', true);
    
    // Emit manual control active event (OPERATOR only)
    this.tasksGateway.emitManualControlActive(taskId, true);
    
    // DO NOT change task status - keep it as RUNNING
    // DO NOT emit agent_status event to all clients - only operators see this
    
    return {
      success: true,
      taskId,
      manualControl: true,
      operatorActive: true,
    };
  }

  async resumeAgent(taskId: string) {
    this.logger.log(`Resuming agent for task ${taskId}`);
    
    // Remove manual control flags
    await this.sharedStateService.set(taskId, 'manual_control', false);
    await this.sharedStateService.set(taskId, 'operator_active', false);
    
    // Emit manual control inactive event (OPERATOR only)
    this.tasksGateway.emitManualControlActive(taskId, false);
    
    // Emit event to resume orchestration
    this.eventEmitter.emit('agent.resume', { taskId });
    
    return {
      success: true,
      taskId,
      manualControl: false,
      operatorActive: false,
    };
  }

  async getOperatorState(taskId: string) {
    const manualControl = await this.sharedStateService.get<boolean>(taskId, 'manual_control');
    const operatorActive = await this.sharedStateService.get<boolean>(taskId, 'operator_active');
    const executionPlan = await this.sharedStateService.get<any>(taskId, 'execution_plan');
    const currentStep = await this.sharedStateService.get<number>(taskId, 'current_step');
    const actionHistory = await this.sharedStateService.get<any[]>(taskId, 'action_history');
    
    return {
      isManualControl: manualControl || false,
      operatorActive: operatorActive || false,
      currentStep: currentStep || 0,
      totalSteps: executionPlan?.steps?.length || 0,
      lastAction: actionHistory?.[actionHistory.length - 1] || null,
      pendingActions: [],
    };
  }

  async updateTaskStatus(taskId: string, status: string) {
    this.logger.log(`Updating task status for ${taskId} to ${status}`);
    
    // Validate status
    const validStatuses = ['PENDING', 'RUNNING', 'NEEDS_HELP', 'NEEDS_REVIEW', 'COMPLETED', 'CANCELLED', 'FAILED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Update task status in database
    const updatedTask = await this.tasksService.update(taskId, { status: status as any });
    
    // Update shared state
    await this.sharedStateService.set(taskId, 'status', status.toLowerCase());
    
    // Emit status change event
    this.eventEmitter.emit('task.status', {
      taskId,
      status: status.toLowerCase(),
      activeAgent: null,
      timestamp: new Date().toISOString(),
    });
    
    // If status is CANCELLED or FAILED, cleanup resources
    if (status === 'CANCELLED' || status === 'FAILED') {
      this.eventEmitter.emit('task.cleanup', { taskId });
    }
    
    this.logger.log(`Task ${taskId} status updated to ${status}`);
    
    return {
      success: true,
      taskId,
      status,
      task: updatedTask,
    };
  }
}

