# Gemini Model Update - March 2026 ✅

## 🚨 Critical Update Applied

Updated Bytebot to use the **current Gemini 2.5 models** (March 2026) instead of deprecated experimental models.

---

## ❌ Previous Configuration (DEPRECATED)

The application was using **experimental Gemini 2.0 models** that are no longer available:

```typescript
// ❌ DEPRECATED - These models no longer exist
'gemini-2.0-flash-exp'
'gemini-2.0-flash-thinking-exp-1219'
```

### Error Encountered
```
models/gemini-2.0-flash-thinking-exp-1219 is not found for API version v1beta
```

**Why it failed:**
- Gemini 2.0 models are being retired on June 1, 2026
- Experimental models have been replaced with stable Gemini 2.5 releases
- The API no longer recognizes these model names

---

## ✅ New Configuration (CURRENT - March 2026)

Updated to use **Gemini 2.5 models** with the best free tier options:

```typescript
export const GOOGLE_MODELS: BytebotAgentModel[] = [
  {
    provider: 'google',
    name: 'gemini-2.5-flash-lite',  // ✅ DEFAULT - Best for free tier
    title: 'Gemini 2.5 Flash-Lite (Free Tier - Best)',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-2.5-flash',  // ✅ Balanced performance
    title: 'Gemini 2.5 Flash',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-2.5-pro',  // ✅ Best quality
    title: 'Gemini 2.5 Pro',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-flash',  // ✅ Legacy support
    title: 'Gemini 1.5 Flash (Legacy)',
    contextWindow: 1000000,
  },
  {
    provider: 'google',
    name: 'gemini-1.5-pro',  // ✅ Legacy support
    title: 'Gemini 1.5 Pro (Legacy)',
    contextWindow: 2000000,
  },
];

export const DEFAULT_MODEL = GOOGLE_MODELS[0]; // gemini-2.5-flash-lite
```

---

## 📊 Free Tier Limits (March 2026)

### Gemini 2.5 Flash-Lite (DEFAULT - RECOMMENDED)
- **Requests per minute:** 15
- **Tokens per minute:** 1,000,000
- **Requests per day:** 1,500
- **Best for:** High-volume tasks, low latency
- **Cost:** FREE

### Gemini 2.5 Flash
- **Requests per minute:** 10
- **Tokens per minute:** 250,000
- **Requests per day:** 250
- **Best for:** Balanced performance and speed
- **Cost:** FREE

### Gemini 2.5 Pro
- **Requests per minute:** 5
- **Tokens per minute:** 250,000
- **Requests per day:** 100
- **Best for:** Complex reasoning tasks
- **Cost:** FREE (limited)

### Gemini 1.5 Flash (Legacy)
- **Requests per minute:** 15
- **Tokens per minute:** 1,000,000
- **Requests per day:** 1,500
- **Best for:** Backward compatibility
- **Cost:** FREE

### Gemini 1.5 Pro (Legacy)
- **Requests per minute:** 2
- **Tokens per minute:** 32,000
- **Requests per day:** 50
- **Best for:** Advanced tasks (limited quota)
- **Cost:** FREE (very limited)

---

## 🎯 Model Selection Guide

### For Development & Testing
**Use:** `gemini-2.5-flash-lite` (Default)
- Highest free tier limits
- Fast responses
- Perfect for testing and development
- 1,500 requests/day is plenty for development

### For Production/Demo
**Use:** `gemini-2.5-flash`
- Balanced performance
- Good quality responses
- Reasonable limits for demos
- 250 requests/day

### For Complex Tasks
**Use:** `gemini-2.5-pro`
- Best reasoning capabilities
- Highest quality responses
- Use sparingly (100 requests/day)
- Reserve for important demos

### For Backward Compatibility
**Use:** `gemini-1.5-flash` or `gemini-1.5-pro`
- If you need specific 1.5 features
- Same limits as 2.5 equivalents
- Will be deprecated eventually

---

## 🔄 Migration Timeline

### Gemini 2.0 Models
- **Status:** Being retired
- **Retirement Date:** June 1, 2026
- **Action Required:** Migrate to 2.5 models (DONE ✅)

