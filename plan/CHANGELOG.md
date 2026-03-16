# Implementation Plan Changelog

## Version 1.2 - 2026-03-12 (Interface Definitions & Critical Gaps)

### 🔴 CRITICAL: Missing Interface Definitions Added

All agent input/output schemas now explicitly defined to prevent silent failures at agent boundaries.

**1. ClarifierAgent Output (Section 9.6)**
- Added `ClarifiedTask` interface with all required fields
- Includes: original_input, clarified_goal, constraints, assumptions, task_type
- Prevents Orchestrator from receiving unpredictable input

**2. OrchestratorAgent Output (Section 9.7)**
- Added `ExecutionPlan` and `ExecutionStep` interfaces
- Each step has: id, type, description, success_criteria, context, depends_on
- Prevents undefined step.type or step.id errors

**3. RecoveryAgent Output (Section 9.8)**
- Added `RecoveryStrategy` interface
- Defines exact format: strategy, avoid[], approach, alternatives[]
- Specifies shared state key: `task:{taskId}:recovery_strategy`
- Web/Desktop agents now know to check this before each retry

**4. ReporterAgent Output (Section 9.9)**
- Added `TaskSummary` interface with 9 required fields
- Includes: task_goal, steps_completed, steps_failed, total_cost, duration_seconds, final_status, human_summary, agent_breakdown, errors
- Frontend now knows exact format to display

**5. Web/Desktop Agent Output (Section 9.10)**
- Added `ActionResult` interface
- Includes: action, details, screenshot, url, elements, error, timestamp
- Verifier now knows exact format to evaluate

### 🟡 Important Fixes

**6. Empty Plan Guard**
- Added validation in OrchestrationService: `if (!plan?.steps?.length) throw Error`
- Prevents silent completion when Orchestrator returns empty plan

**7. Feature Flag Moved to Phase 1**
- Added TASK-000: Create ENABLE_MULTI_AGENT flag immediately
- All new code runs only when flag is true from day one
- Prevents breaking existing system during development

**8. Telegram Made Optional**
- Updated all references: "optional", "gracefully disabled if not configured"
- TASK-030: Now explicitly optional
- DEP-005: Marked as optional dependency
- ASSUMPTION-007: System works fully without Telegram
- TEST-027: Skip if TELEGRAM_BOT_TOKEN not set

**9. TTL Strategy Clarified**
- PAT-006: SharedStateService.set() automatically applies 24hr TTL
- Callers never pass TTL manually
- Prevents memory leaks from forgotten TTL

**10. Recovery Strategy Communication**
- Added PAT-008: Recovery writes to task:{taskId}:recovery_strategy
- Format specified: { strategy, avoid[], approach }
- Web/Desktop agents check this key before each retry

**11. run() vs execute() Naming**
- PAT-007: BaseAgent defines abstract run()
- Web/Desktop provide execute(step, taskId) that OrchestrationService calls
- Clarifies the two-method pattern

**12. AgentRegistry Purpose Clarified**
- FILE-007: Used for dynamic instantiation when type unknown at compile time
- Not required by OrchestrationService (uses NestJS DI)
- Useful for testing and future extensibility

**13. Phase 4 Testing Strategy**
- Added note: "Phase 4 agents tested with MOCKED execution results only"
- Real end-to-end testing happens after Phase 5 completes
- Prevents confusion about testing Orchestrator before Web/Desktop exist

### File Updates

- Added FILE-021a through FILE-021e for all type definition files
- Updated task descriptions to reference Section 9 schemas
- Updated TASK-032, TASK-033, TASK-035, TASK-036, TASK-040, TASK-045, TASK-050 with schema references

### Next Steps Updated

- Changed from "TASK-001 (Redis setup)" to "TASK-000 (Feature flag)"
- Feature flag is now the first task

---

## Version 1.1 - 2026-03-12 (Critical Fixes)

### CRITICAL Bug Fixes

**1. Fixed Replan Bug in OrchestrationService** ⚠️
- **Problem**: `break` statement after replan would exit retry loop but continue to next step in OLD plan, skipping new plan entirely
- **Fix**: Changed to `stepIndex = -1` pattern to restart from beginning of new plan
- **Impact**: Without this fix, replanning would silently fail

**2. Removed Event-Driven Contradiction** 🔧
- **Problem**: REQ-018, TASK-015, and PAT-003 said "event-driven" but OrchestrationService uses sequential awaits
- **Fix**: 
  - REQ-018: Changed to "sequential async/await calls, EventEmitter2 only for UI notifications"
  - TASK-015: Changed to "EventEmitter2 for UI notifications only, NOT agent-to-agent calls"
  - PAT-003: Deleted (contradicted sequential pattern)
