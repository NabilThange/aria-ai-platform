# ARIA Logging Improvements - Implementation Plan

**Created:** March 26, 2026  
**Priority:** HIGH - Reduces log volume by 80-90%, improves readability

---

## Problem Summary

Current logs are 5-10x longer than necessary due to:
1. Token context breakdown at INFO level on every LLM call
2. WebSocket connect/disconnect logged at INFO every 5-10 seconds
3. Task retrieval logged on every GET (20+ times/minute)
4. Excessive separator lines (`====`, `----`, `....`)
5. Redundant log pairs ("Updating..." + "Successfully updated...")
6. No state-change detection for polling endpoints

---

## Implementation Plan

### Phase 1: Critical Fixes (Biggest Impact)

#### 1.1 Token Context Breakdown → DEBUG Level
**File:** `packages/aria-agent/src/groq/groq.service.ts` (lines 89-124)
**Change:** Move entire token breakdown to DEBUG level, only log at INFO if context > 80%

```typescript
// Before: Always logs at INFO
this.logger.log(`📊 CONTEXT SIZE BREAKDOWN:...`);

// After: Only log at INFO if near limits
if (contextUsagePercent > 80 || tpmUsagePercent > 80) {
  this.logger.warn(`Context usage: ${contextUsagePercent.toFixed(1)}%, TPM: ${tpmUsagePercent.toFixed(1)}%`);
} else {
  this.logger.debug(`Token estimate: ${estimatedTokens} (${contextUsagePercent.toFixed(1)}% context, ${tpmUsagePercent.toFixed(1)}% TPM)`);
}
```

**Impact:** Reduces log volume by 30-40% on LLM-heavy tasks

#### 1.2 WebSocket Connect/Disconnect → DEBUG Level
**File:** `packages/aria-agent/src/tasks/tasks.gateway.ts` (lines 31-36)
**Change:** Move to DEBUG level, only log at INFO on errors

```typescript
// Before: Always INFO
this.logger.log({ event: 'ws.connected', clientId: client.id }, `Client connected`);

// After: DEBUG level
this.logger.debug({ event: 'ws.connected', clientId: client.id }, `Client connected`);
```

**Impact:** Eliminates 100+ logs/minute from reconnection churn

#### 1.3 Task Retrieval → State-Change Detection
**File:** `packages/aria-agent/src/tasks/tasks.service.ts` (lines 203, 213)
**Change:** Only log at INFO when task status changes

```typescript
// Before: Always logs
this.logger.log(`Retrieving task by ID: ${id}`);

// After: Only log status changes
const task = await this.prisma.task.findUnique({ where: { id } });
if (task && this.hasStatusChanged(id, task.status)) {
  this.logger.log(`Task ${id} status: ${task.status}`);
}
```

**Impact:** Reduces polling logs from 20+/minute to 1-2/minute

### Phase 2: Separator/Banner Removal

#### 2.1 Remove All Separator Lines
**Files:** 
- `packages/aria-agent/src/orchestration/orchestration.service.ts`
- `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`
- `packages/aria-agent/src/services/workflow.service.ts`

**Change:** Remove all `'='.repeat(80)`, `'-'.repeat(80)`, `'.'.repeat(80)` lines

```typescript
// Before:
this.logger.log(`\n${'='.repeat(80)}`);
this.logger.log(`[ORCHESTRATION STARTED] Task ID: ${taskId}`);
this.logger.log(`${'='.repeat(80)}\n`);

// After:
this.logger.log(`[ORCHESTRATION STARTED] Task ${taskId}`);
```

**Impact:** Reduces visual noise by 50%, improves log readability

### Phase 3: Redundant Log Pairs

#### 3.1 Collapse Update Pairs
**File:** `packages/aria-agent/src/tasks/tasks.service.ts` (lines 250-279)
**Change:** Single log line for updates

```typescript
// Before:
this.logger.log(`Updating task with ID: ${id}`);
this.logger.debug(`Update data: ${JSON.stringify(updateTaskDto)}`);
// ... update logic ...
this.logger.log(`Successfully updated task ID: ${id}`);

// After:
this.logger.log(`Task ${id} → ${updateTaskDto.status || 'updated'}`);
this.logger.debug(`Update data: ${JSON.stringify(updateTaskDto)}`);
```

**Impact:** Reduces update logs by 50%

### Phase 4: Clarification Polling

