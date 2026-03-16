# Desktop Agent VNC API Fix - Terminal Loop Issue

## Problem Summary

The Desktop Agent successfully opened terminals using `Ctrl+Alt+T` but then kept opening MORE terminals (1, 2, 3, 4...) in an infinite loop. The agent also failed when trying to use double-click actions.

## Root Causes

### 1. Wrong VNC API Action Names
**Issue:** Desktop Agent was sending `double_click_mouse`, `right_click_mouse` to VNC API
**Error:** `Unknown action: double_click_mouse`
**Cause:** The VNC API only accepts `click_mouse` with `clickCount` parameter to differentiate single/double clicks

### 2. No Completion Signal Recognition
**Issue:** Agent output `{"action": "done", "result": "..."}` which wasn't recognized
**Cause:** The parser converted it to `{"name": "computer", "arguments": {"action": "done", ...}}` but `mapToExecuteFormat()` didn't recognize "done" as valid, defaulting to `computer_left_click` with empty coordinates

### 3. Unclear When to Stop
**Issue:** Agent didn't know when to signal step completion
**Cause:** System prompt didn't clearly explain when to use `set_task_status` vs continuing with more actions

## What Happened in the Logs

1. **Attempts 1-3**: Tried `double_click` on terminal icon → Failed with "Unknown action: double_click_mouse"
2. **Attempt 4**: Used `Ctrl+Alt+T` keyboard shortcut → **SUCCESS!** Terminal opened
3. **Problem**: Agent typed test command, then output `{"action": "done", ...}` → Parser failed → Kept pressing `Ctrl+Alt+T` → Opened 4+ terminals

## Fixes Applied

### Fix 1: Correct VNC API Action Names
**File:** `packages/aria-agent/src/agents/desktop/desktop.agent.ts`

Changed `executeToolCall()` to use correct VNC API actions:
- All clicks use `action: 'click_mouse'`
- Differentiate by `button: 'left'|'right'` and `clickCount: 1|2`
- Removed incorrect action names like `double_click_mouse`, `right_click_mouse`

```typescript
if (name === 'computer_left_click' || name === 'computer_right_click' || name === 'computer_double_click') {
  requestBody.action = 'click_mouse';  // ← Always 'click_mouse'
  requestBody.coordinates = { x: input.x, y: input.y };
  requestBody.button = name.includes('right') ? 'right' : 'left';
  requestBody.clickCount = name.includes('double') ? 2 : 1;  // ← Differentiate here
}
```

### Fix 2: Handle Unknown Actions Gracefully
**File:** `packages/aria-agent/src/agents/desktop/desktop.agent.ts`

Added handling for unknown tools in the execution loop:
```typescript
} else {
  // Unknown tool - log warning and continue
  this.logger.warn(`   ⚠️  Unknown tool: ${toolCall.name}, skipping`);
}
```

Also added early return in `executeToolCall()` for unknown tools:
```typescript
} else {
  this.logger.warn(`   ⚠️  Unknown tool: ${name}, skipping API call`);
  return;
}
```

### Fix 3: Clarify set_task_status Usage
**File:** `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`

Updated system prompt with clear guidance:
```
WHEN TO USE set_task_status:
- Use "completed" when the CURRENT STEP's success criteria is met
- Use "failed" when the step cannot be completed after multiple attempts
- DO NOT use set_task_status after every action - only when the STEP is truly complete
- If you need to perform multiple actions for one step, keep using "computer" tool until done

WRONG EXAMPLES (DO NOT USE):
✗ {"action": "done", "result": "..."} - Use set_task_status instead
```

## Expected Behavior After Fix

1. **Double-click works**: Agent can now double-click terminal icon successfully
2. **Proper completion**: Agent uses `{"name": "set_task_status", "arguments": {"status": "completed", ...}}` to signal step completion
3. **No infinite loops**: Agent stops after step is complete instead of repeating actions
4. **Graceful handling**: Unknown actions are logged and skipped instead of causing errors

## Testing

To verify the fix:
1. Create a task: "Open a terminal"
2. Agent should either:
   - Double-click terminal icon (now works), OR
   - Use Ctrl+Alt+T keyboard shortcut
3. After terminal opens, agent should output `set_task_status` with "completed"
4. Agent should NOT open multiple terminals
5. Step should complete successfully

## Files Modified

1. `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
   - Fixed `executeToolCall()` to use correct VNC API action names
   - Added unknown tool handling in execution loop
   - Added early return for unknown tools in executeToolCall

2. `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`
   - Updated `buildDesktopSystemPrompt()` with clearer `set_task_status` guidance
   - Added examples of wrong formats to avoid

## VNC API Reference

Correct action names from `packages/ariad/src/computer-use/dto/computer-action.dto.ts`:
- `click_mouse` - All mouse clicks (single, double, left, right)
- `type_text` - Type text string
- `type_keys` - Press key combinations
- `scroll` - Scroll action
- `application` - Open application
- `screenshot` - Take screenshot

Parameters for `click_mouse`:
- `coordinates: {x: number, y: number}` - Click position
- `button: 'left' | 'right'` - Which button
- `clickCount: number` - 1 for single, 2 for double, etc.
