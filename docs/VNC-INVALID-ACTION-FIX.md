# VNC Invalid Action Fix

## Problem

The VNC server was returning "400 Bad Request" errors because the Desktop Agent was trying to execute invalid actions like `"success"` and `"mark_complete"` as mouse clicks with empty coordinates.

### Root Cause

The LLM (Claude Sonnet 4.6) was outputting invalid action names in the JSON response:
```json
{"action": "success", "reason": "..."}
{"action": "mark_complete", "reason": "..."}
```

These invalid actions were:
1. Not being caught by the parser validation
2. Falling through to `mapToExecuteFormat()`
3. Defaulting to `'computer_left_click'` (the fallback)
4. Being sent to VNC API with empty coordinates `{}`
5. VNC API rejecting with 400 Bad Request

### Error Pattern in Logs
```
[DesktopAgent] Tool: computer
[DesktopAgent] Arguments: {"action":"success","reason":"..."}
[DesktopAgent] → Clicking at [undefined, undefined] (left, count: 1)
[DesktopAgent] 📤 Sending to VNC API: {"action":"click_mouse","coordinates":{},"button":"left","clickCount":1}
[DesktopAgent] ❌ VNC API error: 400 Bad Request
```

## Solution

### 1. Enhanced Parser Validation (`desktop-tool-parser.util.ts`)

Added validation to reject invalid actions early:

```typescript
const validComputerActions = ['click', 'double_click', 'right_click', 'type', 'key', 'key_press', 'scroll', 'screenshot', 'application', 'terminal_command'];
const invalidActions = ['success', 'mark_complete', 'complete', 'done', 'wait', 'verify', 'check', 'confirm'];

// Reject invalid actions
if (invalidActions.includes(action)) {
  console.warn(`[DesktopToolParser] Invalid action "${action}" - use set_task_status with status="completed" instead`);
  return null;
}

// Validate it's a known computer action
if (!validComputerActions.includes(action)) {
  console.warn(`[DesktopToolParser] Unknown computer action: ${action}`);
  return null;
}
```

### 2. Improved System Prompt

Made the valid actions crystal clear:

```
⚠️ CRITICAL: THESE ARE THE ONLY VALID ACTIONS ⚠️

VALID computer actions:
✓ click, double_click, right_click, type, key, scroll, screenshot

VALID set_task_status values:
✓ completed, failed

INVALID actions (DO NOT USE):
✗ success, mark_complete, complete, done, wait, verify, check, confirm
✗ Any action not listed above

If the step is complete, use: {"name": "set_task_status", "arguments": {"status": "completed", "message": "..."}}
```

### 3. Better Error Messages (`desktop.agent.ts`)

When an invalid action is detected, provide specific guidance:

```typescript
const invalidActionMatch = responseContent.match(/"action"\s*:\s*"(success|mark_complete|complete|done|wait|verify|check|confirm)"/i);

if (invalidActionMatch) {
  const invalidAction = invalidActionMatch[1];
  errorMessage = `ERROR: Invalid action "${invalidAction}". 

VALID ACTIONS ONLY:
- For computer tool: click, double_click, right_click, type, key, scroll, screenshot
- For set_task_status: completed, failed

If the step is complete, use:
{"name": "set_task_status", "arguments": {"status": "completed", "message": "Step completed"}}

DO NOT use actions like: success, mark_complete, complete, done, wait, verify, check, confirm`;
}
```

### 4. Safety Check in mapToExecuteFormat

Added validation before mapping to prevent invalid actions from reaching VNC API:

```typescript
const validActions = ['click', 'double_click', 'right_click', 'type', 'key', 'scroll', 'screenshot', 'application', 'terminal_command'];
if (!validActions.includes(action)) {
  this.logger.error(`   ❌ Invalid computer action: ${action}`);
  throw new Error(`Invalid computer action: ${action}. Valid actions: ${validActions.join(', ')}`);
}
```

Removed the dangerous fallback:
```typescript
// BEFORE (dangerous):
const toolName = actionToToolName[action] || 'computer_left_click';

// AFTER (safe):
const toolName = actionToToolName[action];
```

## Expected Behavior After Fix

1. **Invalid actions are caught early** by the parser and return `null`
2. **LLM receives clear error message** explaining what went wrong
3. **No invalid requests reach VNC API** - validation happens before API call
4. **LLM learns to use correct format** through error feedback

## Testing

To verify the fix works:

1. Start the agent with a desktop task
2. Monitor logs for any "Invalid action" warnings
3. Verify no "400 Bad Request" errors from VNC API
4. Confirm LLM uses `set_task_status` instead of `success`/`mark_complete`

## Files Modified

- `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`
  - Added `validComputerActions` and `invalidActions` lists
  - Added validation in `normalizeToolCall()`
  - Enhanced system prompt with explicit valid/invalid actions

- `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
  - Enhanced error detection for invalid actions
  - Added validation in `mapToExecuteFormat()`
  - Removed dangerous fallback to `computer_left_click`
  - Improved error messages with specific guidance
