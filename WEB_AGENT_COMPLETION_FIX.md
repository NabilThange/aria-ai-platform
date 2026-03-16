# Web Agent Completion Fix

## Problem
The Web Agent was executing steps but never explicitly signaling completion. It would continue looping until reaching max iterations (20), wasting tokens and time. The agent had no proper mechanism to say "I'm done with this step."

## Root Cause
- Desktop Agent has a `set_task_status` tool to mark steps complete
- Web Agent had NO completion tool
- Web Agent relied on:
  1. Text responses containing "complete/success/done" (unreliable)
  2. Heuristic success criteria evaluation (imprecise)
  3. Reaching max iterations and forcing completion (wasteful)

## Solution
Added a new `pinchtab_mark_complete` tool that allows the Web Agent to explicitly signal step completion.

## Changes Made

### 1. Added `pinchtab_mark_complete` Tool Definition
**File:** `packages/aria-agent/src/groq/pinchtab.tools.ts`

Added new tool to the PinchTab tools array:
```typescript
{
  type: 'function' as const,
  function: {
    name: 'pinchtab_mark_complete',
    description: 'Mark the current step as completed. Call this when you have successfully achieved the success criteria for the step.',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Brief description of what was accomplished',
        },
      },
      required: ['message'],
    },
  },
}
```

### 2. Updated Web Agent System Prompt
**File:** `packages/aria-agent/src/config/system-prompts.config.ts`

**Before:**
```
## STEP COMPLETION
You have no completion tool. When done, respond with text containing "complete", "success", or "done".
```

**After:**
```
## STEP COMPLETION — CRITICAL

You have a completion tool: pinchtab_mark_complete

When you have successfully completed the step (success criteria met), call:
pinchtab_mark_complete arguments: {"message": "Brief description of what was accomplished"}

⚠️  CRITICAL RULES:
1. Call pinchtab_mark_complete as soon as success criteria are met — do NOT continue looping
2. Do NOT call pinchtab_wait and pinchtab_get_snapshot repeatedly after success — this wastes tokens
3. If you've verified the task is done, mark it complete immediately
4. Never respond with just text saying "complete" — always use the pinchtab_mark_complete tool
```

Also updated the tool count from 14 to 15 and added the new tool to the list.

### 3. Implemented Tool Handler in Web Agent
**File:** `packages/aria-agent/src/agents/web/web.agent.ts`

Added handler in `executeToolCall()` method:
```typescript
case 'pinchtab_mark_complete':
  this.logger.log(`   → Marking step as complete: ${input.message}`);
  result = { success: true, message: input.message, completed: true };
  this.logger.log(`   ✓ Tool Result: Step marked as complete`);
  break;
```

Added feedback generation:
```typescript
case 'pinchtab_mark_complete':
  return `✅ STEP COMPLETED: ${input.message}
🎯 Success criteria met - step execution finished.
📋 The orchestrator will now proceed to the next step in the plan.`;
```

### 4. Updated Execution Loop to Detect Completion
**File:** `packages/aria-agent/src/agents/web/web.agent.ts`

Modified the tool call handling to check for completion:
```typescript
// Check for completion tool
if (toolCall.name === 'pinchtab_mark_complete') {
  this.logger.log(`   ✅ Step marked as COMPLETED by agent via pinchtab_mark_complete`);
  stepCompleted = true;
  lastAction = toolCall.input.message || 'Step completed successfully';
  break;
}
```

### 5. Updated Example Workflow
**File:** `packages/aria-agent/src/config/system-prompts.config.ts`

Updated the example to show proper completion:
```
Call: pinchtab_get_snapshot arguments: {}
→ Verify search results are visible in snapshot
Call: pinchtab_mark_complete arguments: {"message": "Search results loaded and visible"}
```

## Benefits

1. **Explicit Completion**: Agent can now clearly signal when a step is done
2. **Token Efficiency**: No more unnecessary loops after success
3. **Faster Execution**: Steps complete as soon as criteria are met
4. **Better Logging**: Clear completion messages in logs
5. **Consistency**: Web Agent now has same completion mechanism as Desktop Agent

## Testing Recommendations

1. Test with simple navigation tasks (e.g., "Open Wikipedia and search for clouds")
2. Verify agent calls `pinchtab_mark_complete` after achieving success criteria
3. Check that execution stops immediately after completion (no extra iterations)
4. Monitor token usage - should be significantly reduced
5. Verify orchestrator proceeds to next step correctly after completion

## Example Usage

**Task:** "Search for Python courses on DuckDuckGo"

**Expected Agent Behavior:**
1. Navigate to DuckDuckGo with search query
2. Wait for page load
3. Get snapshot to verify results
4. Call `pinchtab_mark_complete` with message "Search results loaded"
5. Step ends immediately (no more iterations)

**Before Fix:** Would continue looping, calling wait/snapshot repeatedly until max iterations
**After Fix:** Completes in 4-5 tool calls, immediately after verifying success
