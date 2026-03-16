# Tools - Exact Locations in Code

## File: `packages/aria-agent/src/bytez/bytez.service.ts`

---

## Where Tools Are Attached to Request Body

### Location 1: Anthropic Native Endpoint
**Lines: 96-98**
```typescript
if (useNativeAnthropicEndpoint) {
  if (useTools) {
    requestBody.params = {
      max_tokens: 8192,
      tools: this.getAnthropicTools(),  // ← TOOLS ATTACHED HERE (Line 97)
      tool_choice: { type: 'auto' },
    };
  }
}
```

### Location 2: OpenAI-Compatible Endpoint
**Lines: 103-106**
```typescript
} else if (useTools) {
  // OpenAI-compatible endpoint: Use top-level tools
  requestBody.model = model;
  requestBody.tools = this.getComputerUseTools();  // ← TOOLS ATTACHED HERE (Line 104)
  requestBody.tool_choice = 'auto';
}
```

---

## Where Tools Are Defined

### Method 1: getAnthropicTools()
**Location: Line 815**
**Format: Anthropic (uses `input_schema`)**

```typescript
private getAnthropicTools(): any[] {
  return [
    // Tool 1: computer_screenshot (Line 816-822)
    {
      name: 'computer_screenshot',
      description: 'Captures a screenshot of the current screen',
      input_schema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    
    // Tool 2: computer_left_click (Line 823-839)
    {
      name: 'computer_left_click',
      description: 'Performs a left mouse click at the specified coordinates',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate for the click' },
          y: { type: 'number', description: 'Y coordinate for the click' },
        },
        required: ['x', 'y'],
      },
    },
    
    // Tool 3: computer_right_click (Line 840-856)
    {
      name: 'computer_right_click',
      description: 'Performs a right mouse click at the specified coordinates',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate for the click' },
          y: { type: 'number', description: 'Y coordinate for the click' },
        },
        required: ['x', 'y'],
      },
    },
    
    // Tool 4: computer_double_click (Line 857-873)
    {
      name: 'computer_double_click',
      description: 'Performs a double click at the specified coordinates',
      input_schema: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate for the double click' },
          y: { type: 'number', description: 'Y coordinate for the double click' },
        },
        required: ['x', 'y'],
      },
    },
    
    // Tool 5: computer_type_text (Line 874-891)
    {
      name: 'computer_type_text',
      description: 'Types a string of text character by character',
      input_schema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text to type' },
          isSensitive: { type: 'boolean', description: 'Whether the text is sensitive (e.g., password)' },
        },
        required: ['text'],
      },
    },
    
    // Tool 6: computer_type_keys (Line 892-908)
    {
      name: 'computer_type_keys',
      description: 'Types a sequence of keys (useful for keyboard shortcuts)',
      input_schema: {
        type: 'object',
        properties: {
          keys: { type: 'array', items: { type: 'string' }, description: 'Array of key names to press' },
        },
        required: ['keys'],
      },
    },
    
    // Tool 7: computer_application (Line 909-923)
    {
      name: 'computer_application',
      description: 'Opens or switches to an application',
      input_schema: {
        type: 'object',
        properties: {
          application: { type: 'string', description: 'Name of the application to open' },
        },
        required: ['application'],
      },
    },
    
    // Tool 8: computer_scroll (Line 924-942)
    {
      name: 'computer_scroll',
      description: 'Scrolls the screen',
      input_schema: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down', 'left', 'right'], description: 'Direction to scroll' },
          amount: { type: 'number', description: 'Amount to scroll' },
        },
        required: ['direction'],
      },
    },
    
    // Tool 9: set_task_status (Line 943-961)
    {
      name: 'set_task_status',
      description: 'Set the status of the current task. Use this when the task is completed, needs help, or has failed. ALWAYS call this as your final action.',
      input_schema: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['completed', 'failed', 'needs_help'], description: 'The status of the task' },
          message: { type: 'string', description: 'A brief description or summary of what was accomplished or what help is needed' },
        },
        required: ['status', 'message'],
      },
    },
  ];
}
```

---

### Method 2: getComputerUseTools()
**Location: Line 631**
**Format: OpenAI (uses `parameters`)**

```typescript
private getComputerUseTools(): any[] {
  return [
    // Tool 1: computer_screenshot (Line 632-641)
    {
      type: 'function',
      function: {
        name: 'computer_screenshot',
        description: 'Captures a screenshot of the current screen',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    
    // Tool 2: computer_left_click (Line 642-661)
    {
      type: 'function',
      function: {
        name: 'computer_left_click',
        description: 'Performs a left mouse click at the specified coordinates',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'X coordinate for the click' },
            y: { type: 'number', description: 'Y coordinate for the click' },
          },
          required: ['x', 'y'],
        },
      },
    },
    
    // Tool 3: computer_right_click (Line 662-681)
    // Tool 4: computer_double_click (Line 682-701)
    // Tool 5: computer_type_text (Line 702-721)
    // Tool 6: computer_type_keys (Line 722-738)
    // Tool 7: computer_application (Line 739-753)
    // Tool 8: computer_scroll (Line 754-772)
    // Tool 9: set_task_status (Line 773-791)
    
    // ... (same structure as above, just with OpenAI format)
  ];
}
```

---

## Summary Table

| Tool | Anthropic Line | OpenAI Line | Description |
|------|----------------|------------|-------------|
| computer_screenshot | 816-822 | 632-641 | Take screenshot |
| computer_left_click | 823-839 | 642-661 | Left click at (x,y) |
| computer_right_click | 840-856 | 662-681 | Right click at (x,y) |
| computer_double_click | 857-873 | 682-701 | Double click at (x,y) |
| computer_type_text | 874-891 | 702-721 | Type text |
| computer_type_keys | 892-908 | 722-738 | Press keys |
| computer_application | 909-923 | 739-753 | Open application |
| computer_scroll | 924-942 | 754-772 | Scroll screen |
| set_task_status | 943-961 | 773-791 | Set task status |

---

## How to Find Them

1. **Open file:** `packages/aria-agent/src/bytez/bytez.service.ts`
2. **Go to line 97** → See tools attached for Anthropic
3. **Go to line 104** → See tools attached for OpenAI
4. **Go to line 815** → See `getAnthropicTools()` method
5. **Go to line 631** → See `getComputerUseTools()` method

---

## Key Points

✅ **9 tools total** - Same tools for both Anthropic and OpenAI formats
✅ **Different formats** - Anthropic uses `input_schema`, OpenAI uses `parameters`
✅ **Attached conditionally** - Only when `useTools: true`
✅ **Desktop Agent only** - These tools are for desktop automation
✅ **Tool choice: auto** - Claude automatically chooses which tool to use
