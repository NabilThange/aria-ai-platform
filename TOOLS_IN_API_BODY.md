# Tools Attached to API Body - Complete Reference

## File Location
**File:** `packages/aria-agent/src/bytez/bytez.service.ts`

## Where Tools Are Attached

### For Anthropic Models (Native Endpoint)
**Lines:** 96-98
```typescript
requestBody.params = {
  max_tokens: 8192,
  tools: this.getAnthropicTools(),  // ← Tools attached here
  tool_choice: { type: 'auto' },
};
```

### For Other Models (OpenAI-Compatible Endpoint)
**Lines:** 104-106
```typescript
requestBody.tools = this.getComputerUseTools();  // ← Tools attached here
requestBody.tool_choice = 'auto';
```

---

## All Tools Available

### 1. **computer_screenshot**
- **Description:** Captures a screenshot of the current screen
- **Parameters:** None
- **Location:** Both methods (Anthropic: Line 815+, OpenAI: Line 631+)

### 2. **computer_left_click**
- **Description:** Performs a left mouse click at the specified coordinates
- **Parameters:**
  - `x` (number, required): X coordinate for the click
  - `y` (number, required): Y coordinate for the click
- **Location:** Both methods

### 3. **computer_right_click**
- **Description:** Performs a right mouse click at the specified coordinates
- **Parameters:**
  - `x` (number, required): X coordinate for the click
  - `y` (number, required): Y coordinate for the click
- **Location:** Both methods

### 4. **computer_double_click**
- **Description:** Performs a double click at the specified coordinates
- **Parameters:**
  - `x` (number, required): X coordinate for the double click
  - `y` (number, required): Y coordinate for the double click
- **Location:** Both methods

### 5. **computer_type_text**
- **Description:** Types a string of text character by character
- **Parameters:**
  - `text` (string, required): The text to type
  - `isSensitive` (boolean, optional): Whether the text is sensitive (e.g., password)
- **Location:** Both methods

### 6. **computer_type_keys**
- **Description:** Types a sequence of keys (useful for keyboard shortcuts)
- **Parameters:**
  - `keys` (array of strings, required): Array of key names to press
- **Location:** Both methods

### 7. **computer_application**
- **Description:** Opens or switches to an application
- **Parameters:**
  - `application` (string, required): Name of the application to open
- **Location:** Both methods

### 8. **computer_scroll**
- **Description:** Scrolls the screen
- **Parameters:**
  - `direction` (string, required): Direction to scroll (up, down, left, right)
  - `amount` (number, optional): Amount to scroll
- **Location:** Both methods

### 9. **set_task_status**
- **Description:** Set the status of the current task. Use this when the task is completed, needs help, or has failed. ALWAYS call this as your final action.
- **Parameters:**
  - `status` (string, required): Task status (completed, failed, needs_help)
  - `message` or `description` (string, required): A brief description or summary of what was accomplished or what help is needed
- **Location:** Both methods

---

## Tool Format Differences

### Anthropic Format (Native Endpoint)
**Method:** `getAnthropicTools()` - **Line 815**

```typescript
{
  name: 'computer_left_click',
  description: 'Performs a left mouse click at the specified coordinates',
  input_schema: {  // ← Uses input_schema
    type: 'object',
    properties: {
      x: { type: 'number', description: 'X coordinate for the click' },
      y: { type: 'number', description: 'Y coordinate for the click' },
    },
    required: ['x', 'y'],
  },
}
```

### OpenAI Format (Compatible Endpoint)
**Method:** `getComputerUseTools()` - **Line 631**

```typescript
{
  type: 'function',
  function: {
    name: 'computer_left_click',
    description: 'Performs a left mouse click at the specified coordinates',
    parameters: {  // ← Uses parameters
      type: 'object',
      properties: {
        x: { type: 'number', description: 'X coordinate for the click' },
        y: { type: 'number', description: 'Y coordinate for the click' },
      },
      required: ['x', 'y'],
    },
  },
}
```

---

## How Tools Are Used in API Body

### Request Body Structure (Anthropic)
```json
{
  "messages": [...],
  "system": "...",
  "params": {
    "max_tokens": 8192,
    "tools": [
      {
        "name": "computer_screenshot",
        "description": "...",
        "input_schema": {...}
      },
      {
        "name": "computer_left_click",
        "description": "...",
        "input_schema": {...}
      },
      ...
    ],
    "tool_choice": { "type": "auto" }
  }
}
```

### Request Body Structure (OpenAI-Compatible)
```json
{
  "model": "anthropic/claude-sonnet-4-6",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "computer_screenshot",
        "description": "...",
        "parameters": {...}
      }
    },
    {
      "type": "function",
      "function": {
        "name": "computer_left_click",
        "description": "...",
        "parameters": {...}
      }
    },
    ...
  ],
  "tool_choice": "auto"
}
```

---

## Summary

| Aspect | Count | Location |
|--------|-------|----------|
| **Total Tools** | 9 | Both methods |
| **Anthropic Format** | 9 | `getAnthropicTools()` - Line 815 |
| **OpenAI Format** | 9 | `getComputerUseTools()` - Line 631 |
| **Tools Attached (Anthropic)** | Line 97 | `requestBody.params.tools` |
| **Tools Attached (OpenAI)** | Line 104 | `requestBody.tools` |

---

## Tool Categories

### Mouse Operations (4 tools)
1. computer_left_click
2. computer_right_click
3. computer_double_click
4. computer_scroll

### Keyboard Operations (2 tools)
1. computer_type_text
2. computer_type_keys

### System Operations (2 tools)
1. computer_screenshot
2. computer_application

### Task Management (1 tool)
1. set_task_status

---

## When Tools Are Sent

Tools are attached to the API body when:
- ✅ `useTools: true` is passed to `generateMessage()`
- ✅ Desktop Agent is executing a step
- ✅ Anthropic Claude model is being used
- ✅ OpenAI-compatible endpoint is being used

Tools are NOT sent when:
- ❌ `useTools: false`
- ❌ Non-tool-calling agents (Clarifier, Orchestrator, etc.)
- ❌ Text-only responses needed
