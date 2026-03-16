# Multi-Agent Action Display Implementation

## Goal
Restore the beautiful original action display system where every agent action (clicks, typing, thinking, planning) appears as message blocks in the chat history, just like the single-agent system.

## Completed Steps

### 1. Created New Message Content Block Types ✅
**File:** `packages/shared/src/types/messageContent.types.ts`

Added new enum values to `MessageContentType`:
- `AgentThinking` - For agent reasoning/thinking
- `AgentPlan` - For orchestrator execution plans
- `AgentVerify` - For verifier results
- `AgentQuestion` - For clarifier questions
- `AgentRecovery` - For recovery strategies
- `AgentReport` - For reporter summaries

Created corresponding TypeScript interfaces:
- `AgentThinkingContentBlock`
- `AgentPlanContentBlock`
- `AgentVerifyContentBlock`
- `AgentQuestionContentBlock`
- `AgentRecoveryContentBlock`
- `AgentReportContentBlock`

### 2. Added Type Guards ✅
**File:** `packages/shared/src/utils/messageContent.utils.ts`

Added type guard functions:
- `isAgentThinkingContentBlock()`
- `isAgentPlanContentBlock()`
- `isAgentVerifyContentBlock()`
- `isAgentQuestionContentBlock()`
- `isAgentRecoveryContentBlock()`
- `isAgentReportContentBlock()`

### 3. Created MessagesService Helper Method ✅
**File:** `packages/aria-agent/src/messages/messages.service.ts`

Added `createAgentActionMessage()` method that:
- Takes agent name, action type, and action data
- Converts to appropriate message content blocks
- Saves to database
- Emits `new_message` WebSocket event (triggers frontend update)

### 4. Updated Desktop Agent ✅
**File:** `packages/aria-agent/src/agents/desktop/desktop.agent.ts`

- Injected `MessagesService`
- Created `createComputerToolUseBlock()` helper method
- After executing each computer action, saves it as a message with screenshot

### 5. Updated Clarifier Agent ✅
**File:** `packages/aria-agent/src/agents/clarifier/clarifier.agent.ts`

- Injected `MessagesService`
- Saves clarification thinking as message
- Saves questions as message when user input needed

### 6. Created Frontend Components ✅
**File:** `packages/aria-ui/src/components/messages/content/AgentActionContent.tsx`

Created styled components for each agent action type:
- `AgentThinkingContent` - Subtle, dimmed thinking blocks
- `AgentPlanContent` - Shows execution plan steps
- `AgentVerifyContent` - Shows success/failure with confidence
- `AgentQuestionContent` - Highlights clarifier questions
- `AgentRecoveryContent` - Shows recovery strategies
- `AgentReportContent` - Shows final task summary

Each component:
- Uses agent-specific colors (blue for Clarifier, purple for Orchestrator, etc.)
- Has appropriate icons
- Styled to be visually lighter than computer actions (opacity-75 for thinking/verify)

### 7. Updated MessageContent Renderer ✅
**File:** `packages/aria-ui/src/components/messages/content/MessageContent.tsx`

- Imported new type guards
- Imported new agent action components
- Added rendering logic for all 6 new block types

### 8. Compiled Shared Package ✅
Ran `npm run build` in `packages/shared` to generate TypeScript definitions.

## Remaining Steps

### 9. Update Orchestrator Agent ✅
**File:** `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

- Injected `MessagesService`
- After creating execution plan, saves as message
- After replanning, saves new plan as message

### 10. Update Verifier Agent ✅
**File:** `packages/aria-agent/src/agents/verifier/verifier.agent.ts`

- Injected `MessagesService`
- After verification, saves result as message

### 11. Update Recovery Agent ✅
**File:** `packages/aria-agent/src/agents/recovery/recovery.agent.ts`

- Injected `MessagesService`
- After generating strategy, saves as message

### 12. Update Reporter Agent ✅
**File:** `packages/aria-agent/src/agents/reporter/reporter.agent.ts`

- Injected `MessagesService`
- After generating report, saves as message with step counts

### 13. Update Web Agent ✅
**File:** `packages/aria-agent/src/agents/web/web.agent.ts`

- Injected `MessagesService`
- After executing web actions, saves as message

### 14. Remove Old WebSocket Events ✅
**Files:**
- `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
- `packages/aria-ui/src/components/messages/ChatContainer.tsx`

Removed:
- All `emitAgentActivity()` calls from Desktop Agent (screenshot, perception, reasoning, action)
- `currentActivity` state from ChatContainer
- `agent_activity` WebSocket listener
- Activity badge display

### 15. Test End-to-End ⏳
- Start a task
- Verify all agent actions appear in chat
- Verify screenshots appear inline
- Verify styling (agent actions dimmer than computer actions)
- Verify clarifier pause works correctly
- Verify actions persist after task completion

## Key Design Decisions

1. **Pause Behavior:** Entire pipeline pauses when clarifier needs input (simpler, safer)
2. **New Types:** Created dedicated types instead of reusing ComputerToolUseContentBlock (cleaner, more maintainable)
3. **Visual Hierarchy:** Agent thinking/verify blocks are dimmed (opacity-75) so computer actions stand out
4. **Message-Based:** Actions saved as database messages (persist forever, audit trail)
5. **WebSocket:** Uses existing `new_message` events (no new event types needed)

## Architecture Flow

```
Agent executes action
  ↓
Agent calls messagesService.createAgentActionMessage()
  ↓
MessagesService creates message in database
  ↓
MessagesService emits 'new_message' WebSocket event
  ↓
Frontend receives event via useChatSession
  ↓
Frontend appends to messages array
  ↓
MessageContent renders appropriate component
  ↓
User sees action in chat history
```

## Benefits

- Complete audit trail of all agent actions
- Actions persist after task completion
- Visual distinction between agent types
- Familiar chat-based interface
- No new WebSocket events needed
- Reuses existing message infrastructure
