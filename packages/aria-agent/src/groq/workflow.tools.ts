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
      description: 'List all available pre-built workflows with SHORT descriptions (name + 1-line summary). Returns compressed list to save tokens. Use read_workflow(name) to get full details (variables, timeout, etc) for a specific workflow. Call this FIRST to see what workflows exist, then call read_workflow for details on the one you want to use.',
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
      name: 'read_workflow',
      description: 'Get FULL details for a specific workflow including required variables, types, defaults, timeout, and version. Call this AFTER list_workflows to get complete information about a workflow before using it.',
      parameters: {
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
