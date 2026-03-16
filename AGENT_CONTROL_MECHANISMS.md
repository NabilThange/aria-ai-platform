# Agent Control Mechanisms - Complete Guide

## Overview

Both Desktop Agent and Web Agent use **structured tool calling** (function calling) to control their environments. They do NOT use curl commands directly. Instead, they receive tool definitions from LLM providers and return structured tool calls that get executed by service layers.

---

## 🖥️ Desktop Agent Control

### How It Works

1. **Tool Calling via LLM**: Desktop Agent uses function calling through Bytez or Groq
2. **Unified Tool Design**: Single `computer` tool with `action` parameter
3. **VNC API Execution**: Tool calls are translated to VNC API requests at `http://localhost:3001/computer-use`

### Desktop Agent Tools

**Location**: `packages/aria-agent/src/agents/desktop/desktop.tools.ts`

**Available Tools**:
1. `computer` - Main tool for all desktop actions
2. `set_task_status` - Mark step as completed/failed

### Computer Tool Actions

```typescript
{
  name: "computer",
  arguments: {
    action: "click" | "double_click" | "right_click" | "type" | "paste" | 
            "key" | "screenshot" | "scroll" | "application" | "terminal_command",
    // Action-specific parameters:
    x?: number,              // For mouse actions
    y?: number,              // For mouse actions
    text?: string,           // For type/paste/key actions
    direction?: "up"|"down", // For scroll
    amount?: number,         // For scroll
    application?: string,    // For application action
    command?: string         // For terminal_command
  }
}
```

### Desktop Tool Examples

**Click at coordinates**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "click",
    "x": 100,
    "y": 200
  }
}
```

**Type text (short text < 50 chars)**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "type",
    "text": "hello world"
  }
}
```

**Paste text (long text > 50 chars - MUCH FASTER)**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "paste",
    "text": "This is a very long paragraph that would take forever to type character by character..."
  }
}
```

**Press keyboard shortcut**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "key",
    "text": "ctrl+c"
  }
}
```

**Open application**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "application",
    "application": "google-chrome"
  }
}
```

**Run terminal command**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "terminal_command",
    "command": "ls -la"
  }
}
```

**Mark step complete**:
```json
{
  "name": "set_task_status",
  "arguments": {
    "status": "completed",
    "message": "Chrome opened successfully"
  }
}
```

### Desktop Agent Execution Flow

```
1. Desktop Agent builds decision prompt with screenshot
   ↓
2. Calls Bytez/Groq with system prompt + messages + desktop tools
   ↓
3. LLM returns structured tool call:
   {name: "computer", arguments: {action: "click", x: 100, y: 200}}
   ↓
4. Desktop Agent extracts tool call
   ↓
5. Maps to internal format and calls VNC API:
   POST http://localhost:3001/computer-use
   {action: "click_mouse", coordinates: {x: 100, y: 200}, button: "left"}
   ↓
6. VNC executes action on desktop
   ↓
7. Desktop Agent takes new screenshot and continues iteration
```

---

## 🌐 Web Agent Control

### How It Works

1. **Tool Calling via LLM**: Web Agent uses function calling through Groq
2. **PinchTab Tools**: Specialized tools for browser automation
3. **PinchTab API Execution**: Tool calls are translated to PinchTab HTTP API requests at `http://pinchtab:9867`

### Web Agent Tools

**Location**: `packages/aria-agent/src/groq/pinchtab.tools.ts`

