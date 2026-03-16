# Desktop Agent Tool Calling Fix

## The Real Problem

You were absolutely right! The DesktopAgent was NOT using tool calling correctly. It was:

1. Calling Bytez with `useTools: false`
2. Asking the model to output JSON text
3. Parsing that JSON text (which often had prose/markdown around it)
4. Manually calling the computer-use API

This is why clicks weren't registering - the model was outputting text like:
```
"Let me try double-clicking the terminal icon..."
```json
{ "action": "double_click", "params": { "coordinates": [68, 492] } }
```
```

And your parser was failing, falling back to `wait(2000ms)`, so no actual clicks were happening!

## The Solution

Switched DesktopAgent to use **OpenAI-style tool calling via Bytez**, exactly as documented in your Bytez guide.

### What Changed

#### 1. Enable Tool Calling
**File**: `packages/aria-agent/src/agents/desktop/desktop.agent.ts`

**Before**:
```typescript
const response = await this.bytezService.generateMessage(
  this.getSystemPrompt(),
  conversationMessages as any,
  this.model.model,
  false, // No tools needed ❌
);
```

**After**:
```typescript
const response = await this.bytezService.generateMessage(
  this.getSystemPrompt(),
  conversationMessages as any,
  this.model.model,
  true, // Enable tool calling ✅
);
```

#### 2. Handle Tool Calls Instead of Parsing JSON

**Before**:
```typescript
// Parse JSON from text
const decision = this.parseDecision(response);

// Execute based on parsed JSON
await this.executeComputerAction(decision);
```

**After**:
```typescript
// Handle tool calls directly
if (firstBlock && 'toolUse' in firstBlock) {
  const toolCall = firstBlock.toolUse as { name: string; input: any };
  await this.executeToolCall(toolCall);
}
```

#### 3. New executeToolCall Method

Maps LLM tool calls to computer-use API:

```typescript
private async executeToolCall(toolCall: { name: string; input: any }): Promise<void> {
  const { name, input } = toolCall;
  
  // Map tool names
  const actionMap: Record<string, string> = {
    'computer_left_click': 'click_mouse',
    'computer_right_click': 'right_click_mouse',
    'computer_double_click': 'double_click_mouse',
    'computer_type_text': 'type_text',
    'computer_type_keys': 'type_keys',
    'computer_scroll': 'scroll',
    'computer_application': 'application',
    'computer_screenshot': 'screenshot',
  };
  
  // Build request based on tool
  let requestBody: any = { action: actionMap[name] };
  
  if (name.includes('click')) {
    requestBody.coordinates = [input.x, input.y];
    requestBody.button = name.includes('right') ? 'right' : 'left';
    requestBody.clickCount = name.includes('double') ? 2 : 1;
  } else if (name === 'computer_type_text') {
    requestBody.text = input.text;
    requestBody.delay = 50;
  }
  // ... etc
  
  // Call computer-use API
  await fetch(`${this.DESKTOP_BASE_URL}/computer-use`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });
}
```

#### 4. Updated System Prompt

**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

**Before**:
```
## RESPONSE FORMAT

YOU MUST RETURN ONLY THIS EXACT JSON STRUCTURE:
{
  "action": "click" | "type_text" | ...,
  "params": { ... }
}
```

**After**:
```
## RESPONSE FORMAT

YOU MUST USE THE PROVIDED TOOLS TO TAKE ACTIONS. DO NOT OUTPUT JSON.

Available tools:
- computer_left_click: Click at coordinates
- computer_right_click: Right-click at coordinates
- computer_double_click: Double-click at coordinates
...

When success_criteria is met, respond with text "COMPLETE: [explanation]"
```

## How Bytez Tool Calling Works

According to your Bytez guide:

