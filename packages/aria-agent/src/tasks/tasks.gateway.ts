import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

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

  handleConnection(client: Socket) {
    this.logger.log({ event: 'ws.connected', clientId: client.id }, `Client connected`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log({ event: 'ws.disconnected', clientId: client.id }, `Client disconnected`);
  }

  @SubscribeMessage('join_task')
  handleJoinTask(client: Socket, taskId: string) {
    client.join(`task_${taskId}`);
    this.logger.debug({ event: 'ws.join_task', clientId: client.id, taskId }, `Client joined task room`);
  }

  @SubscribeMessage('leave_task')
  handleLeaveTask(client: Socket, taskId: string) {
    client.leave(`task_${taskId}`);
    this.logger.debug({ event: 'ws.leave_task', clientId: client.id, taskId }, `Client left task room`);
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
   */
  @OnEvent('task.status')
  handleTaskStatusEvent(payload: {
    taskId: string;
    status: string;
    activeAgent: string | null;
    timestamp: string;
  }) {
    // Emit to clients subscribed to this task
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
