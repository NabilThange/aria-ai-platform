# ARIA Prompt Architecture Map

## 🚨 CRITICAL FINDINGS

**You have 3 SEPARATE prompt systems running in parallel:**

1. **OLD SINGLE-AGENT SYSTEM** (agent.constants.ts) - DEPRECATED, should be removed
2. **NEW MULTI-AGENT SYSTEM** (system-prompts.config.ts) - ACTIVE, centralized
3. **PLANNER SYSTEM** (planner.prompts.ts) - Separate feature, optional
4. **DESKTOP TOOL PARSER** (desktop-tool-parser.util.ts) - Inline prompt, DUPLICATE

---

## 📋 Complete Prompt Inventory

### 1. CENTRALIZED MULTI-AGENT PROMPTS (✅ KEEP - PRIMARY SYSTEM)

**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

**Contains prompts for:**
- `ORCHESTRATOR` - Task planning and step decomposition
- `CLARIFIER` - User intent analysis
- `WEB` - Browser automation (PinchTab)
- `DESKTOP` - OS-level automation
- `VERIFIER` - Action result validation
- `PERCEPTION` - Screenshot analysis
- `RECOVERY` - Failure recovery strategies
- `REPORTER` - Task summary generation

**Used by**: All multi-agent system agents via `getAgentSystemPrompt(agentType)`

**Status**: ✅ ACTIVE - This is the PRIMARY prompt system

---

### 2. OLD SINGLE-AGENT PROMPT (❌ REMOVE - DEPRECATED)

**File**: `packages/aria-agent/src/agent/agent.constants.ts`

**Contains**:
- `AGENT_SYSTEM_PROMPT` - Monolithic prompt for single-agent system
- `SUMMARIZATION_SYSTEM_PROMPT` - Task summarization

**Used by**: `agent.processor.ts` when `ENABLE_MULTI_AGENT=false`

**Status**: ❌ DEPRECATED - You want multi-agent forever, so this should be removed

**Why it exists**: Legacy from before multi-agent refactor

**Should it be there?**: NO - Remove it entirely

---

### 3. PLANNER PROMPTS (✅ KEEP - SEPARATE FEATURE)

**File**: `packages/aria-agent/src/planner/planner.prompts.ts`

**Contains**:
- `PLAN_GENERATION_PROMPT` - Generates execution plans with token cost optimization

**Used by**: `planner.service.ts` for the planning feature (separate from orchestrator)

**Status**: ✅ ACTIVE - This is a separate optional feature

**Why it exists**: Planning is a separate feature that generates multi-path execution plans

**Should it be there?**: YES - But it's confusing because it overlaps with Orchestrator

**Relationship to Orchestrator**: 
- Orchestrator creates execution plans for multi-agent system
- Planner creates detailed execution plans with token cost analysis
- They serve different purposes but have overlapping functionality

---

### 4. DESKTOP TOOL PARSER INLINE PROMPT (❌ REMOVE - DUPLICATE)

**File**: `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`

**Function**: `buildDesktopSystemPrompt()`

**Contains**: Complete desktop agent prompt with tool definitions

**Used by**: NOWHERE! This function is defined but never called!

**Status**: ❌ DEAD CODE - Remove it

**Why it exists**: Probably leftover from an earlier implementation

**Should it be there?**: NO - Desktop agent already uses centralized prompt from system-prompts.config.ts

---

### 5. AGENT-SPECIFIC PROMPT BUILDERS (⚠️ REVIEW)

**Files with `buildXXXPrompt()` methods:**

#### Clarifier Agent
**File**: `packages/aria-agent/src/agents/clarifier/clarifier.agent.ts`
**Method**: `buildClarificationPrompt(userInput: string)`
**Content**: 
```typescript
return `Analyze this user request and clarify the intent:

"${userInput}"

Respond with JSON only, following the exact schema in the system prompt.`;
```
**Status**: ✅ KEEP - This is just a user message, not a system prompt
**Why**: Injects user input into the conversation, references centralized system prompt

#### Desktop Agent
**File**: `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
**Method**: `buildIterationPrompt(step, iteration, lastAction, perceptionResult, recoveryStrategy)`
**Content**: Builds dynamic prompts with step details, perception results, recovery strategies
**Status**: ✅ KEEP - This is conversation context, not a system prompt
**Why**: Provides step-specific context to the agent during execution

---

## 🎯 PROMPT FLOW DIAGRAM

```
User Input
    ↓
