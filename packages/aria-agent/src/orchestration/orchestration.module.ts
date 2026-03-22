import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrchestrationService } from './orchestration.service';
import { AgentExecutionLoggerService } from './agent-execution-logger.service';
import { SharedStateModule } from '../shared-state/shared-state.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ClarifierModule } from '../agents/clarifier/clarifier.module';
import { OrchestratorModule } from '../agents/orchestrator/orchestrator.module';
import { WebModule } from '../agents/web/web.module';
import { DesktopModule } from '../agents/desktop/desktop.module';
import { WorkflowModule } from '../agents/workflow/workflow.module';
import { VerifierModule } from '../agents/verifier/verifier.module';
import { RecoveryModule } from '../agents/recovery/recovery.module';
import { ReporterModule } from '../agents/reporter/reporter.module';
import { TasksModule } from '../tasks/tasks.module';
import { ServicesModule } from '../services/services.module';
import { WorkflowsController } from '../workflows/workflows.controller';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SharedStateModule,
    PrismaModule,
    ServicesModule,
    ClarifierModule,
    OrchestratorModule,
    WebModule,
    DesktopModule,
    WorkflowModule,
    VerifierModule,
    RecoveryModule,
    ReporterModule,
    forwardRef(() => TasksModule),
    forwardRef(() => MessagesModule),
  ],
  controllers: [WorkflowsController],
  providers: [OrchestrationService, AgentExecutionLoggerService],
  exports: [OrchestrationService, AgentExecutionLoggerService],
})
export class OrchestrationModule {}
