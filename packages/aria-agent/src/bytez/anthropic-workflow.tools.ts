/**
 * Anthropic-format workflow tools for Orchestrator
 * Uses input_schema instead of parameters (Anthropic native format)
 */

export const anthropicWorkflowTools = [
  {
    name: 'list_workflows',
    description: 'List all available pre-built workflows with SHORT descriptions (name + 1-line summary). Returns compressed list to save tokens. Use read_workflow(name) to get full details (variables, timeout, etc) for a specific workflow. Call this FIRST to see what workflows exist, then call read_workflow for details on the one you want to use.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'read_workflow',
    description: 'Get FULL details for a specific workflow including required variables, types, defaults, timeout, and version. Call this AFTER list_workflows to get complete information about a workflow before using it.',
    input_schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Workflow name from list_workflows (e.g., "google-search", "email-doc-deep-research")',
        },
      },
      required: ['name'],
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
