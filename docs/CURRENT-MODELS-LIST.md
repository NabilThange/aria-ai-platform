# Current Models Configuration

## All Models by Agent

| Agent | Provider | Model | Status | Notes |
|-------|----------|-------|--------|-------|
| CLARIFIER | Groq | `openai/gpt-oss-20b` | ✅ Working | Fast Q&A |
| ORCHESTRATOR | Bytez | `anthropic/claude-opus-4-6` | ✅ Working | Planning brain |
| WEB | Groq | `openai/gpt-oss-120b` | ✅ Working | Web scraping loops |
| DESKTOP | Bytez | `Qwen/Qwen2.5-VL-7B-Instruct` | ❌ **FAILING** | Vision model - 404 error |
| PERCEPTION | Groq | `meta-llama/llama-4-scout-17b-16e-instruct` | ✅ Working | Vision analysis |
| PERCEPTION (fallback) | Bytez | `google/gemini-2.0-flash` | ❓ Unknown | Fallback for Groq |
| VERIFIER | Groq | `openai/gpt-oss-20b` | ✅ Working | JSON validation |
| RECOVERY | Bytez | `anthropic/claude-sonnet-4-6` | ✅ Working | Error recovery |
| REPORTER | Groq | `openai/gpt-oss-20b` | ✅ Working | Summary generation |

## Current Issue

**DESKTOP agent is failing** with:
```
Bytez API error: 404 - Model does not exist: Qwen/Qwen2.5-VL-7B-Instruct
```

## Models That Failed

1. ❌ `anthropic/claude-opus-4-6` (native endpoint) - Content format error
2. ❌ `google/gemini-2.0-flash` - Model doesn't exist in Bytez
3. ❌ `google/gemini-1.5-flash` - Model doesn't exist in Bytez
4. ❌ `Qwen/Qwen2.5-VL-7B-Instruct` - Model doesn't exist in Bytez

## Problem Analysis

The Bytez integration guide you provided lists these models as available, but they're returning 404 errors. This suggests:

1. **The guide is outdated** - Models listed may not actually be in Bytez catalog
2. **Model ID format is wrong** - The exact spelling/format might be different
3. **Bytez catalog has changed** - Models were removed or renamed

## Possible Solutions

### Option 1: Use Anthropic Claude with Tool Calling Endpoint

Since `anthropic/claude-opus-4-6` works for ORCHESTRATOR (text-only), we can try using it with the **OpenAI-compatible endpoint** which supports tool calling:

```typescript
DESKTOP: {
  provider: 'bytez',
  model: 'anthropic/claude-opus-4-6',
  description: 'Using Claude via OpenAI endpoint with tools',
  userSelectable: true,
},
```

**BUT**: This won't support vision (screenshots). The Desktop agent would need to work without seeing the screen.

### Option 2: Use Direct Anthropic API (Bypass Bytez)

Add Anthropic SDK and use it directly for Desktop agent:

```typescript
// Use @anthropic-ai/sdk directly
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

**Pros**: Full vision support, reliable
**Cons**: Requires separate API key, more expensive

### Option 3: Check Bytez Model Catalog

We need to actually query Bytez to see what models are available. The integration guide might be wrong.

### Option 4: Use Groq for Desktop Agent Too

Since Groq's `meta-llama/llama-4-scout-17b-16e-instruct` works for PERCEPTION, use it for DESKTOP too:

```typescript
DESKTOP: {
  provider: 'groq',
  model: 'meta-llama/llama-4-scout-17b-16e-instruct',
  description: 'Using Groq Llama Scout for vision',
  userSelectable: true,
},
```

**BUT**: Groq doesn't support tool calling with vision models.

## Recommended Next Steps

1. **Test what Bytez models actually exist** by trying known working models
2. **Switch Desktop to use Anthropic directly** (bypass Bytez) for vision support
3. **Or switch Desktop to text-only** using Claude Opus via Bytez OpenAI endpoint

## Model Format Patterns

Based on what's working:

- Anthropic via Bytez: `anthropic/claude-opus-4-6` ✅
- Groq OpenAI models: `openai/gpt-oss-20b` ✅
- Groq Llama models: `meta-llama/llama-4-scout-17b-16e-instruct` ✅
- Google via Bytez: `google/gemini-*` ❌ (doesn't exist)
- Qwen via Bytez: `Qwen/Qwen2.5-VL-7B-Instruct` ❌ (doesn't exist)

## Critical Question

**Does Bytez actually support ANY vision models?**

The integration guide says yes, but all vision models we've tried return 404. This suggests:
- The guide is wrong/outdated
- Bytez doesn't actually have vision models in their catalog
- We need to use a different approach entirely
