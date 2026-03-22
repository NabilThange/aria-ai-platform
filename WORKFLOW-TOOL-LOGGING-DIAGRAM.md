# Workflow Tool Logging - Visual Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         WORKFLOW EXECUTION                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  send-email-n8n.workflow.ts                                     │
│                                                                  │
│  const logger = new WorkflowLogger(browserLogger, taskId, name) │
│                                                                  │
│  await logger.logToolCall('launchApplication', {...}, () =>     │
│    desktop.launchApplication('terminal')                        │
│  );                                                              │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  WorkflowLogger.logToolCall()                                   │
│  ├─ Log tool.call event                                         │
│  ├─ Execute tool function                                       │
│  └─ Log tool.result event                                       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  BrowserLoggerService                                           │
│  ├─ logToolCall(taskId, agentName, {name, input})              │
│  └─ logToolResult(taskId, agentName, {toolName, success, ...}) │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  EventEmitter2                                                  │
│  emit('browser.log', {taskId, type, timestamp, data})          │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  TasksGateway                                                   │
│  @OnEvent('browser.log')                                        │
│  handleBrowserLogEvent(payload)                                 │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  WebSocket                                                      │
│  server.to(`task_${taskId}`).emit('browser_log', payload)      │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND - useWebSocket Hook                                   │
│  socket.on('browser_log', (log) => onBrowserLogRef.current(log))│
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  useChatSession Hook                                            │
│  ├─ handleBrowserLog(log)                                       │
│  ├─ if (log.type === 'tool.call') → create pending entry       │
│  └─ if (log.type === 'tool.result') → update with result       │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  Tool Call State (Map)                                          │
│  {                                                               │
│    "WORKFLOW:send-email-n8n-launchApplication-2026-03-21...": { │
│      agentName: "WORKFLOW:send-email-n8n",                      │
│      toolName: "launchApplication",                             │
│      toolInput: { application: "terminal" },                    │
│      success: true,                                              │
│      output: { success: true },                                 │
│      duration: 1234,                                             │
│      pending: false                                              │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│  ToolCallContent Component                                      │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🔧 WORKFLOW:send-email-n8n → launchApplication  ✓ 1234ms │ │
│  │   ▼ Parameters                                            │ │
│  │   { application: "terminal" }                             │ │
│  │   ▼ Result                                                │ │
│  │   { success: true }                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Event Flow Timeline

```
Time    Event                           Location
────────────────────────────────────────────────────────────────────
T+0ms   Workflow starts                 WorkflowService
T+10ms  Tool call: launchApplication    send-email-n8n.workflow.ts
T+10ms  ├─ Log tool.call event          WorkflowLogger
T+10ms  │  └─ Emit browser.log          BrowserLoggerService
T+11ms  │     └─ WebSocket broadcast    TasksGateway
T+12ms  │        └─ Frontend receives   useWebSocket
T+13ms  │           └─ State update     useChatSession
T+14ms  │              └─ UI renders    ToolCallContent (pending)
T+15ms  ├─ Execute tool                 DesktopService
T+1244ms└─ Tool completes               DesktopService
T+1244ms  Log tool.result event         WorkflowLogger
T+1244ms  └─ Emit browser.log           BrowserLoggerService
T+1245ms     └─ WebSocket broadcast     TasksGateway
T+1246ms        └─ Frontend receives    useWebSocket
T+1247ms           └─ State update      useChatSession
T+1248ms              └─ UI updates     ToolCallContent (success ✓)
```

## Data Structure Evolution

### 1. Tool Call Event (tool.call)
```json
{
  "taskId": "task_123",
  "type": "tool.call",
  "timestamp": "2026-03-21T10:00:00.000Z",
  "data": {
    "agentName": "WORKFLOW:send-email-n8n",
    "toolName": "launchApplication",
    "toolInput": {
      "application": "terminal"
    }
  }
}
```

### 2. Frontend State (Pending)
```typescript
{
  "WORKFLOW:send-email-n8n-launchApplication-2026-03-21T10:00:00.000Z": {
    agentName: "WORKFLOW:send-email-n8n",
    toolName: "launchApplication",
    toolInput: { application: "terminal" },
    timestamp: "2026-03-21T10:00:00.000Z",
    pending: true  // ← Waiting for result
  }
}
```

### 3. Tool Result Event (tool.result)
```json
{
  "taskId": "task_123",
  "type": "tool.result",
  "timestamp": "2026-03-21T10:00:01.234Z",
  "data": {
    "agentName": "WORKFLOW:send-email-n8n",
    "toolName": "launchApplication",
    "success": true,
    "output": {
      "success": true
    },
    "duration": 1234
  }
}
```

### 4. Frontend State (Complete)
```typescript
{
  "WORKFLOW:send-email-n8n-launchApplication-2026-03-21T10:00:00.000Z": {
    agentName: "WORKFLOW:send-email-n8n",
    toolName: "launchApplication",
    toolInput: { application: "terminal" },
    timestamp: "2026-03-21T10:00:00.000Z",
    pending: false,  // ← Completed
    success: true,   // ← Success status
    output: { success: true },
    duration: 1234   // ← Execution time
  }
}
```

## Comparison: Agent Tools vs Workflow Tools

### Agent Tools (Existing)

```
WEB_AGENT → pinchtab_click
  Parameters: { ref: "e23" }
  Result: { clicked: true }
  Duration: 234ms
```

**Agent Name:** `WEB_AGENT`, `DESKTOP_AGENT`  
**Logging:** Automatic (built into agent execution)  
**Tools:** PinchTab tools (30), Desktop tools (18)

### Workflow Tools (New)

```
WORKFLOW:send-email-n8n → launchApplication
  Parameters: { application: "terminal" }
  Result: { success: true }
  Duration: 1234ms
```

**Agent Name:** `WORKFLOW:workflow-name`  
**Logging:** Manual (via WorkflowLogger wrapper)  
**Tools:** Same as agents (PinchTab + Desktop services)

## Key Differences

| Aspect | Agent Tools | Workflow Tools |
|--------|-------------|----------------|
| **Logging** | Automatic | Manual (opt-in) |
| **Agent Name** | `WEB_AGENT`, `DESKTOP_AGENT` | `WORKFLOW:workflow-name` |
| **Implementation** | Built into agent classes | WorkflowLogger helper |
| **Tool Names** | LLM tool names (`pinchtab_click`) | Service method names (`launchApplication`) |
| **Visibility** | Always visible | Only if logged |

## Migration Example

### Before (No Logging)

```typescript
export async function execute(variables, services) {
  const { desktop } = services;
  
  await desktop.launchApplication('terminal');
  await desktop.wait(3000);
  const screenshot = await desktop.screenshot();
  
  return { success: true };
}
```

**Frontend sees:** Nothing (only workflow start/complete)

### After (With Logging)

```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export async function execute(variables, services) {
  const { desktop, browserLogger, taskId } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'my-workflow');
  
  await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
    desktop.launchApplication('terminal')
  );
  await logger.logToolCall('wait', { duration: 3000 }, () =>
    desktop.wait(3000)
  );
  const screenshot = await logger.logToolCall('screenshot', {}, () =>
    desktop.screenshot()
  );
  
  return { success: true };
}
```

**Frontend sees:**
```
WORKFLOW:my-workflow → launchApplication ✓ 1234ms
WORKFLOW:my-workflow → wait ✓ 3001ms
WORKFLOW:my-workflow → screenshot ✓ 2345ms
```
