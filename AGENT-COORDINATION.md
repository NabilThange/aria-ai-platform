# Agent Coordination & Context Sharing

## Overview

Your ARIA multi-agent system uses **shared state** to coordinate between agents. Each agent receives context about the overall plan and knows what other agents will do next.

## How Agents Receive Instructions

### 1. System Prompt (Static Context)
Each agent has a system prompt that defines:
- Its identity and purpose
- What it can and cannot do
- Tool usage rules
- Safety guidelines

**Location**: `packages/aria-agent/src/config/system-prompts.config.ts`

### 2. User Prompt (Dynamic Context)
Each agent receives a dynamically built prompt for each step containing:
- **Current step details** (description, success criteria)
- **Full execution plan** (all steps, showing which agent handles each)
- **Current state** (screenshot/page snapshot)
- **Recovery strategy** (if retrying after failure)
- **Downloaded files** (if any)
- **Iteration count** (progress tracking)

**Built by**: `buildDecisionPrompt()` method in each agent

## Shared State Architecture

All agents read from and write to a centralized shared state using the `SharedStateService`:

```typescript
// Reading from shared state
const executionPlan = await this.readState<any>(taskId, 'execution_plan');
const recoveryStrategy = await this.readState<RecoveryStrategy>(taskId, 'recovery_strategy');

// Writing to shared state
await this.writeState(taskId, 'current_step', step.id);
await this.appendToHistory(taskId, { agent: 'WEB', action: 'navigate', ... });
```

### Shared State Keys

| Key | Type | Purpose | Written By | Read By |
|-----|------|---------|------------|---------|
| `task_goal` | ClarifiedTask | Original user intent | Clarifier | Orchestrator, Reporter |
| `execution_plan` | ExecutionPlan | Full step-by-step plan | Orchestrator | Web, Desktop, Verifier |
| `current_step` | string | Current step ID | Orchestration Service | All agents |
| `recovery_strategy` | RecoveryStrategy | Alternative approach after failure | Recovery | Web, Desktop |
| `action_history` | Array | Log of all actions taken | Web, Desktop, Verifier | Recovery, Reporter |
| `failure_log` | Array | Log of all failures | Verifier | Recovery, Orchestrator |
| `downloaded_files` | string[] | List of downloaded files | Desktop | Desktop, Web |

## Agent Coordination Flow

### Example: "Open Firefox and go to Wikipedia to search for India"

#### Phase 1: Planning (Orchestrator)
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Open Firefox browser",
      "success_criteria": "Firefox window is open and visible"
    },
    {
      "id": "step_2",
      "type": "web",
      "description": "Navigate to wikipedia.org",
      "success_criteria": "Wikipedia homepage is loaded"
    },
    {
      "id": "step_3",
      "type": "web",
      "description": "Search for 'India' on Wikipedia",
      "success_criteria": "Search results for India are displayed"
    }
  ]
}
```

Orchestrator writes this plan to shared state: `execution_plan`

#### Phase 2: Execution (Desktop Agent - Step 1)

**Desktop Agent receives:**
```
🎯 ULTIMATE GOAL: Complete all 3 steps to finish the task

**CURRENT STEP: step_1 (1/3)**
Description: Open Firefox browser
Success Criteria: Firefox window is open and visible

📋 Steps After This (DO NOT DO THESE YET):
  1. [WEB] Navigate to wikipedia.org
  2. [WEB] Search for 'India' on Wikipedia

⚠️  FOCUS ONLY ON CURRENT STEP - Do not perform future steps!
⚠️  Some future steps require Web Agent - you will hand off after completing this step!

**Current Step Details**:
- Description: Open Firefox browser
- Success Criteria: Firefox window is open and visible
- Iteration: 1/15
- Last Action: None

