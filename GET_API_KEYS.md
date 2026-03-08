# How to Get API Keys for All Providers

## 1. Google Gemini API Key (FREE)

### Steps:
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy the API key
5. Add to your `.env` file:
   ```bash
   GOOGLE_API_KEY=your_key_here
   ```

### Free Tier:
- 20 requests per day on `gemini-2.5-flash-lite`
- 1M token context window
- No credit card required

---

## 2. Groq Cloud API Key (FREE)

### Steps:
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up for a free account
3. Navigate to [API Keys](https://console.groq.com/keys)
4. Click "Create API Key"
5. Give it a name and copy the key
6. Add to your `.env` file:
   ```bash
   GROQ_API_KEY=your_key_here
   ```

### Free Tier:
- Very generous rate limits (thousands of requests per day)
- Extremely fast inference (fastest in the market)
- Access to Llama 3.3 70B, Mixtral, and more
- No credit card required

---

## 3. OpenRouter API Key (FREE + PAID)

### Steps:
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to [Keys](https://openrouter.ai/keys)
4. Click "Create Key"
5. Copy the API key
6. Add to your `.env` file:
   ```bash
   OPENROUTER_API_KEY=your_key_here
   ```

### Free Models Available:
- `google/gemini-2.0-flash-exp:free`
- `meta-llama/llama-3.3-70b-instruct` (limited free tier)
- Many others with `:free` suffix

### Paid Models:
- Add credits to your account at [Credits](https://openrouter.ai/credits)
- Access to 100+ models including:
  - Claude 3.5 Sonnet
  - GPT-4o
  - Gemini Pro
  - And many more

---

## Quick Setup

After getting your API keys, update your `.env` file:

```bash
# packages/aria-agent/.env

# Google Gemini (FREE - 20 requests/day)
GOOGLE_API_KEY=AIzaSy...

# Groq Cloud (FREE - Very generous limits)
GROQ_API_KEY=gsk_...

# OpenRouter (FREE + PAID models)
OPENROUTER_API_KEY=sk-or-v1-...
```

Then restart your agent:

```bash
# Stop the current agent (Ctrl+C)
# Then restart
npm run start:dev
```

---

## Recommendations

### For Testing/Development:
1. **Start with Groq** - Fastest and most generous free tier
2. **Add Google Gemini** - Good for when you need more context
3. **Add OpenRouter** - For access to specific models like Claude

### For Production:
1. **OpenRouter with Claude 3.5 Sonnet** - Best quality
2. **Google Gemini Pro** - Good balance of cost/performance
3. **Groq** - When speed is critical

### Cost Comparison (Approximate):
- **Groq**: FREE (very generous)
- **Google Gemini Flash**: ~$0.075 per 1M tokens
- **OpenRouter Claude 3.5**: ~$3 per 1M input tokens
- **OpenRouter GPT-4o**: ~$2.50 per 1M input tokens

---

## Troubleshooting

### "No models available"
- Make sure at least one API key is set in your `.env`
- Restart the agent after adding keys

### "API key invalid"
- Double-check you copied the entire key
- Make sure there are no extra spaces
- Verify the key is active in the provider's dashboard

### "Rate limit exceeded"
- Switch to a different provider
- Wait for the rate limit to reset
- Upgrade to a paid tier if needed

### "Model not found"
- Check the model name matches exactly
- Some models may be temporarily unavailable
- Try a different model from the same provider
