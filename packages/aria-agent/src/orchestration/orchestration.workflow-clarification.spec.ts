import { OrchestrationService } from './orchestration.service';
import { TaskStatus } from '@prisma/client';

describe('OrchestrationService workflow clarification handling', () => {
  it('pauses before approval when orchestrator needs workflow clarification', async () => {
    const clarifier = {
      run: jest.fn().mockResolvedValue({
        data: {
          original_input: 'Find coffee shops in Mumbai and email the spreadsheet',
          clarified_goal: 'Find coffee shops in Mumbai and email the spreadsheet',
          constraints: [],
          assumptions: [],
          task_type: 'mixed',
          questions_asked: 0,
        },
      }),
    };

    const orchestrator = {
      plan: jest.fn().mockResolvedValue({
        kind: 'needs_clarification',
        clarification: {
          original_input: 'Find coffee shops in Mumbai and email the spreadsheet',
          clarified_goal: 'REQUIRES_USER_CLARIFICATION',
          constraints: [],
          assumptions: [],
          task_type: 'mixed',
          questions_asked: 1,
          question: {
            id: 'workflow_missing_vars',
            question: 'What email address should I use?',
            type: 'text',
            required: true,
          },
        },
        workflow_context: {
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            maxResults: 20,
          },
          missing_vars: ['recipientEmail'],
        },
      }),
    };

    const sharedState = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const tasksService = {
      update: jest.fn().mockResolvedValue(undefined),
      takeOver: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ status: TaskStatus.RUNNING }),
    };

    const service = new OrchestrationService(
      clarifier as any,
      orchestrator as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      sharedState as any,
      eventEmitter as any,
      {} as any,
      {} as any,
      { logUserRequest: jest.fn() } as any,
      tasksService as any,
      {} as any,
    );

    await service.run(
      'Find coffee shops in Mumbai and email the spreadsheet',
      'task-1',
    );

    expect(orchestrator.plan).toHaveBeenCalled();
    expect(sharedState.set).toHaveBeenCalledWith(
      'task-1',
      'status',
      'needs_clarification',
    );
    expect(tasksService.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.NEEDS_HELP,
    });
    expect(tasksService.takeOver).toHaveBeenCalledWith('task-1');
  });

  it('waits for approval instead of auto-approving a simple workflow plan', async () => {
    const clarifier = {
      run: jest.fn().mockResolvedValue({
        data: {
          original_input:
            'Find coffee shops in Mumbai and email the spreadsheet to thangenabil@gmail.com',
          clarified_goal:
            'Find coffee shops in Mumbai and email the spreadsheet to thangenabil@gmail.com',
          constraints: [],
          assumptions: [],
          task_type: 'mixed',
          questions_asked: 0,
        },
      }),
    };

    const orchestrator = {
      plan: jest.fn().mockResolvedValue({
        kind: 'plan',
        plan: {
          steps: [
            {
              id: 'step_1',
              type: 'workflow',
              description: 'Run the freelancer research email workflow',
              success_criteria: 'Spreadsheet emailed successfully',
              workflow_name: 'freelancer-research-email',
              workflow_vars: {
                businessType: 'coffee shops',
                city: 'Mumbai',
                recipientEmail: 'thangenabil@gmail.com',
                maxResults: 20,
              },
              display_steps: [
                {
                  id: 'research-businesses',
                  title: 'Research businesses',
                  description: 'Search for matching businesses.',
                },
              ],
            },
          ],
          estimated_duration_minutes: 5,
          complexity: 'simple',
        },
      }),
    };

    const sharedState = {
      get: jest.fn().mockResolvedValue([]),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const tasksService = {
      update: jest.fn().mockResolvedValue(undefined),
      takeOver: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ status: TaskStatus.RUNNING }),
    };

    const workflowService = {
      runWorkflow: jest.fn(),
    };

    const service = new OrchestrationService(
      clarifier as any,
      orchestrator as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      workflowService as any,
      {} as any,
      sharedState as any,
      eventEmitter as any,
      {} as any,
      {} as any,
      { logUserRequest: jest.fn() } as any,
      tasksService as any,
      {} as any,
    );

    await service.run(
      'Find coffee shops in Mumbai and email the spreadsheet to thangenabil@gmail.com',
      'task-1',
    );

    expect(sharedState.set).toHaveBeenCalledWith(
      'task-1',
      'status',
      'awaiting_plan_approval',
    );
    expect(tasksService.update).toHaveBeenCalledWith('task-1', {
      status: TaskStatus.NEEDS_HELP,
    });
    expect(workflowService.runWorkflow).not.toHaveBeenCalled();
  });

  it('rejects approval when edited workflow vars are missing required values', async () => {
    const sharedState = {
      get: jest.fn().mockResolvedValue('awaiting_plan_approval'),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const tasksService = {
      update: jest.fn().mockResolvedValue(undefined),
      takeOver: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ status: TaskStatus.NEEDS_HELP }),
    };

    const workflowService = {
      readWorkflow: jest.fn().mockResolvedValue({
        name: 'freelancer-research-email',
        description: 'Research businesses and email a spreadsheet',
        version: '1.0.0',
        timeout_ms: 30000,
        variables: [
          { name: 'businessType', type: 'string', required: true, description: 'Business type' },
          { name: 'city', type: 'string', required: true, description: 'City' },
          { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email' },
          { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
        ],
        user_steps: [
          {
            id: 'research-businesses',
            title: 'Research businesses',
            description: 'Search for matching businesses.',
            titleTemplate: 'Research {businessType}',
            descriptionTemplate: 'Search for {businessType} in {city}',
          },
          {
            id: 'send-email',
            title: 'Send email',
            description: 'Deliver the spreadsheet.',
            titleTemplate: 'Send to {recipientEmail}',
            descriptionTemplate: 'Email the spreadsheet to {recipientEmail}',
          },
        ],
      }),
    };

    const service = new OrchestrationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      sharedState as any,
      eventEmitter as any,
      {} as any,
      workflowService as any,
      { logUserRequest: jest.fn() } as any,
      tasksService as any,
      {} as any,
    );

    await expect(
      service.approvePlan('task-1', [
        {
          id: 'step_1',
          type: 'workflow',
          description: 'Run freelancer-research-email workflow',
          success_criteria: 'Spreadsheet emailed',
          workflow_name: 'freelancer-research-email',
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
          },
        },
      ]),
    ).rejects.toThrow('recipientEmail');

    expect(sharedState.set).not.toHaveBeenCalledWith('task-1', 'status', 'running');
    expect(tasksService.update).not.toHaveBeenCalledWith('task-1', {
      status: TaskStatus.RUNNING,
    });
  });

  it('applies defaults and executes workflow plans using edited workflow vars', async () => {
    const sharedState = {
      get: jest
        .fn()
        .mockResolvedValueOnce('awaiting_plan_approval')
        .mockResolvedValue(undefined),
      appendToArray: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const eventEmitter = {
      on: jest.fn(),
      emit: jest.fn(),
    };

    const tasksService = {
      update: jest.fn().mockResolvedValue(undefined),
      takeOver: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue({ status: TaskStatus.NEEDS_HELP }),
    };

    const workflowAgent = {
      run: jest.fn().mockResolvedValue({
        success: true,
        data: {
          message: 'Workflow finished',
          deliveredTo: 'edited@example.com',
        },
      }),
    };

    const workflowService = {
      readWorkflow: jest.fn().mockResolvedValue({
        name: 'freelancer-research-email',
        description: 'Research businesses and email a spreadsheet',
        version: '1.0.0',
        timeout_ms: 30000,
        variables: [
          { name: 'businessType', type: 'string', required: true, description: 'Business type' },
          { name: 'city', type: 'string', required: true, description: 'City' },
          { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email' },
          { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
        ],
        user_steps: [
          {
            id: 'research-businesses',
            title: 'Research businesses',
            description: 'Search for matching businesses.',
            titleTemplate: 'Research {businessType}',
            descriptionTemplate: 'Search for {businessType} in {city}',
          },
          {
            id: 'send-email',
            title: 'Send email',
            description: 'Deliver the spreadsheet.',
            titleTemplate: 'Send to {recipientEmail}',
            descriptionTemplate: 'Email the spreadsheet to {recipientEmail}',
          },
        ],
      }),
    };

    const verifier = {
      check: jest.fn().mockResolvedValue({
        action_succeeded: true,
      }),
    };

    const reporter = {
      summarize: jest.fn().mockResolvedValue({
        success: true,
      }),
    };

    const service = new OrchestrationService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      workflowAgent as any,
      verifier as any,
      {} as any,
      reporter as any,
      sharedState as any,
      eventEmitter as any,
      { cleanupTask: jest.fn().mockResolvedValue(undefined) } as any,
      workflowService as any,
      { logUserRequest: jest.fn() } as any,
      tasksService as any,
      { createAgentActionMessage: jest.fn() } as any,
    );

    await service.approvePlan('task-1', [
      {
        id: 'step_1',
        type: 'workflow',
        description: 'Old description',
        success_criteria: 'Spreadsheet emailed',
        workflow_name: 'freelancer-research-email',
        workflow_vars: {
          businessType: 'coffee shops',
          city: 'Mumbai',
          recipientEmail: 'edited@example.com',
        },
      },
    ]);

    expect(workflowAgent.run).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow_vars: {
          businessType: 'coffee shops',
          city: 'Mumbai',
          recipientEmail: 'edited@example.com',
          maxResults: 20,
        },
      }),
      'task-1',
    );
    expect(sharedState.set).toHaveBeenCalledWith(
      'task-1',
      'execution_plan',
      [
        expect.objectContaining({
          workflow_vars: {
            businessType: 'coffee shops',
            city: 'Mumbai',
            recipientEmail: 'edited@example.com',
            maxResults: 20,
          },
          workflow_var_definitions: [
            { name: 'businessType', type: 'string', required: true, description: 'Business type' },
            { name: 'city', type: 'string', required: true, description: 'City' },
            { name: 'recipientEmail', type: 'string', required: true, description: 'Recipient email' },
            { name: 'maxResults', type: 'number', required: false, description: 'Maximum results', default: 20 },
          ],
          display_steps: [
            {
              id: 'research-businesses',
              title: 'Research coffee shops',
              description: 'Search for coffee shops in Mumbai',
              titleTemplate: 'Research {businessType}',
              descriptionTemplate: 'Search for {businessType} in {city}',
            },
            {
              id: 'send-email',
              title: 'Send to edited@example.com',
              description: 'Email the spreadsheet to edited@example.com',
              titleTemplate: 'Send to {recipientEmail}',
              descriptionTemplate: 'Email the spreadsheet to {recipientEmail}',
            },
          ],
        }),
      ],
    );
    expect(verifier.check).toHaveBeenCalled();
    expect(reporter.summarize).toHaveBeenCalledWith('task-1');
  });
});
