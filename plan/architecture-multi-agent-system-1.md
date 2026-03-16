---
goal: Transform Aria from single-agent to multi-agent orchestration system with specialized agents, shared state, and intelligent escalation
version: 1.0
date_created: 2026-03-12
last_updated: 2026-03-12
owner: Aria Development Team
status: 'In progress'
tags: [architecture, multi-agent, refactor, orchestration, redis]
---

# Multi-Agent Architecture Implementation Plan

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

This plan transforms Aria from a single-agent system with multiple LLM providers into a sophisticated multi-agent orchestration system. The new architecture features 8 specialized agents, each with a specific role, fixed model assignment, shared state management via Redis, and an intelligent escalation system for error recovery.

## 1. Requirements & Constraints

### Functional Requirements

- **REQ-001**: System must support 8 specialized agents: Clarifier, Orchestrator, Web Agent, Desktop Agent, Perception Agent, Verifier, Recovery, Reporter
- **REQ-002**: Each agent must have a fixed model assignment (no user override except Desktop Agent)
- **REQ-003**: Desktop Agent model must be user-selectable via frontend dropdown
- **REQ-004**: All agents must read/write to shared state (Redis)
- **REQ-005**: Web Agent must use PinchTab exclusively for browser tasks
- **REQ-006**: Desktop Agent must use computer tools (mouse, keyboard, terminal, screenshot)
- **REQ-007**: Perception Agent must process screenshots and return structured JSON
- **REQ-008**: Verifier must use strict JSON schema validation (Groq strict=true)
- **REQ-009**: System must implement 4-attempt escalation ladder: retry → Recovery → Orchestrator → user notification
- **REQ-010**: Orchestrator must delegate tasks sequentially (no parallel execution)
- **REQ-011**: System must track API costs per task
- **REQ-012**: Reporter must generate human-readable summaries and send to user (Telegram optional - gracefully disabled if not configured)

### Technical Requirements

- **REQ-013**: Use raw agent pipeline (OrchestrationService class) with sequential delegation. No framework needed for v1.
- **REQ-014**: Use Redis for shared state with sub-millisecond read/write
- **REQ-015**: Use PostgreSQL for persistent session logs
- **REQ-016**: Maintain backward compatibility with existing task system
- **REQ-017**: All agents must implement common `BaseAgent` interface
- **REQ-018**: Agent handoffs are sequential async/await calls within OrchestrationService. EventEmitter2 is used only for UI notifications (task status updates to WebSocket gateway), NOT for agent-to-agent handoffs
- **REQ-019**: System must support agent-to-agent communication via shared state
- **REQ-020**: PinchTab must run on port 9867 inside VM

### Provider Constraints

- **CON-001**: Groq models support parallel tools except GPT-OSS (no parallel tools)
- **CON-002**: Only Groq Llama 4 Scout supports vision
- **CON-003**: Groq GPT-OSS 20B/120B support strict JSON output
- **CON-004**: Bytez (Claude) models are slowest but most accurate
- **CON-005**: Gemini is standby fallback only
- **CON-006**: Groq speed: GPT-OSS 20B (1000 t/s), GPT-OSS 120B (500 t/s), Llama 3.3 (280 t/s)

### Cost Constraints

- **CON-007**: Target cost per task: ~$0.24
- **CON-008**: Verifier runs 20-30x per task, must use cheapest model
- **CON-009**: Perception runs after every desktop action, must be fast + cheap
- **CON-010**: Orchestrator runs max 2-3x per task (plan + replan only)

### Security Requirements

- **SEC-001**: No authentication agent - login handled manually or via existing session
- **SEC-002**: Sensitive data must not be logged in shared state
- **SEC-003**: Agent communication must be isolated per task (no cross-task leakage)

### Guidelines

- **GUD-001**: Use Claude Opus when wrong decision = task failure
- **GUD-002**: Use Groq when agent runs in loop (10-30x) or speed matters
- **GUD-003**: Prefer terminal over GUI for desktop tasks when possible
- **GUD-004**: Never infinite loops - hard cap at 4 attempts per step
- **GUD-005**: Slow + correct beats fast + wrong for critical agents

### Patterns to Follow

- **PAT-001**: All agents inherit from `BaseAgent` abstract class
- **PAT-002**: Shared state uses namespaced keys: `task:{taskId}:{key}`
- **PAT-003**: Shared state persists to PostgreSQL before Redis TTL expires (Reporter saves full session history)
- **PAT-004**: Escalation follows strict ladder: working agent → Recovery → Orchestrator → user
- **PAT-005**: Each agent logs to shared state: `action_history`, `failure_log`
- **PAT-006**: All shared state keys use TTL of 24 hours. SharedStateService.set() automatically applies 24hr TTL on every write - callers never pass TTL manually. Completed tasks are persisted to PostgreSQL by Reporter before Redis TTL expires
- **PAT-007**: BaseAgent defines abstract run() method. All agents implement run(). Web/Desktop agents also provide execute(step, taskId) as a convenience method that OrchestrationService calls
- **PAT-008**: Recovery agent writes strategy to task:{taskId}:recovery_strategy in format { strategy: string, avoid: string[], approach: string }. Web/Desktop agents check this key before each retry attempt

## 2. Implementation Steps

### Phase 1: Foundation & Infrastructure

