# Desktop Agent Tool Calling Fix - FINAL

## Problem

The Desktop Agent was failing to execute any actions. The logs showed:

```
[DesktopToolParser] Failed to parse tool call from content: {"action":"double_click","coordinate":[69,493],"description":"..."}
```

And later:

```
Bytez API error: 500 - {"error":"400 messages.1.user.content.str: Input should be a valid string"
```

## Root Cause

**Bytez does NOT support OpenAI-style tool calling when images are present.** 

When you send an image to Bytez's native endpoint, it cannot return proper `tool_calls` objects. Instead, Claude outputs the tool call as JSON text in the `content` string. This is documented behavior, not a bug.

The error occurred because we tried to use the OpenAI-compatible endpoint (`useTools: true`) which expects string content, but we were sending an array with image data.

## Solution

**Use Bytez's native endpoint with JSON parsing** (the original approach was correct):

1. **Use native endpoint** - Set `useTools: false` to use Bytez's native API
2. **Force JSON-only output** - System prompt tells LLM to output ONLY raw JSON
3. **Parse JSON from content** - Extract tool call from the text response
4. **Execute the tool** - Map parsed JSON to VNC actions

This is the ONLY way to use images with Bytez + tool calling.

## Changes Made

### File: `packages/aria-agent/src/agents/desktop/desktop.agent.ts`

**Key Points:**
```typescript
// 1. Use native endpoint (NOT OpenAI-compatible)
const response = await this.bytezService.generateMessage(
  buildDesktopSystemPrompt(), // JSON-only prompt
  conversationMessages as any,
  this.model.model,
  false, // ✅ Native endpoint for images
);

// 2. Parse JSON from content string
const textBlock = response.contentBlocks?.find(
  (block: any) => block.type === 'text'
) as any;
const content = textBlock?.text || '';
const toolCall = parseDesktopToolCall(content);

// 3. Map and execute
if (toolCall.name === 'computer') {
  const mappedCall = this.mapToExecuteFormat(toolCall);
  await this.executeToolCall(mappedCall);
}
```

### File: `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts`

**System Prompt (Critical):**
```typescript
export function buildDesktopSystemPrompt(): string {
  return `You are a desktop automation agent. You control a computer by outputting tool calls.

RULES:
- Output ONLY a raw JSON object. Nothing else.
- No explanation. No markdown. No code blocks. No comments.
- No sentences. No "I will...". No "The button is at...".
- Just the JSON object and nothing else.
- If you are unsure, still output your best guess as JSON.

AVAILABLE TOOLS:

computer - control mouse and keyboard
  {"name": "computer", "arguments": {"action": "click", "x": 123, "y": 456}}
  {"name": "computer", "arguments": {"action": "double_click", "x": 123, "y": 456}}
  {"name": "computer", "arguments": {"action": "right_click", "x": 123, "y": 456}}
  {"name": "computer", "arguments": {"action": "type", "text": "hello world"}}
  {"name": "computer", "arguments": {"action": "key", "key": "Return"}}
  {"name": "computer", "arguments": {"action": "key", "key": "ctrl+c"}}
  {"name": "computer", "arguments": {"action": "screenshot"}}
  {"name": "computer", "arguments": {"action": "scroll", "x": 123, "y": 456, "direction": "down", "amount": 3}}

set_task_status - mark the task as done or failed
  {"name": "set_task_status", "arguments": {"status": "completed", "message": "..."}}
  {"name": "set_task_status", "arguments": {"status": "failed", "message": "reason..."}}

OUTPUT FORMAT:
{"name": "tool_name", "arguments": {...}}

EXAMPLE OUTPUT:
{"name": "computer", "arguments": {"action": "click", "x": 245, "y": 380}}

OUTPUT ONLY THE JSON. NOTHING ELSE.`;
}
```

**Parser (Handles Multiple Formats):**
```typescript
export function parseDesktopToolCall(content: string): DesktopToolCall | null {
  // Strategy 1: Pure JSON
  // Strategy 2: JSON in ```json ... ``` block
  // Strategy 3: JSON in ``` ... ``` block
  // Strategy 4: First {...} object
  // Strategy 5: XML format <tool>{...}</tool>
  
  // Returns: {name: string, arguments: Record<string, unknown>}
}
```

### File: `packages/aria-agent/src/bytez/bytez.constants.ts`

**Added Claude Sonnet 4.6:**
```typescript
export const BYTEZ_MODELS = [
  // ... other models
  {
    name: 'anthropic/claude-sonnet-4-6',
    title: 'Claude Sonnet 4.6',
    provider: 'bytez',
    contextWindow: 200000,
  },
  // ...
];
```

## Why This Architecture?

According to the official guide:

> **Bytez does not return a proper tool_calls JSON object when an image is present.** Instead, claude-sonnet-4-6 outputs the tool arguments as a JSON code block inside the content string — and it does this accurately (tested: correct pixel coordinates from a real image).

So we:
1. Force the model to output only raw JSON (no speech)
2. Parse that JSON from the content string
3. Execute the tool call ourselves

The desktop agent doesn't need to speak. It just needs to decide what action to take and output the parameters. Pure JSON is perfect for this.

## Tool Format

**Input (what LLM outputs):**
```json
{"name": "computer", "arguments": {"action": "double_click", "x": 69, "y": 493}}
```

**Mapped (what executeToolCall expects):**
```typescript
{
  name: "computer_double_click",
  input: { x: 69, y: 493 }
}
```

The `mapToExecuteFormat()` method handles this conversion.

## Benefits

1. **Works with images** - Native endpoint supports image + text
2. **Accurate coordinates** - Claude Sonnet 4.6 gives correct pixel positions
3. **Clean JSON output** - Strict prompt ensures parseable responses
4. **Robust parsing** - Handles multiple JSON formats
5. **Available in UI** - Users can select Claude Sonnet 4.6 for Desktop Agent

## Testing

1. Start the agent: `npm run start:dev`
2. Create a desktop task: "make a file named joker.txt"
3. In the UI, select "Claude Sonnet 4.6" as the Desktop Agent model
4. Check logs for:
   - `Content: {"name": "computer", "arguments": {...}}` (JSON output)
   - `Tool: computer` (successfully parsed)
   - `Executed: double_click` (action runs)

## Related Files

- `packages/aria-agent/src/agents/desktop/desktop.agent.ts` - Main agent logic
- `packages/aria-agent/src/agents/desktop/desktop-tool-parser.util.ts` - JSON parser + system prompt
- `packages/aria-agent/src/bytez/bytez.service.ts` - Native vs OpenAI endpoint logic
- `packages/aria-agent/src/bytez/bytez.constants.ts` - Added Claude Sonnet 4.6
- `packages/aria-agent/src/config/agents.config.ts` - Desktop Agent uses Sonnet 4.6

## Key Takeaway

**When using images with Bytez:**
- ✅ Use native endpoint (`useTools: false`)
- ✅ Parse JSON from content string
- ❌ Don't use OpenAI-compatible endpoint (`useTools: true`)
- ❌ Don't expect `tool_calls` objects

This is the documented way to use Bytez with images + tool calling.
