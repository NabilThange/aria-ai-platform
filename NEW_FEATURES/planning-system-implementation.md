# ARIA Planning System - Implementation Guide

## 🎯 Goal: Reduce token usage by 40-70% through intelligent task planning

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Input                           │
│              "Book a flight to NYC next week"               │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Planner Service                           │
│  1. Task Analysis                                           │
│  2. Decomposition into steps                                │
│  3. Multi-path generation                                   │
│  4. Token cost estimation                                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   User Approval UI                          │
│  - View plan options                                        │
│  - Edit steps                                               │
│  - Select path                                              │
│  - Approve/reject                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  Execution Engine                           │
│  - Execute approved plan                                    │
│  - Checkpoint system                                        │
│  - Progress tracking                                        │
│  - Rollback on failure                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Structure

### Backend (aria-agent)

```
packages/aria-agent/src/
├── planner/
│   ├── planner.module.ts          # NestJS module
│   ├── planner.service.ts         # Core planning logic
│   ├── planner.controller.ts      # REST endpoints
│   ├── planner.gateway.ts         # WebSocket for real-time updates
│   ├── planner.types.ts           # TypeScript types
│   ├── planner.prompts.ts         # LLM prompts for planning
│   └── strategies/
│       ├── terminal.strategy.ts   # CLI-based approaches
│       ├── gui.strategy.ts        # GUI-based approaches
│       └── hybrid.strategy.ts     # Mixed approaches
└── executor/
    ├── executor.service.ts        # Plan execution
    ├── checkpoint.service.ts      # Checkpoint management
    └── rollback.service.ts        # Rollback on errors
```

### Frontend (aria-ui)

```
packages/aria-ui/src/
├── components/
│   └── planner/
│       ├── PlanViewer.tsx         # Display generated plans
│       ├── PathSelector.tsx       # Choose between approaches
│       ├── StepEditor.tsx         # Edit individual steps
│       ├── TodoList.tsx           # Interactive checklist
│       ├── TokenEstimate.tsx      # Show token costs
│       └── ExecutionProgress.tsx  # Real-time progress
└── hooks/
    ├── usePlanner.ts              # Planning state management
    └── useExecutor.ts             # Execution state management
```

---

## Data Types

### planner.types.ts

```typescript
export interface TaskPlan {
  id: string;
  taskDescription: string;
  createdAt: Date;
  paths: ExecutionPath[];
  selectedPathId?: string;
  status: 'planning' | 'approved' | 'executing' | 'completed' | 'failed';
}

export interface ExecutionPath {
  id: string;
  name: string;
  description: string;
  strategy: 'terminal' | 'gui' | 'hybrid';
  steps: PlanStep[];
  estimatedTokens: number;
  estimatedDuration: number; // seconds
  successProbability: number; // 0-1
  pros: string[];
  cons: string[];
}

export interface PlanStep {
  id: string;
  order: number;
  action: string;
  description: string;
  type: 'terminal' | 'gui' | 'browser' | 'wait';
  command?: string; // for terminal actions
  screenshot?: boolean; // whether to take screenshot
  verification?: string; // how to verify success
  estimatedTokens: number;
  checkpoint: boolean; // create checkpoint before this step
  dependencies: string[]; // IDs of steps that must complete first
}

export interface ExecutionContext {
  planId: string;
  pathId: string;
  currentStepId: string;
  completedSteps: string[];
  checkpoints: Checkpoint[];
  variables: Record<string, any>; // store data between steps
}

export interface Checkpoint {
  id: string;
  stepId: string;
  timestamp: Date;
  screenshot?: string; // base64 screenshot
  state: Record<string, any>;
}
```

---

## Backend Implementation

### planner.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { Anthropic } from '@anthropic-ai/sdk';

@Injectable()
export class PlannerService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async createPlan(taskDescription: string): Promise<TaskPlan> {
    // Step 1: Analyze task and generate multiple approaches
    const paths = await this.generateExecutionPaths(taskDescription);

    // Step 2: Estimate tokens for each path
    for (const path of paths) {
      path.estimatedTokens = this.estimateTokens(path);
    }

    // Step 3: Create plan object
    const plan: TaskPlan = {
      id: this.generateId(),
      taskDescription,
      createdAt: new Date(),
      paths,
      status: 'planning',
    };