**GOAL-001**: Set up Redis, shared state management, and base agent architecture

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Create ENABLE_MULTI_AGENT feature flag in config. All new multi-agent code runs only when flag is true. Default: false | ✅ | 2026-03-12 |
| TASK-001 | Install and configure Redis in Docker Compose | ✅ | 2026-03-12 |
| TASK-002 | Create Redis module in NestJS with connection pooling | ✅ | 2026-03-12 |
| TASK-003 | Implement SharedStateService with namespaced key operations | ✅ | 2026-03-12 |
| TASK-004 | Create BaseAgent abstract class with common interface | ✅ | 2026-03-12 |
| TASK-005 | Define AgentRole enum (CLARIFIER, ORCHESTRATOR, WEB, DESKTOP, PERCEPTION, VERIFIER, RECOVERY, REPORTER) | ✅ | 2026-03-12 |
| TASK-006 | Create AgentRegistry service for agent lookup and instantiation | ✅ | 2026-03-12 |
| TASK-007 | Add agent model configuration constants (fixed model per agent) | ✅ | 2026-03-12 |
| TASK-008 | Update Task entity to include agent execution metadata | ✅ | 2026-03-12 |
| TASK-009 | Create shared state schema types (TypeScript interfaces) | ✅ | 2026-03-12 |
| TASK-010 | Write unit tests for SharedStateService | ✅ | 2026-03-12 |

### Phase 2: Orchestration Layer

**GOAL-002**: Implement raw orchestration pipeline with sequential agent delegation

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-011 | Create OrchestrationService class with sequential pipeline (Clarifier → Orchestrator → Web/Desktop → Verifier loop → Reporter) | ✅ | 2026-03-12 |
| TASK-012 | Implement agent handoff logic (sequential delegation, no parallel execution) | ✅ | 2026-03-12 |
| TASK-013 | Create AgentContext class (wraps sharedState + taskId + currentStep, prevents agents from needing Redis directly) | ✅ | 2026-03-12 |
| TASK-014 | Implement 4-attempt escalation loop in OrchestrationService (retry → Recovery → Orchestrator → notify user) | ✅ | 2026-03-12 |
| TASK-015 | Add EventEmitter2 for UI notifications only (emit task status events to TasksGateway for WebSocket updates). NOT for agent-to-agent calls | ✅ | 2026-03-12 |
| TASK-016 | Add agent execution logging to PostgreSQL (agent_name, start_time, end_time, cost, result) | ✅ | 2026-03-12 |
| TASK-017 | Create cost tracking service (per agent, per task) | ✅ | 2026-03-12 |
| TASK-018 | Implement task lifecycle hooks (onStart, onComplete, onFail) | ✅ | 2026-03-12 |
| TASK-019 | Write integration tests for orchestration flow | ✅ | 2026-03-12 |

### Phase 3: Core Support Agents