**Available Tools**:
1. `pinchtab_navigate` - Navigate to URL
2. `pinchtab_click` - Click element by reference
3. `pinchtab_fill` - Fill form field (⚠️ DOESN'T WORK - use type instead)
4. `pinchtab_submit` - Submit form
5. `pinchtab_scroll` - Scroll page
6. `pinchtab_wait` - Wait for duration
7. `pinchtab_get_snapshot` - Get page snapshot with element refs

### PinchTab Tool Definitions

**Navigate to URL**:
```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_navigate',
    description: 'Navigate to a URL in the browser',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to navigate to (must include protocol, e.g., https://)'
        }
      },
      required: ['url']
    }
  }
}
```

**Click element**:
```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_click',
    description: 'Click on an element in the browser by its reference ID',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'The element reference ID from the snapshot (e.g., "e1", "e42")'
        }
      },
      required: ['ref']
    }
  }
}
```

**Type text (⚠️ USE THIS, NOT FILL)**:
```typescript
{
  type: 'function',
  function: {
    name: 'pinchtab_type',
    description: 'Type text into a form field',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'The element reference ID of the input field'
        },
        text: {
          type: 'string',
          description: 'The text to type into the field'
        }
      },
      required: ['ref', 'text']
    }
  }
}
```

### Web Agent Tool Examples

**Navigate to URL**:
```json
{
  "name": "pinchtab_navigate",
  "input": {
    "url": "https://www.google.com"
  }
}
```

**Click element by reference**:
```json
{
  "name": "pinchtab_click",
  "input": {
    "ref": "e27"
  }
}
```

**Type into field (✅ WORKS)**:
```json
{
  "name": "pinchtab_type",
  "input": {
    "ref": "e23",
    "text": "search query"
  }
}
```

**Scroll page**:
```json
{
  "name": "pinchtab_scroll",
  "input": {
    "direction": "down",
    "amount": 500
  }
}
```

**Get snapshot**:
```json
{
  "name": "pinchtab_get_snapshot",
  "input": {}
}
```

### Web Agent Execution Flow

```
1. Web Agent gets page snapshot from PinchTab
   ↓
2. Builds decision prompt with snapshot (element refs)
   ↓
3. Calls Groq with system prompt + messages + PinchTab tools
   ↓
4. LLM returns structured tool call:
   {name: "pinchtab_click", input: {ref: "e27"}}
   ↓
5. Web Agent extracts tool call
   ↓
6. Calls PinchTabService method:
   await pinchTabService.click("e27")
   ↓
7. PinchTabService makes HTTP request:
   POST http://pinchtab:9867/tabs/{tabId}/action
   {kind: "click", ref: "e27"}
   ↓
8. PinchTab executes browser action
   ↓
9. Web Agent gets fresh snapshot and continues iteration
```

---

## 🔧 Tool System Architecture

### Tool Definition Format

Tools follow OpenAI function calling format:

```typescript
{
  type: 'function',
  function: {
    name: 'tool_name',
    description: 'What the tool does',
    parameters: {
      type: 'object',
      properties: {
        param1: {
          type: 'string',
          description: 'Parameter description'
        },
        param2: {
          type: 'number',
          enum: [1, 2, 3],
          description: 'Another parameter'
        }
      },
      required: ['param1']
    }
  }
}
```

### How Agents Call Tools

1. **Agent builds prompt** with current state (screenshot/snapshot)
2. **Agent calls LLM provider** with:
   - System prompt
   - Conversation history
   - Tool definitions
   - `useTools: true` flag
3. **LLM returns response** with tool calls:
   ```typescript
   {
     contentBlocks: [
       {
         type: 'tool_use',
         name: 'computer',
         input: {action: 'click', x: 100, y: 200}
       }
     ]
   }
   ```
4. **Agent extracts tool call** from response
5. **Agent executes tool** via service layer (VNC API or PinchTab API)
6. **Agent adds result** to conversation history
7. **Repeat** until step complete or max iterations reached

---

## 🔌 LLM Provider Integration

### Groq Service

**Location**: `packages/aria-agent/src/groq/groq.service.ts`

**Features**:
- Native tool calling support with `tool_choice: 'auto'`
- Returns structured `tool_calls` in response
- Handles multiple API keys with fallback retry
- Formats messages for Groq (images, text, tool results)

**Usage**:
```typescript
const response = await groqService.generateMessage(
  systemPrompt,
  messages,
  model,
  true,              // useTools
  undefined,         // signal
  pinchTabTools      // custom tools
);

// Extract tool call
const toolUseBlock = response.contentBlocks?.find(
  block => block.type === 'tool_use'
);
```

### Bytez Service

**Location**: `packages/aria-agent/src/bytez/bytez.service.ts`

**Features**:
- Supports both native Anthropic endpoint and OpenAI-compatible endpoint
- For Anthropic models: Uses native endpoint with tools in params
- For other models: Uses OpenAI-compatible endpoint
- Handles system prompt extraction for Anthropic
- Supports image content in messages

**Usage**:
```typescript
const response = await bytezService.generateMessage(
  systemPrompt,
  messages,
  model,
  true              // useTools - enforces schema, prevents hallucination
);

// Extract tool call
const toolUseBlock = response.contentBlocks?.find(
  block => block.type === 'tool_use'
);
```

---

## 🎯 Key Architectural Insights

### 1. Unified Tool Design
- Desktop Agent uses ONE `computer` tool with `action` parameter
- Reduces hallucination (LLM can't invent tool names)
- Simplifies system prompt (fewer tools to document)

### 2. Structured Output Only
- All agent control via structured tool calls
- Never via curl commands or text parsing
- Ensures reliable execution

### 3. Conversation History
- Both agents maintain conversation history
- Provides context for multi-turn reasoning
- LLM learns from previous actions

### 4. Provider Abstraction
- Supports multiple LLM providers (Groq, Bytez)
- Provider-specific tool formatting
- Consistent interface for agents

### 5. Iteration Budgets
- Desktop Agent: 20 iterations max per step
- Web Agent: 20 iterations max per step
- Prevents infinite loops
- Manages token usage

### 6. Loop Detection
- Desktop Agent detects repeated same action
- Forces different approach after 2 failures
- Prevents getting stuck

### 7. Recovery Strategies
- System supports recovery strategies
- Guides agents on what to avoid
- Suggests alternative approaches

---

## 📝 Summary

**Desktop Agent**:
- Uses `computer` tool with action parameter
- Calls VNC API at `http://localhost:3001/computer-use`
- Supports: click, type, paste, key, scroll, application, terminal_command
- Uses Bytez (Claude Sonnet) or Groq (Llama-4-Scout)

**Web Agent**:
- Uses PinchTab tools (navigate, click, type, scroll, wait)
- Calls PinchTab API at `http://pinchtab:9867`
- Gets page snapshots with element references
- Uses Groq (GPT-OSS 120B)

**Both agents**:
- Use structured tool calling (NOT curl commands)
- Maintain conversation history for context
- Implement iteration budgets to prevent loops
- Support recovery strategies for failure handling