**What You See (Perception Analysis)**:
- Active Window: Desktop
- UI State: Desktop with taskbar visible
- Clickable Elements: Firefox icon, Terminal icon, ...
```

Desktop Agent:
1. Sees it needs to open Firefox
2. Knows Web Agent will handle the next 2 steps
3. Focuses ONLY on opening Firefox
4. Clicks Firefox icon or runs `firefox` command
5. Verifies Firefox window is open
6. Marks step complete

#### Phase 3: Execution (Web Agent - Step 2)

**Web Agent receives:**
```
🎯 ULTIMATE GOAL: Complete all 3 steps to finish the task

**CURRENT STEP: step_2 (2/3)**
Description: Navigate to wikipedia.org
Success Criteria: Wikipedia homepage is loaded

📋 Steps After This (DO NOT DO THESE YET):
  1. [WEB] Search for 'India' on Wikipedia

⚠️  FOCUS ONLY ON CURRENT STEP - Do not perform future steps!

**Step**: Navigate to wikipedia.org
**Success Criteria**: Wikipedia homepage is loaded
**Iteration**: 1/20
**Last Action**: None

**Current Page Snapshot** (45 elements):
[e1] <input> Search Wikipedia ...
[e2] <a> Main Page ...
...
```

Web Agent:
1. Sees it needs to navigate to Wikipedia
2. Knows another web step follows (search)
3. Focuses ONLY on navigation
4. Calls `pinchtab_navigate` with url="https://wikipedia.org"
5. Verifies Wikipedia homepage loaded
6. Marks step complete

#### Phase 4: Execution (Web Agent - Step 3)

**Web Agent receives:**
```
🎯 ULTIMATE GOAL: Complete all 3 steps to finish the task

**CURRENT STEP: step_3 (3/3)**
Description: Search for 'India' on Wikipedia
Success Criteria: Search results for India are displayed

✅ This is the FINAL step - complete it and you are done!

**Step**: Search for 'India' on Wikipedia
**Success Criteria**: Search results for India are displayed
**Iteration**: 1/20
**Last Action**: None

**Current Page Snapshot** (45 elements):
[e1] <input> Search Wikipedia ...
[e2] <button> Search ...
...
```

Web Agent:
1. Sees this is the final step
2. Focuses on searching for India
3. Fills search box with "India"
4. Clicks search button
5. Verifies search results displayed
6. Marks step complete

## Key Coordination Features

### 1. Plan Awareness
Both agents know:
- Total number of steps
- Which step they're on
- What steps come next
- Which agent handles each step

This prevents:
- ❌ Desktop Agent trying to navigate web pages
- ❌ Web Agent trying to open desktop applications
- ❌ Agents doing future steps prematurely
- ❌ Agents losing context of the overall goal

### 2. Handoff Warnings
Agents are explicitly warned when they'll hand off to another agent:
```
⚠️  Some future steps require Web Agent - you will hand off after completing this step!
```

This helps agents:
- ✅ Focus on their current step only
- ✅ Not worry about future steps outside their scope
- ✅ Complete their step cleanly for the next agent

### 3. Recovery Coordination
When a step fails, the Recovery Agent writes a strategy to shared state:
```json
{
  "strategy": "Use terminal command instead of GUI",
  "avoid": ["Clicking Firefox icon"],
  "approach": "Run 'firefox' command in terminal"
}
```

The executing agent reads this and:
- Avoids failed approaches
- Tries the suggested alternative
- Has context about what already failed

### 4. Action History
All agents log their actions to shared state:
```json
{
  "agent": "DESKTOP",
  "action": "Opened Firefox browser",
  "result": "success",
  "timestamp": "2024-03-14T10:30:00Z",
  "details": { "iterations": 2 }
}
```

This allows:
- Recovery Agent to analyze what worked/failed
- Reporter Agent to summarize what happened
- Orchestrator to make informed replanning decisions

## What Changed

### Before (Missing Coordination)
- ❌ Web Agent didn't know about the full plan
- ❌ Web Agent couldn't see what Desktop Agent did
- ❌ Agents worked in isolation without context
- ❌ Risk of agents doing each other's work

### After (Full Coordination)
- ✅ Both agents read execution plan from shared state
- ✅ Both agents see which steps come next
- ✅ Both agents know which agent handles each step
- ✅ Clear handoff warnings prevent scope confusion
- ✅ Plan context shows agent types: `[WEB]` or `[DESKTOP]`

## Code Changes Made

### 1. Web Agent (`web.agent.ts`)
```typescript
// Added: Read execution plan for coordination
const executionPlan = await this.readState<any>(taskId, 'execution_plan');

