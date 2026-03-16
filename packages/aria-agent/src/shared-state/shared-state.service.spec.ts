import { Test, TestingModule } from '@nestjs/testing';
import { SharedStateService } from './shared-state.service';
import { RedisService } from '../redis/redis.service';
import Redis from 'ioredis';

describe('SharedStateService', () => {
  let service: SharedStateService;
  let redisService: RedisService;
  let mockRedisClient: jest.Mocked<Redis>;

  beforeEach(async () => {
    // Create mock Redis client
    mockRedisClient = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      keys: jest.fn(),
    } as any;

    // Create mock RedisService
    const mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharedStateService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<SharedStateService>(SharedStateService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get value from shared state with namespaced key', async () => {
      const taskId = 'task-123';
      const key = 'test_key';
      const value = { data: 'test' };
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(value));

      const result = await service.get(taskId, key);

      expect(mockRedisClient.get).toHaveBeenCalledWith('task:task-123:test_key');
      expect(result).toEqual(value);
    });


    it('should return null when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.get('task-123', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should throw error on Redis failure', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      await expect(service.get('task-123', 'test_key')).rejects.toThrow('Redis error');
    });
  });

  describe('set', () => {
    it('should set value in shared state with 24-hour TTL', async () => {
      const taskId = 'task-123';
      const key = 'test_key';
      const value = { data: 'test' };
      
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set(taskId, key, value);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'task:task-123:test_key',
        JSON.stringify(value),
        'EX',
        86400,
      );
    });

    it('should throw error on Redis failure', async () => {
      mockRedisClient.set.mockRejectedValue(new Error('Redis error'));

      await expect(service.set('task-123', 'test_key', {})).rejects.toThrow('Redis error');
    });
  });

  describe('delete', () => {
    it('should delete value from shared state', async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await service.delete('task-123', 'test_key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('task:task-123:test_key');
    });
  });


  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.exists('task-123', 'test_key');

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('task:task-123:test_key');
    });

    it('should return false when key does not exist', async () => {
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.exists('task-123', 'test_key');

      expect(result).toBe(false);
    });
  });

  describe('appendToArray', () => {
    it('should append item to existing array', async () => {
      const existingArray = [{ item: 1 }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(existingArray));
      mockRedisClient.set.mockResolvedValue('OK');

      await service.appendToArray('task-123', 'array_key', { item: 2 });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'task:task-123:array_key',
        JSON.stringify([{ item: 1 }, { item: 2 }]),
        'EX',
        86400,
      );
    });

    it('should create new array if key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockResolvedValue('OK');

      await service.appendToArray('task-123', 'array_key', { item: 1 });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'task:task-123:array_key',
        JSON.stringify([{ item: 1 }]),
        'EX',
        86400,
      );
    });
  });


  describe('getArray', () => {
    it('should return array from shared state', async () => {
      const array = [{ item: 1 }, { item: 2 }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(array));

      const result = await service.getArray('task-123', 'array_key');

      expect(result).toEqual(array);
    });

    it('should return empty array when key does not exist', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.getArray('task-123', 'array_key');

      expect(result).toEqual([]);
    });
  });

  describe('deleteTask', () => {
    it('should delete all keys for a task', async () => {
      const keys = ['task:task-123:key1', 'task:task-123:key2', 'task:task-123:key3'];
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.del.mockResolvedValue(3);

      await service.deleteTask('task-123');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('task:task-123:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(...keys);
    });

    it('should handle task with no keys', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      await service.deleteTask('task-123');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('task:task-123:*');
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });
  });

  describe('getTaskKeys', () => {
    it('should return all keys for a task without namespace prefix', async () => {
      const keys = ['task:task-123:key1', 'task:task-123:key2'];
      mockRedisClient.keys.mockResolvedValue(keys);

      const result = await service.getTaskKeys('task-123');

      expect(result).toEqual(['key1', 'key2']);
    });
  });


  describe('getTaskState', () => {
    it('should return all state for a task', async () => {
      const keys = ['task:task-123:key1', 'task:task-123:key2'];
      const value1 = { data: 'value1' };
      const value2 = { data: 'value2' };
      
      mockRedisClient.keys.mockResolvedValue(keys);
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(value1))
        .mockResolvedValueOnce(JSON.stringify(value2));

      const result = await service.getTaskState('task-123');

      expect(result).toEqual({
        key1: value1,
        key2: value2,
      });
    });

    it('should return empty object for task with no keys', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const result = await service.getTaskState('task-123');

      expect(result).toEqual({});
    });
  });

  describe('namespace isolation', () => {
    it('should isolate keys by taskId', async () => {
      mockRedisClient.set.mockResolvedValue('OK');

      await service.set('task-1', 'key', { value: 1 });
      await service.set('task-2', 'key', { value: 2 });

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'task:task-1:key',
        JSON.stringify({ value: 1 }),
        'EX',
        86400,
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        'task:task-2:key',
        JSON.stringify({ value: 2 }),
        'EX',
        86400,
      );
    });
  });
});
