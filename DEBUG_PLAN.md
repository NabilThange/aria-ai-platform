# Groq Token Limit Debug Plan

## Problem Summary
Groq API rejecting requests with error:
```
Request too large for model `openai/gpt-oss-120b` ... Limit 8000, Requested 9527
```

## Root Causes Identified

### 1. Workflow List Size (Primary)
- `list_workflows()` returns ~3,600 tokens
- Gets added to conversation history
- Accumulates across ReAct iterations

### 2. Token Estimation Accuracy (Secondary)
- Current estimation: 1,566 tokens
- Actual Groq count: 9,527 tokens
- Discrepancy: 6.1x underestimation

### 3. Payload Composition
```
System Prompt:     850 tokens
Messages:          200 tokens (initial)
Tools:             390 tokens
Tool Result:     3,600 tokens (workflow list)
Overhead:          420 tokens
─────────────────────────────
TOTAL:           5,460 tokens (safe)

BUT if user prompt is long or multiple iterations:
User Prompt:     2,000 tokens (long request)
Previous msgs:   2,000 tokens (ReAct history)
─────────────────────────────
TOTAL:           9,850 tokens ❌ (exceeds 8K limit)
```

## Debug Actions

### Action 1: Add Accurate Token Counting
**Goal:** Replace estimation with actual token counting using tiktoken

**Files to modify:**
- `packages/aria-agent/src/groq/groq.service.ts`

**Steps:**
1. Install `js-tiktoken`: `npm install js-tiktoken`
2. Replace `estimateTokenCount()` with actual tokenization
3. Add pre-flight validation before sending to Groq
4. Log actual vs estimated tokens for comparison

### Action 2: Implement Workflow List Compression
**Goal:** Reduce workflow list from 3,600 to ~1,000 tokens

**Files to modify:**
- `packages/aria-agent/src/groq/workflow.tools.ts`
- `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Strategies:**
1. Return only workflow names + 1-line descriptions (not full metadata)
2. Add `get_workflow_details(name)` tool for full details on-demand
3. Compress decision hints into shorter format

### Action 3: Add Request Size Guards
**Goal:** Prevent oversized requests from reaching Groq

**Files to modify:**
- `packages/aria-agent/src/groq/groq.service.ts`

**Steps:**
1. Add pre-flight token validation (90% of limit = 7,200 tokens)
2. If over limit, implement automatic reduction:
   - Remove oldest messages (keep first 2)
   - Truncate tool results
   - Skip system prompt (already implemented)
3. Add fallback to Claude for oversized requests

### Action 4: Optimize Message History Management
**Goal:** Keep conversation history minimal

**Files to modify:**
- `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Current:** Keeps first 2 + last 10 messages (12 total)
**Proposed:** Keeps first 1 + last 6 messages (7 total)

### Action 5: Add Groq Rate Limit Monitoring
**Goal:** Track TPM usage across requests

**Files to modify:**
- `packages/aria-agent/src/groq/groq.service.ts`

**Steps:**
1. Parse `x-ratelimit-remaining-tokens` header from Groq responses
2. Log remaining TPM budget
3. Add delay if approaching limit

## Implementation Priority

### Phase 1: Immediate Fixes (Do Now)
1. ✅ Verify auto-injection removal is working
2. ⚠️ Add pre-flight token validation (prevent 413 errors)
3. ⚠️ Compress workflow list (reduce by 70%)

### Phase 2: Accuracy Improvements (Next)
4. Install tiktoken for accurate counting
5. Add Groq rate limit header monitoring
6. Optimize message history (12 → 7 messages)

### Phase 3: Long-term Solutions (Later)
7. Implement request queuing for TPM management
8. Add automatic fallback to Claude for oversized requests
9. Consider upgrading to Groq Performance Tier

## Testing Plan

### Test 1: Simple Task (Baseline)
```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"input": "Search Google for AI trends"}'
```
**Expected:** <2,000 tokens, no errors

### Test 2: Complex Task (Stress Test)
```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"input": "Research quantum computing, create a 20-slide PowerPoint presentation with detailed analysis of 10 companies, build a landing page with interactive charts, and email me a comprehensive PDF report with citations at test@example.com"}'
```
**Expected:** 5,000-7,000 tokens, no errors

### Test 3: Workflow Discovery
```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"input": "I need help with email and documents"}'
```
**Expected:** Orchestrator calls `list_workflows()`, stays under 8K limit

## Success Criteria

✅ All test tasks complete without 413 errors
✅ Token estimation within 10% of actual
✅ Workflow list < 1,500 tokens
✅ Pre-flight validation catches oversized requests
✅ Logs show accurate token counts

## Files to Monitor

1. `packages/aria-agent/src/groq/groq.service.ts` - Token counting & validation
2. `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` - Message history
3. `packages/aria-agent/src/groq/workflow.tools.ts` - Workflow list compression
4. `packages/aria-agent/src/services/workflow.service.ts` - Workflow data

## Next Steps

Run context-gatherer to find:
1. Where workflow list is generated (`WorkflowService.listWorkflows()`)
2. Current workflow list structure and size
3. Where token validation should be added
4. How to implement tiktoken integration
