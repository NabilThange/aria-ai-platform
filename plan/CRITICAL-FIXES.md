# Critical Architecture Fixes

**Date**: 2026-03-12
**Status**: MUST BE RESOLVED BEFORE CONTINUING

## 🔴 CRITICAL - Will Break Things

### 1. Telegram Decision - UNRESOLVED
**Issue**: TASK-030 marked complete but Telegram integration not confirmed
**Decision Required**: 
- [ ] KEEP Telegram - Confirm it's the notification channel
- [ ] REMOVE Telegram - Delete TASK-030, FILE-020, DEP-005, ASSUMPTION-007, TEST-027

**Action**: User must decide NOW before Phase 4 starts.

### 2. ReporterAgent Output Schema - MISSING
**Issue**: No defined output format for Reporter summary
**Fix Required**:
```typescript
// packages/aria-agent/src/agents/reporter/reporter.types.ts
export interface TaskSummary {
  task_goal: string;           // What was asked
  steps_completed: number;     // How many succeeded
  steps_failed: number;        // How many failed
  total_cost: number;          // From CostTrackingService
  duration_seconds: number;    // End time - start time
  final_status: 'completed' | 'failed' | 'needs_help';
  human_summary: string;       // Readable text for user/Telegram
}
```

### 3. ClarifierAgent Output Schema - MISSING
**Issue**: `clarified` passed to Orchestrator but format undefined
**Fix Required**:
```typescript
// packages/aria-agent/src/agents/clarifier/clarifier.types.ts
export interface ClarifiedTask {
  original_input: string;      // User's original request
  clarified_goal: string;      // Clear, unambiguous goal
  constraints: string[];       // "only invoices from March"
  assumptions: string[];       // "assuming Gmail is logged in"
  task_type: 'web' | 'desktop' | 'mixed';
}
```

### 4. Orchestrator Plan Schema - MISSING
**Issue**: `plan.steps` used everywhere but never defined
**Fix Required**:
```typescript
// packages/aria-agent/src/agents/orchestrator/orchestrator.types.ts
export interface ExecutionPlan {
  steps: ExecutionStep[];
}

export interface ExecutionStep {
  id: string;                  // "step_1", "step_2"
  type: 'web' | 'desktop';
  description: string;         // What to do
  success_criteria: string;    // How Verifier knows it worked
  context?: string;            // Extra info the agent needs
}
```

### 5. WebAgent/DesktopAgent execute() Return Type - MISSING
**Issue**: `result` passed to Verifier but format undefined
**Fix Required**:
```typescript
// packages/aria-agent/src/agents/base/agent.types.ts
export interface ActionResult {
  action: string;              // "clicked login button"
  details: any;                // Agent-specific details
  screenshot?: string;         // base64, desktop only
  url?: string;                // web only
  error?: string;              // if something went wrong
}
```

### 6. Recovery strategize() Output - MISSING
**Issue**: Recovery writes to shared state but format/key undefined
**Fix Required**:
```typescript
// packages/aria-agent/src/agents/recovery/recovery.types.ts
export interface RecoveryStrategy {
  strategy: string;            // Alternative approach description
  avoid: string[];             // What NOT to do (failed approaches)
  approach: string;            // Specific technique to try
}

// Recovery writes to: task:{taskId}:recovery_strategy
// Web/Desktop agents MUST check this key before attempt 3
```

## 🟡 IMPORTANT - Will Cause Confusion

### 7. Phase 4 Before Phase 5 Testing Problem
**Issue**: Building Orchestrator/Recovery before Web/Desktop agents exist
**Fix**: Add note to Phase 4:
```
NOTE: Phase 4 agents tested with MOCKED execution results only.
Real end-to-end testing happens after Phase 5 completes.
```

### 8. run() vs execute() Naming Inconsistency
**Issue**: BaseAgent defines `run()` but OrchestrationService calls `execute()`
**Decision Required**:
- [ ] Option A: Change BaseAgent to `abstract execute()`
- [ ] Option B: Change OrchestrationService to call `.run()`

**Recommendation**: Keep `run()` in BaseAgent, add `execute()` as wrapper in Web/Desktop agents

### 9. TTL Application Strategy Not Specified
**Issue**: PAT-006 says 24hr TTL but code doesn't show how
**Fix**: Add to SharedStateService documentation:
```
SharedStateService.set() automatically applies 24hr TTL on every write.
Callers never need to pass TTL manually.
```

### 10. Feature Flag Should Be Phase 1, Not Phase 7
**Issue**: All agents built without flag, then flag added later
**Fix**: Add TASK-001.5:
```
TASK-001.5: Create ENABLE_MULTI_AGENT feature flag (default: false)
All new multi-agent code runs only when flag is true from day one.
```

### 11. Empty Plan Guard Missing
**Issue**: Orchestrator could return empty plan, causing silent success
**Fix**: Add to OrchestrationService:
```typescript
if (!plan?.steps?.length) {
  throw new Error('Orchestrator returned empty plan');
}
```

### 12. TASK-020 Gap in Numbering
**Issue**: Tasks jump from TASK-019 to TASK-021
**Fix**: Renumber or add placeholder

### 13. AgentRegistry Purpose Unclear
**Issue**: OrchestrationService uses DI, not AgentRegistry
**Decision Required**: Define purpose or remove

## 🟢 MINOR - Won't Break But Should Be Fixed

### 14-17. Telegram References Throughout
If Telegram is cut, remove from:
- DEP-005
- FILE-020
- ASSUMPTION-007
- TEST-027

---

## REQUIRED ACTIONS BEFORE CONTINUING

1. **User Decision**: Keep or remove Telegram?
2. **Add Missing Schemas**: Items 2-6 above
3. **Resolve Naming**: run() vs execute()
4. **Move Feature Flag**: To Phase 1
5. **Add Guards**: Empty plan check
6. **Fix Numbering**: TASK-020 gap
7. **Clarify AgentRegistry**: Purpose or removal

**DO NOT PROCEED TO PHASE 4 UNTIL THESE ARE RESOLVED**