**GOAL-003**: Implement Verifier, Reporter, and Perception agents (support infrastructure)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Create VerifierAgent class (Groq GPT-OSS 20B, strict JSON) | ✅ | 2026-03-12 |
| TASK-022 | Define Verifier JSON schema (action_succeeded, screen_changed, error_detected, etc.) - see exact schema in Section 9 | ✅ | 2026-03-12 |
| TASK-023 | Implement Verifier escalation logic (fail #1 → retry, fail #2 → Recovery) | ✅ | 2026-03-12 |
| TASK-024 | Add Verifier call after every Web/Desktop action | ✅ | 2026-03-12 |
| TASK-025 | Create PerceptionAgent class (Groq Llama 4 Scout vision) | ✅ | 2026-03-12 |
| TASK-026 | Define Perception JSON schema (active_window, ui_state, clickable_elements, etc.) - see exact schema in Section 9 | ✅ | 2026-03-12 |
| TASK-027 | Integrate Perception with Desktop Agent (screenshot → JSON) | ✅ | 2026-03-12 |
| TASK-028 | Create ReporterAgent class (Groq GPT-OSS 20B) | ✅ | 2026-03-12 |
| TASK-029 | Implement Reporter summary generation (reads full shared state, returns TaskSummary - see Section 9.9) | ✅ | 2026-03-12 |
| TASK-030 | Add optional Telegram notification for Reporter (gracefully disabled if TELEGRAM_BOT_TOKEN not configured) | ✅ | 2026-03-12 |

### Phase 4: Planning & Recovery Agents

**GOAL-004**: Implement Clarifier, Orchestrator, and Recovery agents (decision-making layer)

**NOTE**: Phase 4 agents are tested with MOCKED execution results only. Real end-to-end testing happens after Phase 5 completes.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-031 | Create ClarifierAgent class (Groq GPT-OSS 20B) | ✅ | 2026-03-12 |
| TASK-032 | Implement Clarifier Q&A loop (resolves ambiguity before execution, returns ClarifiedTask - see Section 9.6). Note: Requires TASK-060 (frontend interface) for end-to-end functionality. For Phase 4 testing, mock user responses. Wire to real UI in Phase 6 | ✅ | 2026-03-12 |
| TASK-033 | Write clarified task to shared state (task_goal field as ClarifiedTask object) | ✅ | 2026-03-12 |
| TASK-034 | Create OrchestratorAgent class (Bytez Claude Opus 4.6) | ✅ | 2026-03-12 |
| TASK-035 | Implement Orchestrator planning (creates ExecutionPlan with ExecutionStep[] - see Section 9.7). Must validate plan is not empty before returning | ✅ | 2026-03-12 |
| TASK-036 | Add Orchestrator replanning logic (triggered by Recovery escalation, returns new ExecutionPlan) | ✅ | 2026-03-12 |
| TASK-037 | Implement Orchestrator extended thinking for complex tasks | ✅ | 2026-03-12 |
| TASK-038 | Add Orchestrator task cancellation authority | ✅ | 2026-03-12 |
| TASK-039 | Create RecoveryAgent class (Bytez Claude Sonnet 4.6) | ✅ | 2026-03-12 |
| TASK-040 | Implement Recovery strategy generation (3 alternatives with scoring, returns RecoveryStrategy - see Section 9.8). Writes to task:{taskId}:recovery_strategy | ✅ | 2026-03-12 |
| TASK-041 | Add Recovery failure log analysis (reads failure_log from shared state) | ✅ | 2026-03-12 |
| TASK-042 | Prevent Recovery from repeating failed strategies (checks previous strategies in shared state) | ✅ | 2026-03-12 |

### Phase 5: Execution Agents

**GOAL-005**: Implement Web Agent and Desktop Agent (task execution layer)

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-043 | Create WebAgent class (Groq GPT-OSS 120B) | ✅ | 2026-03-12 |
| TASK-044 | Integrate WebAgent with existing PinchTab tools | ✅ | 2026-03-12 |
| TASK-045 | Implement WebAgent execute(step, taskId) method (snapshot → pick element → execute, returns ActionResult - see Section 9.10). Checks recovery_strategy before each attempt | ✅ | 2026-03-12 |
| TASK-046 | Add WebAgent file download tracking (writes to shared state) | ✅ | 2026-03-12 |
| TASK-047 | Remove screenshot usage from WebAgent (PinchTab only) | ✅ | 2026-03-12 |
| TASK-048 | Create DesktopAgent class (Bytez Claude Opus 4.6, user-selectable) | ✅ | 2026-03-12 |
| TASK-049 | Integrate DesktopAgent with computer tools (mouse, keyboard, terminal) | ✅ | 2026-03-12 |
| TASK-050 | Implement DesktopAgent execute(step, taskId) method (screenshot → Perception → decide → execute, returns ActionResult - see Section 9.10). Checks recovery_strategy before each attempt | ✅ | 2026-03-12 |
| TASK-051 | Add DesktopAgent terminal-first optimization (skip GUI when possible) | ✅ | 2026-03-12 |
| TASK-052 | Implement DesktopAgent wait logic (reads downloaded_files from shared state) | ✅ | 2026-03-12 |

### Phase 6: Frontend Integration

**GOAL-006**: Update frontend to support multi-agent system and Desktop Agent model selection

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-053 | Update model selector dropdown to "Desktop Agent Model" | ✅ | 2026-03-12 |
| TASK-054 | Add agent execution status display (which agent is active) | ✅ | 2026-03-12 |
| TASK-055 | Create agent cost breakdown visualization | ✅ | 2026-03-13 |
| TASK-056 | Add agent handoff notifications in UI | ✅ | 2026-03-13 |
| TASK-057 | Add basic agent status to WebSocket events (current agent name) | ✅ | 2026-03-12 |
| TASK-058 | Add shared state viewer for debugging (admin only) | ✅ | 2026-03-13 |
| TASK-059 | Update task detail page to show agent execution history | ✅ | 2026-03-13 |
| TASK-060 | Add Clarifier Q&A interface (interactive question flow). Required by TASK-032 for Clarifier to send questions to user | ✅ | 2026-03-13 |

**NOTE**: Tasks 054-060 require frontend UI development. TASK-057 complete - TasksGateway already listens to task.status events from OrchestrationService.

### Phase 7: Migration & Backward Compatibility

**GOAL-007**: Ensure smooth migration from single-agent to multi-agent system

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-061 | Create feature flag: ENABLE_MULTI_AGENT (default: false) | ✅ | 2026-03-12 |
| TASK-062 | Implement fallback to single-agent mode when flag is off | ✅ | 2026-03-12 |
| TASK-063 | Add database migration for agent execution metadata | ✅ | 2026-03-12 |
| TASK-064 | Create data migration script for existing tasks | ✅ | 2026-03-12 |
| TASK-065 | Update AgentProcessor to delegate to OrchestrationService when flag is on | ✅ | 2026-03-12 |
| TASK-066 | Add backward compatibility tests (single-agent mode still works) | ✅ | 2026-03-13 |
| TASK-067 | Create migration guide documentation | ✅ | 2026-03-13 |
| TASK-068 | Add rollback procedure documentation | | |

**NOTE**: TASK-063/064 complete - schema already has agentExecutions and activeAgent fields. TASK-066-068 deferred until after Phase 6 partial + Phase 8 testing.

### Phase 8: Testing & Validation

**GOAL-008**: Comprehensive testing of multi-agent system end-to-end

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-069 | Write unit tests for each agent class | | |
| TASK-070 | Write integration tests for agent handoffs | | |
| TASK-071 | Write end-to-end test: Gmail task (Clarifier → Orchestrator → Web → Reporter) | | |
| TASK-072 | Write end-to-end test: Desktop task (Clarifier → Orchestrator → Desktop → Reporter) | | |
| TASK-073 | Write end-to-end test: Mixed task (Web → Desktop handoff) | | |
| TASK-074 | Write escalation test (Verifier → Recovery → Orchestrator) | | |
| TASK-075 | Write cost tracking validation test | | |
| TASK-076 | Perform load testing (10 concurrent tasks) | | |
| TASK-077 | Validate Redis performance under load | | |
| TASK-078 | Create test report with success metrics | | |

### Phase 9: Documentation & Deployment

**GOAL-009**: Document the system and deploy to production

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-079 | Write architecture documentation (system overview) | | |
| TASK-080 | Document each agent's role, model, and behavior | | |
| TASK-081 | Create shared state schema documentation | | |
| TASK-082 | Write agent development guide (how to add new agents) | | |
| TASK-083 | Create troubleshooting guide (common issues) | | |
| TASK-084 | Update deployment documentation (Redis setup) | | |
| TASK-085 | Create monitoring dashboard (agent health, costs) | | |
| TASK-086 | Set up alerts for agent failures | | |
| TASK-087 | Deploy to staging environment | | |
| TASK-088 | Perform staging validation (run 20 test tasks) | | |
| TASK-089 | Deploy to production with feature flag off | | |
| TASK-090 | Gradually enable multi-agent for beta users | | |
| TASK-091 | Monitor production metrics for 1 week | | |
| TASK-092 | Enable multi-agent for all users | | |

## 3. Alternatives

### ALT-001: Single Agent with Dynamic Model Selection
**Description**: Keep single agent, but dynamically select model based on task type (web vs desktop vs planning)
**Pros**: Simpler architecture, less code, easier to maintain
**Cons**: No specialization, no intelligent escalation, no parallel optimization, harder to debug failures
**Decision**: Rejected - doesn't solve core failure modes (bad planning, infinite loops, no recovery)

### ALT-002: Microservices Architecture (Separate Processes)
**Description**: Each agent runs as a separate microservice with its own process
**Pros**: True isolation, independent scaling, language flexibility
**Cons**: Complex deployment, network latency, harder debugging, overkill for current scale
**Decision**: Rejected - NestJS modules provide sufficient isolation without operational complexity

### ALT-003: Use Existing AgentProcessor with Conditional Logic
**Description**: Add if/else logic to current AgentProcessor to route to different models
**Pros**: Minimal code changes, no new infrastructure
**Cons**: Becomes unmaintainable spaghetti code, no clear agent boundaries, hard to test
**Decision**: Rejected - technical debt would accumulate rapidly

### ALT-004: LangGraph/CrewAI Framework
**Description**: Use LangGraph or CrewAI for agent orchestration
**Pros**: Built-in agent coordination, visualization tools, state management
**Cons**: Learning curve, added complexity, overkill for sequential pipeline, harder to debug
**Decision**: Rejected for v1 - raw OrchestrationService is simpler and sufficient. Can add framework in v2 if needed.

### ALT-005: MongoDB Instead of Redis for Shared State
**Description**: Use MongoDB for shared state instead of Redis
**Pros**: Persistent by default, rich query capabilities, familiar to team
**Cons**: Slower (10-50ms vs <1ms), overkill for ephemeral state, higher resource usage
**Decision**: Rejected - Redis sub-millisecond reads are critical for agent coordination

## 4. Dependencies

### External Dependencies

- **DEP-001**: Redis 7.x (in-memory data store for shared state)
- **DEP-002**: PinchTab (already integrated, runs on port 9867)
- **DEP-003**: Groq API access (GPT-OSS 20B, GPT-OSS 120B, Llama 4 Scout)
- **DEP-004**: Bytez API access (Claude Opus 4.6, Claude Sonnet 4.6)
- **DEP-005**: Telegram Bot API (optional - for Reporter notifications, gracefully disabled if TELEGRAM_BOT_TOKEN not configured)

### Internal Dependencies

- **DEP-007**: Existing PinchTab tools (pinchtab_navigate, pinchtab_snapshot, etc.)
- **DEP-008**: Existing computer tools (computer_mouse, computer_keyboard, etc.)
- **DEP-009**: Existing Task/Message/Summary entities in PostgreSQL
- **DEP-010**: Existing provider services (GoogleService, GroqService, BytezService)
- **DEP-011**: Existing TasksGateway (WebSocket for real-time updates)

### Dependency Installation Order

1. Redis (TASK-001)
2. All other dependencies are already present

## 5. Files

### New Files to Create

- **FILE-001**: `packages/aria-agent/src/redis/redis.module.ts` - Redis module configuration
- **FILE-002**: `packages/aria-agent/src/redis/redis.service.ts` - Redis connection service
- **FILE-003**: `packages/aria-agent/src/shared-state/shared-state.service.ts` - Shared state operations
- **FILE-004**: `packages/aria-agent/src/shared-state/shared-state.types.ts` - Shared state schema types
- **FILE-005**: `packages/aria-agent/src/agents/base/base.agent.ts` - Abstract base agent class with common interface (see BaseAgent definition in Section 9)
- **FILE-006**: `packages/aria-agent/src/agents/base/agent.types.ts` - Agent interfaces, enums, AgentResult, and ActionHistoryEntry
- **FILE-007**: `packages/aria-agent/src/agents/registry/agent.registry.ts` - Agent registry service for dynamic agent instantiation when agent type is not known at compile time (used for testing and future extensibility, not required by OrchestrationService which uses NestJS DI)
- **FILE-008**: `packages/aria-agent/src/agents/clarifier/clarifier.agent.ts` - Clarifier agent
- **FILE-009**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` - Orchestrator agent
- **FILE-010**: `packages/aria-agent/src/agents/web/web.agent.ts` - Web agent
- **FILE-011**: `packages/aria-agent/src/agents/desktop/desktop.agent.ts` - Desktop agent
- **FILE-012**: `packages/aria-agent/src/agents/perception/perception.agent.ts` - Perception agent
- **FILE-013**: `packages/aria-agent/src/agents/verifier/verifier.agent.ts` - Verifier agent
- **FILE-014**: `packages/aria-agent/src/agents/recovery/recovery.agent.ts` - Recovery agent
- **FILE-015**: `packages/aria-agent/src/agents/reporter/reporter.agent.ts` - Reporter agent
- **FILE-016**: `packages/aria-agent/src/orchestration/orchestration.service.ts` - Plain NestJS service (NOT a framework graph). Sequential pipeline: Clarifier → Orchestrator → Web/Desktop → Verifier loop → Reporter
- **FILE-017**: `packages/aria-agent/src/orchestration/orchestration.module.ts` - Orchestration module
- **FILE-018**: `packages/aria-agent/src/orchestration/agent-context.ts` - Wrapper class that passes sharedState + taskId + currentStep to every agent call. Prevents agents from needing to know about Redis directly.
- **FILE-019**: `packages/aria-agent/src/cost-tracking/cost-tracking.service.ts` - Cost tracking service
- **FILE-020**: `packages/aria-agent/src/notifications/telegram.service.ts` - Optional Telegram notification service (gracefully disabled if TELEGRAM_BOT_TOKEN not set)
- **FILE-021a**: `packages/aria-agent/src/agents/clarifier/clarifier.types.ts` - ClarifiedTask interface (see Section 9.6)
- **FILE-021b**: `packages/aria-agent/src/agents/orchestrator/orchestrator.types.ts` - ExecutionPlan and ExecutionStep interfaces (see Section 9.7)
- **FILE-021c**: `packages/aria-agent/src/agents/recovery/recovery.types.ts` - RecoveryStrategy interface (see Section 9.8)
- **FILE-021d**: `packages/aria-agent/src/agents/reporter/reporter.types.ts` - TaskSummary interface (see Section 9.9)
- **FILE-021e**: `packages/aria-agent/src/agents/web/action-result.types.ts` - ActionResult interface shared by Web and Desktop agents (see Section 9.10)

### Files to Modify

- **FILE-021**: `packages/aria-agent/src/agent/agent.processor.ts` - Add multi-agent delegation
- **FILE-022**: `packages/aria-agent/src/agent/agent.module.ts` - Import new modules
- **FILE-023**: `packages/aria-agent/src/tasks/tasks.service.ts` - Add agent metadata
- **FILE-024**: `packages/aria-agent/prisma/schema.prisma` - Add agent execution fields
- **FILE-025**: `packages/aria-agent/docker-compose.yml` - Add Redis service
- **FILE-026**: `packages/aria-agent/.env.example` - Add Redis and Telegram config
- **FILE-027**: `packages/aria-frontend/src/components/ModelSelector.tsx` - Update to Desktop Agent selector
- **FILE-028**: `packages/aria-frontend/src/components/TaskDetail.tsx` - Add agent execution history

### Configuration Files

- **FILE-029**: `packages/aria-agent/src/config/agents.config.ts` - Agent model assignments (see AGENT_MODELS definition in Section 9)
- **FILE-030**: `packages/aria-agent/src/config/redis.config.ts` - Redis connection config
- **FILE-031**: `packages/aria-agent/src/config/orchestration.config.ts` - Orchestration settings

## 6. Testing

### Unit Tests

- **TEST-001**: SharedStateService - get, set, delete, namespace isolation
- **TEST-002**: BaseAgent - abstract methods, common functionality
- **TEST-003**: AgentRegistry - agent lookup, instantiation, caching
- **TEST-004**: ClarifierAgent - Q&A loop, task clarification
- **TEST-005**: OrchestratorAgent - plan creation, replanning, delegation
- **TEST-006**: WebAgent - PinchTab integration, action loop
- **TEST-007**: DesktopAgent - computer tools, Perception integration
- **TEST-008**: PerceptionAgent - screenshot processing, JSON output
- **TEST-009**: VerifierAgent - strict JSON validation, escalation logic
- **TEST-010**: RecoveryAgent - strategy generation, failure analysis
- **TEST-011**: ReporterAgent - summary generation, Telegram integration
- **TEST-012**: CostTrackingService - cost calculation, aggregation

### Integration Tests

- **TEST-013**: Agent handoff - Clarifier → Orchestrator
- **TEST-014**: Agent handoff - Orchestrator → Web Agent
- **TEST-015**: Agent handoff - Orchestrator → Desktop Agent
- **TEST-016**: Agent handoff - Web Agent → Desktop Agent
- **TEST-017**: Escalation flow - Verifier → Recovery → Orchestrator
- **TEST-018**: Shared state - concurrent read/write by multiple agents
- **TEST-019**: Cost tracking - accurate cost per agent per task
- **TEST-020**: Event emitter - agent communication via events

### End-to-End Tests

- **TEST-021**: Gmail task - "Send email to X with subject Y"
- **TEST-022**: Desktop task - "Create spreadsheet with data"
- **TEST-023**: Mixed task - "Download invoices and create spreadsheet"
- **TEST-024**: Escalation scenario - Verifier fails 2x, Recovery intervenes
- **TEST-025**: Replanning scenario - Orchestrator replans after failure
- **TEST-026**: Cost validation - total cost matches expected ~$0.24
- **TEST-027**: Optional Telegram notification - Reporter sends summary if configured (skip if TELEGRAM_BOT_TOKEN not set)

### Performance Tests

- **TEST-028**: Redis latency - <1ms for get/set operations
- **TEST-029**: Concurrent tasks - 3 tasks running simultaneously (basic concurrency test)
- **TEST-030**: Memory usage - Redis memory under 1GB for 100 tasks
- **TEST-031**: Agent response time - Clarifier <2s, Orchestrator <10s

## 7. Risks & Assumptions

### Risks

- **RISK-001**: Redis single point of failure - if Redis crashes, all tasks fail
  - **Mitigation**: Use Redis persistence (AOF), add health checks, implement graceful degradation
  
- **RISK-002**: Cost overrun - multi-agent system may exceed $0.24 per task
  - **Mitigation**: Implement cost tracking early, add cost alerts, optimize agent calls
  
- **RISK-003**: Agent coordination bugs - race conditions in shared state
  - **Mitigation**: Use Redis transactions, add comprehensive integration tests
  
- **RISK-004**: Backward compatibility breaks - existing tasks fail after migration
  - **Mitigation**: Feature flag, extensive testing, gradual rollout
  
- **RISK-005**: Groq API rate limits - high-speed models may hit limits
  - **Mitigation**: Implement exponential backoff, add fallback to Gemini
  
- **RISK-006**: Orchestrator planning failures - bad plan ruins entire task
  - **Mitigation**: Use Claude Opus (most reliable), add plan validation, allow manual override
  
- **RISK-007**: Infinite escalation loops - Recovery → Orchestrator → Recovery
  - **Mitigation**: Hard cap at 4 attempts, track escalation count in shared state

### Assumptions

- **ASSUMPTION-001**: Groq API will remain stable and fast (280-1000 t/s)
- **ASSUMPTION-002**: Bytez API will provide reliable Claude Opus 4.6 access
- **ASSUMPTION-003**: PinchTab will handle 99%+ of web interactions correctly
- **ASSUMPTION-004**: Redis will provide <1ms latency for shared state operations
- **ASSUMPTION-005**: Users will accept slightly slower task execution for higher reliability
- **ASSUMPTION-006**: Desktop Agent model selection is sufficient user control
- **ASSUMPTION-007**: Telegram is optional notification channel - system works fully without it (Reporter logs to PostgreSQL regardless)
- **ASSUMPTION-008**: Sequential task delegation is acceptable (no parallel execution needed)
- **ASSUMPTION-009**: 4-attempt escalation ladder is sufficient for error recovery
- **ASSUMPTION-010**: ~$0.24 per task is acceptable cost for multi-agent system

## 8. Related Specifications / Further Reading

### Internal Documentation

- [Current Agent Architecture](../packages/aria-agent/src/agent/README.md)
- [PinchTab Integration Guide](../docs/pinchtab-integration.md)
- [Provider Configuration](../packages/aria-agent/src/README.md)

### External Resources

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Multi-Agent Systems Design Patterns](https://arxiv.org/abs/2308.10848)
- [Groq API Documentation](https://console.groq.com/docs)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [NestJS Event Emitter](https://docs.nestjs.com/techniques/events)

### Architecture Decision Records

- ADR-001: Why multi-agent over single-agent (to be created)
- ADR-002: Raw pipeline vs framework orchestration (to be created)
- ADR-003: Redis vs MongoDB for shared state (to be created)

---

## 9. Core Definitions & Implementation Patterns

This section provides exact implementations that the coding agent must follow. No guessing, no interpretation.

### 9.1 BaseAgent Abstract Class

```typescript
// packages/aria-agent/src/agents/base/base.agent.ts

import { SharedStateService } from '../../shared-state/shared-state.service';
import { Logger } from '@nestjs/common';

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  tokensUsed?: number;
  cost?: number;
}

