# Browser Logger Client Integration

## Overview
The backend now emits detailed agent execution logs via WebSocket. Add this client-side code to your frontend to display them in the browser console.

## Client-Side Integration

Add this to your frontend code (e.g., in your task detail page):

```typescript
import { io, Socket } from 'socket.io-client';

// Connect to WebSocket
const socket: Socket = io('http://localhost:9991');

// Join task room
socket.emit('join_task', taskId);

// Listen for browser logs
socket.on('browser_log', (log: {
  taskId: string;
  type: string;
  timestamp: string;
  data: any;
}) => {
  handleBrowserLog(log);
});

function handleBrowserLog(log: any) {
  const { type, data, timestamp } = log;
  
  switch (type) {
    case 'agent.start':
      console.group(`%c🤖 ${data.agentName} - STARTED`, 'color: #4CAF50; font-weight: bold; font-size: 14px');
      console.log('%cTimestamp:', 'font-weight: bold', timestamp);
      console.groupCollapsed('%cSystem Prompt', 'color: #2196F3; font-weight: bold');
      console.log(data.systemPrompt);
      console.groupEnd();
      console.groupCollapsed('%cUser Prompt', 'color: #FF9800; font-weight: bold');
      console.log(data.userPrompt);
      console.groupEnd();
      if (data.context) {
        console.groupCollapsed('%cContext', 'color: #9C27B0; font-weight: bold');
        console.table(data.context);
        console.groupEnd();
      }
      console.groupEnd();
      break;
      
    case 'agent.response':
      console.group(`%c📤 ${data.agentName} - RESPONSE`, 'color: #2196F3; font-weight: bold; font-size: 14px');
      console.log('%cModel:', 'font-weight: bold', `${data.provider}/${data.model}`);
      console.log('%cTokens:', 'font-weight: bold', data.tokenUsage);
      console.groupCollapsed('%cContent Blocks', 'color: #FF5722; font-weight: bold');
      data.contentBlocks.forEach((block: any, idx: number) => {
        console.group(`Block ${idx + 1}: ${block.type}`);
        if (block.type === 'text') {
          console.log(block.text);
        } else if (block.type === 'tool_use') {
          console.log('%cTool:', 'font-weight: bold', block.name);
          console.log('%cInput:', 'font-weight: bold');
          console.table(block.input);
        }
        console.groupEnd();
      });
      console.groupEnd();
      console.groupEnd();
      break;
      
    case 'tool.call':
      console.group(`%c🔧 TOOL CALL: ${data.toolName}`, 'color: #FF9800; font-weight: bold; font-size: 13px');
      console.log('%cAgent:', 'font-weight: bold', data.agentName);
      console.log('%cTool Input:', 'font-weight: bold');
      console.table(data.toolInput);
      console.groupEnd();
      break;
      
    case 'tool.result':
      if (data.success) {
        console.group(`%c✅ TOOL SUCCESS: ${data.toolName}`, 'color: #4CAF50; font-weight: bold; font-size: 13px');
      } else {
        console.group(`%c❌ TOOL FAILED: ${data.toolName}`, 'color: #F44336; font-weight: bold; font-size: 13px');
      }
      console.log('%cAgent:', 'font-weight: bold', data.agentName);
      console.log('%cDuration:', 'font-weight: bold', `${data.duration}ms`);
      if (data.success && data.output) {
        console.log('%cOutput:', 'font-weight: bold');
        if (typeof data.output === 'object') {
          console.table(data.output);
        } else {
          console.log(data.output);
        }
      }
      if (!data.success && data.error) {
        console.error('%cError:', 'font-weight: bold', data.error);
      }
      console.groupEnd();
      break;
      
    case 'agent.complete':
      if (data.success) {
        console.group(`%c✅ ${data.agentName} - COMPLETED`, 'color: #4CAF50; font-weight: bold; font-size: 14px');
      } else {
        console.group(`%c❌ ${data.agentName} - FAILED`, 'color: #F44336; font-weight: bold; font-size: 14px');
      }
      console.log('%cDuration:', 'font-weight: bold', `${data.duration}ms`);
      if (data.tokensUsed) {
        console.log('%cTokens Used:', 'font-weight: bold', data.tokensUsed);
        console.log('%cCost:', 'font-weight: bold', `$${data.cost?.toFixed(6) || 0}`);
      }
      console.log('%cOutput:', 'font-weight: bold');
      console.log(data.output);
      console.groupEnd();
      break;
      
    case 'agent.error':
      console.group(`%c💥 ${data.agentName} - ERROR`, 'color: #F44336; font-weight: bold; font-size: 14px');
      console.error(data.error);
      if (data.stack) {
        console.groupCollapsed('Stack Trace');
        console.error(data.stack);
        console.groupEnd();
      }
      console.groupEnd();
      break;
  }
}

// Cleanup on unmount
function cleanup() {
  socket.emit('leave_task', taskId);
  socket.disconnect();
}
```

## Example Console Output

When an agent executes, you'll see:

```
🤖 WEB_AGENT - STARTED
  Timestamp: 2026-03-15T12:00:00.000Z
  ▼ System Prompt
    You are ARIA-Web. You execute web tasks using PinchTab...
  ▼ User Prompt
    Navigate to Google and search for "AI agents"
  ▼ Context
    ┌─────────────┬────────────────────┐
    │ iteration   │ 1                  │
    │ stepId      │ step_1             │
    │ url         │ https://google.com │
    └─────────────┴────────────────────┘

📤 WEB_AGENT - RESPONSE
  Model: groq/llama-4-scout-120b
  Tokens: { inputTokens: 1234, outputTokens: 56, totalTokens: 1290 }
  ▼ Content Blocks
    ▼ Block 1: tool_use
      Tool: pinchtab_navigate
      Input:
      ┌─────┬──────────────────────────────┐
      │ url │ https://www.google.com       │
      └─────┴──────────────────────────────┘

🔧 TOOL CALL: pinchtab_navigate
  Agent: WEB_AGENT
  Tool Input:
  ┌─────┬──────────────────────────────┐
  │ url │ https://www.google.com       │
  └─────┴──────────────────────────────┘

✅ TOOL SUCCESS: pinchtab_navigate
  Agent: WEB_AGENT
  Duration: 1234ms
  Output:
  ┌──────────┬────────────────────────────┐
  │ success  │ true                       │
  │ url      │ https://www.google.com     │
  └──────────┴────────────────────────────┘

✅ WEB_AGENT - COMPLETED
  Duration: 5678ms
  Tokens Used: 1290
  Cost: $0.000129
  Output: { action: "navigate", success: true }
```

## Features

- **Grouped Logs**: Each agent execution is grouped for easy collapse/expand
- **Color Coding**: 
  - Green (✅) for success
  - Red (❌) for errors
  - Blue (📤) for responses
  - Orange (🔧) for tool calls
- **Tables**: Structured data displayed in console tables
- **Collapsible Sections**: System prompts, user prompts, and context can be collapsed
- **Real-time**: Logs appear as agents execute, not after completion

## Benefits

1. **Full Transparency**: See exactly what prompts are sent to LLMs
2. **Tool Debugging**: See exact tool syntax and results
3. **Performance Monitoring**: Track token usage and costs per agent
4. **Error Diagnosis**: Immediate visibility into failures with stack traces
5. **Learning**: Understand how agents make decisions
