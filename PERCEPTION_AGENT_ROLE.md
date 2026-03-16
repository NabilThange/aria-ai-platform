# Perception Agent Role in ARIA Architecture

## Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION PIPELINE                        │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: CLARIFICATION
  └─→ ClarifierAgent: Clarifies user input
      └─→ Output: ClarifiedTask

PHASE 2: PLANNING
  └─→ OrchestratorAgent: Creates execution plan
      └─→ Output: ExecutionPlan (steps with success_criteria)

PHASE 3: EXECUTION (Sequential Loop)
  └─→ For each step:
      ├─→ WebAgent (if step.type === 'web')
      │   ├─→ Navigates, clicks, types, etc.
      │   ├─→ NO Perception Agent (web-only)
      │   ├─→ Uses PinchTab tools directly
      │   └─→ Returns: ActionResult
      │
      ├─→ DesktopAgent (if step.type === 'desktop')
      │   ├─→ Takes screenshot
      │   ├─→ Calls PerceptionAgent to analyze screenshot
      │   │   └─→ PerceptionAgent extracts UI state, clickable elements, errors
      │   ├─→ Uses perception result to make decisions
      │   ├─→ Executes desktop actions
      │   └─→ Returns: ActionResult
      │
      └─→ VerifierAgent: Validates the action result
          ├─→ Checks if action succeeded
          ├─→ Returns: VerifierResult (action_succeeded: boolean)
          └─→ If failed: Escalate to Recovery/Replan

PHASE 4: REPORTING
  └─→ ReporterAgent: Generates summary
      └─→ Output: Task summary
```

## Perception Agent Details

### What It Does
- **Vision Processing**: Analyzes desktop screenshots using Groq Llama 4 Scout (vision model)
- **UI State Extraction**: Identifies active windows, UI elements, clickable buttons, error messages
- **Structured Output**: Returns JSON with:
  - `active_window`: Current window title
  - `ui_state`: Description of current UI state
  - `clickable_elements`: List of interactive elements
  - `errors_visible`: Boolean indicating if errors are shown
  - `task_relevant_info`: Information relevant to the current task

### When It's Used
- **ONLY for DesktopAgent steps** (not for WebAgent)
- Called after every desktop action to analyze the result
- Runs in a loop: Action → Screenshot → Perception → Decision → Next Action

### Why NOT Used for WebAgent
- WebAgent has **PinchTab tools** that provide structured element data
- PinchTab's `snapshot()` method returns:
  - HTML content
  - Element references (refs)
  - Element attributes
  - Page URL and title
- This structured data is better than vision-based analysis
- WebAgent doesn't need vision processing because it has direct DOM access

## The Missing Piece: WebAgent Perception

**Current Issue**: WebAgent has no equivalent to DesktopAgent's Perception Agent

### What WebAgent Currently Does
1. Takes snapshot via PinchTab (structured data)
2. Passes snapshot to LLM
3. LLM decides next action
4. **Problem**: LLM doesn't understand if success criteria are met

### What WebAgent SHOULD Do (Fixed)
1. Takes snapshot via PinchTab
2. **NEW**: Evaluates success criteria against snapshot (evaluateSuccessCriteria method)
3. If criteria met → Mark step complete
4. If not met → Pass to LLM for next action
5. LLM decides next action

## Agent Coordination Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    DESKTOP TASK FLOW                          │
└──────────────────────────────────────────────────────────────┘

DesktopAgent.execute(step)
  ├─→ Iteration 1:
  │   ├─→ Take screenshot
  │   ├─→ PerceptionAgent.run(screenshot)
  │   │   └─→ Returns: { active_window, ui_state, clickable_elements, ... }
  │   ├─→ Build prompt with perception result
  │   ├─→ LLM decides action
  │   └─→ Execute action
  │
  ├─→ Iteration 2:
  │   ├─→ Take screenshot
  │   ├─→ PerceptionAgent.run(screenshot)
  │   │   └─→ Returns: Updated UI state
  │   ├─→ Build prompt with new perception
  │   ├─→ LLM decides next action
  │   └─→ Execute action
  │
  └─→ ... repeat until success or max iterations

OrchestrationService
  ├─→ Get ActionResult from DesktopAgent
  ├─→ VerifierAgent.check(ActionResult)
  │   └─→ Returns: { action_succeeded: boolean, error_message: string }
  ├─→ If succeeded: Move to next step
  └─→ If failed: Escalate to Recovery/Replan


┌──────────────────────────────────────────────────────────────┐
│                    WEB TASK FLOW                              │
└──────────────────────────────────────────────────────────────┘

WebAgent.execute(step)
  ├─→ Iteration 1:
  │   ├─→ Get snapshot via PinchTab
  │   ├─→ **NEW**: evaluateSuccessCriteria(snapshot)
  │   │   └─→ If criteria met → Mark complete, break
  │   ├─→ Build prompt with snapshot
  │   ├─→ LLM decides action
  │   └─→ Execute action
  │
  ├─→ Iteration 2:
  │   ├─→ Get snapshot via PinchTab
  │   ├─→ **NEW**: evaluateSuccessCriteria(snapshot)
  │   │   └─→ If criteria met → Mark complete, break
  │   ├─→ Build prompt with snapshot
  │   ├─→ LLM decides next action
  │   └─→ Execute action
  │
  └─→ ... repeat until success or max iterations (20)

OrchestrationService
  ├─→ Get ActionResult from WebAgent
  ├─→ VerifierAgent.check(ActionResult)
  │   └─→ Returns: { action_succeeded: boolean, error_message: string }
  ├─→ If succeeded: Move to next step
  └─→ If failed: Escalate to Recovery/Replan
```

## Why Perception Agent Isn't Used for Web

| Aspect | WebAgent | DesktopAgent |
|--------|----------|--------------|
| **Data Source** | PinchTab (structured) | Screenshot (visual) |
| **Element Access** | Direct DOM refs | Vision-based detection |
| **Accuracy** | 100% (refs are exact) | ~80% (vision-based) |
| **Speed** | Fast (no vision model) | Slower (vision model) |
| **Cost** | Cheap (no vision) | Expensive (vision model) |
| **Perception Needed** | No (has structured data) | Yes (needs UI understanding) |

## Summary

**Perception Agent's Role:**
- Specialized for **DesktopAgent only**
- Analyzes screenshots to extract UI state
- Provides structured understanding of desktop UI
- Enables DesktopAgent to make informed decisions

**WebAgent's Approach:**
- Uses **PinchTab structured data** instead of vision
- Now has **evaluateSuccessCriteria()** for auto-completion
- Doesn't need Perception Agent because it has direct DOM access
- More efficient and accurate than vision-based approach

**The Fix Applied:**
- Added `evaluateSuccessCriteria()` to WebAgent (acts like a lightweight perception layer)
- Automatically detects when success criteria are met
- Prevents infinite loops by forcing completion at max iterations
- Eliminates need for Perception Agent in web automation