export abstract class BaseAgent {
  protected readonly logger: Logger;
  
  constructor(
    protected readonly sharedState: SharedStateService,
    protected readonly agentName: string,
  ) {
    this.logger = new Logger(agentName);
  }

  /**
   * Main execution method - must be implemented by each agent
   */
  abstract run(input: any, taskId: string): Promise<AgentResult>;

  /**
   * Read from shared state
   */
  protected async readState<T>(taskId: string, key: string): Promise<T | null> {
    return this.sharedState.get<T>(taskId, key);
  }

  /**
   * Write to shared state
   */
  protected async writeState(taskId: string, key: string, value: any): Promise<void> {
    await this.sharedState.set(taskId, key, value);
  }

  /**
   * Append to action history
   */
  protected async appendToHistory(taskId: string, entry: ActionHistoryEntry): Promise<void> {
    await this.sharedState.appendToArray(taskId, 'action_history', entry);
  }

  /**
   * Log cost for tracking
   */
  protected logCost(tokens: number, model: string): void {
    this.logger.log(`Cost: ${tokens} tokens on ${model}`);
  }
}

export interface ActionHistoryEntry {
  agent: string;
  action: string;
  result: 'success' | 'failure';
  timestamp: string;
  details?: any;
}
```

### 9.2 Agent Model Configuration

```typescript
// packages/aria-agent/src/config/agents.config.ts