- **Impact**: Prevents coding agent from implementing conflicting patterns

### Critical Definitions Added

**3. BaseAgent Abstract Class** 📝
- Added complete implementation in Section 9.1
- Includes: `run()`, `readState()`, `writeState()`, `appendToHistory()`, `logCost()`
- Prevents coding agent from inventing inconsistent interfaces

**4. Verifier JSON Schema** 📋
- Added exact strict JSON schema in Section 9.3
- Required fields: `action_succeeded`, `screen_changed`, `error_detected`, `error_message`, `retry_recommended`, `confidence`
- Prevents schema mismatch between Verifier and OrchestrationService

**5. Perception JSON Schema** 📋
- Added exact schema in Section 9.4
- Required fields: `active_window`, `ui_state`, `clickable_elements`, `errors_visible`, `task_relevant_info`
- Ensures Desktop Agent can parse Perception output

**6. Agent Model Configuration** ⚙️
- Added complete AGENT_MODELS definition in Section 9.2
- Specifies exact provider + model for each agent
- Includes fallback for Perception (Gemini if Groq fails)

### Important Improvements

**7. Redis TTL Strategy** ⏰
- Added PAT-006: All shared state keys use 24-hour TTL
- Prevents memory leak from abandoned tasks
- Reporter persists to PostgreSQL before TTL expires

**8. Clarifier Q&A Dependency** 🔗
- TASK-032: Added note about TASK-060 dependency
- Clarifies that Phase 4 testing uses mocked responses
- Real UI integration happens in Phase 6

**9. Enhanced OrchestrationService** 💪
- Added status emission via EventEmitter2 for UI updates
- Added detailed logging at each step
- Added proper error handling and task status tracking
- Includes complete replan logic with stepIndex reset

### File Reference Updates

- FILE-005: Now references BaseAgent definition in Section 9
- FILE-029: Now references AGENT_MODELS definition in Section 9
- TASK-022: Now references Verifier schema in Section 9
- TASK-026: Now references Perception schema in Section 9
- TASK-060: Now notes dependency from TASK-032

---

## Version 1.0 - 2026-03-12

### Initial Plan Created
- Comprehensive 9-phase implementation plan with 92 tasks
- 8 specialized agents defined with fixed model assignments
- Redis-based shared state architecture
- 4-attempt escalation ladder specified

### Improvements Applied (Based on Founder Feedback)

#### Removed Framework Complexity
- ❌ Removed LangGraph/CrewAI requirement (was REQ-013)
- ✅ Changed to raw OrchestrationService pipeline
- ❌ Deleted TASK-011 (Evaluate LangGraph vs CrewAI)
- ❌ Deleted TASK-012 (Install orchestration framework)
- ✅ Replaced with TASK-011 (Create OrchestrationService class)
- ❌ Removed `langgraph` from tags
- ❌ Deleted DEP-002 (LangGraph/CrewAI dependency)
- ❌ Deleted RISK-002 (LangGraph learning curve)
- ❌ Updated ADR-002 from "LangGraph vs CrewAI" to "Raw pipeline vs framework"

#### Clarified Implementation Details
- ✅ Added Section 9: Orchestration Pattern with complete implementation example
- ✅ Updated FILE-016 description: "Plain NestJS service (NOT a framework graph)"
- ✅ Updated FILE-018 description: Detailed AgentContext wrapper purpose
- ✅ Updated ALT-004: Changed from "LangChain" to "LangGraph/CrewAI Framework" with rejection reasoning

#### Simplified Scope
- ✅ TASK-057: Changed from "real-time agent activity feed" to "basic agent status in WebSocket"
- ✅ TEST-029: Reduced from "10 concurrent tasks" to "3 concurrent tasks"

#### Fixed Numbering
- ✅ Renumbered risks after removing RISK-002 (now RISK-001 through RISK-007)

### Key Decisions Documented

**Why No Framework?**
- Sequential pipeline is simple enough for raw implementation
- Avoids learning curve and added complexity
- Can add LangGraph in v2 if parallel execution or complex routing is needed
- OrchestrationService is the entire orchestration logic

**Orchestration Pattern:**
```
Clarifier → Orchestrator → (Web/Desktop + Verifier loop) → Reporter
```

**Escalation Ladder:**
1. Fail #1: Working agent retries
2. Fail #2: Recovery agent strategizes
3. Fail #3: Orchestrator replans
4. Fail #4: Notify user, pause task

### Plan Status
- Status: In Progress
- Next Step: TASK-001 (Redis setup)
- Total Tasks: 91 (reduced from 92 after consolidating orchestration tasks)
- Estimated Timeline: 4 weeks (9 phases)
