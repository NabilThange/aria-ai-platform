# ARIA Agent Logging Improvements

## Overview
Enhanced logging system to provide complete visibility into agent execution flow, showing which agents fire up, their inputs/outputs, tool usage, and transitions between agents.

## What's New

### 1. Orchestration-Level Logging
**Location**: `orchestration.service.ts`

#### Task Start/End
```
================================================================================
🚀 ORCHESTRATION STARTED - Task ID: abc123
📝 User Input: "Send an email to john@example.com..."
================================================================================
```

#### Phase Transitions
Each phase now shows clear boundaries:
```
────────────────────────────────────────────────────────────────────────────────
📋 PHASE 1: CLARIFICATION
🤖 Agent: CLARIFIER
────────────────────────────────────────────────────────────────────────────────
```

#### Agent Input/Output
```
📥 Input to Clarifier: "Send an email..."
📤 Output from Clarifier:
{
  "clarified_goal": "...",
  "task_type": "web",
  ...
}
💰 Tokens Used: 1234 | Cost: $0.000123
```

#### Execution Plan Display
```
📊 Plan Summary:
   Total Steps: 5
   Web Steps: 4
   Desktop Steps: 1

📝 Execution Steps:
   1. [WEB] step_1: Navigate to Gmail
   2. [WEB] step_2: Click Compose button
   3. [WEB] step_3: Fill email form
   4. [WEB] step_4: Click Send
   5. [DESKTOP] step_5: Take screenshot of confirmation
```

### 2. Step-Level Logging
**Location**: `orchestration.service.ts`

Each step shows detailed execution info:
```
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🔧 STEP 1/5: step_1
🤖 Agent: WEB_AGENT
📝 Description: Navigate to Gmail
🎯 Success Criteria: Gmail inbox is visible
📋 Context: {"url": "https://gmail.com"}
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

   🔄 Attempt 1/4
   🤖 Executing with WEB_AGENT...
```

### 3. Agent LLM Response Logging
**Location**: `web.agent.ts`, `desktop.agent.ts`

Shows complete LLM interaction:
```
   🤖 WEB_AGENT LLM Response (Iteration 1):
      Model: llama-4-scout-120b
      Tokens: 456 | Cost: $0.000046
      Content Blocks: 2
      Block 1: text
         Text: I need to navigate to Gmail first. I'll use the pinchtab_navigate tool...
      Block 2: tool_use
         Tool: pinchtab_navigate
         Input: {"url":"https://gmail.com"}

   🔧 Processing response...
   ✅ Tool call detected: pinchtab_navigate
   🚀 Executing tool: pinchtab_navigate
```

### 4. Tool Execution Logging
**Location**: `web.agent.ts`, `desktop.agent.ts`

Detailed tool execution traces with results:
```
🌐 [WebAgent] Executing tool: pinchtab_navigate
   Tool input: {"url":"https://gmail.com"}
   → Navigating to: https://gmail.com
   ✓ Tool Result: Navigation initiated to https://gmail.com
✅ [WebAgent] Tool execution completed: pinchtab_navigate
   ⏳ Waiting 1s for page to settle...
```

For tools that return data:
```
🌐 [WebAgent] Executing tool: pinchtab_list_tabs
   Tool input: {"instanceId":"abc123"}
   → Listing tabs for instance: abc123
   ✓ Tool Result: Found 3 tabs
      1. Gmail - https://mail.google.com/mail/u/0/#inbox
      2. Google - https://www.google.com
      3. GitHub - https://github.com
✅ [WebAgent] Tool execution completed: pinchtab_list_tabs
```

For snapshot tool:
```
🌐 [WebAgent] Executing tool: pinchtab_get_snapshot
   → Getting page snapshot
   ✓ Tool Result: Snapshot captured
      URL: https://mail.google.com/mail/u/0/#inbox
      Title: Inbox (3) - john@example.com - Gmail
      Elements: 47 interactive elements
      Sample elements: compose-button, inbox-link, settings-icon
✅ [WebAgent] Tool execution completed: pinchtab_get_snapshot
```

For desktop tools:
```
🖥️  [DesktopAgent] Executing tool: computer_left_click
   Tool input: {"x":100,"y":200}
   → Clicking at [100, 200] (left, count: 1)
   📤 Sending to VNC API: {"action":"click_mouse","coordinates":{"x":100,"y":200},"button":"left","clickCount":1}
   ✓ Tool Result: VNC API responded with status 200
      Success: true
      Coordinates: [100, 200]
✅ [DesktopAgent] Tool execution completed: computer_left_click
   ⏳ Waiting 1s for UI to update...
```

### 5. Verification Logging
Shows verifier agent checking results:
```
   🔍 Verifying with VERIFIER_AGENT...
   📤 VERIFIER_AGENT Output:
      Success: true
      💰 Tokens: 234 | Cost: $0.000023

   ✅ Step 1 COMPLETED successfully in 3456ms
```

### 6. Escalation Logging
Clear visibility into failure recovery:
```
   ❌ Step 2 FAILED on attempt 1
      Error: Button not found

   🔄 ESCALATION L1: Retrying with different approach...
```

```
   🚨 ESCALATION L2: Calling RECOVERY_AGENT...
   📤 RECOVERY_AGENT Output:
      Strategy: Try scrolling down to find the button
      💰 Tokens: 567 | Cost: $0.000057
```