export const AGENT_MODELS = {
  CLARIFIER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Fast Q&A, user is waiting',
  },
  ORCHESTRATOR: {
    provider: 'bytez',
    model: 'anthropic/claude-opus-4-6',
    description: 'Brain of system - bad plan = everything fails',
  },
  WEB: {
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    description: 'Loops 15-20x, PinchTab gives structured text',
  },
  DESKTOP: {
    provider: 'bytez',
    model: 'anthropic/claude-opus-4-6',
    description: 'User-overridable. Desktop = #1 failure point',
    userSelectable: true,
  },
  PERCEPTION: {
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    fallback: 'google/gemini-2.0-flash',
    description: 'Only Groq vision model, fast, runs every action',
  },
  VERIFIER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Runs 20-30x per task, strict JSON guaranteed',
    strictJson: true,
  },
  RECOVERY: {
    provider: 'bytez',
    model: 'anthropic/claude-sonnet-4-6',
    description: 'Needs creativity, smarter than Groq',
  },
  REPORTER: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    description: 'Reads state, writes summary - zero reasoning',
  },
} as const;

export type AgentRole = keyof typeof AGENT_MODELS;
```

### 9.3 Verifier JSON Schema (Strict)

```typescript
// packages/aria-agent/src/agents/verifier/verifier.schema.ts

