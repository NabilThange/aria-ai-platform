# Workflow Tool Logging Implementation Summary

**Date:** March 21, 2026  
**Feature:** Frontend visibility for workflow tool executions

## Problem Statement

Previously, when workflows executed tools (type, screenshot, wait, launchApplication, etc.), these individual tool calls were NOT visible in the frontend. Users could only see:
- "Workflow: send-email-n8n - Started"
- "Workflow: send-email-n8n - Completed"

This made it impossible to track workflow progress or debug issues.

## Solution Overview

Implemented a complete logging pipeline that enables workflows to emit tool execution events to the frontend, matching the existing agent tool display system.

## Implementation Details

### 1. Backend Changes

#### A. Updated WorkflowServices Interface
**File:** `packages/aria-agent/src/workflows/workflow.interface.ts`

Added two new properties to enable logging:
```typescript
interface WorkflowServices {
  pinchTab: PinchTabService;
  desktop: DesktopService;
  browserLogger: BrowserLoggerService;  // NEW
  taskId: string;                       // NEW
}
```

#### B. Updated WorkflowService
**File:** `packages/aria-agent/src/services/workflow.service.ts`

- Injected `BrowserLoggerService` into constructor
- Passed `browserLogger` and `taskId` to workflow execute functions

#### C. Created WorkflowLogger Helper
**File:** `packages/aria-agent/src/workflows/workflow-logger.helper.ts`

New utility class that wraps tool calls with logging:
```typescript
class WorkflowLogger {
  async logToolCall<T>(
    toolName: string,
    toolInput: any,
    toolFn: () => Promise<T>
  ): Promise<T>
}
```

**Features:**
- Logs tool call start via `browserLogger.logToolCall()`
- Executes the actual tool function
- Logs success/failure result via `browserLogger.logToolResult()`
- Includes duration tracking
- Preserves error handling (re-throws errors)

#### D. Updated Example Workflow
**File:** `packages/aria-agent/workflows/send-email-n8n.workflow.ts`

Converted from direct tool calls to logged tool calls:

**Before:**
```typescript
await desktop.launchApplication('terminal');
await desktop.wait(3000);
```

**After:**
```typescript
const logger = new WorkflowLogger(browserLogger, taskId, 'send-email-n8n');
await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
  desktop.launchApplication('terminal')
);
await logger.logToolCall('wait', { duration: 3000 }, () =>
  desktop.wait(3000)
);
```

### 2. Documentation

#### A. Workflow Logging Guide
**File:** `packages/aria-agent/workflows/README-WORKFLOW-LOGGING.md`

Comprehensive guide covering:
- Why add logging
- How to add logging to workflows
- Complete examples
- Available services & tools
- Workflow patterns
- Best practices
- Troubleshooting

#### B. Architecture Documentation
**File:** `CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md`

Added new section: "Tool Call Display System" covering:
- Architecture overview
- Backend implementation (BrowserLoggerService, WorkflowLogger)
- Frontend implementation (useWebSocket, useChatSession, ToolCallContent)
- Complete data flow
- Example workflow tool display
- Key files reference
- Best practices

### 3. Frontend (No Changes Required)

The existing frontend components already support workflow tool logging:
- `useWebSocket` hook listens for `browser_log` events
- `useChatSession` processes tool calls and maintains state
- `ToolCallContent` component displays tool execution details
- `ToolCallsFeed` component renders tool collections

**Agent Name Format:** `WORKFLOW:workflow-name` (e.g., `WORKFLOW:send-email-n8n`)

## Data Flow

```
Workflow Tool Execution
    ↓
WorkflowLogger.logToolCall()
    ↓
BrowserLoggerService.logToolCall()
    ↓
EventEmitter2 ('browser.log' event)
    ↓
TasksGateway.handleBrowserLogEvent()
    ↓
WebSocket.emit('browser_log')
    ↓
Frontend useWebSocket hook
    ↓
useChatSession (tool call state)
    ↓
ToolCallContent component (UI)
```

## Frontend Display Example

When a workflow executes with logging enabled, users see:

```
WORKFLOW:send-email-n8n → launchApplication ✓ 1234ms
  Parameters: { application: 'terminal' }
  Result: { success: true }

WORKFLOW:send-email-n8n → wait ✓ 3001ms
  Parameters: { duration: 3000 }
  Result: { success: true }

WORKFLOW:send-email-n8n → pasteText ✓ 456ms
  Parameters: { text: 'aria-mail --to "user@example.com" ...' }
  Result: { success: true }

WORKFLOW:send-email-n8n → pressKeys ✓ 123ms
  Parameters: { keys: ['Return'] }
  Result: { success: true }

WORKFLOW:send-email-n8n → screenshot ✓ 2345ms
  Parameters: {}
  Result: { base64: '...' }
```

## Benefits

1. **Transparency:** Users can see exactly what workflows are doing
2. **Debugging:** Easier to identify which tool call failed
3. **Progress Tracking:** Real-time visibility of workflow execution
4. **Consistency:** Workflows now match agent tool display behavior
5. **Performance Monitoring:** Duration tracking for each tool call

## Migration Path

Existing workflows continue to work without changes. To add logging:

1. Import `WorkflowLogger`
2. Extract `browserLogger` and `taskId` from services
3. Create logger instance
4. Wrap tool calls with `logger.logToolCall()`

See `README-WORKFLOW-LOGGING.md` for complete migration guide.

## Files Modified

**Backend:**
- `packages/aria-agent/src/workflows/workflow.interface.ts` (interface update)
- `packages/aria-agent/src/services/workflow.service.ts` (service injection)
- `packages/aria-agent/workflows/send-email-n8n.workflow.ts` (example implementation)

**New Files:**
- `packages/aria-agent/src/workflows/workflow-logger.helper.ts` (logging utility)
- `packages/aria-agent/workflows/README-WORKFLOW-LOGGING.md` (documentation)

**Documentation:**
- `CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md` (architecture update)
- `WORKFLOW-TOOL-LOGGING-IMPLEMENTATION.md` (this file)

## Testing Checklist

- [ ] Compile TypeScript (`npm run build` in aria-agent)
- [ ] Start backend (`npm run start:dev` in aria-agent)
- [ ] Start frontend (`npm run dev` in aria-ui)
- [ ] Create task that uses `send-email-n8n` workflow
- [ ] Verify tool calls appear in frontend with:
  - Agent name: `WORKFLOW:send-email-n8n`
  - Tool names: `launchApplication`, `wait`, `pasteText`, etc.
  - Input parameters displayed
  - Success/failure status
  - Duration tracking
- [ ] Verify workflow still completes successfully
- [ ] Check browser console for WebSocket events

## Next Steps

1. Add logging to other existing workflows:
   - `google-search.workflow.ts`
   - `send-gmail.workflow.ts`
   - `deep-research.workflow.ts`
   - `open-whatsapp.workflow.ts`
   - etc.

2. Consider adding workflow-specific features:
   - Step progress indicators (Step 1 of 5)
   - Workflow pause/resume controls
   - Tool call retry visualization

3. Add analytics:
   - Track tool usage statistics
   - Monitor tool success rates
   - Identify performance bottlenecks
