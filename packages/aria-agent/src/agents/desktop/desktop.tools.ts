/**
 * Desktop Agent Tools
 * Unified tool definitions for desktop automation
 * 
 * CRITICAL: These tools match the API schema sent to Bytez/Groq.
 * The agent receives these exact tool definitions, so they must match
 * what's described in the system prompt.
 */

export const groqDesktopTools = [
  {
    type: 'function' as const,
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
    type: 'function' as const,
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
