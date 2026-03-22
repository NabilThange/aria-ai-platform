/**
 * Workflow Tools for Orchestrator Agent
 * 
 * These tools allow the Orchestrator to discover and use pre-built workflows
 * instead of reasoning through repetitive tasks from scratch.
 */

export const workflowTools = [
  {
    type: 'function',
    function: {
      name: 'list_workflows',
      description: 'List all available pre-built workflows including their descriptions and required variables. Use this BEFORE creating manual steps to see if a workflow already exists for the task. Workflows are faster and more reliable than manual steps. You DO NOT need to call any other tool to understand the workflow; all necessary information is returned here.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'use_workflow',
      description: 'Include a workflow in the execution plan. The workflow will be executed by OrchestrationService as a workflow step. Use this instead of creating manual web/desktop steps when a matching workflow exists.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Workflow name (e.g., "google-search")',
          },
          variables: {
            type: 'object',
            description: 'Variables as key-value pairs matching the workflow schema. Check read_workflow to see required variables.',
          },
        },
        required: ['name', 'variables'],
      },
    },
  },
];
