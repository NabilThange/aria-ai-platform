import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class PlannerGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('join_plan')
  handleJoinPlan(client: Socket, planId: string) {
    client.join(`plan_${planId}`);
    console.log(`Client ${client.id} joined plan ${planId}`);
  }

  @SubscribeMessage('leave_plan')
  handleLeavePlan(client: Socket, planId: string) {
    client.leave(`plan_${planId}`);
    console.log(`Client ${client.id} left plan ${planId}`);
  }

  emitPlanUpdate(planId: string, plan: any) {
    this.server.to(`plan_${planId}`).emit('plan_updated', plan);
  }

  emitStepUpdate(planId: string, step: any) {
    this.server.to(`plan_${planId}`).emit('step_updated', step);
  }
}
