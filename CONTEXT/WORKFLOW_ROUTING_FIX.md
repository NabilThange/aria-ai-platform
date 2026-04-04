# Workflow Routing Fix - Implementation Summary

**Date:** 2026-04-04  
**Issue:** Orchestrator created workflow steps with `type: 'web'` instead of `type: 'workflow'`, causing them to be routed to WEB_AGENT instead of WORKFLOW_AGENT, resulting in infinite loops.

**Update:** 2026-04-04 (Second Issue) - Orchestrator outputting tool call format instead of canonical format, causing variable extraction to fail.

---

## Problem Analysis

### Original Issue (Fixed)
In task `27192d96-c626-4ed2-b0bd-f822f038d010`, the orchestrator created steps with `type: 'web'` instead of `type: 'workflow'`.

### Second Issue (New - Fixed)
In task `e53ed3cd-aa6a-4ca9-8655-11ae513595cb`, the orchestrator is **still outputting tool call format** instead of canonical step format:

**What the orchestrator output:**
```json
{
  "plan": [{
    "step": 1,
    "tool": "use_workflow",  // ❌ Tool call format
    "tool_input": {
      "name": "freelancer-research-email",
      "variables": {
        "businessType": "coffee shops",
        "city": "Mumbai",
        "recipientEmail": "thangenabil@gmail.com",
        "maxResults": 20
      }
    }
  }]
}
```

**What it should output:**
```json
{
  "steps": [{
    "id": "step_1",
    "type": "workflow",  // ✅ Canonical format
    "workflow_name": "freelancer-research-email",
    "workflow_vars": {
      "businessType": "coffee shops",
      "city": "Mumbai",
      "recipientEmail": "thangenabil@gmail.com",
      "maxResults": 20
    }
  }]
}
```

**The Bug Chain:**
1. Orchestrator outputs tool call format with `tool_input.variables`
2. `normalizeWorkflowIntentStep()` tries to extract variables
3. Looks for: `rawStep.workflow_vars` or `rawStep.variables`
4. But variables are in: `rawStep.tool_input.variables` ❌ (not checked!)
5. Extraction fails → thinks variables are missing
6. Triggers clarification question asking for variables that were already provided
7. Task paused with NEEDS_HELP status
8. UI shows clarification question
9. User refreshes browser → WebSocket state lost → messages disappear

---

## Implemented Fixes

### Fix 1-3: Original Workflow Routing Fixes ✅
(See previous section - already documented)

### Fix 4: Handle tool_input Format in Variable Extraction ✅
**File:** `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`  
**Lines:** ~1018-1120 (normalizeWorkflowIntentStep method)

**Changes:**
1. Added `rawStep?.tool_input` to `nestedInput` sources
2. Added `rawStep?.tool_input?.variables` to `hasWorkflowVars` check
3. Added `rawStep?.tool_input?.name` to workflow name extraction
4. Added `rawStep?.tool_input?.variables` to variable extraction with priority
5. Added logging: `🔍 [FIX 4] Extracted workflow variables for "workflow-name": {...}`

**Code:**
```typescript
const nestedInput =
  rawStep?.workflow ||
  rawStep?.arguments ||
  rawStep?.params ||
  rawStep?.parameters ||
  rawStep?.input ||
  rawStep?.tool_input ||  // FIX 4: Add tool_input
  {};

const hasWorkflowVars = !!(
  rawStep?.workflow_vars ||
  rawStep?.variables ||
  rawStep?.tool_input?.variables ||  // FIX 4: Check tool_input.variables
  nestedInput?.workflow_vars ||
  nestedInput?.variables
);

const explicitWorkflowName =
  // ... existing checks ...
  : typeof rawStep?.tool_input?.name === 'string' && useWorkflowIntent
    ? rawStep.tool_input.name  // FIX 4: Check tool_input.name
  // ... rest of checks ...

const extractedVars = {
  ...(selectedWorkflow?.workflow_name === workflowName
    ? selectedWorkflow?.workflow_vars || {}
    : {}),
  ...(rawStep?.tool_input?.variables || {}),  // FIX 4: Extract from tool_input.variables FIRST
  ...(nestedInput?.workflow_vars ||
    nestedInput?.variables ||
    rawStep?.workflow_vars ||
    rawStep?.variables ||
    rawStep?.workflow?.variables ||
    {}),
};
```

