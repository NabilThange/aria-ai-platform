# Correct Tools Implementation - Desktop Agent

## Problem Found

We were sending **9 separate tools** to Anthropic:
- computer_screenshot
- computer_left_click
- computer_right_click
- computer_double_click
- computer_type_text
- computer_type_keys
- computer_application
- computer_scroll
- set_task_status

But the actual Desktop Agent uses **2 unified tools**:
1. **`computer`** - Single unified tool with multiple actions
2. **`set_task_status`** - Task completion tool

## Solution Implemented

Updated `packages/aria-agent/src/bytez/bytez.service.ts` to use the correct tools that match `desktop.tools.ts`.

### File: `packages/aria-agent/src/bytez/bytez.service.ts`

#### Method 1: getAnthropicTools() - Line 815
**Format:** Anthropic native (uses `input_schema`)

```typescript
private getAnthropicTools(): any[] {
  return [
    {
      name: 'computer',
      description: 'Control mouse and keyboard to interact with the desktop. Use this to click, type, paste, press keys, and take screenshots.',
      input_schema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'screenshot', 'scroll', 'application', 'terminal_command'],
            description: 'The action to perform...',
          },
          x: { type: 'integer', description: 'X coordinate for mouse actions' },
          y: { type: 'integer', description: 'Y coordinate for mouse actions' },
          text: { type: 'string', description: 'Text to type/paste or key to press' },
          direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
          amount: { type: 'integer', description: 'Scroll amount in lines' },
          application: { type: 'string', description: 'Application name to open' },
          command: { type: 'string', description: 'Terminal command to run' },
        },
        required: ['action'],
      },
    },
    {
      name: 'set_task_status',
      description: 'Mark the current step as completed or failed.',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'failed'],
            description: 'The status: completed or failed',
          },
          message: {
            type: 'string',
            description: 'Brief message explaining the status',
          },
        },
        required: ['status', 'message'],
      },
    },
  ];
}
```

#### Method 2: getComputerUseTools() - Line 631
**Format:** OpenAI-compatible (uses `parameters`)

```typescript
private getComputerUseTools(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'computer',
        description: 'Control mouse and keyboard to interact with the desktop...',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'screenshot', 'scroll', 'application', 'terminal_command'],
              description: 'The action to perform...',
            },
            x: { type: 'integer', description: 'X coordinate for mouse actions' },
            y: { type: 'integer', description: 'Y coordinate for mouse actions' },
            text: { type: 'string', description: 'Text to type/paste or key to press' },
            direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
            amount: { type: 'integer', description: 'Scroll amount in lines' },
            application: { type: 'string', description: 'Application name to open' },
            command: { type: 'string', description: 'Terminal command to run' },
          },
          required: ['action'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_task_status',
        description: 'Mark the current step as completed or failed.',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['completed', 'failed'],
              description: 'The status: completed or failed',
            },
            message: {
              type: 'string',
              description: 'Brief message explaining the status',
            },
          },
          required: ['status', 'message'],
        },
      },
    },
  ];
}
```

---

## The 2 Tools Explained

### Tool 1: `computer`

**Purpose:** Unified tool for all desktop interactions

**Actions Available:**
- `click` - Left mouse click at (x, y)
- `double_click` - Double click at (x, y)
- `right_click` - Right mouse click at (x, y)
- `type` - Type text slowly (character by character)
- `paste` - Paste text fast via clipboard (preferred for long text)
- `key` - Press keyboard keys/combinations (e.g., "Return", "ctrl+c")
- `screenshot` - Capture current screen
- `scroll` - Scroll up or down by amount
- `application` - Open or switch to application (e.g., "chromium", "terminal")
- `terminal_command` - Run command in terminal (e.g., "ls -la", "npm install")

**Parameters:**
- `action` (required) - Which action to perform
- `x` (optional) - X coordinate for mouse actions
- `y` (optional) - Y coordinate for mouse actions
- `text` (optional) - Text to type/paste or key to press
- `direction` (optional) - Scroll direction (up/down)
- `amount` (optional) - Scroll amount in lines
- `application` (optional) - Application name
- `command` (optional) - Terminal command

