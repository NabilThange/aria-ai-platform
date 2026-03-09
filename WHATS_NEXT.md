# What's Next: Completing the ARIA Planning System

## 🎯 Current Status: 60% Complete

### ✅ What's Done (Phases 1 & 2)
- Database schema with planning tables
- Backend API for plan generation and management
- Frontend UI components for plan viewing and interaction
- WebSocket real-time updates
- State management hooks
- Planning toggle in chat interface

### ⏳ What's Remaining (Phases 3 & 4)

---

## Phase 3: Execution Engine (1-2 days)

### 1. Executor Service Implementation

**File**: `packages/aria-agent/src/executor/executor.service.ts`

**What it needs to do**:
```typescript
class ExecutorService {
  // Main execution method
  async executePlan(planId: string): Promise<void> {
    // 1. Get approved plan with selected path
    // 2. Initialize execution context
    // 3. Loop through steps:
    //    - Create checkpoint if needed
    //    - Execute step based on type
    //    - Mark step as completed
    //    - Emit progress update
    // 4. Handle errors and rollback
    // 5. Mark plan as completed
  }

  // Execute different step types
  private async executeTerminalStep(step: PlanStep): Promise<void> {
    // Run bash command directly
    // Store output in context
  }

  private async executeGuiStep(step: PlanStep): Promise<void> {
    // Delegate to existing agent processor
    // Use screenshot-based approach
  }

  private async executeBrowserStep(step: PlanStep): Promise<void> {
    // Delegate to existing agent processor
    // Use browser automation
  }
}
```

**Key Features**:
- ✅ Execute terminal commands directly (fast, low tokens)
- ✅ Delegate GUI/browser steps to existing agent flow
- ✅ Create checkpoints before risky operations
- ✅ Rollback on failure
- ✅ Real-time progress updates via WebSocket
- ✅ Error handling and recovery

**Estimated Time**: 1 day

---

### 2. Checkpoint Service

**File**: `packages/aria-agent/src/executor/checkpoint.service.ts`

**What it needs to do**:
```typescript
class CheckpointService {
  async createCheckpoint(
    context: ExecutionContext,
    step: PlanStep
  ): Promise<Checkpoint> {
    // 1. Take screenshot (optional)
    // 2. Serialize execution context
    // 3. Save to database
    // 4. Return checkpoint
  }

  async restoreCheckpoint(checkpointId: string): Promise<ExecutionContext> {
    // 1. Load checkpoint from database
    // 2. Deserialize context
    // 3. Return restored context
  }
}
```

**Estimated Time**: 0.5 days

---

### 3. Rollback Service

**File**: `packages/aria-agent/src/executor/rollback.service.ts`

**What it needs to do**:
```typescript
class RollbackService {
  async rollback(context: ExecutionContext): Promise<void> {
    // 1. Find last checkpoint
    // 2. Restore execution context
    // 3. Mark failed steps as SKIPPED
    // 4. Emit rollback event
  }
}
```

**Estimated Time**: 0.5 days

---

### 4. Agent Processor Integration

**File**: `packages/aria-agent/src/agent/agent.processor.ts`

**Changes needed**:
```typescript
class AgentProcessor {
  async processTask(taskId: string) {
    const task = await this.tasksService.findById(taskId);

    // NEW: Check if planning is enabled
    if (task.planningEnabled) {
      // Wait for plan approval
      const plan = await this.plannerService.getPlanByTaskId(taskId);
      
      if (!plan || plan.status !== PlanStatus.APPROVED) {
        // Don't start execution yet
        return;
      }

      // Execute the approved plan
      await this.executorService.executePlan(plan.id);
    } else {
      // Existing immediate execution flow
      await this.runIteration(taskId);
    }
  }
}
```

**Estimated Time**: 0.5 days

---

## Phase 4: Testing & Polish (1 day)

### 1. End-to-End Testing

**Test Scenarios**:
1. ✅ Create task with planning enabled
2. ✅ Generate plan with multiple paths
3. ✅ Select terminal path
4. ✅ Approve and execute
5. ✅ Verify file was created
6. ✅ Check token usage (should be ~200 vs ~4500)

**Test Cases**:
```typescript
describe('Planning System E2E', () => {
  it('should create and execute a simple file creation plan', async () => {
    // 1. Create task with planning
    const task = await createTask({
      description: 'Create test.txt with Hello World',
      planningEnabled: true,
    });

    // 2. Wait for plan generation
    const plan = await waitForPlan(task.id);
    expect(plan.paths).toHaveLength(2); // Terminal + GUI

    // 3. Approve terminal path
    const terminalPath = plan.paths.find(p => p.strategy === 'TERMINAL');
    await approvePlan(plan.id, terminalPath.id);

    // 4. Wait for execution
    await waitForTaskCompletion(task.id);

    // 5. Verify file exists
    const fileExists = await checkFileExists('test.txt');
    expect(fileExists).toBe(true);

    // 6. Verify token savings
    const tokenUsage = await getTokenUsage(task.id);
    expect(tokenUsage).toBeLessThan(500); // Much less than 4500
  });

  it('should rollback on failure', async () => {
    // Test checkpoint and rollback functionality
  });

  it('should handle GUI steps correctly', async () => {
    // Test delegation to existing agent flow
  });
});
```

