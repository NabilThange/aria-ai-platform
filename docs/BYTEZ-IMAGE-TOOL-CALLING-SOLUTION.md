# Bytez Image + Tool Calling Solution

## The Discovery

After 2 hours of testing, the team found the root cause:

**Bytez does NOT return proper `tool_calls` JSON when an image is present in the request.**

Instead, `claude-sonnet-4-6` outputs the tool call as a JSON code block inside the `content` string - and it does this accurately with correct pixel coordinates from the image.

## The Solution

Instead of fighting the API, we lean into it:
1. Force the model to output ONLY raw JSON (no speech, no explanation)
2. Parse that JSON from the content string
3. Execute the tool call ourselves

The desktop agent doesn't need to speak - it just needs to decide what action to take and output the parameters.

## Architecture Flow

```
1. Take screenshot
   ↓
2. PerceptionAgent (Groq llama-4-scout)
   Input:  raw screenshot image
   Output: text description of screen
   ↓
3. DesktopAgent (Bytez claude-sonnet-4-6)
   Input:  raw screenshot image (direct visual)
         + text description (from Groq)
         + tool definitions (in system prompt)
         + "output ONLY raw JSON" instruction
   Output: raw JSON string in content
   ↓
4. Parser
   Extracts JSON from content string
   Validates tool schema
   Returns structured tool call
   ↓
5. Tool Executor
   Runs the actual action
```

## Critical Changes Needed

### 1. Use Native Bytez Endpoint (NOT OpenAI-compatible)

```typescript
// CORRECT - Native endpoint supports images
POST https://api.bytez.com/models/v2/anthropic/claude-sonnet-4-6

// WRONG - OpenAI endpoint doesn't support images properly
POST https://api.bytez.com/models/v2/openai/v1/chat/completions
```

### 2. System Prompt - Force JSON Output

```typescript
const systemPrompt = `You are a desktop automation agent. Output ONLY a raw JSON object.

AVAILABLE TOOLS:
computer - {"name": "computer", "arguments": {"action": "click", "x": 0, "y": 0}}
computer - {"name": "computer", "arguments": {"action": "type", "text": "..."}}
computer - {"name": "computer", "arguments": {"action": "key", "key": "Return"}}
computer - {"name": "computer", "arguments": {"action": "screenshot"}}
set_task_status - {"name": "set_task_status", "arguments": {"status": "completed"}}

OUTPUT FORMAT: {"name": "tool_name", "arguments": {...}}
OUTPUT ONLY THE JSON. NOTHING ELSE.`;
```

### 3. Request Format

```typescript
{
  "messages": [
    {
      "role": "system",
      "content": systemPrompt
    },
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": `SCREEN DESCRIPTION:\n${screenDescription}\n\nTASK: ${taskStep}`
        },
        {
          "type": "image",
          "url": screenshotDataUrl
        }
      ]
    }
  ],
  "max_tokens": 256
}
```

### 4. Parser Function

```typescript
interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

function parseDesktopAgentResponse(content: string): ToolCall | null {
  if (!content?.trim()) return null;
  
  const cleaned = content.trim();
  
  // Strategy 1: Pure JSON (ideal)
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.name && parsed.arguments !== undefined) {
      return parsed as ToolCall;
    }
  } catch {}
  
  // Strategy 2: JSON in ```json ... ``` block
  const jsonCodeBlock = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonCodeBlock) {
    try {
      const parsed = JSON.parse(jsonCodeBlock[1].trim());
      if (parsed.name && parsed.arguments !== undefined) {
        return parsed as ToolCall;
      }
    } catch {}
  }
  
  // Strategy 3: JSON in ``` ... ``` block
  const codeBlock = cleaned.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlock) {
    try {
      const parsed = JSON.parse(codeBlock[1].trim());
      if (parsed.name && parsed.arguments !== undefined) {
        return parsed as ToolCall;
      }
    } catch {}
  }
  
  // Strategy 4: Find first {...} anywhere
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.name && parsed.arguments !== undefined) {
        return parsed as ToolCall;
      }
    } catch {}
  }
  
  return null;
}
```

## Implementation Steps

1. **Update Desktop Agent to use native Bytez endpoint** (not OpenAI-compatible)
2. **Change system prompt** to force JSON-only output with tool definitions
3. **Add parser function** to extract JSON from content string
4. **Remove tool_calls handling** - parse from content instead
5. **Add retry logic** - if parse fails, retry with fresh screenshot (max 3x)

## Why claude-sonnet-4-6?

| Model | Sees Image | Tool Output | JSON Quality |
|-------|-----------|-------------|--------------|
| claude-haiku-4-5 | ✅ | ❌ ignores tools | - |
| claude-sonnet-4-5 | ✅ | ⚠️ XML format | Parseable |
| claude-sonnet-4-6 | ✅ | ✅ JSON format | Clean, accurate |

Use `claude-sonnet-4-6` - it's the only one that outputs clean JSON with accurate pixel coordinates.

## Key Points

- **NO `tools` array in request** - define schema in system prompt instead
- **Use native endpoint** - `/models/v2/anthropic/claude-sonnet-4-6`
- **System message in messages array** - with `role: "system"`
- **Image format**: `{"type": "image", "url": "data:image/png;base64,..."}`
- **Text BEFORE image** in content array
- **max_tokens: 256** - tool calls are short
- **Parse content string** - not `tool_calls` object

## This Fixes

✅ The "content.str: Input should be a valid string" error (we're not using OpenAI endpoint)
✅ The "Model does not exist" error (we're using claude-sonnet-4-6 which exists)
✅ Tool calling with images (we parse JSON from content)
✅ Accurate pixel coordinates (claude-sonnet-4-6 sees the image directly)
