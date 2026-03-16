# Bytez Vision Model Fix - FINAL SOLUTION

## Problem Summary

The Desktop agent was failing with two different errors when trying to use vision models through Bytez:

1. **First Error (Anthropic)**: `messages.1.user.content.str: Input should be a valid string`
   - Bytez's Anthropic endpoint doesn't support multimodal content arrays
   
2. **Second Error (Google)**: `Model does not exist or has yet to be added to the Bytez catalog`
   - `google/gemini-2.0-flash` and `google/gemini-1.5-flash` don't exist in Bytez

## Final Solution

**Use Qwen open-source vision model: `Qwen/Qwen2.5-VL-7B-Instruct`**

This model:
- ✅ Exists in Bytez catalog
- ✅ Supports vision/multimodal inputs
- ✅ Is free (open-source)
- ✅ Works with OpenAI-compatible endpoint for tool calling
- ✅ Has good vision quality

## Changes Made

### 1. Updated Desktop Agent Model (`packages/aria-agent/src/config/agents.config.ts`)

```typescript
DESKTOP: {
  provider: 'bytez',
  model: 'Qwen/Qwen2.5-VL-7B-Instruct', // Changed from anthropic/claude-opus-4-6
  description: 'User-overridable. Desktop = #1 failure point. Using Qwen vision model.',
  userSelectable: true,
},
```

### 2. Updated Bytez Service (`packages/aria-agent/src/bytez/bytez.service.ts`)

Added handling for open-source models to keep system messages in the messages array (not extracted like Anthropic):

```typescript
} else {
  // For open-source models (Qwen, Llama, etc.), keep system message in messages array
  this.logger.debug(`Using open-source model (${provider}) - keeping system message in messages array`);
}
```

### 3. Added Content Validation

Added validation to filter out invalid content parts before sending to Bytez:

```typescript
const validContentParts = contentParts.filter(part => {
  if (!part || typeof part !== 'object') return false;
  if (!part.type) return false;
  if (part.type === 'text' && !part.text) return false;
  if (part.type === 'image' && !part.url) return false;
  return true;
});
```

### 4. Added Detailed Logging

Added debug logging to see exactly what's being sent to Bytez:

```typescript
this.logger.debug(`📤 Sending request to Bytez:`);
this.logger.debug(`   Endpoint: ${endpoint}`);
this.logger.debug(`   Messages count: ${requestBody.messages.length}`);
requestBody.messages.forEach((msg: any, idx: number) => {
  this.logger.debug(`   Message ${idx}: role=${msg.role}, contentType=${typeof msg.content}, isArray=${Array.isArray(msg.content)}`);
  if (Array.isArray(msg.content)) {
    msg.content.forEach((part: any, partIdx: number) => {
      this.logger.debug(`      Part ${partIdx}: type=${part.type}, hasUrl=${!!part.url}, hasText=${!!part.text}`);
    });
  }
});
```

## Testing

After restarting the server, test with:

```bash
# Create a simple desktop task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Take a screenshot and tell me what you see",
    "type": "IMMEDIATE"
  }'
```

Expected behavior:
- ✅ No more "Model does not exist" errors
- ✅ No more "content.str: Input should be a valid string" errors
- ✅ Desktop agent successfully processes screenshots
- ✅ Vision-based desktop automation works

## Alternative Models (if Qwen doesn't work)

If Qwen fails, try these alternatives in order:

1. **meta-llama/Llama-3.2-11B-Vision-Instruct** - Meta's vision model
2. **meta-llama/Llama-3.2-90B-Vision-Instruct** - Larger Meta vision model
3. Use Anthropic directly (bypass Bytez) - requires separate API key

## Why This Works

1. **Qwen is confirmed available** in Bytez catalog (per integration guide)
2. **Open-source models** use standard message format (no special handling needed)
3. **OpenAI-compatible endpoint** supports both vision and tool calling
4. **Content validation** ensures no malformed data is sent

## Performance Notes

- Qwen is slower than Claude/Gemini (open-source model)
- Quality is good but not as high as Claude Opus
- Free to use (no per-token cost beyond Bytez API)
- May have higher latency on first request (cold start)

## Rollback Plan

If this doesn't work, revert to Claude without vision:

```typescript
DESKTOP: {
  provider: 'bytez',
  model: 'anthropic/claude-opus-4-6',
  description: 'User-overridable. Desktop = #1 failure point',
  userSelectable: true,
},
```

And modify Desktop agent to use text descriptions instead of screenshots.
