# Quick Start: Multi-Provider Setup

## 🚀 Get Running in 5 Minutes

Your agent failed because Google's free tier only allows 20 requests/day. Let's fix that by adding Groq (free, unlimited-ish).

## Step 1: Get Groq API Key (2 minutes)

1. Go to https://console.groq.com/
2. Sign up (free, no credit card)
3. Go to https://console.groq.com/keys
4. Click "Create API Key"
5. Copy the key (starts with `gsk_`)

## Step 2: Add to .env (30 seconds)

Open `packages/aria-agent/.env` and add:

```bash
GROQ_API_KEY=gsk_your_key_here
```

## Step 3: Install & Restart (2 minutes)

```bash
# Install the Groq SDK
cd packages/aria-agent
npm install

# Restart the agent
npm run start:dev
```

## Step 4: Test It (1 minute)

1. Open your UI
2. Create a new task
3. Select "Llama 3.3 70B" from the model dropdown
4. Watch it work! ✨

## That's It!

You now have:
- ✅ Google Gemini (20 requests/day)
- ✅ Groq Cloud (thousands of requests/day)
- ✅ Automatic switching between providers

## Bonus: Add OpenRouter (Optional)

Want even more models? Add OpenRouter:

1. Get API key: https://openrouter.ai/keys
2. Add to `.env`: `OPENROUTER_API_KEY=sk-or-v1-...`
3. Restart agent
4. Access 100+ models including Claude, GPT-4o, etc.

## Why This Solves Your Problem

**Before:**
- Google free tier: 20 requests/day
- Hit limit → agent fails ❌

**After:**
- Google: 20 requests/day
- Groq: ~14,400 requests/day (free)
- OpenRouter: Varies by model
- Total: Never run out! ✅

## Model Recommendations

### For Speed:
- **Groq: Llama 3.3 70B** - Fastest inference

### For Quality:
- **Google: Gemini 2.5 Pro** - Best reasoning
- **OpenRouter: Claude 3.5 Sonnet** - Best overall (paid)

### For Free:
- **Groq: Llama 3.3 70B** - Best free model
- **Google: Gemini 2.5 Flash-Lite** - Good for simple tasks

## Troubleshooting

### "No models available"
→ Check your `.env` has at least one API key

### "API key invalid"
→ Copy the entire key, no spaces

### "Models not showing up"
→ Restart the agent after adding keys

### Still stuck?
→ Check [MULTI_PROVIDER_SETUP.md](./MULTI_PROVIDER_SETUP.md) for detailed help

## Next Steps

1. ✅ Add Groq API key (do this now!)
2. ⏭️ Read [MULTI_PROVIDER_SETUP.md](./MULTI_PROVIDER_SETUP.md) for details
3. ⏭️ Check [GET_API_KEYS.md](./GET_API_KEYS.md) for all providers
4. ⏭️ Explore different models for different tasks

---

**Need help?** Check the documentation files or create an issue.

**Happy coding!** 🎉
