# Operator Tool Usage Display in Chat - Summary

## Date: March 23, 2026

## Problem

When operators manually execute tools from the Stream Deck panel on the control page, the tool calls were not visible in the chat section. Only agent tool usage was displayed, making it unclear what actions the operator had performed.

## Solution

Integrated `BrowserLoggerService` into the control center to emit `browser_log` WebSocket events for operator tool execution, making them appear in the chat just like agent tool calls.

## How It Works

### Agent Tool Calls (Existing)
1. Agent executes tool via `BrowserLoggerService.logToolCall()`
2. Emits `browser.log` event with type `tool.call`
3. WebSocket broadcasts to all clients
4. Frontend `useChatSession` receives event and stores in `toolCalls` Map
5. `ToolCallContent` component renders in chat

### Operator Tool Calls (New)
1. Operator clicks tool in Stream Deck panel
2. `ControlCenterService.executeTool()` emits `tool.call` event via `BrowserLoggerService`
3. Tool executes (Web, Desktop, or Workflow)
4. Emits `tool.result` event with success/error/duration
5. Frontend receives events and displays in chat with "OPERATOR" label
6. Same visual treatment as agent tool calls

## Implementation

### Backend Changes

**File:** `packages/aria-agent/src/control-center/control-center.service.ts`

**Changes:**
1. Added `BrowserLoggerService` import and dependency injection
2. Track execution start time
3. Emit `tool.call` event before execution
4. Emit `tool.result` event after execution (success or error)
5. Include duration in result

**Code:**
```typescript
// Before execution
this.browserLoggerService.logToolCall(taskId, 'OPERATOR', {
  name: executeToolDto.toolName,
  input: executeToolDto.parameters,
});

// After execution (success)
this.browserLoggerService.logToolResult(taskId, 'OPERATOR', {
  toolName: executeToolDto.toolName,
  success: true,
  output: result,
  duration: Date.now() - startTime,
});

// After execution (error)
this.browserLoggerService.logToolResult(taskId, 'OPERATOR', {
  toolName: executeToolDto.toolName,
  success: false,
  error: error.message,
  duration: Date.now() - startTime,
});
```

### Frontend Changes

**No changes required!** The existing `useChatSession` hook and `ToolCallContent` component already handle `tool.call` and `tool.result` events from any agent, including "OPERATOR".

## Visual Display

Operator tool calls appear in the chat with:
- 🔧 Wrench icon
- "OPERATOR" label (instead of agent name like "WEB" or "DESKTOP")
- Tool name (e.g., "pinchtab_screenshot", "computer")
- Success/error indicator (✓ green or ✗ red)
- Duration in milliseconds
- Expandable details showing input parameters and output

**Example:**
```
🔧 OPERATOR → pinchtab_screenshot ✓ 1234ms
   Input: {}
   Output: { base64: "...", width: 1920, height: 1080 }
```

## Benefits

1. **Transparency**: All operator actions are visible in the chat
2. **Consistency**: Same visual treatment as agent actions
3. **Audit Trail**: Easy to track what was done manually vs automatically
4. **Debugging**: Helps identify issues with manual tool execution
5. **Learning**: Users can see exactly what tools do and how they work

## Testing Checklist

- [ ] Execute Web tool (e.g., pinchtab_screenshot) from Stream Deck
- [ ] Verify tool call appears in chat with "OPERATOR" label
- [ ] Verify success indicator and duration are shown
- [ ] Expand tool call to see input/output details
- [ ] Execute Desktop tool (e.g., computer with click action)
- [ ] Verify it appears in chat
- [ ] Execute tool that fails (invalid parameters)
- [ ] Verify error is shown in chat with red indicator
- [ ] Execute multiple tools in sequence
- [ ] Verify all appear in chat in correct order
- [ ] Refresh page and verify tool calls persist

## Architecture Updates

Updated `CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md` with:
- Feature documentation for operator tool display
- Implementation details
- Visual examples
- Benefits and use cases

## Related Features

This feature complements:
- Stop Agent functionality (operators can see what they did while agent was paused)
- Task Status Dropdown (operators can see actions taken before changing status)
- Stream Deck Tool Panel (provides visual feedback for tool execution)