    return plan;
  }

  private async generateExecutionPaths(
    task: string,
  ): Promise<ExecutionPath[]> {
    const prompt = `
You are an expert task planner for a computer-use AI agent running on Ubuntu 22.04.

Available capabilities:
1. Terminal commands (bash, apt, npm, pip, curl, wget, etc.)
2. GUI automation (screenshot-based clicks and keyboard input)
3. Web browser automation (Firefox)
4. File system operations

Task: ${task}

Generate 2-3 different approaches to accomplish this task.
For each approach:
1. List step-by-step actions
2. Specify if each step uses terminal, GUI, or browser
3. Estimate success probability
4. List pros and cons

Return as JSON:
{
  "paths": [
    {
      "name": "Approach name",
      "description": "Brief description",
      "strategy": "terminal" | "gui" | "hybrid",
      "steps": [
        {
          "action": "Step description",
          "type": "terminal" | "gui" | "browser",
          "command": "bash command if terminal",
          "verification": "How to verify success"
        }
      ],
      "successProbability": 0.9,
      "pros": ["Advantage 1", "Advantage 2"],
      "cons": ["Disadvantage 1"]
    }
  ]
}
`;

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const result = JSON.parse(content.text);
    
    // Transform to ExecutionPath with full metadata
    return result.paths.map((path: any, index: number) => ({
      id: `path-${index}`,
      ...path,
      steps: path.steps.map((step: any, stepIndex: number) => ({
        id: `step-${stepIndex}`,
        order: stepIndex,
        ...step,
        screenshot: step.type === 'gui' || step.type === 'browser',
        checkpoint: stepIndex % 3 === 0, // checkpoint every 3 steps
        estimatedTokens: this.estimateStepTokens(step),
        dependencies: [],
      })),
    }));
  }

  private estimateTokens(path: ExecutionPath): number {
    return path.steps.reduce((sum, step) => sum + step.estimatedTokens, 0);
  }

  private estimateStepTokens(step: any): number {
    // Token estimation based on step type
    const baseTokens = {
      terminal: 200, // Just command execution
      gui: 1500, // Screenshot analysis + action
      browser: 1000, // Page analysis + action
      wait: 50, // Just waiting
    };

    return baseTokens[step.type as keyof typeof baseTokens] || 500;
  }

  private generateId(): string {
    return `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async updatePlan(planId: string, updates: Partial<TaskPlan>): Promise<TaskPlan> {
    // Implementation: Update plan in database
    // This would use your Prisma service
    throw new Error('Not implemented');
  }

  async approvePlan(planId: string, pathId: string): Promise<void> {
    // Mark plan as approved with selected path
    throw new Error('Not implemented');
  }
}
```

### executor.service.ts

```typescript
import { Injectable } from '@nestjs/common';
import { ComputerUseService } from '../computer-use/computer-use.service';

@Injectable()
export class ExecutorService {
  constructor(private computerUse: ComputerUseService) {}

  async executePlan(plan: TaskPlan, pathId: string): Promise<void> {
    const path = plan.paths.find(p => p.id === pathId);
    if (!path) {
      throw new Error(`Path ${pathId} not found`);
    }

    const context: ExecutionContext = {
      planId: plan.id,
      pathId,
      currentStepId: path.steps[0].id,
      completedSteps: [],
      checkpoints: [],
      variables: {},
    };

    for (const step of path.steps) {
      try {
        // Create checkpoint if needed
        if (step.checkpoint) {
          await this.createCheckpoint(context, step);
        }

        // Execute step based on type
        await this.executeStep(step, context);

        // Mark as completed
        context.completedSteps.push(step.id);
        context.currentStepId = this.getNextStep(path.steps, step.id)?.id;

        // Emit progress event
        this.emitProgress(plan.id, context);

      } catch (error) {
        // Rollback to last checkpoint on error
        await this.rollbackToCheckpoint(context);
        throw error;
      }
    }
  }

  private async executeStep(step: PlanStep, context: ExecutionContext): Promise<void> {
    switch (step.type) {
      case 'terminal':
        await this.executeTerminalCommand(step, context);
        break;
      case 'gui':
      case 'browser':
        await this.executeGuiAction(step, context);
        break;
      case 'wait':
        await this.sleep(parseInt(step.command || '1000'));
        break;
    }
  }

  private async executeTerminalCommand(step: PlanStep, context: ExecutionContext): Promise<void> {
    // Use computer-use service to execute bash command
    const result = await this.computerUse.executeAction({
      action: 'bash',
      command: step.command,
    });

    // Store result in context
    context.variables[`step_${step.id}_result`] = result;
  }

  private async executeGuiAction(step: PlanStep, context: ExecutionContext): Promise<void> {
    // Take screenshot and use LLM to perform action
    // This uses your existing computer-use logic
    throw new Error('Not implemented - use existing agent flow');
  }

  private async createCheckpoint(context: ExecutionContext, step: PlanStep): Promise<void> {
    const checkpoint: Checkpoint = {
      id: `checkpoint-${Date.now()}`,
      stepId: step.id,
      timestamp: new Date(),
      state: { ...context.variables },
    };

    context.checkpoints.push(checkpoint);
  }

  private async rollbackToCheckpoint(context: ExecutionContext): Promise<void> {
    const lastCheckpoint = context.checkpoints[context.checkpoints.length - 1];
    if (lastCheckpoint) {
      // Restore state from checkpoint
      context.variables = { ...lastCheckpoint.state };
      context.completedSteps = context.completedSteps.filter(
        id => parseInt(id.split('-')[1]) <= parseInt(lastCheckpoint.stepId.split('-')[1])
      );
    }
  }

  private getNextStep(steps: PlanStep[], currentId: string): PlanStep | undefined {
    const currentIndex = steps.findIndex(s => s.id === currentId);
    return steps[currentIndex + 1];
  }

  private emitProgress(planId: string, context: ExecutionContext): void {
    // Emit WebSocket event for real-time UI updates
    // Use your existing gateway pattern
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## Frontend Implementation

### PlanViewer.tsx

```typescript
import React from 'react';
import { TaskPlan, ExecutionPath } from '@/types';
import { PathSelector } from './PathSelector';
import { TodoList } from './TodoList';
import { TokenEstimate } from './TokenEstimate';

interface PlanViewerProps {
  plan: TaskPlan;
  onPathSelect: (pathId: string) => void;
  onStepEdit: (stepId: string, newAction: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

export function PlanViewer({ 
  plan, 
  onPathSelect, 
  onStepEdit,
  onApprove,
  onReject 
}: PlanViewerProps) {
  const [selectedPath, setSelectedPath] = React.useState<ExecutionPath | null>(null);

  const handlePathChange = (pathId: string) => {
    const path = plan.paths.find(p => p.id === pathId);
    setSelectedPath(path || null);
    onPathSelect(pathId);
  };

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Task Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Task Plan</h2>
        <p className="text-gray-600 mt-1">{plan.taskDescription}</p>
      </div>

      {/* Path Selection */}
      <PathSelector
        paths={plan.paths}
        selectedPathId={selectedPath?.id}
        onSelect={handlePathChange}
      />

      {/* Todo List */}
      {selectedPath && (
        <>
          <TodoList
            steps={selectedPath.steps}
            onStepEdit={onStepEdit}
          />

          <TokenEstimate
            estimatedTokens={selectedPath.estimatedTokens}
            strategy={selectedPath.strategy}
          />
        </>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <button
          onClick={onApprove}
          disabled={!selectedPath}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Approve & Execute
        </button>
        <button
          onClick={onReject}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### PathSelector.tsx

```typescript
import React from 'react';
import { ExecutionPath } from '@/types';

interface PathSelectorProps {
  paths: ExecutionPath[];
  selectedPathId?: string;
  onSelect: (pathId: string) => void;
}

export function PathSelector({ paths, selectedPathId, onSelect }: PathSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Choose an Approach</h3>
      
      {paths.map(path => (
        <button
          key={path.id}
          onClick={() => onSelect(path.id)}
          className={`
            w-full p-4 rounded-lg border-2 text-left transition
            ${selectedPathId === path.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-gray-300'
            }
          `}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{path.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{path.description}</p>
              
              <div className="flex gap-4 mt-3 text-sm">
                <span className="text-gray-500">
                  {path.steps.length} steps
                </span>
                <span className="text-gray-500">
                  ~{path.estimatedTokens.toLocaleString()} tokens
                </span>
                <span className="text-gray-500">
                  {Math.round(path.successProbability * 100)}% success rate
                </span>
              </div>

              {/* Pros and Cons */}
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-green-700">Pros:</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {path.pros.map((pro, i) => (
                      <li key={i}>{pro}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-red-700">Cons:</p>
                  <ul className="list-disc list-inside text-gray-600">
                    {path.cons.map((con, i) => (
                      <li key={i}>{con}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Strategy Badge */}
            <div className={`
              px-3 py-1 rounded-full text-xs font-medium
              ${path.strategy === 'terminal' ? 'bg-purple-100 text-purple-800' : ''}
              ${path.strategy === 'gui' ? 'bg-blue-100 text-blue-800' : ''}
              ${path.strategy === 'hybrid' ? 'bg-green-100 text-green-800' : ''}
            `}>
              {path.strategy}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
```

### TodoList.tsx

```typescript
import React from 'react';
import { PlanStep } from '@/types';

interface TodoListProps {
  steps: PlanStep[];
  onStepEdit: (stepId: string, newAction: string) => void;
  executionContext?: {
    currentStepId: string;
    completedSteps: string[];
  };
}

export function TodoList({ steps, onStepEdit, executionContext }: TodoListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');

  const handleEdit = (step: PlanStep) => {
    setEditingId(step.id);
    setEditValue(step.action);
  };

  const handleSave = (stepId: string) => {
    onStepEdit(stepId, editValue);
    setEditingId(null);
  };

  const getStepStatus = (stepId: string) => {
    if (!executionContext) return 'pending';
    if (executionContext.completedSteps.includes(stepId)) return 'completed';
    if (executionContext.currentStepId === stepId) return 'current';
    return 'pending';
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Execution Steps</h3>
      
      <div className="space-y-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isEditing = editingId === step.id;

          return (
            <div
              key={step.id}
              className={`
                p-3 rounded-lg border
                ${status === 'completed' ? 'bg-green-50 border-green-200' : ''}
                ${status === 'current' ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-200' : ''}
                ${status === 'pending' ? 'bg-white border-gray-200' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={status === 'completed'}
                    disabled
                    className="h-5 w-5 rounded border-gray-300"
                  />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500">
                      Step {index + 1}
                    </span>
                    <span className={`
                      px-2 py-0.5 rounded text-xs font-medium
                      ${step.type === 'terminal' ? 'bg-purple-100 text-purple-800' : ''}
                      ${step.type === 'gui' ? 'bg-blue-100 text-blue-800' : ''}
                      ${step.type === 'browser' ? 'bg-green-100 text-green-800' : ''}
                    `}>
                      {step.type}
                    </span>
                    {step.checkpoint && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        checkpoint
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSave(step.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-gray-900 mt-1">{step.action}</p>
                      {step.command && (
                        <code className="block mt-2 p-2 bg-gray-800 text-green-400 text-sm rounded font-mono">
                          $ {step.command}
                        </code>
                      )}
                      {!executionContext && (
                        <button
                          onClick={() => handleEdit(step)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Token estimate */}
                <div className="text-right text-sm text-gray-500">
                  ~{step.estimatedTokens} tokens
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t">
        <p className="text-sm text-gray-600">
          Total: {steps.length} steps · 
          {steps.reduce((sum, s) => sum + s.estimatedTokens, 0).toLocaleString()} tokens estimated
        </p>
      </div>
    </div>
  );
}
```

---

## Integration with Existing ARIA

### Modified task creation flow:

```typescript
// Before (current):
User sends message → Agent starts executing immediately

// After (with planning):
User sends message → Planner generates plan → User approves → Agent executes
```

### API Endpoints:

```typescript
POST /api/plans/create
Body: { taskDescription: string }
Response: TaskPlan

PUT /api/plans/:planId/approve
Body: { pathId: string }
Response: void

POST /api/plans/:planId/execute
Response: void (starts execution, updates via WebSocket)

GET /api/plans/:planId/status
Response: ExecutionContext
```

---

## Token Savings Example

### Task: "Send email to john@example.com with subject 'Meeting' and body 'See you at 3pm'"

#### Without Planning (Current):
1. Screenshot → 1500 tokens
2. Open terminal? No, open Firefox → 1500 tokens
3. Go to Gmail → 1500 tokens
4. Click compose → 1500 tokens
5. Fill in recipient → 1500 tokens
6. Fill in subject → 1500 tokens
7. Fill in body → 1500 tokens
8. Click send → 1500 tokens

**Total: 12,000 tokens**

#### With Planning (Terminal path):
1. Planning phase → 2000 tokens
2. Execute: `echo "See you at 3pm" | mail -s "Meeting" john@example.com` → 200 tokens

**Total: 2,200 tokens**

**Savings: 81.7%**

---

## Next Steps

1. **Phase 1**: Implement basic planner service (1-2 days)
2. **Phase 2**: Add UI components (1-2 days)
3. **Phase 3**: Integrate with existing agent (1 day)
4. **Phase 4**: Testing and refinement (2-3 days)

**Total implementation time: ~1 week**

Would you like me to start implementing any of these components?
