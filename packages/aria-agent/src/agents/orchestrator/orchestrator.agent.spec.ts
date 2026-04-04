import { OrchestratorAgent } from './orchestrator.agent';
import { ExecutionPlan } from './orchestrator.types';
import { ClarifiedTask } from '../clarifier/clarifier.types';

describe('OrchestratorAgent workflow display enrichment', () => {
  let agent: OrchestratorAgent;
  let sharedState: { set: jest.Mock; get: jest.Mock; appendToArray: jest.Mock };
  let workflowService: { readWorkflow: jest.Mock; listWorkflows: jest.Mock };
  let messagesService: { createAgentActionMessage: jest.Mock; create: jest.Mock };
  let browserLogger: { logAgentStart: jest.Mock; logAgentResponse: jest.Mock };
  let agentsService: { getAgentModel: jest.Mock };

  beforeEach(() => {
    sharedState = {
      set: jest.fn(),
      get: jest.fn(),
      appendToArray: jest.fn(),
    };

    workflowService = {
      readWorkflow: jest.fn(),
      listWorkflows: jest.fn(),
    };

    messagesService = {
      createAgentActionMessage: jest.fn(),
      create: jest.fn(),
    };

    browserLogger = {
      logAgentStart: jest.fn(),
      logAgentResponse: jest.fn(),
    };

    agentsService = {
      getAgentModel: jest.fn().mockReturnValue(null),
    };

    agent = new OrchestratorAgent(
      sharedState as any,
      { generateMessage: jest.fn() } as any,
      { generateMessage: jest.fn() } as any,
      { generateMessage: jest.fn() } as any,
      { generateMessage: jest.fn() } as any,
      messagesService as any,
      agentsService as any,
      browserLogger as any,
      workflowService as any,
    );
  });

  it('attaches metadata-defined display steps to workflow plan steps', async () => {
    workflowService.readWorkflow.mockResolvedValue({
      name: 'google-search',
      description: 'Search DuckDuckGo for a query and return results',
      summary: 'Run a search and return summarized results',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [],
      user_steps: [
        { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
        { id: 'search', title: 'Search', description: 'Run the search workflow in the browser.' },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Use google-search workflow',
          success_criteria: 'Search results are available',
          workflow_name: 'google-search',
          workflow_vars: { query: 'AI agents' },
        },
      ],
      estimated_duration_minutes: 1,
      complexity: 'simple',
    };

    const enriched = await (agent as any).enrichPlanWithWorkflowDisplaySteps(plan);

    expect(enriched.steps[0].display_steps).toEqual([
      { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
      { id: 'search', title: 'Search', description: 'Run the search workflow in the browser.' },
    ]);
    expect(enriched.steps[0].workflow_var_definitions).toEqual([]);
    expect(enriched.steps[0].description).toBe(
      'Run google-search workflow with query "AI agents".'
    );
  });

  it('attaches editable workflow var definitions and a generated summary for workflow steps', async () => {
    workflowService.readWorkflow.mockResolvedValue({
      name: 'freelancer-research-email',
      description: 'Research local businesses on Perplexity, generate Excel file via OpenCode, and email it',
      summary: 'Research local businesses and email the spreadsheet',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'businessType', type: 'string', required: true, description: 'Business type' },
        { name: 'city', type: 'string', required: true, description: 'City' },
        { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
      ],
      user_steps: [
        { id: 'research', title: 'Research businesses', description: 'Search for matching businesses.' },
        { id: 'email', title: 'Send email', description: 'Deliver the spreadsheet.' },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Use freelancer workflow',
          success_criteria: 'The output is delivered',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            recipientEmail: 'user@example.com',
            maxResults: 20,
          },
        },
      ],
      estimated_duration_minutes: 2,
      complexity: 'simple',
    };

    const enriched = await (agent as any).enrichPlanWithWorkflowDisplaySteps(plan);

    expect(enriched.steps[0].display_steps).toEqual([
      { id: 'research', title: 'Research businesses', description: 'Search for matching businesses.' },
      { id: 'email', title: 'Send email', description: 'Deliver the spreadsheet.' },
    ]);
    expect(enriched.steps[0].workflow_var_definitions).toEqual([
      { name: 'businessType', type: 'string', required: true, description: 'Business type' },
      { name: 'city', type: 'string', required: true, description: 'City' },
      { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
      { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
    ]);
    expect(enriched.steps[0].description).toBe(
      'Run freelancer-research-email workflow with businessType "coffee shops", city "Mumbai", recipientEmail "user@example.com", and maxResults 20.'
    );
  });

  it('persists the enriched workflow plan before saving the plan message', async () => {
    workflowService.readWorkflow.mockResolvedValue({
      name: 'google-search',
      description: 'Search DuckDuckGo for a query and return results',
      summary: 'Run a search and return summarized results',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [],
      user_steps: [
        { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
      ],
    });

    jest.spyOn(agent as any, 'callModelService').mockResolvedValue({
      contentBlocks: [
        {
          type: 'text',
          text: JSON.stringify({
            steps: [
              {
                id: 'step_1',
                type: 'workflow',
                description: 'Use google-search workflow',
                success_criteria: 'Search results are available',
                workflow_name: 'google-search',
                workflow_vars: { query: 'AI agents' },
              },
            ],
            estimated_duration_minutes: 1,
            complexity: 'simple',
          }),
        },
      ],
      tokenUsage: { totalTokens: 12 },
    });

    const clarifiedTask = {
      clarified_goal: 'Search for AI agents',
      task_type: 'web',
      constraints: [],
      assumptions: [],
    };

    const result = await agent.run(clarifiedTask, 'task-1');

    expect(result.success).toBe(true);
    expect(sharedState.set).toHaveBeenCalledWith(
      'task-1',
      'execution_plan',
      expect.objectContaining({
        steps: [
          expect.objectContaining({
            type: 'workflow',
            workflow_name: 'google-search',
            display_steps: [
              { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
            ],
          }),
        ],
      }),
    );
    expect(messagesService.createAgentActionMessage).toHaveBeenCalledWith(
      'task-1',
      'ORCHESTRATOR',
      'plan',
      {
        plan: {
          steps: [
            expect.objectContaining({
              workflow_name: 'google-search',
              display_steps: [
                { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
              ],
            }),
          ],
        },
      },
    );
  });

  it('normalizes non-canonical workflow intent into a workflow step using selected workflow context', () => {
    const response = {
      contentBlocks: [
        {
          type: 'text',
          text: JSON.stringify({
            steps: [
              {
                id: 'step_1',
                tool: 'use_workflow',
                name: 'google-search',
                variables: { query: 'AI agents' },
                description: 'Use the selected workflow to search for AI agents',
                success_criteria: 'Workflow completes successfully',
              },
            ],
            estimated_duration_minutes: 1,
            complexity: 'simple',
          }),
        },
      ],
    };

    const parsed = (agent as any).parseExecutionPlan(response, {
      workflow_name: 'google-search',
      workflow_vars: { query: 'AI agents' },
    });

    expect(parsed.steps).toEqual([
      expect.objectContaining({
        id: 'step_1',
        type: 'workflow',
        workflow_name: 'google-search',
        workflow_vars: { query: 'AI agents' },
      }),
    ]);
  });

  it('normalizes workflow intent when the final plan uses parameters.name and parameters.variables', () => {
    const response = {
      contentBlocks: [
        {
          type: 'text',
          text: JSON.stringify({
            plan: [
              {
                step: 1,
                tool: 'use_workflow',
                description:
                  'Execute the freelancer-research-email workflow to research 20 coffee shops in Mumbai, generate the Excel file, and email it to the specified recipient.',
                success_criteria: 'Excel file is generated and emailed',
                parameters: {
                  name: 'freelancer-research-email',
                  variables: {
                    businessType: 'coffee shops',
                    city: 'Mumbai',
                    recipientEmail: 'thangenabil@gmail.com',
                    maxResults: 20,
                  },
                },
              },
            ],
            estimated_duration_minutes: 5,
            complexity: 'simple',
          }),
        },
      ],
    };

    const parsed = (agent as any).parseExecutionPlan(response);

    expect(parsed.steps).toEqual([
      expect.objectContaining({
        id: 1,
        type: 'workflow',
        workflow_name: 'freelancer-research-email',
        workflow_vars: {
          businessType: 'coffee shops',
          city: 'Mumbai',
          recipientEmail: 'thangenabil@gmail.com',
          maxResults: 20,
        },
      }),
    ]);
  });

  it('returns clarification-needed when a selected workflow is missing required variables before approval', async () => {
    workflowService.readWorkflow.mockResolvedValue({
      name: 'freelancer-research-email',
      description: 'Research businesses and email an Excel file',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'businessType', type: 'string', required: true, description: 'Type of business to research' },
        { name: 'city', type: 'string', required: true, description: 'City to research in' },
        { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
      ],
      user_steps: [
        { id: 'research', title: 'Research', description: 'Research businesses' },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Research coffee shops and email the spreadsheet',
          success_criteria: 'Spreadsheet is ready to send',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
          },
        },
      ],
      estimated_duration_minutes: 3,
      complexity: 'simple',
    };

    const clarifiedTask: ClarifiedTask = {
      original_input: 'Find 20 coffee shops in Mumbai and email it to me',
      clarified_goal: 'Find 20 coffee shops in Mumbai and email the spreadsheet to the user',
      constraints: [],
      assumptions: [],
      task_type: 'mixed',
      questions_asked: 0,
    };

    const result = await (agent as any).validateWorkflowPlan(plan, clarifiedTask, 'task-1');

    expect(result.kind).toBe('needs_clarification');
    expect(result.workflow_context).toEqual({
      workflow_name: 'freelancer-research-email',
      workflow_vars: {
        businessType: 'coffee shops',
        city: 'Mumbai',
        maxResults: 20,
      },
      missing_vars: ['recipientEmail'],
    });
    expect(result.clarification).toEqual(
      expect.objectContaining({
        clarified_goal: 'REQUIRES_USER_CLARIFICATION',
        questions_asked: 1,
        question: expect.objectContaining({
          id: 'workflow_missing_vars',
        }),
      }),
    );
  });

  it('returns clarification-needed when a workflow does not exist', async () => {
    workflowService.readWorkflow.mockRejectedValue(
      new Error('Workflow "missing-workflow" not found or invalid'),
    );

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Use a missing workflow',
          success_criteria: 'Workflow exists',
          workflow_name: 'missing-workflow',
          workflow_vars: {},
        },
      ],
      estimated_duration_minutes: 1,
      complexity: 'simple',
    };

    const clarifiedTask: ClarifiedTask = {
      original_input: 'Do the thing with the missing workflow',
      clarified_goal: 'Do the thing with the missing workflow',
      constraints: [],
      assumptions: [],
      task_type: 'mixed',
      questions_asked: 0,
    };

    const result = await (agent as any).validateWorkflowPlan(plan, clarifiedTask, 'task-1');

    expect(result.kind).toBe('needs_clarification');
    expect(result.workflow_context.workflow_name).toBe('missing-workflow');
    expect(result.clarification.question?.question).toContain('missing-workflow');
  });

  it('returns clarification-needed when a workflow variable has the wrong type', async () => {
    workflowService.readWorkflow.mockResolvedValue({
      name: 'freelancer-research-email',
      description: 'Research businesses and email an Excel file',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'businessType', type: 'string', required: true, description: 'Type of business to research' },
        { name: 'city', type: 'string', required: true, description: 'City to research in' },
        { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Research coffee shops and email the spreadsheet',
          success_criteria: 'Spreadsheet is ready to send',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            recipientEmail: 'test@example.com',
            maxResults: '20',
          } as any,
        },
      ],
      estimated_duration_minutes: 3,
      complexity: 'simple',
    };

    const clarifiedTask: ClarifiedTask = {
      original_input: 'Find coffee shops in Mumbai and email it to test@example.com',
      clarified_goal: 'Find coffee shops in Mumbai and email the spreadsheet to test@example.com',
      constraints: [],
      assumptions: [],
      task_type: 'mixed',
      questions_asked: 0,
    };

    const result = await (agent as any).validateWorkflowPlan(plan, clarifiedTask, 'task-1');

    expect(result.kind).toBe('needs_clarification');
    expect(result.clarification.question?.question).toContain('maxResults');
    expect(result.clarification.question?.question).toContain('number');
  });

  it('preserves clarified workflow vars when a regenerated plan step includes empty values', async () => {
    sharedState.get.mockImplementation(async (_taskId: string, key: string) => {
      if (key === 'workflow_selection_context') {
        return {
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            recipientEmail: 'saved@example.com',
          },
          missing_vars: ['recipientEmail'],
        };
      }

      return null;
    });

    workflowService.readWorkflow.mockResolvedValue({
      name: 'freelancer-research-email',
      description: 'Research businesses and email an Excel file',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'businessType', type: 'string', required: true, description: 'Type of business to research' },
        { name: 'city', type: 'string', required: true, description: 'City to research in' },
        { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Research coffee shops and email the spreadsheet',
          success_criteria: 'Spreadsheet is ready to send',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            recipientEmail: undefined,
          } as any,
        },
      ],
      estimated_duration_minutes: 3,
      complexity: 'simple',
    };

    const clarifiedTask: ClarifiedTask = {
      original_input: 'Find coffee shops in Mumbai and email it to saved@example.com',
      clarified_goal: 'Find coffee shops in Mumbai and email the spreadsheet to saved@example.com',
      constraints: [],
      assumptions: [],
      task_type: 'mixed',
      questions_asked: 0,
    };

    const result = await (agent as any).validateWorkflowPlan(plan, clarifiedTask, 'task-1');

    expect(result.kind).toBe('plan');
    expect((result as any).plan.steps[0].workflow_vars).toEqual({
      businessType: 'coffee shops',
      city: 'Mumbai',
      recipientEmail: 'saved@example.com',
      maxResults: 20,
    });
    expect((result as any).plan.steps[0].description).toBe(
      'Run freelancer-research-email workflow with businessType "coffee shops", city "Mumbai", recipientEmail "saved@example.com", and maxResults 20.'
    );
  });

  it('reuses stored workflow context when a clarification reply only adds the remaining variables', async () => {
    sharedState.get.mockImplementation(async (_taskId: string, key: string) => {
      if (key === 'workflow_selection_context') {
        return {
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
          },
          missing_vars: ['recipientEmail'],
        };
      }

      return null;
    });

    workflowService.readWorkflow.mockResolvedValue({
      name: 'freelancer-research-email',
      description: 'Research businesses and email an Excel file',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'businessType', type: 'string', required: true, description: 'Type of business to research' },
        { name: 'city', type: 'string', required: true, description: 'City to research in' },
        { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email address' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
      ],
    });

    const plan: ExecutionPlan = {
      steps: [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Research coffee shops and email the spreadsheet',
          success_criteria: 'Spreadsheet is ready to send',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            recipientEmail: 'fresh@example.com',
          },
        },
      ],
      estimated_duration_minutes: 3,
      complexity: 'simple',
    };

    const clarifiedTask: ClarifiedTask = {
      original_input: 'Send it to fresh@example.com',
      clarified_goal: 'Use the same workflow and send the spreadsheet to fresh@example.com',
      constraints: [],
      assumptions: [],
      task_type: 'mixed',
      questions_asked: 1,
    };

    const result = await (agent as any).validateWorkflowPlan(plan, clarifiedTask, 'task-1');

    expect(result.kind).toBe('plan');
    expect((result as any).plan.steps[0].workflow_vars).toEqual({
      businessType: 'coffee shops',
      city: 'Mumbai',
      recipientEmail: 'fresh@example.com',
      maxResults: 20,
    });
  });

  it('keeps workflow selection context after saving a valid plan so follow-up replanning can reuse it', async () => {
    sharedState.get.mockImplementation(async (_taskId: string, key: string) => {
      if (key === 'workflow_selection_context') {
        return {
          workflow_name: 'google-search',
          workflow_vars: { query: 'AI agents' },
        };
      }

      return null;
    });

    workflowService.readWorkflow.mockResolvedValue({
      name: 'google-search',
      description: 'Search DuckDuckGo for a query and return results',
      summary: 'Run a search and return summarized results',
      version: '1.0.0',
      timeout_ms: 30000,
      variables: [
        { name: 'query', type: 'string', required: true, description: 'Search query' },
      ],
      user_steps: [
        { id: 'prepare', title: 'Prepare query', description: 'Validate and prepare the search query.' },
      ],
    });

    jest.spyOn(agent as any, 'callModelService').mockResolvedValue({
      contentBlocks: [
        {
          type: 'text',
          text: JSON.stringify({
            steps: [
              {
                id: 'step_1',
                type: 'workflow',
                description: 'Use google-search workflow',
                success_criteria: 'Search results are available',
                workflow_name: 'google-search',
                workflow_vars: { query: 'AI agents' },
              },
            ],
            estimated_duration_minutes: 1,
            complexity: 'simple',
          }),
        },
      ],
      tokenUsage: { totalTokens: 12 },
    });

    const clarifiedTask = {
      clarified_goal: 'Search for AI agents',
      task_type: 'web',
      constraints: [],
      assumptions: [],
    };

    const result = await agent.run(clarifiedTask, 'task-1');

    expect(result.success).toBe(true);
    expect(sharedState.set).not.toHaveBeenCalledWith(
      'task-1',
      'workflow_selection_context',
      null,
    );
  });

  it('adds a prompt hint to read workflows before using them and prefers freelancer workflow for lead-gen spreadsheet tasks', () => {
    const clarifiedTask: ClarifiedTask = {
      original_input:
        'Find 20 coffee shops in Mumbai, create an Excel file, and email it to thangenabil@gmail.com',
      clarified_goal:
        'Find 20 coffee shops in Mumbai, create an Excel file, and email it to thangenabil@gmail.com',
      constraints: ['20 coffee shops', 'Excel file', 'email delivery'],
      assumptions: [],
      task_type: 'desktop',
      questions_asked: 0,
    };

    const prompt = (agent as any).buildPlanningPrompt(clarifiedTask, null, true);

    expect(prompt).toContain('call read_workflow(name) before use_workflow(name)');
    expect(prompt).toContain('Do not invent workflow variable names');
    expect(prompt).toContain('Prefer freelancer-research-email');
  });

  it('persists important workflow discovery results as task messages so refresh can restore them', async () => {
    workflowService.listWorkflows.mockResolvedValue([
      {
        name: 'freelancer-research-email',
        description: 'Research local businesses and email an Excel file',
      },
    ]);

    await (agent as any).executeToolCall(
      {
        name: 'list_workflows',
        input: {},
      },
      'task-1',
    );

    expect(messagesService.create).toHaveBeenCalledWith({
      taskId: 'task-1',
      role: 'ASSISTANT',
      content: [
        expect.objectContaining({
          type: 'tool_result',
          tool_use_id: 'list_workflows',
        }),
      ],
    });
  });
});
