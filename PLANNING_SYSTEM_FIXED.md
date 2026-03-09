# Planning System Integration - FIXED

## Issue
The planning toggle was not showing up in the dashboard UI, and the planning system was not integrated with the task execution flow.

## Root Cause
1. Dashboard page was not passing `planningEnabled` state and handlers to ChatInput
2. Agent processor was not checking for `planningEnabled` flag before starting task execution
3. No event handler for plan approval to trigger task execution
4. Task page was not showing the PlanningContainer component

## Changes Made

### Frontend (packages/aria-ui)

#### 1. Dashboard Page (`src/app/dashboard/page.tsx`)
- Added `planningEnabled` state: `const [planningEnabled, setPlanningEnabled] = useState(false);`
- Passed planning props to ChatInput: `planningEnabled={planningEnabled}` and `onPlanningToggle={setPlanningEnabled}`
- Updated taskData to include `planningEnabled` flag when calling `startTask()`
- Applied to both desktop and mobile layouts

#### 2. Task Page (`src/app/tasks/[id]/page.tsx`)
- Added import for `PlanningContainer` and `fetchTaskById`
- Added `taskDetails` state to store task information
- Added useEffect to fetch task details on mount
- Integrated PlanningContainer to show when `taskDetails?.planningEnabled && taskStatus === TaskStatus.PENDING`
- PlanningContainer shows above chat messages when planning is active

#### 3. usePlanner Hook (`src/hooks/usePlanner.ts`)
- Fixed API routes: Changed `/api/proxy/plans` to `/api/plans` (catch-all proxy handles routing)
- Fixed all endpoints: createPlan, fetchPlan, approvePlan, cancelPlan, updateStep
- This was causing the "Failed to create plan" error

### Backend (packages/aria-agent)

#### 1. Agent Processor (`src/agent/agent.processor.ts`)
- Added import for `PlannerService` and `PlanStatus`
- Injected `PlannerService` using `forwardRef` to avoid circular dependency
- Modified `processTask()` to check if task has `planningEnabled`
- If planning enabled:
  - Check if plan exists
  - If no plan, create one and wait for approval
  - If plan is pending, wait for approval
  - If plan is approved, proceed with execution
- Added `@OnEvent('plan.approved')` handler to start task execution when plan is approved

#### 2. Planner Service (`src/planner/planner.service.ts`)
- Added import for `EventEmitter2`
- Injected `EventEmitter2` in constructor
- Modified `approvePlan()` to emit `plan.approved` event with `planId` and `taskId`
- This triggers the agent processor to start task execution

#### 3. Agent Module (`src/agent/agent.module.ts`)
- Added import for `PlannerModule` using `forwardRef` to avoid circular dependency
- Added `forwardRef(() => PlannerModule)` to imports array

## How It Works Now

### User Flow:
1. User opens dashboard
2. User checks "Enable Planning Mode" toggle (now visible!)
3. User types task description and clicks send
4. Task is created with `planningEnabled: true`
5. User is redirected to task page

### Backend Flow:
1. AgentScheduler picks up the task
2. AgentProcessor.processTask() is called
3. Processor checks `task.planningEnabled === true`
4. Processor calls `plannerService.createPlan()` to generate execution paths
5. Plan status is set to PENDING, waiting for user approval
6. Task remains in PENDING status

### Frontend Flow (Task Page):
1. Task page loads and fetches task details
2. Sees `taskDetails.planningEnabled === true` and `taskStatus === PENDING`
3. Shows PlanningContainer component
4. PlanningContainer fetches or creates plan
5. User sees multiple execution paths with steps, token estimates, pros/cons
6. User selects a path and clicks "Approve"

### Execution Flow:
1. User approves plan
2. Frontend calls `approvePlan(planId, pathId)` API
3. Backend updates plan status to APPROVED and emits `plan.approved` event
4. AgentProcessor receives event via `@OnEvent('plan.approved')`
5. AgentProcessor calls `processTask(taskId)` again
6. This time, plan is approved, so execution starts
7. Task status changes to RUNNING
8. Agent executes the approved plan steps

## Testing Instructions

1. Start services:
   ```bash
   # Terminal 1: Start Docker (postgres)
   cd Aria
   docker-compose -f docker-compose.yml up postgres -d
   
   # Terminal 2: Start backend
   cd packages/aria-agent
   npm run start:dev
   
   # Terminal 3: Start frontend
   cd packages/aria-ui
   npm run dev
   ```

2. Test the flow:
   - Open http://localhost:3000/dashboard
   - You should now see "Enable Planning Mode" checkbox
   - Check the box
   - Type a task: "Create test.txt with 'Hi Nabil'"
   - Click send
   - You should be redirected to task page
   - You should see the planning UI with multiple execution paths
   - Select a path and click "Approve"
   - Task should start executing automatically

## Expected Behavior

### With Planning Disabled (default):
- No checkbox visible
- Task executes immediately as before
- No plan is created

### With Planning Enabled:
- Checkbox is visible and can be toggled
- Task creates a plan first
- User sees plan with multiple paths
- User must approve before execution
- After approval, task executes automatically

## Files Modified

### Frontend:
- `packages/aria-ui/src/app/dashboard/page.tsx`
- `packages/aria-ui/src/app/tasks/[id]/page.tsx`
- `packages/aria-ui/src/hooks/usePlanner.ts` (FIXED API ROUTES)

### Backend:
- `packages/aria-agent/src/agent/agent.processor.ts`
- `packages/aria-agent/src/agent/agent.module.ts`
- `packages/aria-agent/src/planner/planner.service.ts`

## Next Steps

1. Test the full flow end-to-end
2. Verify plan generation works correctly
3. Verify execution follows the approved plan
4. Add execution progress tracking (ExecutionProgress component)
5. Add step-by-step execution with checkpoints
6. Add ability to pause/resume during execution