```
   🚨 ESCALATION L3: Requesting ORCHESTRATOR replan...
   ✅ Replan successful - restarting with 6 new steps
```

```
   💀 ESCALATION L4: Max attempts exhausted - TASK FAILED
```

### 7. Completion Logging
```
────────────────────────────────────────────────────────────────────────────────
📋 PHASE 4: REPORTING
🤖 Agent: REPORTER
────────────────────────────────────────────────────────────────────────────────
📥 Input to Reporter: Full task state from Redis
📤 Output from Reporter: Summary generated
💰 Tokens Used: 890 | Cost: $0.000089

================================================================================
✅ ORCHESTRATION COMPLETED - Task ID: abc123
⏱️  Total Duration: 45678ms (45.68s)
================================================================================
```

## Log Levels

### Production (INFO)
- Phase transitions
- Agent activations
- Step execution
- Tool calls
- Success/failure outcomes
- Token usage and costs

### Development (DEBUG)
- Detailed input/output
- Conversation history
- Provider selection
- Internal state changes

## Benefits

1. **Complete Visibility**: See exactly which agent is active at any moment
2. **Tool Tracking**: Know which tools are being called and with what parameters
3. **Cost Monitoring**: Track token usage and costs per agent and per step
4. **Debugging**: Easily identify where failures occur in the pipeline
5. **Performance**: Monitor iteration counts and execution times
6. **Recovery Tracking**: See escalation levels and recovery strategies

## Example Full Flow

```
================================================================================
🚀 ORCHESTRATION STARTED - Task ID: task_123
📝 User Input: "Send email to john@example.com saying hello"
================================================================================

────────────────────────────────────────────────────────────────────────────────
📋 PHASE 1: CLARIFICATION
🤖 Agent: CLARIFIER
────────────────────────────────────────────────────────────────────────────────
📥 Input to Clarifier: "Send email to john@example.com saying hello"
📤 Output from Clarifier:
{
  "clarified_goal": "Send an email to john@example.com with message 'hello'",
  "task_type": "web",
  "questions_asked": 0
}
💰 Tokens Used: 234 | Cost: $0.000023

────────────────────────────────────────────────────────────────────────────────
📋 PHASE 2: PLANNING
🤖 Agent: ORCHESTRATOR
────────────────────────────────────────────────────────────────────────────────
📥 Input to Orchestrator: Clarified goal
📤 Output from Orchestrator: Execution plan created
📊 Plan Summary:
   Total Steps: 4
   Web Steps: 4
   Desktop Steps: 0

📝 Execution Steps:
   1. [WEB] step_1: Navigate to Gmail
   2. [WEB] step_2: Click Compose button
   3. [WEB] step_3: Fill email form with recipient and message
   4. [WEB] step_4: Click Send button

────────────────────────────────────────────────────────────────────────────────
📋 PHASE 3: EXECUTION
────────────────────────────────────────────────────────────────────────────────

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
🔧 STEP 1/4: step_1
🤖 Agent: WEB_AGENT
📝 Description: Navigate to Gmail
🎯 Success Criteria: Gmail inbox is visible
📋 Context: {"url":"https://gmail.com"}
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

   🔄 Attempt 1/4
   🤖 Executing with WEB_AGENT...

   🤖 WEB_AGENT LLM Response (Iteration 1):
      Model: llama-4-scout-120b
      Tokens: 456 | Cost: $0.000046
      Content Blocks: 2
      Block 1: text
         Text: I'll navigate to Gmail using pinchtab_navigate...
      Block 2: tool_use
         Tool: pinchtab_navigate
         Input: {"url":"https://gmail.com"}

   🔧 Processing response...
   ✅ Tool call detected: pinchtab_navigate
   🚀 Executing tool: pinchtab_navigate

🌐 [WebAgent] Executing tool: pinchtab_navigate
   Tool input: {"url":"https://gmail.com"}
   → Navigating to: https://gmail.com
✅ [WebAgent] Tool execution completed: pinchtab_navigate
   ⏳ Waiting 1s for page to settle...

   🔍 Verifying with VERIFIER_AGENT...
   📤 VERIFIER_AGENT Output:
      Success: true
      💰 Tokens: 123 | Cost: $0.000012

   ✅ Step 1 COMPLETED successfully in 2345ms

[... Steps 2-4 continue similarly ...]

────────────────────────────────────────────────────────────────────────────────
📋 PHASE 4: REPORTING
🤖 Agent: REPORTER
────────────────────────────────────────────────────────────────────────────────
📥 Input to Reporter: Full task state from Redis
📤 Output from Reporter: Summary generated
💰 Tokens Used: 345 | Cost: $0.000035

================================================================================
✅ ORCHESTRATION COMPLETED - Task ID: task_123
⏱️  Total Duration: 12345ms (12.35s)
================================================================================
```

## Configuration

Logging is controlled by environment variables:
- `LOG_LEVEL`: Set to `debug` for detailed logs, `info` for production
- `NODE_ENV`: `development` enables pretty-printed logs with colors

## Future Enhancements

1. Structured JSON logging for log aggregation systems
2. Trace IDs for distributed tracing
3. Performance metrics dashboard
4. Real-time log streaming to UI
5. Log filtering by agent type or task ID
