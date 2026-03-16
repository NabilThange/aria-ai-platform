import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrchestrationService } from './orchestration.service';
import { SharedStateService } from '../shared-state/shared-state.service';

describe('OrchestrationService - Integration Tests', () => {
  let service: OrchestrationService;
  let sharedState: SharedStateService;
  let eventEmitter: EventEmitter2;
  let emittedEvents: any[];

  beforeEach(async () => {
    emittedEvents = [];

    // Mock SharedStateService
    const mockSharedState = {
      get: jest.fn(),
      set: jest.fn(),
      appendToArray: jest.fn(),
    };

    // Mock EventEmitter2
    const mockEventEmitter = {
      emit: jest.fn((event: string, payload: any) => {
        emittedEvents.push({ event, payload });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestrationService,
        {
          provide: SharedStateService,
          useValue: mockSharedState,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<OrchestrationService>(OrchestrationService);
    sharedState = module.get<SharedStateService>(SharedStateService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Lifecycle Hooks', () => {
    it('should call onStart lifecycle hook', async () => {
      const taskId = 'test-task-1';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      // Verify onStart was called
      expect(sharedState.set).toHaveBeenCalledWith(taskId, 'status', 'running');
      expect(sharedState.set).toHaveBeenCalledWith(
        taskId,
        'start_time',
        expect.any(String),
      );


      // Verify lifecycle event was emitted
      const startEvent = emittedEvents.find(e => e.event === 'task.lifecycle.start');
      expect(startEvent).toBeDefined();
      expect(startEvent.payload.taskId).toBe(taskId);
    });

    it('should call onComplete lifecycle hook on success', async () => {
      const taskId = 'test-task-2';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      // Verify onComplete was called
      expect(sharedState.set).toHaveBeenCalledWith(taskId, 'status', 'completed');
      expect(sharedState.set).toHaveBeenCalledWith(
        taskId,
        'end_time',
        expect.any(String),
      );

      // Verify lifecycle event was emitted
      const completeEvent = emittedEvents.find(e => e.event === 'task.lifecycle.complete');
      expect(completeEvent).toBeDefined();
      expect(completeEvent.payload.taskId).toBe(taskId);
    });

    it('should call onFail lifecycle hook on error', async () => {
      const taskId = 'test-task-3';
      const userInput = 'Test task';
      const testError = new Error('Test error');

      // Mock sharedState.set to throw error during execution
      (sharedState.set as jest.Mock).mockImplementationOnce(() => {
        throw testError;
      });

      await expect(service.run(userInput, taskId)).rejects.toThrow('Test error');

      // Verify onFail was called
      const failEvent = emittedEvents.find(e => e.event === 'task.lifecycle.fail');
      expect(failEvent).toBeDefined();
      expect(failEvent.payload.taskId).toBe(taskId);
      expect(failEvent.payload.error).toBe('Test error');
    });
  });

  describe('Agent Status Events', () => {
    it('should emit status events during execution', async () => {
      const taskId = 'test-task-4';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      // Verify status events were emitted
      const statusEvents = emittedEvents.filter(e => e.event === 'task.status');
      expect(statusEvents.length).toBeGreaterThan(0);

      // Check for expected status transitions
      const statuses = statusEvents.map(e => e.payload.status);
      expect(statuses).toContain('clarifying');
      expect(statuses).toContain('planning');
      expect(statuses).toContain('reporting');
      expect(statuses).toContain('completed');
    });


    it('should include activeAgent in status events', async () => {
      const taskId = 'test-task-5';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      const statusEvents = emittedEvents.filter(e => e.event === 'task.status');
      
      // Check that some events have activeAgent set
      const clarifyingEvent = statusEvents.find(e => e.payload.status === 'clarifying');
      expect(clarifyingEvent.payload.activeAgent).toBe('CLARIFIER');

      const planningEvent = statusEvents.find(e => e.payload.status === 'planning');
      expect(planningEvent.payload.activeAgent).toBe('ORCHESTRATOR');
    });
  });

  describe('Shared State Integration', () => {
    it('should write task_goal to shared state', async () => {
      const taskId = 'test-task-6';
      const userInput = 'Test task input';

      await service.run(userInput, taskId);

      expect(sharedState.set).toHaveBeenCalledWith(taskId, 'task_goal', userInput);
    });

    it('should write execution_plan to shared state', async () => {
      const taskId = 'test-task-7';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      expect(sharedState.set).toHaveBeenCalledWith(
        taskId,
        'execution_plan',
        expect.any(Array),
      );
    });

    it('should track task status throughout execution', async () => {
      const taskId = 'test-task-8';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      // Verify status transitions
      const setStatusCalls = (sharedState.set as jest.Mock).mock.calls.filter(
        call => call[1] === 'status',
      );

      expect(setStatusCalls.length).toBeGreaterThanOrEqual(2);
      expect(setStatusCalls[0][2]).toBe('running'); // onStart
      expect(setStatusCalls[setStatusCalls.length - 1][2]).toBe('completed'); // onComplete
    });
  });

  describe('Sequential Execution', () => {
    it('should execute pipeline steps in order', async () => {
      const taskId = 'test-task-9';
      const userInput = 'Test task';

      await service.run(userInput, taskId);

      // Verify order of status events
      const statusEvents = emittedEvents.filter(e => e.event === 'task.status');
      const statuses = statusEvents.map(e => e.payload.status);

      const clarifyingIndex = statuses.indexOf('clarifying');
      const planningIndex = statuses.indexOf('planning');
      const reportingIndex = statuses.indexOf('reporting');
      const completedIndex = statuses.indexOf('completed');

      // Verify sequential order
      expect(clarifyingIndex).toBeLessThan(planningIndex);
      expect(planningIndex).toBeLessThan(reportingIndex);
      expect(reportingIndex).toBeLessThan(completedIndex);
    });
  });
});
