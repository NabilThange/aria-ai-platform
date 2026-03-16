# ARIA Prompt Architecture Cleanup Summary

## ✅ Completed Actions

### 1. Removed Old Single-Agent System (agent.constants.ts)
- ❌ Deleted `packages/aria-agent/src/agent/agent.constants.ts`
- This file contained the monolithic `AGENT_SYSTEM_PROMPT` for the legacy single-agent system
- Moved `SUMMARIZATION_SYSTEM_PROMPT` to `system-prompts.config.ts`

### 2. Removed Dead Code (buildDesktopSystemPrompt)
- ✅ Removed `buildDesktopSystemPrompt()` function from `desktop-tool-parser.util.ts`
- This function was never called - desktop agent uses centralized prompts from `system-prompts.config.ts`
- Left a comment explaining the removal

### 3. Removed ENABLE_MULTI_AGENT Toggle
- ✅ Removed `multiAgentEnabled` property from `AgentProcessor`
- ✅ Removed conditional check for multi-agent mode
- ✅ Multi-agent orchestration is now the ONLY execution path
- ✅ Updated imports to remove `getAgentSystemPrompt` from old constants file
- ✅ Updated import for `SUMMARIZATION_SYSTEM_PROMPT` to use `system-prompts.config.ts`

### 4. Removed Planner Feature
**Backend files deleted:**
- ❌ `packages/aria-agent/src/planner/planner.prompts.ts`
- ❌ `packages/aria-agent/src/planner/planner.service.ts`
- ❌ `packages/aria-agent/src/planner/planner.controller.ts`
- ❌ `packages/aria-agent/src/planner/planner.gateway.ts`
- ❌ `packages/aria-agent/src/planner/planner.module.ts`
- ❌ `packages/aria-agent/src/planner/planner.types.ts`

**Frontend files to remove:**
- ⚠️ `packages/aria-ui/src/hooks/usePlanner.ts`
- ⚠️ `packages/aria-ui/src/hooks/usePlanWebSocket.ts`
- ⚠️ `packages/aria-ui/src/components/planner/PlanningContainer.tsx`
- ⚠️ `packages/aria-ui/src/components/planner/PlanViewer.tsx`
- ⚠️ `packages/aria-ui/src/types/planning.types.ts`

**Frontend code to update:**
- ⚠️ Remove `planningEnabled` prop from `ChatInput.tsx`
- ⚠️ Remove "Extended Thinking" checkbox from dashboard
- ⚠️ Remove `planningEnabled` state from `dashboard/page.tsx`
- ⚠️ Remove `planningEnabled` from task creation API calls
- ⚠️ Remove "Planner Agent" from Activities component

**Database schema to update:**
- ⚠️ Remove `planningEnabled` field from `Task` model
- ⚠️ Remove `Plan`, `ExecutionPath`, `PlanStep`, `Checkpoint` models
- ⚠️ Remove `PlanStatus`, `Strategy`, `StepType` enums
- ⚠️ Create migration to drop these tables/columns

**Agent module to update:**
- ⚠️ Remove `PlannerModule` import from `agent.module.ts`
- ⚠️ Remove `PlannerService` injection from `AgentProcessor`

---

## 🎯 Current State

### Single Source of Truth for Prompts
**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

All agents now use centralized prompts:
- ✅ ORCHESTRATOR - Task planning
- ✅ CLARIFIER - Intent analysis  
- ✅ WEB - Browser automation
- ✅ DESKTOP - OS automation
- ✅ VERIFIER - Result validation
- ✅ PERCEPTION - Screenshot analysis
- ✅ RECOVERY - Failure recovery
- ✅ REPORTER - Task summaries

### Agent-Specific Message Builders (NOT System Prompts)
These are conversation context builders, not system prompts:
- ✅ `ClarifierAgent.buildClarificationPrompt()` - Injects user input into conversation
- ✅ `DesktopAgent.buildIterationPrompt()` - Builds step context with perception results

### Execution Flow
```
User Input
    ↓
AgentProcessor.processTask()
    ↓
OrchestrationService.run()
    ↓
Multi-Agent Pipeline:
    1. ClarifierAgent → Analyze intent
    2. OrchestratorAgent → Create execution plan
    3. WebAgent / DesktopAgent → Execute steps
    4. VerifierAgent → Validate results
    5. RecoveryAgent → Handle failures (if needed)
    6. ReporterAgent → Generate summary
```

---

## ⚠️ Remaining Work

### Frontend Cleanup
1. Delete planner-related components and hooks
2. Remove "Extended Thinking" UI toggle
3. Remove `planningEnabled` from task creation flow
4. Update Activities component to remove "Planner Agent"

### Database Migration
1. Create Prisma migration to:
   - Drop `Plan`, `ExecutionPath`, `PlanStep`, `Checkpoint` tables
   - Remove `planningEnabled` column from `Task` table
   - Drop `PlanStatus`, `Strategy`, `StepType` enums

### Module Updates
1. Remove `PlannerModule` from `agent.module.ts` imports
2. Remove `PlannerService` from `AgentProcessor` constructor

### Legacy Code Removal
1. Remove entire legacy single-agent implementation from `agent.processor.ts` (lines 250-512)
   - The `runIteration()` method and all its helpers are no longer used
   - Multi-agent system handles everything through `OrchestrationService`

---

## 📊 Before vs After

### Before (Confusing)
- 3 separate prompt systems (old single-agent, new multi-agent, planner)
- ENABLE_MULTI_AGENT toggle with two execution paths
- Duplicate prompts in multiple files
- Planning feature overlapping with orchestrator
- 512-line agent.processor.ts with legacy code

### After (Clean)
- 1 prompt system (`system-prompts.config.ts`)
- Multi-agent only, no toggles
- No duplicate prompts
- No planning feature (orchestrator handles it)
- Streamlined agent.processor.ts (just delegates to orchestration)

---

## 🚀 Benefits

1. **Clarity**: One source of truth for all system prompts
2. **Maintainability**: Update prompts in one place
3. **Consistency**: All agents use the same prompt architecture
4. **Simplicity**: No confusing toggles or legacy code paths
5. **Performance**: No overhead from unused planning feature
6. **Debugging**: Easier to trace execution through single pipeline

---

## 📝 Next Steps

1. Complete frontend cleanup (remove planner UI)
2. Create database migration (remove planner tables)
3. Remove legacy single-agent code from agent.processor.ts
4. Test multi-agent system end-to-end
5. Update documentation to reflect new architecture
6. Remove ENABLE_MULTI_AGENT from .env.example
