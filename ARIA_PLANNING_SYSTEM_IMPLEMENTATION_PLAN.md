# ARIA Planning System - Implementation Plan

## 1. Executive Summary

This implementation plan details the architecture, development approach, and rollout strategy for adding an intelligent planning system to ARIA. The planning system will reduce token usage by 40-70% by generating upfront execution plans that users can review and approve before the agent begins work.

### Key Benefits
- **Token Reduction**: 40-70% savings through upfront planning vs. iterative screenshot analysis
- **User Control**: Review and modify plans before execution
- **Transparency**: Clear visibility into what the agent will do
- **Error Prevention**: Catch issues before expensive execution
- **Multi-Path Options**: Choose between terminal, GUI, or hybrid approaches

### Implementation Timeline
- **Phase 1**: Backend Planning Service (3-4 days)
- **Phase 2**: Frontend UI Components (3-4 days)
- **Phase 3**: Integration & Testing (2-3 days)
- **Phase 4**: Production Rollout (1-2 days)

**Total Estimated Time**: 9-13 days

---

## 2. Current State Analysis

### Existing Architecture

**Backend (aria-agent)**:
- NestJS application with modular architecture
- Task-based execution model with WebSocket real-time updates
- Agent processor runs iterative loops: screenshot → analyze → act → repeat
- Prisma ORM with PostgreSQL database
- Multiple LLM provider support (Google, Groq, OpenRouter, Bytez)
- Computer-use tools for mouse, keyboard, terminal, and application control

**Frontend (aria-ui)**:
- Next.js application with React components
- Real-time WebSocket integration for task updates
- Chat-based interface with message streaming
- Task list with status tracking
- File upload support

**Current Flow**:
```
User Message → Task Created → Agent Starts Immediately → 
Screenshot Loop → Tool Execution → Status Updates → Completion
```

### Problems with Current Approach

1. **High Token Usage**: Every action requires screenshot analysis (~1500 tokens)
2. **No Planning**: Agent discovers approach through trial and error
3. **Limited User Control**: Can't preview or modify execution strategy
4. **Inefficient Paths**: May choose GUI when terminal would be faster
5. **No Cost Visibility**: Users don't know token costs upfront

### Example Token Waste

**Task**: "Create a file test.txt with content 'Hello World'"

**Current Approach** (4500 tokens):
1. Screenshot → Analyze → Open file manager (1500 tokens)
2. Screenshot → Analyze → Right-click → New file (1500 tokens)
3. Screenshot → Analyze → Type name and content (1500 tokens)

**With Planning** (200 tokens):
1. Planning phase: Generate plan (2000 tokens, one-time)
2. Execution: `echo "Hello World" > test.txt` (200 tokens)

**Savings**: 95.6% for this task

---

## 3. Proposed Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     User Input                              │
│           "Book a flight to NYC next week"                  │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Planner Service                            │
│  • Task analysis & decomposition                            │
│  • Multi-path generation (terminal/GUI/hybrid)              │
│  • Token cost estimation                                    │
│  • Success probability calculation                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  User Approval UI                           │
│  • View 2-3 execution paths with pros/cons                  │
│  • Edit individual steps                                    │
│  • See token estimates                                      │
│  • Approve or reject plan                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Execution Engine                            │
│  • Execute approved plan step-by-step                       │
│  • Create checkpoints before critical steps                 │
│  • Track progress with WebSocket updates                    │
│  • Rollback on failure to last checkpoint                   │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Backend Modules**:
- `planner/` - Plan generation and management
- `executor/` - Plan execution with checkpoints
- `strategies/` - Terminal, GUI, and hybrid execution strategies

**Frontend Components**:
- `planner/` - Plan viewer, path selector, step editor
- Integration with existing task and message components

**Database Schema**:
- New tables: `Plan`, `ExecutionPath`, `PlanStep`, `Checkpoint`
- Relationships with existing `Task` model

---

## 4. Database Schema Changes

### New Prisma Models

