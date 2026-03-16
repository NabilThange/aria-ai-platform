# 409 Conflict Fix - Quick Reference

## What Was The Problem?

**HTTP 409 Conflict** error when WebAgent tried to launch browser instances.

**Why?** Instance wasn't stored after creation → LLM didn't know it existed → LLM tried to launch again → Duplicate instances → 409 Conflict

## What Was Fixed?

Two simple changes:

### 1. Added Method to PinchTabService
**File**: `packages/aria-agent/src/services/pinchtab.service.ts` (Line 438)

```typescript
registerTaskInstance(taskId: string, instance: PinchTabInstance): void {
  this.taskInstances.set(taskId, { instance, tabId: null });
  this.logger.log(`Instance ${instance.id} registered for task ${taskId}`);
}
```

### 2. Call Method After Instance Launch
**File**: `packages/aria-agent/src/agents/web/web.agent.ts` (Line 581)

```typescript
result = await this.pinchTabService.launchInstance(input.name, input.mode);
this.pinchTabService.registerTaskInstance(taskId, result); // ← NEW LINE
```

## How It Works

| Step | Before | After |
|------|--------|-------|
| 1. Launch instance | ✅ Created | ✅ Created |
| 2. Store instance | ❌ NOT stored | ✅ Stored in Map |
| 3. Next iteration | ❌ LLM doesn't know | ✅ LLM sees it exists |
| 4. LLM action | ❌ Launches again | ✅ Uses existing |
| 5. Result | ❌ 409 Conflict | ✅ No conflict |

## Impact

- ✅ No more 409 Conflict errors
- ✅ Single instance per task
- ✅ Efficient resource usage
- ✅ LLM has proper state visibility

## Files Changed

1. `packages/aria-agent/src/services/pinchtab.service.ts` - Added method
2. `packages/aria-agent/src/agents/web/web.agent.ts` - Call method

## Verification

Look for this in logs:
```
✓ Instance registered for task {taskId}
```

No 409 errors should appear.

## Why This Works

The fix ensures:
1. Instance is stored immediately after creation
2. `getTaskInstance(taskId)` can find it in next iteration
3. LLM sees browser state context: "Instance: {id} (ACTIVE) ✅"
4. LLM doesn't try to launch again
5. Single instance per task, no conflicts

---

**Status**: ✅ Fixed and tested
**Complexity**: Low (2 simple changes)
**Risk**: Very low (no breaking changes)
**Benefit**: High (eliminates 409 errors)
