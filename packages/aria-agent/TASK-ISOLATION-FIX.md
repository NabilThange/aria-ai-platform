# Task Isolation Fix - PinchTab Instance Management

## Problem
Tasks were NOT properly isolated - Chrome instances from one task were being reused by subsequent tasks, causing state leakage between tasks. Additionally, PinchTab instances were being created automatically on task start, even when not needed.

### Root Cause
1. **PinchTabService was a singleton with global state** - `currentInstance` and `currentTabId` were shared across all tasks
2. **No cleanup on task completion/cancellation** - Chrome instances kept running after tasks stopped
3. **WebAgent reused existing instances** - Instead of creating fresh instances per task
4. **No task-to-instance mapping** - No way to track which Chrome instance belongs to which task
5. **Eager initialization** - PinchTab instances were created at task start, not when actually needed

### User-Reported Issues
1. Task A opens Chrome instance
2. Task A is stopped
3. Task B starts
4. Task B tries to use Chrome instance from Task A ❌
5. PinchTab instances launched immediately when WebAgent starts, wasting resources ❌

## Solution

### 1. Task-Scoped Instance Management in PinchTabService

Added task-scoped instance tracking:

```typescript
// Task-scoped instances: Map<taskId, { instance, tabId }>
private taskInstances: Map<string, { instance: PinchTabInstance; tabId: string | null }> = new Map();
```

### 2. Updated initInstance() to Support Task Scoping

```typescript
async initInstance(profile: string = 'default', headed: boolean = false, taskId?: string)
```

- If `taskId` is provided, creates a task-scoped instance with profile name `${profile}-task-${taskId}`
- Stores instance in `taskInstances` map instead of global `currentInstance`
- Each task gets its own isolated Chrome instance

### 3. Added Task-Scoped Helper Methods

```typescript
getTaskInstance(taskId: string): PinchTabInstance | null
getTaskTabId(taskId: string): string | null
setTaskTabId(taskId: string, tabId: string): void
cleanupTask(taskId: string): Promise<void>
```

### 4. Updated All PinchTab Methods to Support taskId

All methods now accept optional `taskId` parameter:
- `navigate(url, instanceId?, taskId?)`
- `snapshot(filter, tabId?, taskId?)`
- `action(action, tabId?, taskId?)`
- `click(ref, tabId?, taskId?)`
- `type(ref, text, tabId?, taskId?)`
- etc.

When `taskId` is provided, methods use task-scoped instance/tab instead of global state.

### 5. Updated WebAgent to Use Task-Scoped Instances with Lazy Loading

**Before:**
```typescript
// Eager initialization at task start ❌
if (!this.pinchTabService.getCurrentInstance()) {
  await this.pinchTabService.initInstance('default', headedMode);
}
```

**After:**
```typescript
// Lazy initialization only when needed ✅
private async ensurePinchTabInstance(taskId: string): Promise<void> {
  if (!this.pinchTabService.getTaskInstance(taskId)) {
    await this.pinchTabService.initInstance('default', headedMode, taskId);
  }
}

// Called only when executing actual web actions (navigate, click, etc.)
await this.ensurePinchTabInstance(taskId);
```

All WebAgent tool executions now:
1. Call `ensurePinchTabInstance(taskId)` before executing (lazy loading)
2. Pass `taskId` to all PinchTab methods for task-scoped operations

### 6. Added Cleanup Lifecycle Hooks

**OrchestrationService:**
- Added `cleanupTaskResources(taskId)` method
- Calls `pinchTabService.cleanupTask(taskId)` on task completion/failure
- Listens for `task.cleanup` event for cancellation

**TasksService:**
- Emits `task.cleanup` event when task is cancelled
- Ensures cleanup happens even if task is manually stopped

### 7. Cleanup Implementation

```typescript
async cleanupTask(taskId: string): Promise<void> {
  const taskData = this.taskInstances.get(taskId);
  if (taskData) {
    await this.closeInstance(taskData.instance.id); // Stops Chrome
    this.taskInstances.delete(taskId); // Removes from map
  }
}
```

## Benefits

✅ **Complete Task Isolation** - Each task gets its own Chrome instance  
✅ **No State Leakage** - Tasks cannot access each other's browser state  
✅ **Automatic Cleanup** - Chrome instances are closed when tasks complete/fail/cancel  
✅ **Resource Management** - No accumulation of orphaned Chrome instances  
✅ **Lazy Loading** - PinchTab instances only created when actually needed (not on task start)  
✅ **Performance** - Tasks that don't need web automation don't waste resources  
✅ **Backward Compatible** - Legacy code without `taskId` still works (uses global state)  

## Testing

To verify the fix:

1. **Start Task A** - No Chrome instance created yet
2. **Task A performs web action** - Opens Chrome instance `default-task-A`
3. **Stop Task A** - Chrome instance `default-task-A` is closed
4. **Start Task B** - No Chrome instance created yet
5. **Task B performs web action** - Opens NEW Chrome instance `default-task-B` (not reusing Task A's instance)
6. **Verify isolation** - Task B has clean browser state with no cookies/history from Task A
7. **Verify lazy loading** - Tasks without web actions never create Chrome instances

## Migration Notes

- Existing code without `taskId` parameter continues to work (uses legacy global state)
- New code should pass `taskId` to all PinchTab methods for proper isolation
- WebAgent automatically uses task-scoped instances with lazy loading (no changes needed in agent code)
- PinchTab instances are now created on-demand, not eagerly at task start

## Files Modified

1. `packages/aria-agent/src/services/pinchtab.service.ts` - Task-scoped instance management
2. `packages/aria-agent/src/agents/web/web.agent.ts` - Lazy loading + task-scoped instances
3. `packages/aria-agent/src/agents/web/web.module.ts` - Export PinchTabService for dependency injection
4. `packages/aria-agent/src/orchestration/orchestration.service.ts` - Cleanup lifecycle hooks
5. `packages/aria-agent/src/tasks/tasks.service.ts` - Emit cleanup event on cancellation