```prisma
// Plan represents the overall planning session for a task
model Plan {
  id                String          @id @default(uuid())
  taskId            String          @unique
  task              Task            @relation(fields: [taskId], references: [id], onDelete: Cascade)
  taskDescription   String
  status            PlanStatus      @default(PLANNING)
  selectedPathId    String?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  paths             ExecutionPath[]
  
  @@index([taskId])
  @@index([status])
}

enum PlanStatus {
  PLANNING      // Plan is being generated
  PENDING       // Plan generated, awaiting user approval
  APPROVED      // User approved, ready for execution
  EXECUTING     // Currently executing
  COMPLETED     // Execution completed successfully
  FAILED        // Execution failed
  CANCELLED     // User cancelled
}

// ExecutionPath represents one possible approach to complete the task
model ExecutionPath {
  id                    String      @id @default(uuid())
  planId                String
  plan                  Plan        @relation(fields: [planId], references: [id], onDelete: Cascade)
  name                  String      // e.g., "Terminal Approach", "GUI Approach"
  description           String      // Brief explanation of this approach
  strategy              Strategy
  estimatedTokens       Int         // Total estimated tokens for this path
  estimatedDuration     Int         // Estimated seconds to complete
  successProbability    Float       // 0.0 to 1.0
  pros                  String[]    // Advantages of this approach
  cons                  String[]    // Disadvantages of this approach
  order                 Int         // Display order (0, 1, 2)
  createdAt             DateTime    @default(now())
  steps                 PlanStep[]
  
  @@index([planId])
}

enum Strategy {
  TERMINAL  // Command-line based approach
  GUI       // Graphical interface approach
  HYBRID    // Mix of terminal and GUI
  BROWSER   // Web browser based approach
}

// PlanStep represents a single action in an execution path
model PlanStep {
  id                String          @id @default(uuid())
  pathId            String
  path              ExecutionPath   @relation(fields: [pathId], references: [id], onDelete: Cascade)
  order             Int             // Execution order within path
  action            String          // Human-readable description
  description       String          // Detailed explanation
  type              StepType
  command           String?         // For terminal steps
  screenshot        Boolean         @default(false) // Whether to take screenshot
  verification      String?         // How to verify success
  estimatedTokens   Int             // Tokens for this step
  checkpoint        Boolean         @default(false) // Create checkpoint before this step
  dependencies      String[]        // IDs of steps that must complete first
  status            StepStatus      @default(PENDING)
  executedAt        DateTime?
  completedAt       DateTime?
  error             String?
  createdAt         DateTime        @default(now())
  
  @@index([pathId])
  @@index([status])
}

enum StepType {
  TERMINAL  // Execute bash command
  GUI       // GUI interaction (click, type, etc.)
  BROWSER   // Browser navigation/interaction
  WAIT      // Wait for duration
  VERIFY    // Verification step
}

enum StepStatus {
  PENDING       // Not started
  EXECUTING     // Currently running
  COMPLETED     // Successfully completed
  FAILED        // Failed with error
  SKIPPED       // Skipped due to dependency failure
}

// Checkpoint represents a saved state during execution
model Checkpoint {
  id          String    @id @default(uuid())
  planId      String
  stepId      String    // Step ID where checkpoint was created
  screenshot  String?   // Base64 screenshot (optional)
  state       Json      // Serialized execution context
  createdAt   DateTime  @default(now())
  
  @@index([planId])
  @@index([createdAt])
}

// Update existing Task model to include planning relationship
model Task {
  // ... existing fields ...
  plan        Plan?     // One-to-one relationship
}
```

### Migration Strategy

**Step 1**: Create migration file
```bash
cd packages/aria-agent
npx prisma migrate dev --name add_planning_system
```

**Step 2**: Migration SQL (auto-generated by Prisma)
```sql
-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('PLANNING', 'PENDING', 'APPROVED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "Strategy" AS ENUM ('TERMINAL', 'GUI', 'HYBRID', 'BROWSER');
CREATE TYPE "StepType" AS ENUM ('TERMINAL', 'GUI', 'BROWSER', 'WAIT', 'VERIFY');
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL UNIQUE,
    "taskDescription" TEXT NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'PLANNING',
    "selectedPathId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionPath" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "strategy" "Strategy" NOT NULL,
    "estimatedTokens" INTEGER NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "successProbability" DOUBLE PRECISION NOT NULL,
    "pros" TEXT[],
    "cons" TEXT[],
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExecutionPath_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "PlanStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pathId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "StepType" NOT NULL,
    "command" TEXT,
    "screenshot" BOOLEAN NOT NULL DEFAULT false,
    "verification" TEXT,
    "estimatedTokens" INTEGER NOT NULL,
    "checkpoint" BOOLEAN NOT NULL DEFAULT false,
    "dependencies" TEXT[],
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanStep_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "ExecutionPath" ("id") ON DELETE CASCADE
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "screenshot" TEXT,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Plan_taskId_idx" ON "Plan"("taskId");
CREATE INDEX "Plan_status_idx" ON "Plan"("status");
CREATE INDEX "ExecutionPath_planId_idx" ON "ExecutionPath"("planId");
CREATE INDEX "PlanStep_pathId_idx" ON "PlanStep"("pathId");
CREATE INDEX "PlanStep_status_idx" ON "PlanStep"("status");
CREATE INDEX "Checkpoint_planId_idx" ON "Checkpoint"("planId");
CREATE INDEX "Checkpoint_createdAt_idx" ON "Checkpoint"("createdAt");
```

