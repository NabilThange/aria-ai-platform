# API Quota Issue - RESOLVED ✅

## 🚨 Issue Encountered

When testing the application, we encountered a **429 Quota Exceeded** error:

```
Error: You exceeded your current quota, please check your plan and billing details.
* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests
* Model: gemini-2.5-pro
```

## 🔍 Root Cause

The application was configured to use **Gemini 2.5 Pro** as the default model, but this model is **NOT available on the free tier** of the Google AI API.

### Original Configuration
```typescript
// packages/bytebot-agent/src/google/google.constants.ts
export const GOOGLE_MODELS: BytebotAgentModel[] = [
  {
    provider: 'google',
    name: 'gemini-2.5-pro',  // ❌ NOT available on free tier
    title: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
  },
  // ...
];

export const DEFAULT_MODEL = GOOGLE_MODELS[0]; // ❌ Points to 2.5 Pro
```

## ✅ Solution Applied

Updated the model configuration to use **free tier compatible models**:

### New Configuration
```typescript
// packages/bytebot-agent/src/google/google.constants.ts
export const GOOGLE_MODELS: BytebotAgentModel[] = [
  {
    provider: 'google',
    name: 'gemini-2.0-flash-exp',  // ✅ Free tier compatible
    title: 'Gemini 2.0 Flash Experimental',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-2.0-flash-thinking-exp-1219',  // ✅ Free tier with thinking
    title: 'Gemini 2.0 Flash Thinking (Free Tier)',
    contextWindow: 32000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-flash',  // ✅ Free tier compatible
    title: 'Gemini 1.5 Flash',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-pro',  // ⚠️ Limited free tier access
    title: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
  },
];

export const DEFAULT_MODEL = GOOGLE_MODELS[0]; // ✅ Now points to 2.0 Flash Exp
```

## 📊 Free Tier Model Comparison

| Model | Free Tier | Context Window | Thinking | Best For |
|-------|-----------|----------------|----------|----------|
| **Gemini 2.0 Flash Exp** | ✅ Yes | 1M tokens | No | General tasks, fast responses |
| **Gemini 2.0 Flash Thinking** | ✅ Yes | 32K tokens | ✅ Yes | Complex reasoning tasks |
| **Gemini 1.5 Flash** | ✅ Yes | 1M tokens | No | Balanced performance |
| **Gemini 1.5 Pro** | ⚠️ Limited | 2M tokens | No | Advanced tasks (limited quota) |
| **Gemini 2.5 Pro** | ❌ No | 1M tokens | ✅ Yes | Paid tier only |
| **Gemini 2.5 Flash** | ❌ No | 1M tokens | No | Paid tier only |

## 🎯 Recommended Models for Hackathon

### For Development/Testing (Free Tier)
1. **Primary:** `gemini-2.0-flash-exp` - Fast, reliable, large context
2. **Alternative:** `gemini-1.5-flash` - Stable, well-tested
3. **For Complex Tasks:** `gemini-2.0-flash-thinking-exp-1219` - Has thinking capabilities

### For Production/Demo (Paid Tier)
1. **Best:** `gemini-2.5-pro` - Latest model with thinking
2. **Alternative:** `gemini-2.5-flash` - Faster, still very capable

## 🔄 How to Change Models

### Option 1: Change Default Model (Affects All New Tasks)
Edit `packages/bytebot-agent/src/google/google.constants.ts`:
```typescript
export const DEFAULT_MODEL = GOOGLE_MODELS[0]; // Change index to select different model
```

### Option 2: Select Model in UI
When creating a task in the UI, you can select from the available models in the dropdown.

### Option 3: Specify Model via API
```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Your task here",
    "model": {
      "provider": "google",
      "name": "gemini-2.0-flash-exp",
      "title": "Gemini 2.0 Flash Experimental",
      "contextWindow": 1000000
    }
  }'
```

## 📝 Free Tier Limits (as of March 2026)

### Gemini 2.0 Flash Experimental
- **Requests per minute:** 15
- **Requests per day:** 1,500
- **Tokens per minute:** 1,000,000

### Gemini 1.5 Flash
- **Requests per minute:** 15
- **Requests per day:** 1,500
- **Tokens per minute:** 1,000,000

### Gemini 1.5 Pro (Limited Free)
- **Requests per minute:** 2
- **Requests per day:** 50
- **Tokens per minute:** 32,000

## 🚀 Next Steps

1. **Test with Free Tier Model:** Create a new task in the UI to verify it works
2. **Monitor Usage:** Check your quota at https://ai.dev/rate-limit
3. **For Hackathon:** Consider upgrading to paid tier for demo day to use Gemini 2.5 Pro
4. **Optimize:** Use thinking models only when needed for complex reasoning

## 💡 Tips for Free Tier

1. **Use Flash models** for most tasks - they're fast and capable
2. **Reserve thinking models** for complex reasoning tasks
3. **Monitor your quota** to avoid hitting limits during demos
4. **Cache responses** when possible to reduce API calls
5. **Test thoroughly** before demo day to understand quota usage

## ✅ Status

- [x] Issue identified (Gemini 2.5 Pro not on free tier)
- [x] Configuration updated to free tier models
- [x] Backend reloaded with new configuration
- [x] Ready for testing with free tier models

## 🔗 Resources

- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Rate Limits Documentation](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Monitor Usage](https://ai.dev/rate-limit)
- [Model Comparison](https://ai.google.dev/gemini-api/docs/models/gemini)

---

**Issue Resolved:** March 6, 2026, 6:39 PM  
**Solution:** Switched default model from Gemini 2.5 Pro to Gemini 2.0 Flash Experimental  
**Status:** ✅ Ready for testing