**Estimated Time**: 0.5 days

---

### 2. UI Polish

**Improvements**:
- ✅ Add loading skeletons
- ✅ Improve error messages
- ✅ Add success animations
- ✅ Improve mobile responsiveness
- ✅ Add keyboard shortcuts
- ✅ Add tooltips for complex features

**Estimated Time**: 0.5 days

---

## Quick Win: Minimal Viable Executor

If you want to see it working ASAP, implement just the terminal executor first:

**File**: `packages/aria-agent/src/executor/executor.service.ts` (minimal version)

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class ExecutorService {
  constructor(private readonly prisma: PrismaService) {}

  async executePlan(planId: string): Promise<void> {
    // Get plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      include: {
        paths: {
          include: { steps: { orderBy: { order: 'asc' } } },
        },
      },
    });

    if (!plan?.selectedPathId) {
      throw new Error('No path selected');
    }

    const path = plan.paths.find(p => p.id === plan.selectedPathId);
    if (!path) {
      throw new Error('Selected path not found');
    }

    // Update plan status
    await this.prisma.plan.update({
      where: { id: planId },
      data: { status: 'EXECUTING' },
    });

    // Execute terminal steps only (for now)
    for (const step of path.steps) {
      if (step.type === 'TERMINAL' && step.command) {
        try {
          // Update step status
          await this.prisma.planStep.update({
            where: { id: step.id },
            data: { status: 'EXECUTING', executedAt: new Date() },
          });

          // Execute command
          const { stdout, stderr } = await execAsync(step.command, {
            cwd: '/home/user',
          });

          console.log('Command output:', stdout);
          if (stderr) console.warn('Command stderr:', stderr);

          // Mark as completed
          await this.prisma.planStep.update({
            where: { id: step.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          });
        } catch (error: any) {
          // Mark as failed
          await this.prisma.planStep.update({
            where: { id: step.id },
            data: { status: 'FAILED', error: error.message },
          });

          // Mark plan as failed
          await this.prisma.plan.update({
            where: { id: planId },
            data: { status: 'FAILED' },
          });

          throw error;
        }
      }
    }

    // Mark plan as completed
    await this.prisma.plan.update({
      where: { id: planId },
      data: { status: 'COMPLETED' },
    });
  }
}
```

**This minimal version**:
- ✅ Executes terminal commands
- ✅ Updates step status
- ✅ Handles errors
- ✅ Marks plan as completed
- ❌ No checkpoints (yet)
- ❌ No GUI/browser steps (yet)
- ❌ No WebSocket updates (yet)

**Time to implement**: 2-3 hours

**Then you can test**:
```bash
# Create task
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create test.txt with Hello World",
    "planningEnabled": true,
    "model": {...}
  }'

# Create plan
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "...",
    "taskDescription": "Create test.txt with Hello World",
    "model": {...}
  }'

# Approve plan
curl -X PUT http://localhost:3001/plans/{planId}/approve \
  -H "Content-Type: application/json" \
  -d '{ "pathId": "..." }'

# Execute plan (add this endpoint)
curl -X POST http://localhost:3001/plans/{planId}/execute
```

---

## Timeline Summary

### Option 1: Full Implementation
- **Executor Service**: 1 day
- **Checkpoint/Rollback**: 1 day
- **Agent Integration**: 0.5 days
- **Testing & Polish**: 1 day
- **Total**: 3.5 days

### Option 2: Quick Win (Minimal Executor)
- **Minimal Executor**: 0.25 days (2-3 hours)
- **Basic Testing**: 0.25 days
- **Total**: 0.5 days (4-6 hours)

Then iterate and add:
- Checkpoints: +0.5 days
- GUI/Browser steps: +0.5 days
- WebSocket updates: +0.25 days
- Full testing: +0.5 days

---

## Recommended Approach

### Day 1 Morning: Quick Win
1. Implement minimal executor (2-3 hours)
2. Test with simple terminal commands
3. Verify token savings

### Day 1 Afternoon: Enhance
1. Add WebSocket progress updates
2. Add checkpoint creation
3. Test rollback

### Day 2: Full Integration
1. Integrate with agent processor
2. Add GUI/browser step delegation
3. Full E2E testing

### Day 3: Polish & Deploy
1. UI improvements
2. Error handling
3. Documentation
4. Deploy to staging

---

## Success Metrics

After completion, you should see:
- ✅ 40-70% token reduction on average
- ✅ Plans execute successfully
- ✅ Rollback works on failures
- ✅ Real-time progress updates
- ✅ User can edit plans before execution
- ✅ Terminal commands execute directly (fast)
- ✅ GUI steps work via existing agent flow

---

## 🚀 Ready to Continue?

The foundation is solid. Pick your approach:

1. **Quick Win**: Implement minimal executor now (2-3 hours)
2. **Full Implementation**: Follow the 3.5 day plan
3. **Hybrid**: Start with quick win, then iterate

Either way, you're 60% done and the hardest parts (database, API, UI) are complete! 🎉

