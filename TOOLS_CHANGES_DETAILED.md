# Tools Changes - Detailed

## File: `packages/aria-agent/src/bytez/bytez.service.ts`

## Change 1: getComputerUseTools() - Line 631

### BEFORE (9 separate tools)
```typescript
private getComputerUseTools(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'computer_screenshot',
        description: 'Captures a screenshot of the current screen',
        parameters: { ... }
      }
    },
    {
      type: 'function',
      function: {
        name: 'computer_left_click',
        description: 'Performs a left mouse click at the specified coordinates',
        parameters: { ... }
      }
    },
    // ... 7 more separate tools
  ];
}
```

### AFTER (2 unified tools)
```typescript
private getComputerUseTools(): any[] {
  return [
    {
      type: 'function',
      function: {
        name: 'computer',
        description: 'Control mouse and keyboard to interact with the desktop. Use this to click, type, paste, press keys, and take screenshots.',
        parameters: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['click', 'double_click', 'right_click', 'type', 'paste', 'key', 'screenshot', 'scroll', 'application', 'terminal_command'],
              description: 'The action to perform: click (left click), double_click, right_click, type (type text slowly), paste (paste text fast via clipboard), key (press key/combo), screenshot, scroll, application (open app), terminal_command (run command in terminal)',
            },
            x: {
              type: 'integer',
              description: 'X coordinate for mouse actions (click, double_click, right_click, scroll)',
            },
            y: {
              type: 'integer',
              description: 'Y coordinate for mouse actions (click, double_click, right_click, scroll)',
            },
            text: {
              type: 'string',
              description: 'Text to type/paste (for type or paste action) or key to press (for key action, e.g., "Return", "ctrl+c"). Use paste for long text (faster), type for short text.',
            },
            direction: {
              type: 'string',
              enum: ['up', 'down'],
              description: 'Scroll direction (for scroll action)',
            },
            amount: {
              type: 'integer',
              description: 'Scroll amount in lines (for scroll action)',
            },
            application: {
              type: 'string',
              description: 'Application name to open (for application action, e.g., "chromium", "terminal", "vscode")',
            },
            command: {
              type: 'string',
              description: 'Terminal command to run (for terminal_command action, e.g., "ls -la", "npm install")',
            },
          },
          required: ['action'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'set_task_status',
        description: 'Mark the current step as completed or failed. Use this when the success criteria is met or when the step cannot be completed.',
        parameters: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['completed', 'failed'],
              description: 'The status: completed (success criteria met) or failed (cannot complete)',
            },
            message: {
              type: 'string',
              description: 'Brief message explaining the status (what was accomplished or why it failed)',
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

## Change 2: getAnthropicTools() - Line 815

### BEFORE (9 separate tools)
```typescript
private getAnthropicTools(): any[] {
  return [
    {
      name: 'computer_screenshot',
      description: 'Captures a screenshot of the current screen',
      input_schema: { ... }
    },
    {
      name: 'computer_left_click',
      description: 'Performs a left mouse click at the specified coordinates',
      input_schema: { ... }
    },
    // ... 7 more separate tools
  ];
}
```

### AFTER (2 unified tools)
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
            description: 'The action to perform: click (left click), double_click, right_click, type (type text slowly), paste (paste text fast via clipboard), key (press key/combo), screenshot, scroll, application (open app), terminal_command (run command in terminal)',
          },
          x: {
            type: 'integer',
            description: 'X coordinate for mouse actions (click, double_click, right_click, scroll)',
          },
          y: {
            type: 'integer',
            description: 'Y coordinate for mouse actions (click, double_click, right_click, scroll)',
          },
          text: {
            type: 'string',
            description: 'Text to type/paste (for type or paste action) or key to press (for key action, e.g., "Return", "ctrl+c"). Use paste for long text (faster), type for short text.',
          },
          direction: {
            type: 'string',
            enum: ['up', 'down'],
            description: 'Scroll direction (for scroll action)',
          },
          amount: {
            type: 'integer',
            description: 'Scroll amount in lines (for scroll action)',
          },
          application: {
            type: 'string',
            description: 'Application name to open (for application action, e.g., "chromium", "terminal", "vscode")',
          },
          command: {
            type: 'string',
            description: 'Terminal command to run (for terminal_command action, e.g., "ls -la", "npm install")',
          },
        },
        required: ['action'],
      },
    },
    {
      name: 'set_task_status',
      description: 'Mark the current step as completed or failed. Use this when the success criteria is met or when the step cannot be completed.',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'failed'],
            description: 'The status: completed (success criteria met) or failed (cannot complete)',
          },
          message: {
            type: 'string',
            description: 'Brief message explaining the status (what was accomplished or why it failed)',
          },
        },
        required: ['status', 'message'],
      },
    },
  ];
}
```

---

## Key Differences

| Aspect | Before | After |
|--------|--------|-------|
| **Tool Count** | 9 | 2 |
| **Tool Names** | computer_screenshot, computer_left_click, etc. | computer, set_task_status |
| **Structure** | Each action as separate tool | Single tool with action enum |
| **Parameters** | Specific to each tool | Flexible based on action |
| **Matches desktop.tools.ts** | ❌ No | ✅ Yes |
| **Groq Compatible** | ❌ Different | ✅ Same |

---

## Why This Matters

1. **Consistency** - Now matches what Groq receives
2. **Simplicity** - Claude has fewer tools to choose from
3. **Flexibility** - Single tool can handle all desktop actions
4. **Correctness** - Matches the actual Desktop Agent implementation

---

## Verification

✅ Build: SUCCESS (Exit Code: 0)
✅ No TypeScript errors
✅ No compilation warnings
✅ Ready for deployment
