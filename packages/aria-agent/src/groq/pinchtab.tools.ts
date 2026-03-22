/**
 * PinchTab tool definitions for Groq LLM
 * These tools expose PinchTab browser automation capabilities to the model
 */

export const pinchTabTools = [
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_health',
      description: 'Check if PinchTab service is available and healthy',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_launch_instance',
      description: 'Launch a new browser instance. Use "headed" mode to show browser in VNC (visible UI), "headless" for background (no UI)',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Instance name/profile (e.g., "myinstance", "default")',
          },
          mode: {
            type: 'string',
            enum: ['headed', 'headless'],
            description: 'headed = visible in VNC, headless = background',
          },
        },
        required: ['name', 'mode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_list_instances',
      description: 'List all browser instances with their IDs and status',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_stop_instance',
      description: 'Stop and close a browser instance',
      parameters: {
        type: 'object',
        properties: {
          instanceId: {
            type: 'string',
            description: 'The instance ID to stop',
          },
        },
        required: ['instanceId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_list_tabs',
      description: 'List all open tabs in the current or specified instance',
      parameters: {
        type: 'object',
        properties: {
          instanceId: {
            type: 'string',
            description: 'Instance ID (optional, uses current instance if not provided)',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_switch_tab',
      description: 'Switch to a different tab by its ID',
      parameters: {
        type: 'object',
        properties: {
          tabId: {
            type: 'string',
            description: 'The tab ID to switch to',
          },
        },
        required: ['tabId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_navigate',
      description: 'Navigate to a URL in the browser (opens a new tab)',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL to navigate to (must include protocol, e.g., https://)',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_click',
      description: 'Click on an element in the browser by its reference ID',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The element reference ID from the snapshot (e.g., "e1", "e42")',
          },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_type',
      description: 'Type text into an element (WORKS - use this instead of fill which is broken)',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The element reference ID of the input field',
          },
          text: {
            type: 'string',
            description: 'The text to type into the field',
          },
        },
        required: ['ref', 'text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_press',
      description: 'Press a keyboard key or key combination',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Key to press (e.g., "Enter", "Escape", "Tab", "Ctrl+C")',
          },
        },
        required: ['key'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_submit',
      description: 'Submit a form by clicking its submit button',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The element reference ID of the submit button',
          },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_scroll',
      description: 'Scroll the page up or down',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down'],
            description: 'The direction to scroll',
          },
          amount: {
            type: 'number',
            description: 'The amount to scroll in pixels (default: 500)',
          },
        },
        required: ['direction'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_wait',
      description: 'Wait for a specified duration (use sparingly, prefer waiting for specific conditions)',
      parameters: {
        type: 'object',
        properties: {
          ms: {
            type: 'number',
            description: 'Milliseconds to wait (max: 5000)',
          },
        },
        required: ['ms'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_get_snapshot',
      description: 'Get the current page snapshot with element references and text content',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_mark_complete',
      description: 'Mark the current step as completed. Call this when you have successfully achieved the success criteria for the step.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'Brief description of what was accomplished (e.g., "Email sent successfully", "Search results loaded")',
          },
        },
        required: ['message'],
      },
    },
  },
  // ============================================================================
  // PHASE 1: PROFILE MANAGEMENT TOOLS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_create_profile',
      description: 'Create a named persistent profile for session persistence (cookies, localStorage, etc.)',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Profile name (e.g., "gmail-profile", "web-agent-default")',
          },
          description: {
            type: 'string',
            description: 'Optional description of the profile purpose',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_list_profiles',
      description: 'List all saved persistent profiles with their names and running status',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_start_with_profile',
      description: 'Start a browser instance bound to a specific profileId (enables session persistence)',
      parameters: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: 'The profile ID to use',
          },
          mode: {
            type: 'string',
            enum: ['headed', 'headless'],
            description: 'headed = visible in VNC, headless = background',
          },
        },
        required: ['profileId', 'mode'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_check_profile',
      description: 'Check if a profile has a running instance',
      parameters: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: 'The profile ID to check',
          },
        },
        required: ['profileId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_get_profile',
      description: 'Get details about a specific profile by ID or name',
      parameters: {
        type: 'object',
        properties: {
          idOrName: {
            type: 'string',
            description: 'Profile ID or name',
          },
        },
        required: ['idOrName'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_stop_by_profile',
      description: 'Stop instance by profile ID (preserves profile data)',
      parameters: {
        type: 'object',
        properties: {
          profileId: {
            type: 'string',
            description: 'The profile ID',
          },
        },
        required: ['profileId'],
      },
    },
  },
  // ============================================================================
  // PHASE 2: MISSING ACTIONS (hover, focus, select)
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_hover',
      description: 'Hover over an element to reveal tooltips or menus',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The element reference ID from the snapshot',
          },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_focus',
      description: 'Focus an element (useful for inputs before typing)',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The element reference ID from the snapshot',
          },
        },
        required: ['ref'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_select',
      description: 'Select a dropdown option by value',
      parameters: {
        type: 'object',
        properties: {
          ref: {
            type: 'string',
            description: 'The select element reference ID from the snapshot',
          },
          value: {
            type: 'string',
            description: 'The option value to select',
          },
        },
        required: ['ref', 'value'],
      },
    },
  },
  // ============================================================================
  // PHASE 2: MISSING READ ENDPOINTS
  // ============================================================================
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_get_text',
      description: 'Extract full page text (token-efficient, ~800 tokens vs 10k for screenshot)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_screenshot',
      description: 'Take a screenshot of the current page',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_eval',
      description: 'Run JavaScript in the page context (e.g., document.cookie, localStorage.getItem())',
      parameters: {
        type: 'object',
        properties: {
          script: {
            type: 'string',
            description: 'JavaScript code to execute',
          },
        },
        required: ['script'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'pinchtab_find',
      description: 'Find elements by text or selector',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (text or CSS selector)',
          },
        },
        required: ['query'],
      },
    },
  },
];
