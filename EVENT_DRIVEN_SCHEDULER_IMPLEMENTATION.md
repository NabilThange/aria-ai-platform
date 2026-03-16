# Event-Driven Task Scheduler Implementation

## Overview
Replaced the polling-based scheduler with an event-driven architecture using Redis pub/sub. This eliminates the 10-second polling overhead and enables immediate task processing.

## Changes Made

### 1. TasksService (`packages/aria-agent/src/tasks/tasks.service.ts`)
**Status:** Already implemented ✓

The service already publishes events to Redis pub/sub when tasks transition to PENDING status:
- In `create()`: Publishes `aria:tasks:pending` event with task ID
- In `update()`: Publishes `aria:tasks:pending` event when status changes to PENDING

```typescript
// When task enters PENDING status
this.redisService.getClient().publish('aria:tasks:pending', taskId).catch(err => {
  this.logger.error(`Failed to publish task pending event: ${err.message}`);
});
```

### 2. AgentScheduler (`packages/aria-agent/src/agent/agent.scheduler.ts`)
**Status:** Updated ✓

#### Removed
- `@Cron(CronExpression.EVERY_10_SECONDS)` polling decorator

#### Added
- Redis pub/sub subscription in `onModuleInit()`
- `handlePendingTask(taskId)` method for immediate task processing
- `OnModuleDestroy` lifecycle hook for cleanup
- Fallback cron job: `@Cron(CronExpression.EVERY_30_MINUTES)` as safety net

#### Key Features
1. **Immediate Processing**: Tasks are processed milliseconds after creation via pub/sub
2. **Graceful Degradation**: If Redis pub/sub fails, 30-minute cron ensures tasks still process
3. **No Data Loss**: Fallback cron catches any missed tasks
4. **Reduced DB Load**: 99% fewer database queries (from every 10 seconds to every 30 minutes)

## Architecture

```
Task Created/Updated
        ↓
TasksService publishes to 'aria:tasks:pending'
        ↓
AgentScheduler receives pub/sub message
        ↓
handlePendingTask(taskId) called immediately
        ↓
Task marked RUNNING and processed
```

## Performance Impact

### Before
- Polling every 10 seconds (6 times/minute)
- Up to 10-second delay before task processing
- Constant database queries even with no pending tasks
- High CPU usage from continuous polling

### After
- Event-driven: immediate processing (milliseconds)
- Zero polling overhead
- Database queries only when tasks exist
- 30-minute fallback cron as safety net
- ~99% reduction in unnecessary database queries

## Fallback Behavior

If Redis pub/sub connection drops:
1. Scheduler continues running
2. 30-minute cron job runs full database scan
3. Any pending tasks are picked up and processed
4. No data loss or task abandonment

## Testing

To verify the implementation:

1. **Create a task** and observe immediate processing:
   ```bash
   curl -X POST http://localhost:9991/tasks \
     -H "Content-Type: application/json" \
     -d '{"description": "Test task"}'
   ```

2. **Check logs** for pub/sub events:
   ```
   [PubSub] Received pending task event for task ID: <taskId>
   [PubSub] Processing task ID: <taskId>
   ```

3. **Monitor Redis** pub/sub:
   ```bash
   redis-cli SUBSCRIBE aria:tasks:pending
   ```

## Files Modified
- `packages/aria-agent/src/agent/agent.scheduler.ts` — Event-driven scheduler implementation

## Files Already Updated
- `packages/aria-agent/src/tasks/tasks.service.ts` — Redis pub/sub publish calls (already in place)

## Deployment Notes
- No database migrations required
- No environment variable changes needed
- Backward compatible with existing task system
- Redis connection must be stable (already required for SharedStateService)
