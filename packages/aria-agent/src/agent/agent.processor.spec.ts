import { Test, TestingModule } from '@nestjs/testing';
import { AgentProcessor } from './agent.processor';
import { TasksService } from '../tasks/tasks.service';
import { MessagesService } from '../messages/messages.service';
import { SummariesService } from '../summaries/summaries.service';
import { GroqService } from '../groq/groq.service';
import { BytezService } from '../bytez/bytez.service';
import { InputCaptureService } from './input-capture.service';
import { PinchTabService } from '../services/pinchtab.service';
import { ConfigService } from '@nestjs/config';
import { OrchestrationService } from '../orchestration/orchestration.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskStatus, Role, TaskType, TaskPriority } from '@prisma/client';

describe('AgentProcessor - Backward Compatibility', () => {
  let tasksService: jest.Mocked<TasksService>;
  let messagesService: jest.Mocked<MessagesService>;
  let summariesService: jest.Mocked<SummariesService>;
  let groqService: jest.Mocked<GroqService>;
  let bytezService: jest.Mocked<BytezService>;
  let orchestrationService: jest.Mocked<OrchestrationService>;

  const mockTask = {
    id: 'test-task-id',
    description: 'Test task',
    status: TaskStatus.PENDING,
    type: TaskType.IMMEDIATE,
    priority: TaskPriority.MEDIUM,
    control: Role.ASSISTANT,
    createdBy: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    model: {
      provider: 'groq',
      name: 'meta-llama/llama-3.3-70b-versatile',
      title: 'Llama 3.3 70B',
      contextWindow: 128000,
    },
  };

  const createTestModule = async (multiAgentEnabled: boolean) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentProcessor,
        {
          provide: TasksService,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: MessagesService,
          useValue: {
            findLatest: jest.fn(),
            findUnsummarized: jest.fn(),
            create: jest.fn(),
            attachSummary: jest.fn(),
          },
        },
        {
          provide: SummariesService,
          useValue: {
            findLatest: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: GroqService,
          useValue: {
            generateMessage: jest.fn(),
          },
        },
        {
          provide: BytezService,
          useValue: {
            generateMessage: jest.fn(),
          },
        },
        {
          provide: InputCaptureService,
          useValue: {
            start: jest.fn(),
            stop: jest.fn(),
          },
        },
        {
          provide: PinchTabService,
          useValue: {
            navigate: jest.fn(),
            snapshot: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(multiAgentEnabled ? 'true' : 'false'),
          },
        },
        {
          provide: OrchestrationService,
          useValue: {
            run: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
            on: jest.fn(),
          },
        },
      ],
    }).compile();

    tasksService = module.get(TasksService);
    messagesService = module.get(MessagesService);
    summariesService = module.get(SummariesService);
    groqService = module.get(GroqService);
    bytezService = module.get(BytezService);
    orchestrationService = module.get(OrchestrationService);

    return module.get<AgentProcessor>(AgentProcessor);
  };

  describe('Single-Agent Mode (ENABLE_MULTI_AGENT=false)', () => {
    it('should use legacy single-agent processing when feature flag is disabled', async () => {
      const processor = await createTestModule(false);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      summariesService.findLatest.mockResolvedValue(null);
      messagesService.findUnsummarized.mockResolvedValue([]);
      
      groqService.generateMessage.mockResolvedValue({
        contentBlocks: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'set_task_status',
            input: {
              status: 'completed',
              description: 'Task completed successfully',
            },
          },
        ],
        tokenUsage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      } as any);

      await processor.processTask('test-task-id');

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify orchestration service was NOT called
      expect(orchestrationService.run).not.toHaveBeenCalled();

      // Verify legacy single-agent flow was used
      expect(groqService.generateMessage).toHaveBeenCalled();
      expect(messagesService.create).toHaveBeenCalled();
    });

    it('should handle task completion in single-agent mode', async () => {
      const processor = await createTestModule(false);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      summariesService.findLatest.mockResolvedValue(null);
      messagesService.findUnsummarized.mockResolvedValue([]);
      
      groqService.generateMessage.mockResolvedValue({
        contentBlocks: [
          {
            type: 'tool_use',
            id: 'tool-1',
            name: 'set_task_status',
            input: {
              status: 'completed',
              description: 'Task completed',
            },
          },
        ],
        tokenUsage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      } as any);

      await processor.processTask('test-task-id');

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify task was marked as completed
      expect(tasksService.update).toHaveBeenCalledWith(
        'test-task-id',
        expect.objectContaining({
          status: TaskStatus.COMPLETED,
        }),
      );
    });

    it('should handle task failure in single-agent mode', async () => {
      const processor = await createTestModule(false);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      summariesService.findLatest.mockResolvedValue(null);
      messagesService.findUnsummarized.mockResolvedValue([]);
      
      groqService.generateMessage.mockRejectedValue(new Error('API Error'));

      await processor.processTask('test-task-id');

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify task was marked as failed
      expect(tasksService.update).toHaveBeenCalledWith(
        'test-task-id',
        expect.objectContaining({
          status: TaskStatus.FAILED,
        }),
      );
    });

    it('should support all legacy providers in single-agent mode', async () => {
      const providers = [
        { provider: 'groq', service: groqService },
        { provider: 'bytez', service: bytezService },
      ];

      for (const { provider, service } of providers) {
        const processor = await createTestModule(false);
        
        const taskWithProvider = {
          ...mockTask,
          model: {
            ...mockTask.model,
            provider,
          },
        };

        tasksService.findById.mockResolvedValue(taskWithProvider as any);
        tasksService.update.mockResolvedValue({ ...taskWithProvider, status: TaskStatus.RUNNING } as any);
        summariesService.findLatest.mockResolvedValue(null);
        messagesService.findUnsummarized.mockResolvedValue([]);
        
        service.generateMessage.mockResolvedValue({
          contentBlocks: [
            {
              type: 'tool_use',
              id: 'tool-1',
              name: 'set_task_status',
              input: {
                status: 'completed',
                description: 'Task completed',
              },
            },
          ],
          tokenUsage: {
            inputTokens: 100,
            outputTokens: 50,
            totalTokens: 150,
          },
        } as any);

        await processor.processTask('test-task-id');

        // Wait for async processing
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Verify the correct provider service was called
        expect(service.generateMessage).toHaveBeenCalled();

        // Reset mocks for next iteration
        jest.clearAllMocks();
      }
    });
  });

  describe('Multi-Agent Mode (ENABLE_MULTI_AGENT=true)', () => {
    it('should delegate to orchestration service when feature flag is enabled', async () => {
      const processor = await createTestModule(true);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      orchestrationService.run.mockResolvedValue(undefined);

      await processor.processTask('test-task-id');

      // Verify orchestration service was called
      expect(orchestrationService.run).toHaveBeenCalledWith(
        mockTask.description,
        'test-task-id',
      );

      // Verify legacy services were NOT called
      expect(groqService.generateMessage).not.toHaveBeenCalled();
    });

    it('should mark task as completed after successful multi-agent orchestration', async () => {
      const processor = await createTestModule(true);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      orchestrationService.run.mockResolvedValue(undefined);

      await processor.processTask('test-task-id');

      // Verify task was marked as completed
      expect(tasksService.update).toHaveBeenCalledWith(
        'test-task-id',
        expect.objectContaining({
          status: TaskStatus.COMPLETED,
        }),
      );
    });

    it('should mark task as failed if multi-agent orchestration fails', async () => {
      const processor = await createTestModule(true);
      
      tasksService.findById.mockResolvedValue(mockTask as any);
      tasksService.update.mockResolvedValue({ ...mockTask, status: TaskStatus.RUNNING } as any);
      orchestrationService.run.mockRejectedValue(new Error('Orchestration failed'));

      await processor.processTask('test-task-id');

      // Verify task was marked as failed
      expect(tasksService.update).toHaveBeenCalledWith(
        'test-task-id',
        expect.objectContaining({
          status: TaskStatus.FAILED,
        }),
      );
    });
  });
});
