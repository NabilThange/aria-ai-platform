/**
 * Perception JSON Schema
 * Used with Groq Llama 4 Scout (vision model)
 * Section 9.4 of architecture document
 */

export const PERCEPTION_SCHEMA = {
  type: 'object',
  properties: {
    active_window: {
      type: 'string',
      description: 'Name of the currently active window/application',
    },
    ui_state: {
      type: 'string',
      description: 'Description of current UI state and what is visible',
    },
    clickable_elements: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of clickable UI elements visible on screen',
    },
    errors_visible: {
      type: 'boolean',
      description: 'Are any error messages or dialogs visible?',
    },
    task_relevant_info: {
      type: 'string',
      description: 'Any information on screen relevant to the current task',
    },
  },
  required: [
    'active_window',
    'ui_state',
    'clickable_elements',
    'errors_visible',
    'task_relevant_info',
  ],
  additionalProperties: false,
} as const;

export interface PerceptionResult {
  active_window: string;
  ui_state: string;
  clickable_elements: string[];
  errors_visible: boolean;
  task_relevant_info: string;
}
