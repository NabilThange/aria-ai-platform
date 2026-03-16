# Clarification Flow Bug Fix

## Problem
When the agent asked for clarification:
1. Task status was set to NEEDS_HELP
2. The update() method automatically called takeOver() which set control to USER
3. User added a message but nothing happened
4. User had to manually click "Proceed" button
5. Even clicking "Proceed" didn't work properly - task got stuck in RUNNING state

## Root Causes

### Issue 1: Automatic takeOver() Interference
The automatic takeOver() call in TasksService.update() when status changed to NEEDS_HELP was interfering with the clarification flow.

### Issue 2: No Auto-Resume on User Message
When user added a message during clarification, the system didn't automatically resume the task. It expected explicit "Proceed" button click.

### Issue 3: Resume Handler Didn't Restart Orchestration
The task.resume event handler only worked when isProcessing was true, but orchestration had already returned early during clarification.

## Solution

### 1. Removed Automatic takeOver() Call
**File:** `packages/aria-agent/src/tasks/tasks.service.ts`

Removed the automatic takeOver() when status changes to NEEDS_HELP. This prevents premature control switch.

### 2. Explicit Control Handoff in Orchestration
**File:** `packages/aria-agent/src/orchestration/orchestration.service.ts`

When clarification is needed, the orchestration service now explicitly:
- Sets task status to NEEDS_HELP
- Calls takeOver() to switch control to USER
- This ensures proper sequencing

### 3. Enhanced Resume Handler
**File:** `packages/aria-agent/src/agent/agent.processor.ts`

The task.resume event handler now:
- Checks if task was paused for clarification
- Restarts orchestration even when isProcessing is false
- Properly handles the clarification resume flow

### 4. Auto-Resume on User Message
**File:** `packages/aria-agent/src/tasks/tasks.service.ts`

The addTaskMessage method now:
- Detects if task is paused for clarification (NEEDS_HELP + USER control)
- Automatically calls resume() when user adds a message
- Provides seamless UX - user just types response, no need to click "Proceed"

## Flow After Fix

1. Agent needs clarification
2. Orchestration service sets status to NEEDS_HELP and calls takeOver()
3. User sees clarification question in UI
4. User types response and sends message
5. addTaskMessage detects clarification state and automatically resumes
6. task.resume event handler restarts orchestration
7. Task continues with user's clarification response
8. Task completes or asks for more clarification

## Files Modified
- `packages/aria-agent/src/tasks/tasks.service.ts` (2 changes)
- `packages/aria-agent/src/agent/agent.processor.ts`
- `packages/aria-agent/src/orchestration/orchestration.service.ts`
- `packages/aria-agent/src/orchestration/orchestration.module.ts`