**Example Calls:**
```json
// Click at coordinates
{"action": "click", "x": 100, "y": 200}

// Type text
{"action": "type", "text": "hello"}

// Paste long text (faster)
{"action": "paste", "text": "very long text here..."}

// Press key combination
{"action": "key", "text": "ctrl+c"}

// Open application
{"action": "application", "application": "chromium"}

// Run terminal command
{"action": "terminal_command", "command": "npm install"}

// Take screenshot
{"action": "screenshot"}

// Scroll
{"action": "scroll", "direction": "down", "amount": 3}
```

### Tool 2: `set_task_status`

**Purpose:** Mark the current step as completed or failed

**Parameters:**
- `status` (required) - "completed" or "failed"
- `message` (required) - Brief explanation

**Example Calls:**
```json
// Task completed
{"status": "completed", "message": "Successfully opened Chrome and navigated to Google"}

// Task failed
{"status": "failed", "message": "Could not find the login button after 3 attempts"}
```

---

## Where Tools Are Attached to API Body

### For Anthropic Models (Native Endpoint)
**Line 97 in bytez.service.ts:**
```typescript
requestBody.params = {
  max_tokens: 8192,
  tools: this.getAnthropicTools(),  // ← 2 tools attached here
  tool_choice: { type: 'auto' },
};
```

### For OpenAI-Compatible Endpoint
**Line 104 in bytez.service.ts:**
```typescript
requestBody.tools = this.getComputerUseTools();  // ← 2 tools attached here
requestBody.tool_choice = 'auto';
```

---

## API Request Body Example

### Anthropic Format
```json
{
  "messages": [...],
  "system": "...",
  "params": {
    "max_tokens": 8192,
    "tools": [
      {
        "name": "computer",
        "description": "Control mouse and keyboard...",
        "input_schema": {
          "type": "object",
          "properties": {
            "action": {"type": "string", "enum": ["click", "double_click", ...]},
            "x": {"type": "integer"},
            "y": {"type": "integer"},
            ...
          },
          "required": ["action"]
        }
      },
      {
        "name": "set_task_status",
        "description": "Mark the current step...",
        "input_schema": {...}
      }
    ],
    "tool_choice": {"type": "auto"}
  }
}
```

### OpenAI-Compatible Format
```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "computer",
        "description": "Control mouse and keyboard...",
        "parameters": {
          "type": "object",
          "properties": {
            "action": {"type": "string", "enum": ["click", "double_click", ...]},
            "x": {"type": "integer"},
            "y": {"type": "integer"},
            ...
          },
          "required": ["action"]
        }
      }
    },
    {
      "type": "function",
      "function": {
        "name": "set_task_status",
        "description": "Mark the current step...",
        "parameters": {...}
      }
    }
  ],
  "tool_choice": "auto"
}
```

---

## Comparison: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| **Tools Count** | 9 separate tools | 2 unified tools |
| **Tool Names** | computer_screenshot, computer_left_click, etc. | computer, set_task_status |
| **Tool Structure** | Each action as separate tool | Single tool with action enum |
| **Matches Desktop Agent** | ❌ No | ✅ Yes |
| **Matches desktop.tools.ts** | ❌ No | ✅ Yes |
| **Groq Compatibility** | ❌ Different | ✅ Same |

---

## Build Status

✅ **Compilation:** SUCCESS (Exit Code: 0)
✅ **No TypeScript errors**
✅ **No warnings**
✅ **Ready for deployment**

---

## Summary

The Desktop Agent now sends the **correct 2 tools** to Anthropic Claude:

1. **`computer`** - Unified tool with 10 actions (click, type, paste, key, screenshot, scroll, application, terminal_command, etc.)
2. **`set_task_status`** - Task completion tool

These match exactly what the Desktop Agent expects and what Groq receives, ensuring consistency across all LLM providers.