export const VERIFIER_SCHEMA = {
  type: 'object',
  properties: {
    action_succeeded: {
      type: 'boolean',
      description: 'Did the action complete successfully?',
    },
    screen_changed: {
      type: 'boolean',
      description: 'Did the screen/page state change after the action?',
    },
    error_detected: {
      type: 'boolean',
      description: 'Was an error message or failure state detected?',
    },
    error_message: {
      type: ['string', 'null'],
      description: 'Description of error if detected, null otherwise',
    },
    retry_recommended: {
      type: 'boolean',
      description: 'Should the action be retried with a different approach?',
    },
    confidence: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for this verification (0.0 to 1.0)',
    },
  },
  required: [
    'action_succeeded',
    'screen_changed',
    'error_detected',
    'error_message',
    'retry_recommended',
    'confidence',
  ],
  additionalProperties: false,
} as const;

export interface VerifierResult {
  action_succeeded: boolean;
  screen_changed: boolean;
  error_detected: boolean;
  error_message: string | null;
  retry_recommended: boolean;
  confidence: number;
}
```

### 9.4 Perception JSON Schema

```typescript
// packages/aria-agent/src/agents/perception/perception.schema.ts

export const PERCEPTION_SCHEMA = {
  type: 'object',
  properties: {
    active_window: {
      type: 'string',
      description: 'Name of the currently active window/application',
    },
    ui_state: {
      type: 'string',
      description: 'Description of current UI state and what is visible',
    },
    clickable_elements: {
      type: 'array',
      items: { type: 'string' },
      description: 'List of clickable UI elements visible on screen',
    },
    errors_visible: {
      type: 'boolean',
      description: 'Are any error messages or dialogs visible?',
    },
    task_relevant_info: {
      type: 'string',
      description: 'Any information on screen relevant to the current task',
    },
  },
  required: [
    'active_window',
    'ui_state',
    'clickable_elements',
    'errors_visible',
    'task_relevant_info',
  ],
  additionalProperties: false,
} as const;