agent.processor.ts (entry point)
    ↓
    ├─ if ENABLE_MULTI_AGENT=false (DEPRECATED)
    │   └─ Uses agent.constants.ts → AGENT_SYSTEM_PROMPT
    │
    └─ if ENABLE_MULTI_AGENT=true (ACTIVE)
        └─ orchestration.service.ts
            ↓
            ├─ ClarifierAgent
            │   └─ system-prompts.config.ts → CLARIFIER
            │   └─ buildClarificationPrompt() → user message
            │
            ├─ OrchestratorAgent
            │   └─ system-prompts.config.ts → ORCHESTRATOR
            │
            ├─ WebAgent
            │   └─ system-prompts.config.ts → WEB
            │
            ├─ DesktopAgent
            │   └─ system-prompts.config.ts → DESKTOP
            │   └─ buildIterationPrompt() → conversation context
            │
            ├─ VerifierAgent
            │   └─ system-prompts.config.ts → VERIFIER
            │
            ├─ PerceptionAgent
            │   └─ system-prompts.config.ts → PERCEPTION
            │
            ├─ RecoveryAgent
            │   └─ system-prompts.config.ts → RECOVERY
            │
            └─ ReporterAgent
                └─ system-prompts.config.ts → REPORTER

Separate Feature:
PlannerService
    └─ planner.prompts.ts → PLAN_GENERATION_PROMPT
```

---

## 🔍 CONFUSION ANALYSIS

### Why Multiple Prompts Exist

1. **Historical Evolution**: System evolved from single-agent → multi-agent
2. **Feature Separation**: Planner is a separate feature from orchestrator
3. **Dead Code**: Some prompts (desktop-tool-parser) were never cleaned up
4. **Context vs System**: Some "prompts" are actually conversation context, not system prompts

### What's Actually Confusing

1. **agent.constants.ts still exists** even though multi-agent is the default
2. **Planner vs Orchestrator** - both create execution plans, unclear which to use
3. **buildDesktopSystemPrompt()** exists but is never called
4. **Agent-specific prompt builders** look like system prompts but are actually user messages

---

## ✅ RECOMMENDED ACTIONS

### 1. Remove Old Single-Agent System
**Files to delete/modify:**
- ❌ DELETE: `agent.constants.ts` → `AGENT_SYSTEM_PROMPT` and `getAgentSystemPrompt()`
- ✅ KEEP: `SUMMARIZATION_SYSTEM_PROMPT` → Move to system-prompts.config.ts if still needed
- ✅ MODIFY: `agent.processor.ts` → Remove ENABLE_MULTI_AGENT check, always use orchestration

### 2. Remove Dead Code
**Files to modify:**
- ❌ DELETE: `buildDesktopSystemPrompt()` from `desktop-tool-parser.util.ts`
- Keep the parser functions, just remove the unused prompt builder

### 3. Clarify Planner vs Orchestrator
**Decision needed:**
- Are you using the Planner feature? (token cost optimization, multi-path planning)
- If YES: Keep planner.prompts.ts, document the difference
- If NO: Remove planner.prompts.ts and planner.service.ts

### 4. Document Agent-Specific Builders
**Add comments to clarify:**
- `buildClarificationPrompt()` → "Builds user message, not system prompt"
- `buildIterationPrompt()` → "Builds conversation context, not system prompt"

### 5. Consolidate All System Prompts
**Ensure system-prompts.config.ts is the ONLY source of system prompts:**
- All agents use `getAgentSystemPrompt(agentType)`
- No inline system prompts in agent files
- No duplicate prompt definitions

---

## 📊 PROMPT USAGE MATRIX

| Agent | System Prompt Source | User Message Builder | Status |
|-------|---------------------|---------------------|--------|
| Clarifier | system-prompts.config.ts | buildClarificationPrompt() | ✅ Clean |
| Orchestrator | system-prompts.config.ts | None | ✅ Clean |
| Web | system-prompts.config.ts | None | ✅ Clean |
| Desktop | system-prompts.config.ts | buildIterationPrompt() | ✅ Clean |
| Verifier | system-prompts.config.ts | None | ✅ Clean |
| Perception | system-prompts.config.ts | None | ✅ Clean |
| Recovery | system-prompts.config.ts | None | ✅ Clean |
| Reporter | system-prompts.config.ts | None | ✅ Clean |
| OLD Single-Agent | agent.constants.ts | N/A | ❌ Remove |
| Planner | planner.prompts.ts | N/A | ⚠️ Decide |

---

## 🎯 FINAL RECOMMENDATION

**Keep:**
1. `system-prompts.config.ts` - Primary system prompt source
2. Agent-specific message builders (clarifier, desktop) - These are conversation context
3. `planner.prompts.ts` - Only if you're using the planning feature

**Remove:**
1. `agent.constants.ts` - Old single-agent system
2. `buildDesktopSystemPrompt()` in desktop-tool-parser.util.ts - Dead code
3. `ENABLE_MULTI_AGENT` env var - Multi-agent is now permanent

**Clarify:**
1. Add comments distinguishing system prompts from user messages
2. Document when to use Planner vs Orchestrator
3. Update README to reflect multi-agent as the only system
