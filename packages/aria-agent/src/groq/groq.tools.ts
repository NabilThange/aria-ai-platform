export const groqTools = [
  {
    type: 'function' as const,
    function: {
      name: 'computer',
      description:
        'Use a mouse and keyboard to interact with a computer, and take screenshots.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'key',
              'type',
              'mouse_move',
              'left_click',
              'left_click_drag',
              'right_click',
              'middle_click',
              'double_click',
              'screenshot',
              'cursor_position',
            ],
            description:
              'The action to perform. key: Press a key or key-combination. type: Type a string of text. mouse_move: Move the mouse to a coordinate. left_click: Click the left mouse button. left_click_drag: Click and drag the mouse. right_click: Click the right mouse button. middle_click: Click the middle mouse button. double_click: Double-click the left mouse button. screenshot: Take a screenshot. cursor_position: Get the current cursor position.',
          },
          coordinate: {
            type: 'array',
            items: { type: 'integer' },
            description:
              'The (x, y) coordinate to move the mouse to (required for mouse_move, left_click, right_click, middle_click, double_click, left_click_drag).',
          },
          text: {
            type: 'string',
            description:
              'The text to type (required for type action). For key action, the key or key-combination to press (e.g., "Return", "Ctrl+c").',
          },
        },
        required: ['action'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'computer_application',
      description: 'Open or close an application on the computer.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['open', 'close'],
            description: 'Whether to open or close the application.',
          },
          application: {
            type: 'string',
            description:
              'The name of the application to open or close (e.g., "firefox", "chrome", "code").',
          },
        },
        required: ['action', 'application'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_task_status',
      description:
        'Set the status of the current task. Use this when the task is completed, needs help, or has failed.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'needs_help', 'failed'],
            description: 'The new status of the task.',
          },
          description: {
            type: 'string',
            description:
              'A description of why the status is being set (e.g., what was accomplished, what help is needed).',
          },
        },
        required: ['status', 'description'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Create a new task for the agent to work on.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'A description of the task to be created.',
          },
          type: {
            type: 'string',
            enum: ['immediate', 'scheduled'],
            description:
              'The type of task. immediate: Execute as soon as possible. scheduled: Execute at a specific time.',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'The priority of the task.',
          },
          scheduledFor: {
            type: 'string',
            description:
              'ISO 8601 timestamp for when the task should be executed (required for scheduled tasks).',
          },
        },
        required: ['description', 'type'],
      },
    },
  },
];
