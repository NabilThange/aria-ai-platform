import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(() => {
    service = new WorkflowService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );

    (service as any)._workflowsLoaded = true;
    (service as any).workflowCache = new Map([
      [
        'workflow-with-summary',
        {
          metadata: {
            name: 'workflow-with-summary',
            description: 'Long detailed description',
            summary: 'Compact summary',
            version: '1.0.0',
            timeout_ms: 1000,
            variables: [],
            user_steps: [{ id: 'one', title: 'One', description: 'First step' }],
          },
          execute: jest.fn(),
        },
      ],
      [
        'google-search',
        {
          metadata: {
            name: 'google-search',
            description: 'Search DuckDuckGo for a query and return results',
            version: '1.0.0',
            timeout_ms: 1000,
            variables: [],
          },
          execute: jest.fn(),
        },
      ],
    ]);
  });

  it('returns workflow summaries in the compact workflow list', async () => {
    const workflows = await service.listWorkflows();

    expect(workflows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'workflow-with-summary',
          description: 'Compact summary',
        }),
        expect.objectContaining({
          name: 'google-search',
          description: 'Quick DuckDuckGo search (CAPTCHA-free)',
        }),
      ]),
    );
  });

  it('returns full workflow metadata including user steps', async () => {
    const workflow = await service.readWorkflow('workflow-with-summary');

    expect(workflow.summary).toBe('Compact summary');
    expect(workflow.user_steps).toEqual([
      { id: 'one', title: 'One', description: 'First step' },
    ]);
  });
});