**Step 3**: Apply migration
```bash
npx prisma migrate deploy
```

**Step 4**: Generate Prisma Client
```bash
npx prisma generate
```

---

## 5. Backend Implementation

### 5.1 Planner Module

#### File Structure
```
packages/aria-agent/src/planner/
├── planner.module.ts           # NestJS module registration
├── planner.service.ts          # Core planning logic
├── planner.controller.ts       # REST API endpoints
├── planner.gateway.ts          # WebSocket events
├── planner.types.ts            # TypeScript interfaces
├── planner.prompts.ts          # LLM prompts for planning
├── planner.constants.ts        # Constants and configurations
├── dto/
│   ├── create-plan.dto.ts      # DTO for plan creation
│   ├── update-plan.dto.ts      # DTO for plan updates
│   └── approve-plan.dto.ts     # DTO for plan approval
└── strategies/
    ├── terminal.strategy.ts    # Terminal-based strategies
    ├── gui.strategy.ts         # GUI-based strategies
    ├── hybrid.strategy.ts      # Hybrid strategies
    └── browser.strategy.ts     # Browser-based strategies
```

#### planner.module.ts
```typescript
import { Module, forwardRef } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PlannerController } from './planner.controller';
import { PlannerGateway } from './planner.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { TasksModule } from '../tasks/tasks.module';
import { GoogleModule } from '../google/google.module';
import { GroqModule } from '../groq/groq.module';
import { OpenRouterModule } from '../openrouter/openrouter.module';
import { BytezModule } from '../bytez/bytez.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => TasksModule),
    GoogleModule,
    GroqModule,
    OpenRouterModule,
    BytezModule,
  ],
  controllers: [PlannerController],
  providers: [PlannerService, PlannerGateway],
  exports: [PlannerService],
})
export class PlannerModule {}
```

#### planner.types.ts
```typescript
import { Strategy, StepType, PlanStatus, StepStatus } from '@prisma/client';

export interface CreatePlanInput {
  taskId: string;
  taskDescription: string;
  model: {
    provider: string;
    name: string;
    title: string;
  };
}

export interface ExecutionPathData {
  name: string;
  description: string;
  strategy: Strategy;
  estimatedTokens: number;
  estimatedDuration: number;
  successProbability: number;
  pros: string[];
  cons: string[];
  steps: PlanStepData[];
}

export interface PlanStepData {
  action: string;
  description: string;
  type: StepType;
  command?: string;
  screenshot: boolean;
  verification?: string;
  estimatedTokens: number;
  checkpoint: boolean;
  dependencies: string[];
}

export interface ExecutionContext {
  planId: string;
  pathId: string;
  currentStepId: string | null;
  completedSteps: string[];
  checkpoints: CheckpointData[];
  variables: Record<string, any>;
}

export interface CheckpointData {
  id: string;
  stepId: string;
  timestamp: Date;
  screenshot?: string;
  state: Record<string, any>;
}

export interface PlanGenerationResponse {
  paths: ExecutionPathData[];
}
```

#### planner.prompts.ts
```typescript
export const PLAN_GENERATION_PROMPT = `You are an expert task planner for a computer-use AI agent running on Ubuntu 22.04 with XFCE desktop.

AVAILABLE CAPABILITIES:
1. Terminal Commands
   - Full bash/shell access
   - Package management: apt, npm, pip
   - File operations: ls, cp, mv, rm, mkdir, cat, grep, find
   - Network tools: curl, wget, ping
   - Text processing: sed, awk, sort, uniq

2. GUI Automation
   - Screenshot-based visual analysis
   - Mouse actions: click, drag, scroll
   - Keyboard input: type text, keyboard shortcuts
   - Application launching and window management

