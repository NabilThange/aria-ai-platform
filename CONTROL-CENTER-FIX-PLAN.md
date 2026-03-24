# Control Center Fix Plan

## Issue 1: Stop Agent Doesn't Actually Stop Agents

### Problem
- Clicking "Stop Agent" sets Redis flags but agents continue executing
- Orchestration service doesn't check `manual_control` flag during execution
- No polling mechanism to pause agent execution

### Solution
1. Add manual control check before each step in orchestration loop
2. When `manual_control = true`, pause execution and wait
3. Poll Redis every 2 seconds to check if flag changes
4. Resume execution when `manual_control = false`

### Files to Modify
- `packages/aria-agent/src/orchestration/orchestration.service.ts`
  - Add `checkManualControl()` method
  - Add polling loop before each step execution
  - Add before Phase 3 execution loop

## Issue 2: Add Task Status Dropdown

### Problem
- No way for operator to manually change task status from control page
- Need dropdown to change status to any valid TaskStatus value

### Solution
1. Add status dropdown component to control task page
2. Create backend endpoint to update task status
3. Add validation to prevent invalid status transitions
4. Emit WebSocket event on status change

### Files to Create/Modify
- `packages/aria-ui/src/components/control/TaskStatusDropdown.tsx` (NEW)
- `packages/aria-agent/src/control-center/control-center.controller.ts` (ADD endpoint)
- `packages/aria-agent/src/control-center/control-center.service.ts` (ADD method)
- `packages/aria-ui/src/app/control/tasks/[id]/page.tsx` (ADD dropdown)

### Task Status Values
- PENDING
- RUNNING
- NEEDS_HELP
- NEEDS_REVIEW
- COMPLETED
- CANCELLED
- FAILED

## Implementation Order
1. Fix stop agent functionality (critical bug)
2. Add task status dropdown (new feature)
3. Update documentation
