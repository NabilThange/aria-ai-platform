# Migration Guide: Single Provider → Multi-Provider

## What Changed?

Your Bytebot agent has been upgraded from supporting only Google Gemini to supporting **3 AI providers**:
- ✅ Google Gemini (existing)
- ✅ Groq Cloud (new)
- ✅ OpenRouter (new)

## Breaking Changes

**None!** This is a backward-compatible upgrade. Your existing Google Gemini setup will continue to work exactly as before.

## What You Need to Do

### Option 1: Keep Using Google Only (No Action Required)
If you're happy with Google Gemini, you don't need to do anything. Your existing setup will continue working.

### Option 2: Add Additional Providers (Recommended)
To avoid quota issues and get access to more models:

1. **Install the new dependency:**
   ```bash
   cd packages/aria-agent
   npm install
   ```

2. **Get API keys** (see [GET_API_KEYS.md](./GET_API_KEYS.md)):
   - [Groq Cloud](https://console.groq.com/keys) - FREE, very generous limits
   - [OpenRouter](https://openrouter.ai/keys) - FREE + PAID models

3. **Update your `.env` file:**
   ```bash
   # packages/aria-agent/.env
   
   # Existing Google Gemini (keep as is)
   GOOGLE_API_KEY=your_existing_key
   
   # Add Groq (optional but recommended)
   GROQ_API_KEY=your_groq_key_here
   
   # Add OpenRouter (optional)
   OPENROUTER_API_KEY=your_openrouter_key_here
   ```

4. **Restart the agent:**
   ```bash
   npm run start:dev
   ```

## New Features

### 1. Model Selection in UI
Users can now select from all available models when creating a task. The UI will show models from all configured providers.

### 2. Automatic Provider Routing
The agent automatically routes requests to the correct provider based on the selected model. No manual configuration needed.

### 3. Fallback Options
If one provider hits rate limits, users can switch to another provider's model.

## File Changes

### New Files Created:
```
packages/aria-agent/src/
├── groq/
│   ├── groq.service.ts
│   ├── groq.module.ts
│   ├── groq.tools.ts
│   └── groq.constants.ts
└── openrouter/
    ├── openrouter.service.ts
    ├── openrouter.module.ts
    ├── openrouter.tools.ts
    └── openrouter.constants.ts
```

### Modified Files:
- `packages/aria-agent/src/agent/agent.module.ts` - Added new provider modules
- `packages/aria-agent/src/agent/agent.processor.ts` - Added provider services
- `packages/aria-agent/src/agent/agent.types.ts` - Updated provider types
- `packages/aria-agent/src/tasks/tasks.controller.ts` - Added model detection
- `packages/aria-agent/package.json` - Added groq-sdk dependency

### No Changes to:
- Database schema
- API endpoints
- Message format
- Tool definitions
- UI components (will automatically show new models)

## Testing the Migration

1. **Verify existing Google models still work:**
   ```bash
   # Start the agent
   npm run start:dev
   
   # Check the models endpoint
   curl http://localhost:3001/tasks/models
   ```
   
   You should see your Google Gemini models listed.

2. **Add a Groq API key and verify:**
   ```bash
   # Add GROQ_API_KEY to .env
   # Restart the agent
   # Check models again
   curl http://localhost:3001/tasks/models
   ```
   
   You should now see both Google and Groq models.

3. **Create a test task with a Groq model:**
   - Open the UI
   - Create a new task
   - Select a Groq model (e.g., "Llama 3.3 70B")
   - Verify it works

## Rollback Plan

If you encounter any issues, you can rollback by:

1. **Remove the new provider modules:**
   ```bash
   rm -rf packages/aria-agent/src/groq
   rm -rf packages/aria-agent/src/openrouter
   ```

2. **Revert the modified files** using git:
   ```bash
   git checkout packages/aria-agent/src/agent/agent.module.ts
   git checkout packages/aria-agent/src/agent/agent.processor.ts
   git checkout packages/aria-agent/src/agent/agent.types.ts
   git checkout packages/aria-agent/src/tasks/tasks.controller.ts
   ```

3. **Uninstall the Groq SDK:**
   ```bash
   cd packages/aria-agent
   npm uninstall groq-sdk
   ```

4. **Restart the agent:**
   ```bash
   npm run start:dev
   ```

## Support

If you encounter any issues:

1. Check the logs for error messages
2. Verify your API keys are correct
3. Ensure you've restarted the agent after adding keys
4. Check the [MULTI_PROVIDER_SETUP.md](./MULTI_PROVIDER_SETUP.md) for detailed configuration

## Benefits of Upgrading

1. **No More Quota Issues**: Switch providers when you hit limits
2. **Better Performance**: Groq offers extremely fast inference
3. **More Model Options**: Access to 100+ models via OpenRouter
4. **Cost Optimization**: Use free tiers strategically
5. **Redundancy**: If one provider is down, use another

## Recommended Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Get a Groq API key (free, takes 2 minutes)
3. ✅ Add it to your `.env` file
4. ✅ Restart the agent
5. ✅ Test with a Groq model
6. ⏭️ Optionally add OpenRouter for even more models
