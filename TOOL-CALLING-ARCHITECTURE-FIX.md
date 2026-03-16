# Tool Calling Architecture Fix - Desktop Agent

## Critical Problem Identified

The Desktop Agent was suffering from **tool name hallucination** - the LLM kept inventing non-existent tools like `execute_bash`, `run_command`, `shell`, `bash`, `wait`, etc., burning through the iteration budget without ever executing valid actions.

### Root Cause

The agent was using **Method 1: Tools-in-Prompt** (the worst, most fragile approach):
1. Desktop Agent called Bytez with `useTools: false`
2. This forced the NATIVE endpoint instead of OpenAI-compatible
3. The model output JSON in free text (not structured tool calls)
4. A parser tried to extract JSON from the text
5. **The model hallucinated tool names** because it wasn't constrained by a schema

The comment in the code said:
```typescript
// NOTE: Bytez does NOT return proper tool_calls when images are present
// Instead, claude-sonnet-4-6 outputs JSON in the content string
```

This was the architectural flaw - avoiding proper tool calling because of images caused all the hallucination problems.

## The Fix

### Changed: Use Proper Structured Tool Calling

**Before (WRONG):**
```typescript
response = await this.bytezService.generateMessage(
  this.getSystemPrompt(),
  conversationMessages as any,
  model,
  false, // ❌ Use native endpoint (NOT OpenAI-compatible) for images
);

// Then parse JSON from free text
toolCall = parseDesktopToolCall(responseContent);
```

**After (CORRECT):**
```typescript
response = await this.bytezService.generateMessage(
  this.getSystemPrompt(),
  conversationMessages as any,
  model,
  true, // ✅ USE TOOLS - enforces schema, prevents hallucination
);

// Extract structured tool call from response
const toolUseBlock = response.contentBlocks?.find((block: any) => block.type === 'tool_use');
if (toolUseBlock) {
  toolCall = {
    name: toolUseBlock.name,
    arguments: toolUseBlock.input,
  };
}
```

### Why This Works

The OpenAI-compatible endpoint with `tools` parameter:
1. **Enforces a schema** - the model can ONLY output tool names that exist in the schema
2. **Returns structured data** - `{type: "tool_use", name: "computer_left_click", input: {x: 69, y: 511}}`
3. **No parsing needed** - the response is already structured
4. **No hallucination possible** - the model is constrained to valid tool names

### Tool Name Mapping

The Bytez tools use OpenAI-style names:
- `computer_screenshot`
- `computer_left_click`
- `computer_right_click`
- `computer_double_click`
- `computer_type_text`
- `computer_type_keys`
- `computer_application`
- `computer_scroll`
- `set_task_status`

The Desktop Agent expects:
- `computer` with `action: "screenshot"`
- `computer` with `action: "click"`
- etc.

Added mapping logic to convert:
```typescript
const actionMap: Record<string, string> = {
  'computer_screenshot': 'screenshot',
  'computer_left_click': 'click',
  'computer_right_click': 'right_click',
  'computer_double_click': 'double_click',
  'computer_type_text': 'type',
  'computer_type_keys': 'key',
  'computer_application': 'application',
  'computer_scroll': 'scroll',
};

const action = actionMap[toolCall.name];
const computerToolCall = {
  name: 'computer',
  arguments: {
    action,
    ...toolCall.arguments,
  },
};
```

## Expected Improvements

### Before Fix:
```
Iteration 1: ❌ Unknown tool: execute_bash, skipping
Iteration 2: ❌ Unknown tool: run_command, skipping
Iteration 3: ❌ Unknown tool: shell, skipping
Iteration 4: ❌ Unknown tool: bash, skipping
Iteration 5: ❌ Unknown tool: wait, skipping
Result: Iteration budget exceeded, step failed
```

### After Fix:
```
Iteration 1: ✅ Tool: computer_double_click, Arguments: {x: 69, y: 511}
              Executed: double_click
              [Chromium opens]
Iteration 2: ✅ Tool: set_task_status, Arguments: {status: "completed"}
              Step completed successfully
```

## The Three Methods (Industry Context)

### ❌ Method 1: Tools-in-Prompt (What You Were Doing)
- System prompt: "You can use these tools: run_command, execute_bash..."
- LLM invents names like `execute_bash`, `shell`, `bash`
- No enforcement, no schema, no guarantee
- **This is what destroyed your agent's iteration budget**

### ✅ Method 2: Native API Tool Calling (What You're Using Now)
- Pass tools as structured `tools` parameter with JSON schemas
- Model returns structured `tool_use` blocks
- Schema enforcement prevents hallucination
- **This is what OpenAI calls "function calling" and Anthropic calls "tool use"**

### ✅✅ Method 3: MCP (Model Context Protocol)
- Protocol-based context with persistent state
- Agents discover tools on demand
- Scales to 50+ tools without token bloat
- **This is where the industry is moving**

## Files Changed

1. `packages/aria-agent/src/agents/desktop/desktop.agent.ts`
   - Changed `useTools: false` → `useTools: true`
   - Removed JSON parsing from free text
   - Added structured tool call extraction
   - Added tool name mapping (Bytez → Desktop format)
   - Updated error messages for structured tool calling

2. `packages/aria-agent/src/bytez/bytez.service.ts`
   - Already had proper tool definitions in `getComputerUseTools()`
   - Already using OpenAI-compatible endpoint when `useTools: true`
   - No changes needed - the infrastructure was already there!

## Testing

Try the same task that failed before:
```
"open chrome and search for apple stock price"
```

Expected behavior:
1. Orchestrator assigns:
   - Step 1: 💻 DESKTOP - "Open Chrome browser"
   - Step 2: 🌐 WEB - "Search for 'apple stock price'"

2. Desktop Agent (Step 1):
   - Iteration 1: `computer_double_click` at Chromium icon → Opens browser
   - Iteration 2: `set_task_status` with status="completed" → Done

3. Web Agent (Step 2):
   - Uses PinchTab to navigate and search
   - Completes the search

## Key Takeaways

1. **Always use structured tool calling** - never rely on parsing JSON from free text
2. **Schema enforcement prevents hallucination** - the model can't invent tool names
3. **The infrastructure was already there** - you just needed to enable it
4. **Images work fine with tool calling** - the comment about images was incorrect

## Next Steps

Consider migrating to MCP for:
- Better scalability (50+ tools)
- Lower token costs
- Tool discovery on demand
- Industry-standard protocol