// Added: Pass execution plan to prompt builder
const prompt = this.buildDecisionPrompt(
  step,
  snapshot,
  iteration,
  lastAction,
  recoveryStrategy,
  executionPlan, // NEW
);

// Added: Plan context in prompt
let planContext = '';
if (executionPlan && executionPlan.steps) {
  const currentStepIndex = executionPlan.steps.findIndex((s: any) => s.id === step.id);
  const totalSteps = executionPlan.steps.length;
  const remainingSteps = executionPlan.steps.slice(currentStepIndex + 1);
  
  planContext = `🎯 ULTIMATE GOAL: Complete all ${totalSteps} steps...`;
  // Shows remaining steps with agent types
  // Warns about handoffs to Desktop Agent
}
```

### 2. Desktop Agent (`desktop.agent.ts`)
```typescript
// Already had: Read execution plan for coordination
const executionPlan = await this.readState<any>(taskId, 'execution_plan');

// Updated: Show agent types in remaining steps
${remainingSteps.map((s: any, i: number) => 
  `  ${i + 1}. [${s.type.toUpperCase()}] ${s.description}`
).join('\n')}

// Added: Warn about handoffs to Web Agent
${remainingSteps.some((s: any) => s.type === 'web') ? 
  '⚠️  Some future steps require Web Agent - you will hand off after completing this step!' 
  : ''}
```

### 3. Orchestration Service (`orchestration.service.ts`)
```typescript
// Already correct: Routes steps based on type
const result = step.type === 'web'
  ? await this.webAgent.execute(step, taskId)
  : await this.desktopAgent.execute(step, taskId);

// Enhanced: Better logging showing agent distribution
const webSteps = plan.steps.filter(s => s.type === 'web').length;
const desktopSteps = plan.steps.filter(s => s.type === 'desktop').length;
this.logger.log(`   🌐 Web Agent: ${webSteps} steps | 💻 Desktop Agent: ${desktopSteps} steps`);
```

## Testing the Coordination

Try these tasks to verify coordination:

### Test 1: Desktop → Web Handoff
**Task**: "Open Firefox and search Google for weather"

**Expected Plan**:
1. [DESKTOP] Open Firefox browser
2. [WEB] Navigate to google.com
3. [WEB] Search for "weather"

**Verify**:
- Desktop Agent opens Firefox and stops
- Web Agent takes over for navigation
- Web Agent performs search

### Test 2: Web → Desktop Handoff
**Task**: "Download a file from example.com and rename it"

**Expected Plan**:
1. [WEB] Navigate to example.com
2. [WEB] Click download button
3. [DESKTOP] Rename downloaded file

**Verify**:
- Web Agent handles download
- Desktop Agent takes over for file operation

### Test 3: Multiple Handoffs
**Task**: "Create a file, upload it to Google Drive, then delete the local copy"

**Expected Plan**:
1. [DESKTOP] Create file with content
2. [WEB] Navigate to Google Drive
3. [WEB] Upload file
4. [DESKTOP] Delete local file

**Verify**:
- Agents alternate smoothly
- Each agent knows what comes next
- No scope confusion

## Benefits of This Architecture

1. **Clear Separation of Concerns**: Each agent knows its role
2. **Context Awareness**: Agents understand the bigger picture
3. **Smooth Handoffs**: Agents prepare for transitions
4. **Failure Recovery**: Shared context enables better recovery
5. **Debugging**: Action history shows full execution flow
6. **Scalability**: Easy to add more specialized agents

## Future Enhancements

Potential improvements:
- Parallel execution (when steps don't depend on each other)
- Agent-to-agent messaging (direct communication)
- Shared memory (agents can leave notes for each other)
- Dynamic replanning (agents can request plan changes mid-execution)