export interface PerceptionResult {
  active_window: string;
  ui_state: string;
  clickable_elements: string[];
  errors_visible: boolean;
  task_relevant_info: string;
}
```

### 9.5 OrchestrationService Implementation (CORRECTED)

```typescript
// packages/aria-agent/src/orchestration/orchestration.service.ts

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly clarifier: ClarifierAgent,
    private readonly orchestrator: OrchestratorAgent,
    private readonly webAgent: WebAgent,
    private readonly desktopAgent: DesktopAgent,
    private readonly verifier: VerifierAgent,
    private readonly recovery: RecoveryAgent,
    private readonly reporter: ReporterAgent,
    private readonly sharedState: SharedStateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async run(userInput: string, taskId: string): Promise<void> {
    try {
      // Step 1: Clarify user intent
      this.emitStatus(taskId, 'clarifying', 'CLARIFIER');
      const clarified = await this.clarifier.run(userInput, taskId);
      await this.sharedState.set(taskId, 'task_goal', clarified);

      // Step 2: Create execution plan
      this.emitStatus(taskId, 'planning', 'ORCHESTRATOR');
      const plan = await this.orchestrator.plan(clarified, taskId);
      
      // Guard: Orchestrator must return a valid plan
      if (!plan?.steps?.length) {
        throw new Error('Orchestrator returned empty plan - cannot proceed');
      }
      
      await this.sharedState.set(taskId, 'execution_plan', plan.steps);

      // Step 3: Execute steps sequentially with escalation
      let stepIndex = 0;
      while (stepIndex < plan.steps.length) {
        const step = plan.steps[stepIndex];
        await this.sharedState.set(taskId, 'current_step', step.id);
        
        let attempts = 0;
        let success = false;
        let replanRequested = false;

        while (!success && attempts < 4 && !replanRequested) {
          attempts++;
          this.logger.log(`Executing step ${step.id}, attempt ${attempts}`);

          // Execute step with appropriate agent
          this.emitStatus(taskId, 'executing', step.type === 'web' ? 'WEB' : 'DESKTOP');
          const result = step.type === 'web'
            ? await this.webAgent.execute(step, taskId)
            : await this.desktopAgent.execute(step, taskId);

          // Verify result
          this.emitStatus(taskId, 'verifying', 'VERIFIER');
          const verification = await this.verifier.check(result, taskId);

          if (verification.action_succeeded) {
            success = true;
            await this.sharedState.appendToArray(taskId, 'action_history', {
              agent: step.type === 'web' ? 'WEB' : 'DESKTOP',
              action: result.action,
              result: 'success',
              timestamp: new Date().toISOString(),
              details: result.details,
            });
            this.logger.log(`Step ${step.id} succeeded`);
          } else {
            // Log failure
            await this.sharedState.appendToArray(taskId, 'failure_log', {
              step: step.id,
              attempt: attempts,
              error: verification.error_message,
              timestamp: new Date().toISOString(),
            });

            // Escalation ladder
            if (attempts === 1) {
              // Fail #1: Working agent retries with different approach
              this.logger.warn(`Step ${step.id} failed, attempt 1 - retrying`);
              continue;
            } else if (attempts === 2) {
              // Fail #2: Recovery agent generates alternative strategies
              this.logger.warn(`Step ${step.id} failed, attempt 2 - calling Recovery`);
              this.emitStatus(taskId, 'recovering', 'RECOVERY');
              await this.recovery.strategize(step, taskId);
              // Recovery writes strategy to shared state, working agent reads it
            } else if (attempts === 3) {
              // Fail #3: Orchestrator replans
              this.logger.warn(`Step ${step.id} failed, attempt 3 - replanning`);
              this.emitStatus(taskId, 'replanning', 'ORCHESTRATOR');
              const newPlan = await this.orchestrator.replan(step, taskId);
              
              if (newPlan && newPlan.steps.length > 0) {
                plan.steps = newPlan.steps;
                stepIndex = -1; // Will be incremented to 0 at end of outer loop
                replanRequested = true;
                this.logger.log('Replan successful, restarting from step 0');
                break; // Exit retry loop
              } else {
                this.logger.error('Replan failed, continuing to attempt 4');
              }
            } else if (attempts === 4) {
              // Fail #4: Notify user and pause task
              this.logger.error(`Step ${step.id} failed after 4 attempts`);
              await this.notifyUser(taskId, step, verification.error_message);
              throw new Error(
                `Task ${taskId} failed after 4 attempts on step ${step.id}: ${verification.error_message}`
              );
            }
          }
        }

        stepIndex++;
      }

      // Step 4: Generate summary and notify user
      this.emitStatus(taskId, 'reporting', 'REPORTER');
      await this.reporter.summarize(taskId);
      this.emitStatus(taskId, 'completed', null);

    } catch (error) {
      this.logger.error(`Task ${taskId} failed:`, error);
      this.emitStatus(taskId, 'failed', null);
      throw error;
    }
  }

  private async notifyUser(taskId: string, step: any, error: string): Promise<void> {
    await this.sharedState.set(taskId, 'status', 'needs_help');
    await this.sharedState.set(taskId, 'error', {
      step: step.id,
      message: error,
      timestamp: new Date().toISOString(),
    });
    this.emitStatus(taskId, 'needs_help', null);
  }

  private emitStatus(taskId: string, status: string, activeAgent: string | null): void {
    this.eventEmitter.emit('task.status', {
      taskId,
      status,
      activeAgent,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Key Points:**
- **CRITICAL FIX**: Replan now uses `stepIndex = -1` to restart from beginning of new plan
- No framework - just a plain NestJS service
- Sequential execution - one step at a time
- 4-attempt escalation ladder with proper replan handling
- EventEmitter2 used ONLY for UI notifications, NOT agent handoffs
- All state goes through SharedStateService with automatic 24-hour TTL
- Each agent receives taskId and uses BaseAgent methods to access shared state
- **Empty plan guard**: Throws error if Orchestrator returns empty plan

### 9.6 ClarifierAgent Output Schema

```typescript
// packages/aria-agent/src/agents/clarifier/clarifier.types.ts

export interface ClarifiedTask {
  original_input: string;
  clarified_goal: string;
  constraints: string[];      // e.g., "only invoices from March"
  assumptions: string[];      // e.g., "assuming Gmail is already logged in"
  task_type: 'web' | 'desktop' | 'mixed';
  questions_asked: number;    // how many clarifying questions were needed
}
```

**Usage:**
- Clarifier returns this from `run(userInput, taskId)`
- Orchestrator receives this as input to `plan(clarified, taskId)`
- Stored in shared state at `task:{taskId}:task_goal`

### 9.7 OrchestratorAgent Output Schema

```typescript
// packages/aria-agent/src/agents/orchestrator/orchestrator.types.ts

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimated_duration_minutes: number;
  complexity: 'simple' | 'moderate' | 'complex';
}

export interface ExecutionStep {
  id: string;                 // "step_1", "step_2", etc.
  type: 'web' | 'desktop';
  description: string;        // what to do: "Navigate to Gmail and click Compose"
  success_criteria: string;   // how Verifier knows it worked: "Compose window is visible"
  context?: string;           // extra info the agent needs
  depends_on?: string[];      // IDs of steps that must complete first
}
```

**Usage:**
- Orchestrator returns this from `plan(clarified, taskId)` and `replan(step, taskId)`
- OrchestrationService validates `plan.steps.length > 0` before proceeding
- Stored in shared state at `task:{taskId}:execution_plan`

### 9.8 RecoveryAgent Output Schema

```typescript
// packages/aria-agent/src/agents/recovery/recovery.types.ts

export interface RecoveryStrategy {
  strategy: string;           // chosen strategy description
  avoid: string[];            // what NOT to try (already failed)
  approach: string;           // specific approach to take
  alternatives: Array<{       // other options considered
    strategy: string;
    score: number;            // 0.0 to 1.0
    reasoning: string;
  }>;
}
```

**Usage:**
- Recovery returns this from `strategize(step, taskId)`
- Written to shared state at `task:{taskId}:recovery_strategy`
- Web/Desktop agents check this key before each retry attempt
- If present, agent uses the suggested approach instead of repeating previous action

### 9.9 ReporterAgent Output Schema

```typescript
// packages/aria-agent/src/agents/reporter/reporter.types.ts

export interface TaskSummary {
  task_goal: string;          // what was asked
  steps_completed: number;    // how many succeeded
  steps_failed: number;       // how many failed
  total_cost: number;         // from CostTrackingService
  duration_seconds: number;   // total execution time
  final_status: 'completed' | 'failed' | 'needs_help';
  human_summary: string;      // readable text for user
  agent_breakdown: Array<{    // cost per agent
    agent: string;
    calls: number;
    cost: number;
  }>;
  errors?: string[];          // if any errors occurred
}
```

**Usage:**
- Reporter returns this from `summarize(taskId)`
- Stored in shared state at `task:{taskId}:summary`
- Persisted to PostgreSQL before Redis TTL expires
- Optionally sent via Telegram if configured

### 9.10 Web/Desktop Agent Output Schema

```typescript
// packages/aria-agent/src/agents/web/action-result.types.ts

export interface ActionResult {
  action: string;             // what was done: "clicked login button"
  details: any;               // agent-specific details
  screenshot?: string;        // base64, desktop only
  url?: string;               // current URL, web only
  elements?: string[];        // PinchTab element refs, web only
  error?: string;             // if something went wrong
  timestamp: string;          // ISO 8601
}
```

**Usage:**
- Web/Desktop agents return this from `execute(step, taskId)`
- Verifier receives this as input to `check(result, taskId)`
- Logged to shared state `action_history` array

---

**Next Steps**: Begin Phase 1 (Foundation & Infrastructure) starting with TASK-000 (Feature flag)
