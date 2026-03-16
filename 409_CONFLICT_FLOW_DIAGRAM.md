# 409 Conflict - Before & After Flow Diagram

## BEFORE (Buggy Behavior)

```
┌─────────────────────────────────────────────────────────────────┐
│ ITERATION 1                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. buildDecisionPrompt(taskId)                                │
│     └─> getTaskInstance(taskId) → null (no instance yet)      │
│     └─> Browser state: "No browser instance running yet"      │
│                                                                 │
│  2. LLM sees: "You may need to call pinchtab_launch_instance" │
│     └─> Calls: pinchtab_launch_instance("aria-17", "headed")  │
│                                                                 │
│  3. executeToolCall() → launchInstance()                       │
│     └─> ✅ Success: inst_0f469204 created                      │
│     └─> ❌ BUG: Instance NOT stored in taskInstances Map       │
│     └─> Returns result to LLM                                  │
│                                                                 │
│  4. taskInstances Map: {} (EMPTY!)                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ITERATION 2                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. buildDecisionPrompt(taskId)                                │
│     └─> getTaskInstance(taskId) → null (still not stored!)    │
│     └─> Browser state: "No browser instance running yet"      │
│                                                                 │
│  2. LLM sees: "You may need to call pinchtab_launch_instance" │
│     └─> Calls: pinchtab_launch_instance("aria-42", "headed")  │
│        (Different random name - no 409 conflict!)             │
│                                                                 │
│  3. executeToolCall() → launchInstance()                       │
│     └─> ✅ Success: inst_xyz123 created (NEW INSTANCE!)       │
│     └─> ❌ BUG: Instance NOT stored in taskInstances Map       │
│                                                                 │
│  4. taskInstances Map: {} (STILL EMPTY!)                       │
│                                                                 │
│  RESULT: TWO INSTANCES RUNNING FOR SAME TASK! 🔴              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## AFTER (Fixed Behavior)

```
┌─────────────────────────────────────────────────────────────────┐
│ ITERATION 1                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. buildDecisionPrompt(taskId)                                │
│     └─> getTaskInstance(taskId) → null (no instance yet)      │
│     └─> Browser state: "No browser instance running yet"      │
│                                                                 │
│  2. LLM sees: "You may need to call pinchtab_launch_instance" │
│     └─> Calls: pinchtab_launch_instance("aria-17", "headed")  │
│                                                                 │
│  3. executeToolCall() → launchInstance()                       │
│     └─> ✅ Success: inst_0f469204 created                      │
│     └─> ✅ FIX: registerTaskInstance(taskId, instance)        │
│     └─> Returns result to LLM                                  │
│                                                                 │
│  4. taskInstances Map: {                                        │
│       taskId: { instance: inst_0f469204, tabId: null }         │
│     } ✅ STORED!                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ ITERATION 2                                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. buildDecisionPrompt(taskId)                                │
│     └─> getTaskInstance(taskId) → inst_0f469204 ✅            │
│     └─> Browser state: "Instance: inst_0f469204 (ACTIVE) ✅"  │
│     └─> Warning: "DO NOT call pinchtab_launch_instance AGAIN" │
│                                                                 │
│  2. LLM sees: "Browser is already running!"                   │
│     └─> Skips launch, moves to next step                      │
│     └─> Calls: pinchtab_navigate(url) instead                 │
│                                                                 │
│  3. executeToolCall() → navigate()                             │
│     └─> ✅ Success: Navigation to URL                          │
│                                                                 │
│  4. taskInstances Map: {                                        │
│       taskId: { instance: inst_0f469204, tabId: tab_123 }      │
│     } ✅ UPDATED!                                               │
│                                                                 │
│  RESULT: SINGLE INSTANCE, EFFICIENT EXECUTION! 🟢              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Differences

| Aspect | Before (Buggy) | After (Fixed) |
|--------|---|---|
| **Instance Storage** | ❌ Not stored | ✅ Stored in taskInstances Map |
| **State Visibility** | ❌ LLM sees "no instance" | ✅ LLM sees "instance active" |
| **Iteration 2 Action** | ❌ Launches new instance | ✅ Uses existing instance |
| **Result** | ❌ 409 Conflict (eventually) | ✅ No conflicts |
| **Instances Created** | ❌ Multiple | ✅ Single |
| **Resource Usage** | ❌ Wasteful | ✅ Efficient |

## Code Changes

### PinchTabService (pinchtab.service.ts)

```typescript
// NEW METHOD
registerTaskInstance(taskId: string, instance: PinchTabInstance): void {
  this.taskInstances.set(taskId, { instance, tabId: null });
  this.logger.log(`Instance ${instance.id} registered for task ${taskId}`);
}
```

### WebAgent (web.agent.ts)

```typescript
// BEFORE
result = await this.pinchTabService.launchInstance(input.name, input.mode);
this.logger.log(`   ✓ Tool Result: Instance launched with ID = ${result.id}`);

// AFTER
result = await this.pinchTabService.launchInstance(input.name, input.mode);
this.pinchTabService.registerTaskInstance(taskId, result); // ← NEW LINE
this.logger.log(`   ✓ Tool Result: Instance launched with ID = ${result.id}`);
this.logger.log(`   ✓ Instance registered for task ${taskId}`);
```

## Why This Fixes the 409 Error

The 409 error occurred because:
1. Instance wasn't stored → LLM didn't know it existed
2. LLM tried to launch again with different name → No 409 (different name)
3. But eventually, PinchTab service would try to reuse old instances
4. Conflict between old and new instances → 409 Conflict

Now:
1. Instance IS stored → LLM knows it exists
2. LLM doesn't try to launch again → No duplicate attempts
3. Single instance per task → No conflicts
4. Clean, efficient execution ✅