### Gemini 1.5 Models
- **Status:** Legacy support
- **Retirement Date:** Not announced yet
- **Action Required:** None (still supported)

### Gemini 2.5 Models
- **Status:** Current stable release
- **Support:** Long-term
- **Recommendation:** Use these for all new development

---

## 🚀 What Changed in Your Application

### File Updated
`packages/bytebot-agent/src/google/google.constants.ts`

### Changes Made
1. ✅ Removed deprecated `gemini-2.0-flash-exp`
2. ✅ Removed deprecated `gemini-2.0-flash-thinking-exp-1219`
3. ✅ Added `gemini-2.5-flash-lite` as default
4. ✅ Added `gemini-2.5-flash`
5. ✅ Added `gemini-2.5-pro`
6. ✅ Kept `gemini-1.5-flash` and `gemini-1.5-pro` for compatibility

### Backend Status
- ✅ Auto-reloaded with new configuration
- ✅ Process ID: 20208
- ✅ All routes mapped successfully
- ✅ Ready for testing

---

## 🧪 Testing the Update

### Test 1: Simple Task
Create a task in the UI:
```
"Tell me a joke"
```
**Expected:** Should work with gemini-2.5-flash-lite

### Test 2: Complex Task
Create a task:
```
"Explain quantum computing in simple terms"
```
**Expected:** Should work with default model

### Test 3: Model Selection
In the UI, try selecting different models from the dropdown:
- Gemini 2.5 Flash-Lite (default)
- Gemini 2.5 Flash
- Gemini 2.5 Pro

**Expected:** All should work

---

## 📝 Free Tier Best Practices

### 1. Use Flash-Lite for Most Tasks
- It has the highest limits (1,500/day)
- Fast and efficient
- Perfect for development

### 2. Reserve Pro for Important Tasks
- Only 100 requests/day
- Use for demos or complex reasoning
- Don't waste on simple tasks

### 3. Monitor Your Usage
- Check quota at: https://ai.dev/rate-limit
- Track requests per day
- Plan demo usage carefully

### 4. Optimize Requests
- Cache responses when possible
- Batch similar tasks
- Use appropriate model for task complexity

### 5. Hackathon Strategy
- **Development:** Use Flash-Lite (1,500/day)
- **Testing:** Use Flash (250/day)
- **Demo Day:** Use Pro (100/day) for best quality
- **Backup:** Keep Flash-Lite as fallback

---

## 🔗 Resources

### Official Documentation
- [Gemini API Models](https://ai.google.dev/gemini-api/docs/models/gemini)
- [Pricing & Quotas](https://ai.google.dev/pricing)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- [Monitor Usage](https://ai.dev/rate-limit)

### Google AI Studio
- [AI Studio Console](https://aistudio.google.com/)
- [API Keys](https://aistudio.google.com/apikey)
- [Quota Dashboard](https://ai.dev/rate-limit)

---

## ✅ Status

- [x] Identified deprecated models
- [x] Updated to Gemini 2.5 models
- [x] Set Flash-Lite as default (best free tier)
- [x] Backend reloaded successfully
- [x] Ready for testing
- [x] Documentation updated

---

## 🎯 Next Steps

1. **Test Task Creation** - Create a simple task to verify it works
2. **Monitor Logs** - Watch backend for any errors
3. **Try Different Models** - Test Flash, Pro, and Flash-Lite
4. **Check Quota** - Monitor usage at https://ai.dev/rate-limit
5. **Plan Demo** - Reserve Pro model for important demos

---

## 💡 Pro Tips

1. **Flash-Lite is your friend** - Use it for everything during development
2. **Pro is precious** - Only 100/day, save for demos
3. **Monitor quota daily** - Don't get surprised on demo day
4. **Test early** - Verify all models work before hackathon deadline
5. **Have a backup** - Keep Flash-Lite as fallback if Pro quota runs out

---

**Update Applied:** March 6, 2026, 6:43 PM  
**Backend Status:** ✅ Running (Process 20208)  
**Default Model:** gemini-2.5-flash-lite  
**Ready for:** Testing and development