3. Web Browser (Firefox ESR)
   - Navigate to URLs
   - Fill forms
   - Click elements
   - Extract data from pages

4. File System
   - Read/write files
   - Create directories
   - File manager (Thunar)
   - Text editor (Mousepad)

INSTALLED APPLICATIONS:
- Firefox ESR (web browser)
- XFCE Terminal (terminal emulator)
- Thunar (file manager)
- Mousepad (text editor)
- Galculator (calculator)
- Ristretto (image viewer)
- File-roller (archive manager)

TASK: {{taskDescription}}

INSTRUCTIONS:
Generate 2-3 different approaches to accomplish this task. For each approach:

1. Choose the most efficient strategy (TERMINAL preferred when possible)
2. Break down into clear, atomic steps
3. Estimate token cost for each step:
   - Terminal command: 200 tokens
   - GUI action: 1500 tokens (includes screenshot analysis)
   - Browser action: 1000 tokens
   - Wait: 50 tokens

4. Calculate success probability based on:
   - Complexity of the approach
   - Number of steps
   - Reliability of each step type

5. List pros and cons

RESPONSE FORMAT (JSON):
{
  "paths": [
    {
      "name": "Descriptive name (e.g., 'Terminal Approach', 'GUI Approach')",
      "description": "Brief 1-2 sentence explanation",
      "strategy": "TERMINAL" | "GUI" | "HYBRID" | "BROWSER",
      "estimatedTokens": <sum of all step tokens>,
      "estimatedDuration": <estimated seconds>,
      "successProbability": <0.0 to 1.0>,
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1"],
      "steps": [
        {
          "action": "Brief action description",
          "description": "Detailed explanation of what this step does",
          "type": "TERMINAL" | "GUI" | "BROWSER" | "WAIT",
          "command": "bash command (if type is TERMINAL)",
          "screenshot": true/false,
          "verification": "How to verify this step succeeded",
          "estimatedTokens": <token count>,
          "checkpoint": true/false (checkpoint every 3-5 steps),
          "dependencies": []
        }
      ]
    }
  ]
}

OPTIMIZATION RULES:
1. ALWAYS prefer terminal commands over GUI when possible
2. Combine multiple operations into single commands when safe
3. Use pipes and command chaining to reduce steps
4. Only use GUI when terminal is not feasible
5. Create checkpoints before risky or irreversible operations
6. Include verification steps for critical actions

EXAMPLES:

Task: "Create a file test.txt with content 'Hello World'"
Best approach: Terminal
Command: echo "Hello World" > test.txt
Tokens: 200 (vs 4500 for GUI approach)

Task: "Book a flight on airline website"
Best approach: Browser
Reason: Requires web interaction, no CLI alternative

Task: "Install Node.js and create a new project"
Best approach: Terminal
Commands: sudo apt install nodejs npm && npx create-react-app my-app
Tokens: 400 (vs 15000+ for GUI approach)

Now generate the plan:`;

export function buildPlanPrompt(taskDescription: string): string {
  return PLAN_GENERATION_PROMPT.replace('{{taskDescription}}', taskDescription);
}
```


