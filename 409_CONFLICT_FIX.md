# 409 Conflict Error - Root Cause & Fix

## Problem Summary

The WebAgent was getting **HTTP 409 Conflict** errors when trying to launch browser instances. The sequence was:

1. **Iteration 1**: LLM calls `pinchtab_launch_instance("aria-17", "headed")`
   - ✅ Success: Instance `inst_0f469204` created
   - ❌ **BUG**: Instance NOT registered with taskId

2. **Iteration 2**: LLM should see existing instance but doesn't
   - ❌ `getTaskInstance(taskId)` returns null (instance not stored)
   - LLM thinks no instance exists
   - Calls `pinchtab_launch_instance("aria-42", "headed")` (different random name)
   - ✅ Success: NEW instance created (no 409 because name is different)

3. **Result**: Two instances running for same task, wasting resources

## Root Cause

In `web.agent.ts` line 578, when `pinchtab_launch_instance` tool succeeds:

```typescript
// OLD CODE - BUG
result = await this.pinchTabService.launchInstance(input.name, input.mode);
this.logger.log(`   ✓ Tool Result: Instance launched with ID = ${result.id}`);
// Instance returned but NOT stored in taskInstances Map!
```

The instance was returned to the LLM but **never registered** in the `taskInstances` Map. This meant:
- Next iteration: `getTaskInstance(taskId)` returns null
- LLM doesn't see the browser state context warning
- LLM thinks it needs to launch a new instance
- Calls `pinchtab_launch_instance` again with a different random name

## Solution

### 1. Added `registerTaskInstance()` method to PinchTabService

**File**: `packages/aria-agent/src/services/pinchtab.service.ts`

```typescript
/**
 * Register a PinchTab instance for a specific task
 * This ensures the instance can be retrieved in subsequent iterations
 */
registerTaskInstance(taskId: string, instance: PinchTabInstance): void {
  this.taskInstances.set(taskId, { instance, tabId: null });
  this.logger.log(`Instance ${instance.id} registered for task ${taskId}`);
}
```

### 2. Call `registerTaskInstance()` after successful launch

**File**: `packages/aria-agent/src/agents/web/web.agent.ts` (line 578)

```typescript
// NEW CODE - FIX
result = await this.pinchTabService.launchInstance(input.name, input.mode);

// CRITICAL FIX: Register the instance with taskId so it can be retrieved in next iteration
this.pinchTabService.registerTaskInstance(taskId, result);
this.logger.log(`   ✓ Tool Result: Instance launched with ID = ${result.id}`);
this.logger.log(`   ✓ Instance registered for task ${taskId}`);
```

## How It Works Now

1. **Iteration 1**: LLM calls `pinchtab_launch_instance("aria-17", "headed")`
   - ✅ Success: Instance `inst_0f469204` created
   - ✅ **FIX**: Instance registered: `taskInstances.set(taskId, { instance: inst_0f469204, tabId: null })`

2. **Iteration 2**: LLM checks browser state
   - ✅ `getTaskInstance(taskId)` returns `inst_0f469204`
   - ✅ Browser state context shows: "Instance: inst_0f469204 (ACTIVE) ✅ ALREADY CREATED"
   - ✅ LLM sees warning: "DO NOT call pinchtab_launch_instance AGAIN"
   - ✅ LLM moves to next step (navigate, click, etc.)

3. **Result**: Single instance per task, no 409 conflicts, efficient execution

## Impact

- ✅ Eliminates 409 Conflict errors
- ✅ Prevents duplicate instance creation
- ✅ Reduces resource waste
- ✅ Improves task execution efficiency
- ✅ LLM now has proper state visibility between iterations

## Testing

The fix ensures that:
1. Instance state persists across iterations
2. LLM receives accurate browser state context
3. No duplicate instances are created
4. Tasks complete without 409 errors
