# Tool Calling Migration Guide

## Problem Statement

The WebAgent was experiencing JSON parsing failures because the LLM (Groq) was outputting natural language prose before/around JSON blocks:

```
"Let me try clicking the button..."
```json
{ "action": "click", "ref": "e5" }
```
```

The parser expected raw JSON only, causing failures and falling back to wasteful `wait(2000ms)` actions.

## Root Cause

The agent was asking the LLM to output structured JSON in its text response, which is unreliable because:
1. Models naturally "think out loud" before outputting structured data
2. Models often wrap JSON in markdown code fences
3. Text-based parsing is fragile and requires defensive extraction logic

## Solution: Tool Calling

Instead of parsing JSON from text, we now use **function calling** (tools) where the LLM must call structured functions with validated parameters. This is the architecturally correct approach because:

1. **Schema Enforcement**: The API enforces parameter types and required fields
2. **No Parsing Ambiguity**: Tool calls are structured data, not text
3. **Model Reliability**: Models are trained to use tools correctly
4. **Separation of Concerns**: Reasoning goes in text, actions go in tool calls

## Changes Made

### 1. Created PinchTab Tool Definitions
**File**: `packages/aria-agent/src/groq/pinchtab.tools.ts`

Defined 7 tools matching PinchTab capabilities:
- `pinchtab_navigate`: Navigate to URL
- `pinchtab_click`: Click element by reference
- `pinchtab_fill`: Fill form field
- `pinchtab_submit`: Submit form
- `pinchtab_scroll`: Scroll page
- `pinchtab_wait`: Wait for duration
- `pinchtab_get_snapshot`: Get page snapshot

### 2. Updated GroqService to Accept Custom Tools
**File**: `packages/aria-agent/src/groq/groq.service.ts`

Added `customTools` parameter to `generateMessage()`:
```typescript
async generateMessage(
  systemPrompt: string,
  messages: Message[],
  model: string = DEFAULT_MODEL.name,
  useTools: boolean = true,
  signal?: AbortSignal,
  customTools?: any[], // NEW: Allow passing custom tools
): Promise<BytebotAgentResponse>
```

This allows WebAgent to pass PinchTab tools instead of using default computer control tools.

### 3. Refactored WebAgent to Use Tool Calling
**File**: `packages/aria-agent/src/agents/web/web.agent.ts`

**Before**:
```typescript
// Call LLM with useTools: false
const response = await this.groqService.generateMessage(..., false);

// Parse JSON from text
const decision = this.parseDecision(response);

// Execute action based on parsed JSON
await this.executePinchTabAction(decision);
```

**After**:
```typescript
// Call LLM with useTools: true and PinchTab tools
const response = await this.groqService.generateMessage(..., true, undefined, pinchTabTools);

// Handle tool calls directly
if (firstBlock && 'toolUse' in firstBlock) {
  const toolCall = firstBlock.toolUse;
  await this.executeToolCall(toolCall);
}
```

**Key Changes**:
- Removed `parseDecision()` method (no longer needed)
- Removed `executePinchTabAction()` method
- Added `executeToolCall()` method that handles tool calls directly
- Added logic to detect completion via text response ("COMPLETE: ...")
- Added fallback for unexpected responses (wait and retry)

### 4. Updated WEB Agent System Prompt
**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

**Before**:
```
## RESPONSE FORMAT

YOU MUST RETURN ONLY THIS EXACT JSON STRUCTURE:
{
  "action": "navigate" | "click" | ...,
  "ref": "element reference",
  ...
}
```

**After**:
```
## RESPONSE FORMAT

YOU MUST USE THE PROVIDED TOOLS TO TAKE ACTIONS. DO NOT OUTPUT JSON.

Available tools:
- pinchtab_navigate: Navigate to a URL
- pinchtab_click: Click an element by reference
...

When success_criteria is met, respond with text "COMPLETE: [explanation]"
```

Also updated `SHARED_PROMPT_GUIDELINES` to remove "No Markdown" rule since we're using tool calling.

## Benefits

1. **Eliminates JSON Parsing Failures**: No more "Let me try..." prose breaking the parser
2. **Better Error Messages**: Tool call failures provide structured error info
3. **Schema Validation**: API validates parameters before execution
4. **Cleaner Code**: No defensive JSON extraction logic needed
5. **Model Alignment**: Uses tools as intended by model training

## Testing Recommendations

1. **Basic Navigation**: Test navigating to a URL and verifying page load
2. **Form Filling**: Test filling multi-field forms and submitting
3. **Element Interaction**: Test clicking buttons, links, and interactive elements
4. **Completion Detection**: Verify agent correctly signals completion with text response
5. **Error Handling**: Test with invalid element references to verify error handling
6. **Recovery**: Test that recovery strategies still work with tool calling

## Future Work

### DesktopAgent Migration
The DesktopAgent still uses text-based JSON parsing. It should be migrated to use the existing `getComputerUseTools()` from BytezService:

```typescript
// In desktop.agent.ts
const response = await this.bytezService.generateMessage(
  systemPrompt,
  messages,
  model,
  true, // Enable tools
  signal
);

// Handle tool calls instead of parsing JSON
if (firstBlock && 'toolUse' in firstBlock) {
  await this.executeComputerTool(firstBlock.toolUse);
}
```

### Orchestrator/Clarifier/Verifier
These agents output structured data (plans, clarifications, verifications) rather than taking actions. They should continue using JSON output, but with improved defensive parsing:

```typescript
function parseWithFallback(content: string): any {
  // Try raw JSON
  try { return JSON.parse(content); } catch {}
  
  // Extract from markdown fences
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch {}
  }
  
  // Extract first { ... } block
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }
  
  throw new Error("No valid JSON found");
}
```

## Rollback Plan

If tool calling causes issues, you can revert by:

1. Change `useTools: true` back to `useTools: false` in WebAgent
2. Restore `parseDecision()` and `executePinchTabAction()` methods
3. Revert system prompt changes in `system-prompts.config.ts`

The old code is preserved in git history.

## References

- [Anthropic Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Groq Tool Use](https://console.groq.com/docs/tool-use)