#### planner.service.ts
```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleService } from '../google/google.service';
import { GroqService } from '../groq/groq.service';
import { OpenRouterService } from '../openrouter/openrouter.service';
import { BytezService } from '../bytez/bytez.service';
import { PlannerGateway } from './planner.gateway';
import {
  CreatePlanInput,
  ExecutionPathData,
  PlanGenerationResponse,
  PlanStepData,
} from './planner.types';
import { buildPlanPrompt } from './planner.prompts';
import { Plan, PlanStatus, Strategy, StepType } from '@prisma/client';
import { BytebotAgentService } from '../agent/agent.types';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);
  private services: Record<string, BytebotAgentService> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly googleService: GoogleService,
    private readonly groqService: GroqService,
    private readonly openRouterService: OpenRouterService,
    private readonly bytezService: BytezService,
    private readonly plannerGateway: PlannerGateway,
  ) {
    this.services = {
      google: this.googleService,
      groq: this.groqService,
      openrouter: this.openRouterService,
      bytez: this.bytezService,
    };
  }

  /**
   * Create a new plan for a task
   */
  async createPlan(input: CreatePlanInput): Promise<Plan> {
    this.logger.log(`Creating plan for task: ${input.taskId}`);

    // Create plan record with PLANNING status
    const plan = await this.prisma.plan.create({
      data: {
        taskId: input.taskId,
        taskDescription: input.taskDescription,
        status: PlanStatus.PLANNING,
      },
    });

    // Emit planning started event
    this.plannerGateway.emitPlanUpdate(plan.id, plan);

    try {
      // Generate execution paths using LLM
      const paths = await this.generateExecutionPaths(
        input.taskDescription,
        input.model,
      );

      // Save paths to database
      for (let i = 0; i < paths.length; i++) {
        const pathData = paths[i];
        await this.createExecutionPath(plan.id, pathData, i);
      }

      // Update plan status to PENDING (awaiting user approval)
      const updatedPlan = await this.prisma.plan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.PENDING },
        include: {
          paths: {
            include: {
              steps: {
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { order: 'asc' },
          },
        },
      });

      this.logger.log(`Plan created successfully: ${plan.id}`);
      this.plannerGateway.emitPlanUpdate(plan.id, updatedPlan);

      return updatedPlan;
    } catch (error) {
      this.logger.error(`Error creating plan: ${error.message}`, error.stack);
      
      // Update plan status to FAILED
      await this.prisma.plan.update({
        where: { id: plan.id },
        data: { status: PlanStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Generate execution paths using LLM
   */
  private async generateExecutionPaths(
    taskDescription: string,
    model: { provider: string; name: string },
  ): Promise<ExecutionPathData[]> {
    this.logger.log('Generating execution paths with LLM');

    const service = this.services[model.provider];
    if (!service) {
      throw new Error(`Unknown model provider: ${model.provider}`);
    }

    const prompt = buildPlanPrompt(taskDescription);

    const response = await service.generateMessage(
      '', // No system prompt needed, it's in the user message
      [
        {
          id: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          taskId: '',
          summaryId: null,
          role: 'USER' as any,
          content: [
            {
              type: 'text' as any,
              text: prompt,
            },
          ],
        },
      ],
      model.name,
      false, // No tools
      new AbortController().signal,
    );

    // Extract text from response
    const textBlock = response.contentBlocks.find(
      (block: any) => block.type === 'text',
    );
    if (!textBlock) {
      throw new Error('No text response from LLM');
    }

    // Parse JSON response
    const jsonMatch = (textBlock as any).text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
    }

    const planResponse: PlanGenerationResponse = JSON.parse(jsonMatch[0]);

    this.logger.log(`Generated ${planResponse.paths.length} execution paths`);

    return planResponse.paths;
  }

  /**
   * Create an execution path with steps
   */
  private async createExecutionPath(
    planId: string,
    pathData: ExecutionPathData,
    order: number,
  ): Promise<void> {
    const path = await this.prisma.executionPath.create({
      data: {
        planId,
        name: pathData.name,
        description: pathData.description,
        strategy: pathData.strategy,
        estimatedTokens: pathData.estimatedTokens,
        estimatedDuration: pathData.estimatedDuration,
        successProbability: pathData.successProbability,
        pros: pathData.pros,
        cons: pathData.cons,
        order,
      },
    });

    // Create steps
    for (let i = 0; i < pathData.steps.length; i++) {
      const stepData = pathData.steps[i];
      await this.prisma.planStep.create({
        data: {
          pathId: path.id,
          order: i,
          action: stepData.action,
          description: stepData.description,
          type: stepData.type,
          command: stepData.command,
          screenshot: stepData.screenshot,
          verification: stepData.verification,
          estimatedTokens: stepData.estimatedTokens,
          checkpoint: stepData.checkpoint,
          dependencies: stepData.dependencies,
        },
      });
    }
  }

  /**
   * Get plan by ID with all related data
   */
  async getPlanById(planId: string): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
        task: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan ${planId} not found`);
    }

    return plan;
  }

  /**
   * Get plan by task ID
   */
  async getPlanByTaskId(taskId: string): Promise<Plan | null> {
    return this.prisma.plan.findUnique({
      where: { taskId },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  /**
   * Approve a plan and select an execution path
   */
  async approvePlan(planId: string, pathId: string): Promise<Plan> {
    this.logger.log(`Approving plan ${planId} with path ${pathId}`);

    // Verify path belongs to plan
    const path = await this.prisma.executionPath.findFirst({
      where: {
        id: pathId,
        planId,
      },
    });

    if (!path) {
      throw new NotFoundException(
        `Path ${pathId} not found in plan ${planId}`,
      );
    }

    // Update plan
    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: {
        status: PlanStatus.APPROVED,
        selectedPathId: pathId,
      },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    this.plannerGateway.emitPlanUpdate(planId, updatedPlan);

    return updatedPlan;
  }

  /**
   * Update a step in a plan
   */
  async updateStep(
    stepId: string,
    updates: {
      action?: string;
      description?: string;
      command?: string;
    },
  ): Promise<void> {
    await this.prisma.planStep.update({
      where: { id: stepId },
      data: updates,
    });

    // Get plan ID to emit update
    const step = await this.prisma.planStep.findUnique({
      where: { id: stepId },
      include: {
        path: {
          select: { planId: true },
        },
      },
    });

    if (step) {
      const plan = await this.getPlanById(step.path.planId);
      this.plannerGateway.emitPlanUpdate(plan.id, plan);
    }
  }

  /**
   * Cancel a plan
   */
  async cancelPlan(planId: string): Promise<Plan> {
    const updatedPlan = await this.prisma.plan.update({
      where: { id: planId },
      data: { status: PlanStatus.CANCELLED },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    this.plannerGateway.emitPlanUpdate(planId, updatedPlan);

    return updatedPlan;
  }
}
```

#### planner.controller.ts
```typescript
import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PlannerService } from './planner.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { ApprovePlanDto } from './dto/approve-plan.dto';
import { UpdateStepDto } from './dto/update-step.dto';

@Controller('plans')
export class PlannerController {
  constructor(private readonly plannerService: PlannerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.plannerService.createPlan(createPlanDto);
  }

  @Get(':id')
  async getPlan(@Param('id') id: string) {
    return this.plannerService.getPlanById(id);
  }

  @Get('task/:taskId')
  async getPlanByTaskId(@Param('taskId') taskId: string) {
    return this.plannerService.getPlanByTaskId(taskId);
  }

  @Put(':id/approve')
  async approvePlan(
    @Param('id') id: string,
    @Body() approvePlanDto: ApprovePlanDto,
  ) {
    return this.plannerService.approvePlan(id, approvePlanDto.pathId);
  }

  @Put(':id/cancel')
  async cancelPlan(@Param('id') id: string) {
    return this.plannerService.cancelPlan(id);
  }

  @Put('steps/:stepId')
  async updateStep(
    @Param('stepId') stepId: string,
    @Body() updateStepDto: UpdateStepDto,
  ) {
    return this.plannerService.updateStep(stepId, updateStepDto);
  }
}
```

#### planner.gateway.ts
```typescript
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
```

#### DTOs

**dto/create-plan.dto.ts**:
```typescript
import { IsString, IsObject, IsNotEmpty } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  taskDescription: string;

  @IsObject()
  @IsNotEmpty()
  model: {
    provider: string;
    name: string;
    title: string;
  };
}
```

**dto/approve-plan.dto.ts**:
```typescript
import { IsString, IsNotEmpty } from 'class-validator';

export class ApprovePlanDto {
  @IsString()
  @IsNotEmpty()
  pathId: string;
}
```

**dto/update-step.dto.ts**:
```typescript
import { IsString, IsOptional } from 'class-validator';

export class UpdateStepDto {
  @IsString()
  @IsOptional()
  action?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  command?: string;
}
```

---

### 5.2 Executor Module

#### File Structure
```
packages/aria-agent/src/executor/
├── executor.module.ts          # NestJS module
├── executor.service.ts         # Plan execution engine
├── executor.gateway.ts         # Real-time progress updates
├── checkpoint.service.ts       # Checkpoint management
├── rollback.service.ts         # Rollback on failure
└── executor.types.ts           # TypeScript types
```

#### executor.service.ts
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutorGateway } from './executor.gateway';
import { CheckpointService } from './checkpoint.service';
import { RollbackService } from './rollback.service';
import {
  Plan,
  PlanStep,
  StepStatus,
  PlanStatus,
  StepType,
} from '@prisma/client';
import { ExecutionContext } from '../planner/planner.types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executorGateway: ExecutorGateway,
    private readonly checkpointService: CheckpointService,
    private readonly rollbackService: RollbackService,
  ) {}

  /**
   * Execute an approved plan
   */
  async executePlan(planId: string): Promise<void> {
    this.logger.log(`Starting execution of plan: ${planId}`);

    // Get plan with selected path
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        paths: {
          include: {
            steps: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!plan || !plan.selectedPathId) {
      throw new Error('Plan not found or no path selected');
    }

    const selectedPath = plan.paths.find((p) => p.id === plan.selectedPathId);
    if (!selectedPath) {
      throw new Error('Selected path not found');
    }

    // Update plan status to EXECUTING
    await this.prisma.plan.update({
      where: { id: planId },
      data: { status: PlanStatus.EXECUTING },
    });

    // Initialize execution context
    const context: ExecutionContext = {
      planId,
      pathId: selectedPath.id,
      currentStepId: null,
      completedSteps: [],
      checkpoints: [],
      variables: {},
    };

    try {
      // Execute steps in order
      for (const step of selectedPath.steps) {
        context.currentStepId = step.id;

        // Create checkpoint if needed
        if (step.checkpoint) {
          await this.checkpointService.createCheckpoint(context, step);
        }

        // Execute step
        await this.executeStep(step, context);

        // Mark step as completed
        await this.prisma.planStep.update({
          where: { id: step.id },
          data: {
            status: StepStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        context.completedSteps.push(step.id);

        // Emit progress update
        this.executorGateway.emitExecutionProgress(planId, {
          currentStep: step.id,
          completedSteps: context.completedSteps.length,
          totalSteps: selectedPath.steps.length,
          progress:
            (context.completedSteps.length / selectedPath.steps.length) * 100,
        });
      }

      // Mark plan as completed
      await this.prisma.plan.update({
        where: { id: planId },
        data: { status: PlanStatus.COMPLETED },
      });

      this.logger.log(`Plan ${planId} completed successfully`);
    } catch (error) {
      this.logger.error(`Error executing plan: ${error.message}`, error.stack);

      // Rollback to last checkpoint
      await this.rollbackService.rollback(context);

      // Mark plan as failed
      await this.prisma.plan.update({
        where: { id: planId },
        data: { status: PlanStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: PlanStep,
    context: ExecutionContext,
  ): Promise<void> {
    this.logger.log(`Executing step: ${step.action}`);

    // Update step status to EXECUTING
    await this.prisma.planStep.update({
      where: { id: step.id },
      data: {
        status: StepStatus.EXECUTING,
        executedAt: new Date(),
      },
    });

    try {
      switch (step.type) {
        case StepType.TERMINAL:
          await this.executeTerminalStep(step, context);
          break;
        case StepType.GUI:
        case StepType.BROWSER:
          // For GUI/Browser steps, we'll integrate with existing agent flow
          // This will be handled by the agent processor
          this.logger.log('GUI/Browser step - delegating to agent processor');
          break;
        case StepType.WAIT:
          await this.executeWaitStep(step);
          break;
        case StepType.VERIFY:
          await this.executeVerifyStep(step, context);
          break;
      }
    } catch (error) {
      // Mark step as failed
      await this.prisma.planStep.update({
        where: { id: step.id },
        data: {
          status: StepStatus.FAILED,
          error: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Execute a terminal command step
   */
  private async executeTerminalStep(
    step: PlanStep,
    context: ExecutionContext,
  ): Promise<void> {
    if (!step.command) {
      throw new Error('Terminal step missing command');
    }

    this.logger.log(`Executing command: ${step.command}`);

    try {
      const { stdout, stderr } = await execAsync(step.command, {
        cwd: '/home/user',
        env: process.env,
      });

      // Store result in context
      context.variables[`step_${step.id}_stdout`] = stdout;
      context.variables[`step_${step.id}_stderr`] = stderr;

      this.logger.log(`Command output: ${stdout}`);
      if (stderr) {
        this.logger.warn(`Command stderr: ${stderr}`);
      }
    } catch (error) {
      this.logger.error(`Command failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute a wait step
   */
  private async executeWaitStep(step: PlanStep): Promise<void> {
    const duration = parseInt(step.command || '1000');
    this.logger.log(`Waiting for ${duration}ms`);
    await new Promise((resolve) => setTimeout(resolve, duration));
  }

  /**
   * Execute a verification step
   */
  private async executeVerifyStep(
    step: PlanStep,
    context: ExecutionContext,
  ): Promise<void> {
    if (!step.verification) {
      return;
    }

    this.logger.log(`Verifying: ${step.verification}`);
    // Verification logic would go here
    // For now, we'll just log it
  }
}
```

