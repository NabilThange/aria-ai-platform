/**
 * Anthropic-format workflow tools for Orchestrator
 * Uses input_schema instead of parameters (Anthropic native format)
 */

export const anthropicWorkflowTools = [
  {
    name: 'list_workflows',
    description: 'List all available pre-built workflows. Use this to discover what workflows exist before planning.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_workflow',
    description: 'Read the full definition of a specific workflow by name. Use this to understand what a workflow does and what variables it needs.',
    input_schema: {
      type: 'object',
      properties: {
        workflow_name: {
          type: 'string',
          description: 'The name of the workflow to read (e.g., "google-search", "take-screenshot")',
        },
      },
      required: ['workflow_name'],
    },
  },
  {
    name: 'use_workflow',
    description: 'Include a workflow in the execution plan. This creates a step that will execute the workflow with the provided variables.',
    input_schema: {
      type: 'object',
      properties: {
        workflow_name: {
          type: 'string',
          description: 'The name of the workflow to use',
        },
        variables: {
          type: 'object',
          description: 'Key-value pairs for workflow variables (e.g., {"query": "AI agents", "max_results": 5})',
        },
        description: {
          type: 'string',
          description: 'Brief description of what this workflow step will accomplish in the context of the task',
        },
      },
      required: ['workflow_name', 'variables', 'description'],
    },
  },
];