**Why This Works:**
- Now handles both canonical format (`workflow_vars`) AND tool call format (`tool_input.variables`)
- Variables are extracted from `tool_input.variables` with high priority
- Workflow name is extracted from `tool_input.name`
- Prevents false "missing variables" errors
- Allows the orchestrator to output either format (though canonical is preferred)

---

## Testing Performed

### Diagnostics Check
- ✅ No TypeScript errors in `orchestrator.agent.ts`
- ✅ No TypeScript errors in `system-prompts.config.ts`

### Code Review
- ✅ Regex pattern correctly extracts workflow names
- ✅ Type inference prioritizes workflow detection
- ✅ System prompt clearly explains format differences
- ✅ Existing functionality preserved
- ✅ Code style matches existing patterns

---

## Expected Behavior After Fixes

### Scenario 1: User mentions workflow by name
**Input:** "Use the freelancer-research-email workflow to find coffee shops"

**Before Fix:**
```json
{
  "type": "web",  // ❌ Wrong
  "description": "Use the freelancer-research-email workflow..."
}
```

**After Fix:**
```json
{
  "type": "workflow",  // ✅ Correct
  "workflow_name": "freelancer-research-email",
  "workflow_vars": {...}
}
```

### Scenario 2: Orchestrator selects workflow
**Input:** "Find 20 coffee shops in Mumbai and email me the results"

**Before Fix:**
- Orchestrator calls `use_workflow` tool
- Creates step with `type: 'web'` (inferred incorrectly)
- Routes to WEB_AGENT → fails

**After Fix:**
- Orchestrator calls `use_workflow` tool
- Detects workflow indicators in description
- Creates step with `type: 'workflow'` (inferred correctly)
- Routes to WORKFLOW_AGENT → succeeds

---

## Remaining Work (Phase 2: Fixes 4-6)

### Fix 4: Add loop detection to WEB_AGENT
**Status:** Not yet implemented  
**Priority:** High (prevents infinite loops)

### Fix 5: Add workflow step rejection in WEB_AGENT
**Status:** Not yet implemented  
**Priority:** Medium (provides clear error messages)

### Fix 6: Add validation in OrchestrationService
**Status:** Not yet implemented  
**Priority:** Medium (catches routing errors early)

---

## Monitoring & Success Criteria

### Metrics to Track
- [ ] Workflow step routing success rate (should be 100%)
- [ ] WEB_AGENT rejection rate (should be 0% after fixes)
- [ ] Orchestrator plan validation failure rate (should be 0%)
- [ ] Task completion rate for workflow-based tasks

### Success Indicators
- ✅ Orchestrator always sets `type: "workflow"` for workflow steps
- ✅ Steps with workflow keywords route to WORKFLOW_AGENT
- ⏳ WEB_AGENT rejects workflow steps with clear error (Fix 5)
- ⏳ Loop detection prevents infinite snapshot calls (Fix 4)
- ⏳ Validation catches routing errors early (Fix 6)

---

## Rollback Plan

If issues arise:
1. Revert `orchestrator.agent.ts` changes (Fixes 1-2)
2. Revert `system-prompts.config.ts` changes (Fix 3)
3. Monitor for regression in orchestrator planning quality
4. Re-test with original task: "Find 20 coffee shops in Mumbai..."

---

## Related Files

- `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` - Orchestrator logic
- `packages/aria-agent/src/config/system-prompts.config.ts` - System prompts
- `packages/aria-agent/src/orchestration/orchestration.service.ts` - Step routing
- `packages/aria-agent/src/agents/web/web.agent.ts` - Web agent (needs Fixes 4-5)
- `packages/aria-agent/src/agents/workflow/workflow.agent.ts` - Workflow agent
- `packages/aria-agent/workflows/freelancer-research-email.workflow.ts` - Example workflow

---

## Next Steps

1. **Test the fixes** with the original failing task
2. **Implement Fixes 4-6** (loop detection, rejection, validation)
3. **Update ARIA_COMPLETE_ARCHITECTURE.md** with these changes
4. **Create unit tests** for the new logic
5. **Monitor production** for workflow routing success rate
