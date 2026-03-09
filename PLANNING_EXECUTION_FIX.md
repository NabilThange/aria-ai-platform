# Planning Execution Fix - Critical Logic Error

## Problem Identified

The system was marking tasks as COMPLETED immediately after the user selected a plan, without the agent actually doing any work. This was a fundamental misunderstanding of the execution flow.

### What Was Happening (WRONG):
1. User selects plan → Plan status = APPROVED
2. **ExecutorService immediately runs terminal commands** ← This was the problem!
3. Plan status = COMPLETED
4. Agent processor sees COMPLETED plan → Marks task as COMPLETED
5. **Agent never actually does anything!**

### What Should Happen (CORRECT):
1. User selects plan → Plan status = APPROVED
2. Agent processor sees APPROVED plan → Injects plan into system prompt
3. **Agent uses its computer control tools to execute the plan**
4. Agent takes screenshots, verifies steps, and completes the task
5. Agent marks task as COMPLETED when done

## Root Cause

The ExecutorService was being called automatically from the `approvePlan` endpoint, which would:
- Run terminal commands directly (bypassing the agent)
- Mark the plan as COMPLETED
- Cause the agent processor to think the work was done

This defeats the entire purpose of having an AI agent! The agent should be doing the work, not a simple command executor.

## Fixes Applied

### 1. Removed Automatic ExecutorService Call
**File**: `packages/aria-agent/src/planner/planner.controller.ts`

Removed the automatic call to `executorService.executePlan()` from the approve endpoint. The ExecutorService is now only for future use cases where we want direct command execution without agent involvement.

### 2. Updated Agent Processor Logic
**File**: `packages/aria-agent/src/agent/agent.processor.ts`

**Changed**: Removed the logic that marked tasks as COMPLETED when plan status was COMPLETED.

**Added**: 
- When plan status is APPROVED or EXECUTING, the agent proceeds with normal execution
- The plan is injected into the agent's system prompt as context
- The agent uses its computer control tools to execute the steps
- The agent completes the task when it's actually done

### 3. Plan Context Injection
**File**: `packages/aria-agent/src/agent/agent.processor.ts`

Added logic to inject the approved plan into the agent's system prompt:
- Lists all steps from the selected execution path
- Includes commands, descriptions, and verification steps
- Instructs the agent to use computer control tools
- Tells the agent to take screenshots and verify each step

## How It Works Now

### Flow:
1. **Task Created** with `planningEnabled: true`
2. **Plan Generated** by LLM with multiple execution paths
3. **User Selects Path** → Plan status = APPROVED
4. **Agent Starts Execution**:
   - Sees APPROVED plan
   - Gets plan injected into system prompt
   - Uses computer control tools (bash, screenshot, etc.)
   - Follows the steps from the plan
   - Verifies each step
5. **Agent Completes Task** when all steps are done

### Example System Prompt Addition:
```
## APPROVED EXECUTION PLAN

You have an approved execution plan for this task. Follow these steps:

**Strategy:** TERMINAL
**Estimated Duration:** 2 seconds
**Estimated Tokens:** 200

**Steps to execute:**

1. Create nabil.txt with content using echo
   Description: Use echo command to create file with content in one step
   Type: TERMINAL
   Command: echo 'Hi Nabil' > nabil.txt
   Verification: File exists and contains correct content

**IMPORTANT:** Execute these steps using your computer control tools. Take screenshots to verify each step. Mark the task as completed when all steps are done successfully.
```

## Testing

To test the fix:

1. Create a task with planning enabled
2. Wait for plan generation
3. Select a path
4. **Watch the agent actually execute the steps** using computer control tools
5. Verify the agent takes screenshots and completes the task properly

## What About ExecutorService?

The ExecutorService is still available for future use cases where we want:
- Direct command execution without agent involvement
- Automated testing of plans
- Background task execution

But for normal operation, the agent should be doing the work!

## Files Modified

1. `packages/aria-agent/src/planner/planner.controller.ts` - Removed automatic executor call
2. `packages/aria-agent/src/agent/agent.processor.ts` - Updated plan handling logic and added plan context injection

## Expected Behavior After Fix

- Task stays in RUNNING status while agent works
- Agent uses computer control tools to execute plan steps
- Agent takes screenshots to verify progress
- Task only marked as COMPLETED when agent finishes
- User can see the agent actually working in the VNC viewer
