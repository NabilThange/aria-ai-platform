# Bytez Vision API Error Fix

## Problem

The Desktop agent is failing when trying to send screenshots to Anthropic Claude models through Bytez with this error:

```
Bytez API error: 500 - {"error":"400 messages.1.user.content.str: Input should be a valid string","output":null}
```

## Root Cause

Bytez's native Anthropic endpoint (`/models/v2/anthropic/claude-haiku-4-5`) **does not support multimodal content arrays** (text + image) in the same way that Anthropic's direct API does.

The error `messages.1.user.content.str: Input should be a valid string` indicates that Bytez is validating the `content` field and expecting it to be a string, not an array of content blocks.

## Current Message Format (FAILING)

```typescript
{
  role: 'user',
  content: [
    { type: 'text', text: 'What do you see?' },
    { type: 'image', url: 'data:image/png;base64,...' }
  ]
}
```

## Solutions

### Option 1: Switch to Google Gemini for Vision (RECOMMENDED)

Google Gemini models work better with Bytez for multimodal tasks:

```typescript
// In desktop.agent.ts or perception.agent.ts
const VISION_MODEL = 'google/gemini-2.0-flash'; // Instead of anthropic/claude-haiku-4-5
```

**Pros:**
- Gemini has excellent vision capabilities
- Works reliably through Bytez
- Fast and cost-effective
- Long context window

**Cons:**
- Different model behavior than Claude

### Option 2: Use Qwen Open-Source Vision Model

```typescript
const VISION_MODEL = 'Qwen/Qwen2.5-VL-7B-Instruct';
```

**Pros:**
- Free (open-source)
- Good vision quality
- Works through Bytez

**Cons:**
- Slower than closed-source models
- May have lower quality than Claude/Gemini

### Option 3: Convert Images to Text Descriptions (FALLBACK)

If you must use Claude, convert screenshots to text descriptions first using a vision model, then send the text to Claude:

```typescript
// 1. Use Gemini to describe the screenshot
const description = await gemini.describeImage(screenshot);

// 2. Send description to Claude
const response = await claude.chat({
  role: 'user',
  content: `Based on this screen description: ${description}\n\nWhat action should I take?`
});
```

**Pros:**
- Can still use Claude for reasoning
- Works around Bytez limitation

**Cons:**
- Two API calls (slower, more expensive)
- Loss of visual detail
- More complex code

### Option 4: Use Anthropic Direct API for Vision

Bypass Bytez entirely for vision tasks and call Anthropic's API directly:

```typescript
// Use Anthropic SDK directly
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'What do you see?' },
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: screenshot,
        },
      },
    ],
  }],
});
```

**Pros:**
- Full Anthropic API support
- Best Claude vision quality
- No Bytez limitations

**Cons:**
- Requires separate Anthropic API key
- More expensive than Bytez
- Need to manage multiple API providers

## Recommended Implementation

**Use Google Gemini for vision tasks through Bytez:**

1. Update the Desktop agent model configuration:

```typescript
// packages/aria-agent/src/agents/desktop/desktop.agent.ts
export class DesktopAgent extends BaseAgent {
  protected model = {
    model: 'google/gemini-2.0-flash', // Changed from anthropic/claude-haiku-4-5
    provider: 'bytez',
  };
}
```

2. Update the Perception agent model configuration:

```typescript
// packages/aria-agent/src/agents/perception/perception.agent.ts
export class PerceptionAgent extends BaseAgent {
  protected model = {
    model: 'meta-llama/Llama-4-Scout-17B-16e-Instruct', // Keep for Groq
    fallback: 'google/gemini-2.0-flash', // Changed from google/gemini-1.5-flash
    provider: 'groq',
  };
}
```

3. Test the changes:

```bash
# Run a simple desktop task
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Take a screenshot and describe what you see",
    "type": "IMMEDIATE"
  }'
```

## Code Changes Made

1. Added validation for content parts in `bytez.service.ts` to catch malformed content
2. Added detailed logging to debug the exact request format being sent
3. Documented the Bytez vision API limitations

## Testing

After implementing the fix:

1. Test screenshot analysis works
2. Test desktop automation with vision
3. Verify no more "content.str: Input should be a valid string" errors
4. Check that vision quality is acceptable with the new model

## Alternative: Fix Bytez Message Format

If you want to keep using Claude through Bytez, you could try modifying the message format to match what Bytez expects. However, based on the error, this is unlikely to work without Bytez API documentation updates.

The error suggests Bytez's Anthropic proxy doesn't support the multimodal content array format at all.
