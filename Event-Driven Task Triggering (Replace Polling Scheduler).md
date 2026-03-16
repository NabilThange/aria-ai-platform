# Event-Driven Task Scheduler
## Current State
`AgentScheduler` polls every 10 seconds via `@Cron(EVERY_10_SECONDS)`. This wastes CPU cycles when no tasks are pending.
## Goal
Replace polling with event-driven triggering: when a task enters `PENDING` status, immediately notify the scheduler.
## Architecture
### 1. Redis Pubsub Channel
Create a single channel: `aria:tasks:pending`
* When task status → `PENDING`, publish event to this channel
* AgentScheduler subscribes on startup
### 2. Task Service Changes
**File:** `tasks.service.ts`
* Inject `RedisService`
* In `create()` and `update()` methods: after setting status to PENDING, call `redis.publish('aria:tasks:pending', taskId)`
* Keep the status change logic, just add the pubsub publish
### 3. Scheduler Changes
**File:** `agent.scheduler.ts`
* Remove `@Cron(EVERY_10_SECONDS)` from `handleCron`
* In `onModuleInit()`, subscribe to `aria:tasks:pending` channel
* On message received (taskId), call `handlePendingTask(taskId)` directly
* Keep the existing `handleCron()` logic, but rename it to `handlePendingTask(taskId)`
* Add a fallback cron job: `@Cron(EVERY_30_MINUTES)` that runs full DB scan (safety net in case pubsub fails)
### 4. Benefits
* Zero polling overhead
* Tasks start processing milliseconds after creation
* Reduces DB queries by 99%
* Better for high-frequency task creation scenarios
## Implementation Order
1. Inject RedisService into TasksService
2. Add publish calls in TasksService.create() and TasksService.update()
3. Update AgentScheduler to use Redis pubsub subscription
4. Keep a safety-net cron job (EVERY_30_MINUTES)
5. Test: create a task and verify it processes immediately
## Files to Modify
* `tasks/tasks.service.ts` — add pubsub publish
* `agent/agent.scheduler.ts` — replace cron with pubsub + fallback cron
* `redis/redis.service.ts` — verify pubsub methods exist (likely already do)
## Fallback Behavior
If Redis pubsub connection drops, the 30-minute safety cron ensures tasks still eventually process. No data loss.