### Step 1: Send Message + Tools
```
POST https://api.bytez.com/models/v2/openai/v1/chat/completions

{
  "model": "anthropic/claude-opus-4-6",
  "messages": [...],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "computer_left_click",
        "parameters": {
          "type": "object",
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" }
          },
          "required": ["x", "y"]
        }
      }
    }
  ],
  "tool_choice": "auto"
}
```

### Step 2: Model Returns Tool Call
```json
{
  "choices": [{
    "finish_reason": "tool_calls",
    "message": {
      "role": "assistant",
      "tool_calls": [{
        "id": "toolu_abc123",
        "type": "function",
        "function": {
          "name": "computer_left_click",
          "arguments": "{\"x\": 68, \"y\": 492}"
        }
      }]
    }
  }]
}
```

### Step 3: Execute Tool & Continue
Your code executes the actual click, then continues the conversation.

## Why This Fixes the VNC Issue

**Before**: Model outputs text → parser fails → fallback to wait → NO CLICK HAPPENS

**After**: Model calls tool → tool executed directly → CLICK HAPPENS

The clicks weren't registering because they were never being sent to the computer-use API!

## Testing

Run a simple task like "Open terminal":

**Expected logs**:
```
🤖 [DesktopAgent] Iteration 1 response:
   Tool: computer_double_click
   Input: {"x":68,"y":492}
   → Clicking at [68, 492]
✅ [DesktopAgent] Tool execution completed: computer_double_click
```

**NOT**:
```
🤖 [DesktopAgent] Iteration 1 response:
Let me try double-clicking the terminal icon...
Failed to parse decision: Unexpected token L in JSON at position 0
```

## Files Changed

1. `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
   - Changed `useTools: false` → `useTools: true`
   - Removed `parseDecision()` method
   - Removed `executeComputerAction()` method
   - Removed `mapActionToDesktopAPI()` method
   - Added `executeToolCall()` method
   - Added tool call handling logic

2. `packages/aria-agent/src/config/system-prompts.config.ts`
   - Updated DESKTOP response format section
   - Changed from JSON output to tool calling instructions

## Comparison: Before vs After

### Before (Broken)
```
User: "Open terminal"
↓
Agent calls Bytez with useTools: false
↓
Model outputs: "Let me double-click... ```json {...}```"
↓
Parser tries to extract JSON → FAILS
↓
Fallback: wait(2000ms)
↓
NO CLICK HAPPENS
↓
Screen unchanged
↓
Repeat 7 times...
```

### After (Fixed)
```
User: "Open terminal"
↓
Agent calls Bytez with useTools: true
↓
Model calls: computer_double_click(x=68, y=492)
↓
Agent executes tool → POST to computer-use API
↓
CLICK HAPPENS
↓
Terminal opens
↓
Success!
```

## Why Bytez Requires OpenAI Endpoint for Tools

From your guide:

> ✅ Bytez DOES support OpenAI-style tool calling
> ❌ Bytez does NOT support Anthropic computer-use tools (computer_screenshot, bash, str_replace_editor)

The key insight: Bytez routes tool calls through the OpenAI-compatible endpoint:
- `POST https://api.bytez.com/models/v2/openai/v1/chat/completions` ✅ (for tools)
- `POST https://api.bytez.com/models/v2/{provider}/{model}` ❌ (no tools)

Your `BytezService.getComputerUseTools()` already defines tools in OpenAI format, so when you set `useTools: true`, Bytez automatically uses the correct endpoint.

## Next Steps

1. Test DesktopAgent with simple task ("Open terminal")
2. Verify tool calls appear in logs (not JSON parsing errors)
3. Confirm clicks are actually happening on VNC display
4. If still issues, check DISPLAY environment variable in ariad container

## Related Fixes

- ✅ WebAgent migrated to tool calling (PinchTab tools)
- ✅ DesktopAgent migrated to tool calling (computer use tools)
- ✅ RecoveryAgent defensive parsing (handles multiple formats)
- ⏳ PinchTab restarted (was unhealthy)
- ⏳ Bytez keys need top-up (7 failures before success)
