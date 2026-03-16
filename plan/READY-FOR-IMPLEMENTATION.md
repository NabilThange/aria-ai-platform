# ✅ Plan Ready for Implementation

**Version**: 1.1  
**Date**: 2026-03-12  
**Status**: All critical issues resolved

---

## Critical Fixes Applied

### 🐛 Bug Fixes

1. **Replan Bug Fixed** - OrchestrationService now correctly restarts from step 0 after replanning using `stepIndex = -1` pattern
2. **Event-Driven Contradiction Removed** - Clarified that agents use sequential async/await, EventEmitter2 only for UI notifications

### 📝 Complete Definitions Added

3. **BaseAgent Abstract Class** - Full implementation in Section 9.1 with all required methods
4. **Verifier JSON Schema** - Exact strict JSON schema with all 6 required fields
5. **Perception JSON Schema** - Exact schema with all 5 required fields  
6. **Agent Model Configuration** - Complete AGENT_MODELS with provider/model for each agent
7. **Redis TTL Strategy** - PAT-006 added: 24-hour TTL on all shared state keys
8. **Clarifier Q&A Dependency** - TASK-032 ↔ TASK-060 dependency documented

---

## What the Coding Agent Gets

### Zero Ambiguity
- ✅ Exact BaseAgent interface to implement
- ✅ Exact JSON schemas for Verifier and Perception
- ✅ Exact model assignments for each agent
- ✅ Complete OrchestrationService implementation with corrected replan logic
- ✅ Clear distinction: sequential awaits for agents, EventEmitter2 for UI only

### No Guessing Required
- ✅ Section 9 contains all core implementations
- ✅ Every schema is defined with TypeScript types
- ✅ Every agent knows which model to use
- ✅ Every file reference points to Section 9 for details

### No Silent Failures
- ✅ Replan logic correctly restarts from new plan
- ✅ Redis TTL prevents memory leaks
- ✅ Verifier schema matches OrchestrationService expectations
- ✅ Perception schema matches Desktop Agent expectations

---

## Implementation Checklist

Before starting Phase 1, verify:

- [ ] Read Section 9 completely - it contains all core implementations
- [ ] Understand BaseAgent abstract class (Section 9.1)
- [ ] Understand AGENT_MODELS configuration (Section 9.2)
- [ ] Understand Verifier schema (Section 9.3)
- [ ] Understand Perception schema (Section 9.4)
- [ ] Understand OrchestrationService with corrected replan logic (Section 9.5)
- [ ] Note: EventEmitter2 is for UI notifications ONLY, not agent handoffs
- [ ] Note: All shared state keys have 24-hour TTL (PAT-006)

---

## Start Here

**Phase 1, TASK-001**: Install and configure Redis in Docker Compose

The plan is now solid. No more ambiguity. No more contradictions. No more missing definitions.

Ready to build.
