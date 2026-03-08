# Multi-Provider AI Setup

Your Bytebot agent now supports **3 AI providers** that users can switch between:

## Supported Providers

### 1. Google Gemini (via @google/genai SDK)
- **Free Tier**: 20 requests/day on `gemini-2.5-flash-lite`
- **Models Available**:
  - `gemini-2.5-flash-lite` (Free Tier - Best)
  - `gemini-2.5-flash`
  - `gemini-2.5-pro`
  - `gemini-1.5-flash` (Legacy)
  - `gemini-1.5-pro` (Legacy)
- **Context Window**: Up to 1M tokens (2M for 1.5 Pro)
- **Setup**: Set `GOOGLE_API_KEY` or `GEMINI_API_KEY` in your `.env`

### 2. Groq Cloud (via groq-sdk)
- **Free Tier**: Very generous limits, extremely fast inference
- **Models Available**:
  - `llama-3.3-70b-versatile` (Default)
  - `llama-3.1-70b-versatile`
  - `mixtral-8x7b-32768`
- **Context Window**: Up to 128K tokens
- **Setup**: Set `GROQ_API_KEY` in your `.env`
- **Get API Key**: https://console.groq.com/keys

### 3. OpenRouter (via REST API)
- **Access to 100+ models** from multiple providers
- **Models Available** (pre-configured):
  - `anthropic/claude-3.5-sonnet` (Default)
  - `openai/gpt-4o`
  - `google/gemini-2.0-flash-exp:free` (Free)
  - `meta-llama/llama-3.3-70b-instruct`
  - `qwen/qwen-2.5-72b-instruct`
- **Context Window**: Varies by model (up to 1M tokens)
- **Setup**: Set `OPENROUTER_API_KEY` in your `.env`
- **Get API Key**: https://openrouter.ai/keys

## Environment Variables

Add these to your `.env` file (you can use one, two, or all three):

```bash
# Google Gemini
GOOGLE_API_KEY=your_google_api_key_here
# OR
GEMINI_API_KEY=your_gemini_api_key_here

# Groq Cloud
GROQ_API_KEY=your_groq_api_key_here

# OpenRouter
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

## How It Works

1. **Automatic Detection**: The system automatically detects which API keys are configured
2. **Dynamic Model List**: Only models from configured providers appear in the UI
3. **User Selection**: Users can select any available model when creating a task
4. **Provider Routing**: The agent automatically routes requests to the correct provider based on the selected model

## Installation

Install the new Groq SDK dependency:

```bash
cd packages/aria-agent
npm install groq-sdk@^0.8.0
```

Or from the root:

```bash
npm install
```

## Architecture

Each provider has its own module structure:

```
packages/aria-agent/src/
├── google/
│   ├── google.service.ts      # Google Gemini implementation
│   ├── google.module.ts
│   ├── google.tools.ts
│   └── google.constants.ts
├── groq/
│   ├── groq.service.ts        # Groq Cloud implementation
│   ├── groq.module.ts
│   ├── groq.tools.ts
│   └── groq.constants.ts
└── openrouter/
    ├── openrouter.service.ts  # OpenRouter implementation
    ├── openrouter.module.ts
    ├── openrouter.tools.ts
    └── openrouter.constants.ts
```

All providers implement the `BytebotAgentService` interface for consistency.

## Benefits

1. **No More Quota Issues**: Switch providers when you hit rate limits
2. **Cost Optimization**: Use free tiers or cheaper models for simple tasks
3. **Performance**: Groq offers extremely fast inference speeds
4. **Model Variety**: Access to 100+ models via OpenRouter
5. **Redundancy**: If one provider is down, use another

## Recommendations

- **For Development**: Use Groq (fast, generous free tier)
- **For Production**: Use Google Gemini Pro or OpenRouter with Claude
- **For Cost Savings**: Use free models on OpenRouter or Gemini Flash-Lite
- **For Speed**: Use Groq Cloud (fastest inference)

## Troubleshooting

### Models Not Appearing
- Check that the corresponding API key is set in your `.env`
- Restart the agent service after adding new API keys

### API Errors
- Verify your API keys are valid
- Check rate limits on your provider dashboard
- Ensure you have credits/quota available

### Provider-Specific Issues
- **Google**: Free tier has 20 requests/day limit
- **Groq**: Some models may have temporary availability issues
- **OpenRouter**: Requires credits for most models (some are free)

## Future Enhancements

Potential additions:
- Anthropic Claude (direct API)
- OpenAI (direct API)
- Azure OpenAI
- AWS Bedrock
- Cohere
- Custom model endpoints