#### 4.1 Add State-Change Detection
**File:** `packages/aria-agent/src/tasks/tasks.service.ts` (line 459)
**Change:** Cache clarification state, only log changes

```typescript
// Add caching mechanism
private clarificationCache = new Map<string, string>();

async getClarificationSession(taskId: string): Promise<any> {
  const session = await this.sharedStateService.get(taskId, 'clarification_session');
  const sessionStatus = session?.status || 'not_started';
  
  // Only log if status changed
  if (this.clarificationCache.get(taskId) !== sessionStatus) {
    this.logger.log(`Clarification ${taskId}: ${sessionStatus}`);
    this.clarificationCache.set(taskId, sessionStatus);
  }
  
  return session || { status: 'not_started' };
}
```

**Impact:** Reduces clarification polling logs by 90%

---

## Expected Results

### Before Improvements
```
[18:35:25] INFO  [TasksService]     Retrieving task by ID: 18811d3e
[18:35:25] DEBUG [TasksService]     Retrieved task with ID: 18811d3e
[18:35:25] INFO  [TasksGateway]     Client connected
[18:35:25] INFO  [GroqService]      ================================================================================
[18:35:25] INFO  [GroqService]      [GROQ API CALL] Model: openai/gpt-oss-20b
[18:35:25] INFO  [GroqService]      ================================================================================
[18:35:25] INFO  [GroqService]      📊 CONTEXT SIZE BREAKDOWN:
[18:35:25] INFO  [GroqService]         System Prompt: ~2500 tokens
[18:35:25] INFO  [GroqService]         Messages: 3 messages, ~800 tokens
[18:35:25] INFO  [GroqService]         Tools: 30 tools, ~1200 tokens
[18:35:25] INFO  [GroqService]         TOTAL ESTIMATED: ~4500 tokens
[18:35:25] INFO  [GroqService]      
[18:35:25] INFO  [GroqService]      📈 MODEL LIMITS:
[18:35:25] INFO  [GroqService]         Context Window: 128,000 tokens
[18:35:25] INFO  [GroqService]         TPM Limit: 30,000 tokens/minute
[18:35:25] INFO  [GroqService]         RPM Limit: 30 requests/minute
[18:35:25] INFO  [GroqService]      
[18:35:25] INFO  [GroqService]      ⚠️  USAGE WARNINGS:
[18:35:25] INFO  [GroqService]         ✅ Context usage: 3.5% (safe)
[18:35:25] INFO  [GroqService]         ✅ TPM usage: 15.0% (safe)
[18:35:25] INFO  [GroqService]      ================================================================================
[18:35:26] INFO  [TasksService]     Updating task with ID: 18811d3e
[18:35:26] DEBUG [TasksService]     Update data: {"status":"RUNNING"}
[18:35:26] INFO  [TasksService]     Successfully updated task ID: 18811d3e
[18:35:26] INFO  [TasksGateway]     Client disconnected
```

### After Improvements
```
[18:35:25] INFO  [Clarifier]        Round 3 | turns=2 | input="search iPhone price"
[18:35:26] INFO  [Clarifier]        Goal clarified: "Google search: iPhone price" | tokens=2821
[18:35:26] INFO  [TasksService]     Task 18811d3e → RUNNING
```

**Reduction:** ~20 lines → 3 lines (85% reduction)

---

## Implementation Order

1. ✅ Token context breakdown (GroqService) - HIGHEST IMPACT
2. ✅ WebSocket logging (TasksGateway) - HIGH IMPACT
3. ✅ Task retrieval state detection (TasksService) - HIGH IMPACT
4. ✅ Remove separator lines (all files) - MEDIUM IMPACT
5. ✅ Collapse redundant pairs (TasksService) - MEDIUM IMPACT
6. ✅ Clarification polling cache (TasksService) - LOW IMPACT

---

## Testing

After each change:
1. Run a test task: "search iPhone price on Google"
2. Check logs for:
   - Reduced volume (target: 80-90% reduction)
   - Key events still visible (status changes, errors, agent decisions)
   - No missing critical information
3. Verify WebSocket reconnections don't flood logs
4. Verify polling endpoints don't spam logs

---

## Rollback Plan

If logs become too sparse:
1. Revert to previous commit
2. Adjust log levels in `logger.config.ts` (set LOG_LEVEL=debug)
3. Re-evaluate which logs are truly necessary at INFO level
