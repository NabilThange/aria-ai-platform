import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TasksService } from './tasks.service';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TasksGateway.name);

  constructor(
    @Inject(forwardRef(() => TasksService))
    private readonly tasksService: TasksService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug({ event: 'ws.connected', clientId: client.id }, `Client connected`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug({ event: 'ws.disconnected', clientId: client.id }, `Client disconnected`);
  }

  @SubscribeMessage('join_task')
  handleJoinTask(client: Socket, payload: { taskId: string; role?: 'JUDGE' | 'OPERATOR' }) {
    const taskId = typeof payload === 'string' ? payload : payload.taskId;
    const role = typeof payload === 'object' ? payload.role : undefined;
    
    client.join(`task_${taskId}`);
    
    // Store role in socket metadata for filtering
    if (role) {
      client.data.role = role;
      client.data.taskId = taskId;
      this.logger.debug({ event: 'ws.join_task', clientId: client.id, taskId, role }, `Client joined task room with role`);
    } else {
      this.logger.debug({ event: 'ws.join_task', clientId: client.id, taskId }, `Client joined task room`);
    }
  }

  @SubscribeMessage('leave_task')
  handleLeaveTask(client: Socket, taskId: string) {
    client.leave(`task_${taskId}`);
    this.logger.debug({ event: 'ws.leave_task', clientId: client.id, taskId }, `Client left task room`);
  }

  @SubscribeMessage('approve_plan')
  async handleApprovePlan(client: Socket, payload: { taskId: string; approvedPlan: any[] }) {
    this.logger.log({ event: 'ws.approve_plan', clientId: client.id, taskId: payload.taskId, stepCount: payload.approvedPlan.length }, `Plan approved by client`);
    
    try {
      // Call TasksService.approvePlan() which will emit the 'plan.approved' event
      // that OrchestrationService is listening for
      await this.tasksService.approvePlan(payload.taskId, payload.approvedPlan);
      
      // Emit confirmation back to client
      this.server.to(`task_${payload.taskId}`).emit('plan_approval_confirmed', {
        taskId: payload.taskId,
        success: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error({ event: 'ws.approve_plan_error', taskId: payload.taskId, error: error.message }, `Failed to approve plan`);
      
      // Emit error back to client
      this.server.to(`task_${payload.taskId}`).emit('plan_approval_error', {
        taskId: payload.taskId,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitTaskUpdate(taskId: string, task: any) {
    this.server.to(`task_${taskId}`).emit('task_updated', task);
  }

  emitNewMessage(taskId: string, message: any) {
    this.server.to(`task_${taskId}`).emit('new_message', message);
  }

  emitTaskCreated(task: any) {
    this.server.emit('task_created', task);
  }

  emitTaskDeleted(taskId: string) {
    this.server.emit('task_deleted', taskId);
  }

  /**
   * Emit real-time agent activity (screenshots, actions, reasoning)
   */
  emitAgentActivity(taskId: string, activity: {
    type: 'screenshot' | 'action' | 'reasoning' | 'perception';
    data: any;
    timestamp: string;
  }) {
    this.server.to(`task_${taskId}`).emit('agent_activity', activity);
  }

  /**
   * Listen for task.status events from OrchestrationService
   * EventEmitter2 is used ONLY for UI notifications, NOT for agent-to-agent communication
   * 
   * CONTROL CENTER: Filter sensitive events based on client role
   */
  @OnEvent('task.status')
  handleTaskStatusEvent(payload: {
    taskId: string;
    status: string;
    activeAgent: string | null;
    timestamp: string;
  }) {
    // Check if this is a sensitive status that should only go to operators
    const sensitiveStatuses = ['manual_control', 'operator_active'];
    const isSensitive = sensitiveStatuses.includes(payload.status);

    if (isSensitive) {
      // Only emit to OPERATOR clients
      this.emitToRole(`task_${payload.taskId}`, 'OPERATOR', 'agent_status', {
        status: payload.status,
        activeAgent: payload.activeAgent,
        timestamp: payload.timestamp,
      });
      
      this.logger.debug({ event: 'ws.agent_status_filtered', taskId: payload.taskId, status: payload.status }, 'Emitted to OPERATOR only');
    } else {
      // Emit to all clients in the room
      this.server.to(`task_${payload.taskId}`).emit('agent_status', {
        status: payload.status,
        activeAgent: payload.activeAgent,
        timestamp: payload.timestamp,
      });

      // Also emit general task update
      this.server.to(`task_${payload.taskId}`).emit('task_status_changed', {
        status: payload.status,
        activeAgent: payload.activeAgent,
      });
    }
  }

  /**
   * Emit event to clients with specific role
   */
  private emitToRole(room: string, role: 'JUDGE' | 'OPERATOR', event: string, data: any) {
    const roomSockets = this.server.sockets.adapter.rooms.get(room);
    if (!roomSockets) return;

    for (const socketId of roomSockets) {
      const socket = this.server.sockets.sockets.get(socketId);
      if (socket && socket.data.role === role) {
        socket.emit(event, data);
      }
    }
  }

  /**
   * Emit manual control active event (OPERATOR only)
   */
  emitManualControlActive(taskId: string, active: boolean) {
    this.emitToRole(`task_${taskId}`, 'OPERATOR', 'manual_control_active', {
      taskId,
      active,
      timestamp: new Date().toISOString(),
    });
    
    this.logger.debug({ event: 'ws.manual_control_active', taskId, active }, 'Manual control status emitted to operators');
  }

  /**
   * Emit operator action (visible to all, but marked as from operator on C2)
   */
  emitOperatorAction(taskId: string, action: {
    toolName: string;
    parameters: any;
    result: any;
    timestamp: string;
  }) {
    // Emit to OPERATOR with full details
    this.emitToRole(`task_${taskId}`, 'OPERATOR', 'operator_action', {
      ...action,
      source: 'OPERATOR',
    });

    // Emit to JUDGE as if agent did it (no source field)
    this.emitToRole(`task_${taskId}`, 'JUDGE', 'tool_execution_result', {
      toolName: action.toolName,
      result: action.result,
      timestamp: action.timestamp,
    });
    
    this.logger.debug({ event: 'ws.operator_action', taskId, toolName: action.toolName }, 'Operator action emitted');
  }

  /**
   * Listen for browser.log events from BrowserLoggerService
   * Sends detailed agent execution logs to browser console
   */
  @OnEvent('browser.log')
  handleBrowserLogEvent(payload: {
    taskId: string;
    type: string;
    timestamp: string;
    data: any;
  }) {
    // Emit to clients subscribed to this task
    this.server.to(`task_${payload.taskId}`).emit('browser_log', payload);
  }
}
