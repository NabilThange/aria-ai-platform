# Google Provider Routing Fix

## Problem
The WEB agent was configured to use Google's `gemini-3-flash-preview` model, but the code was hardcoded to call `GroqService` instead of `GoogleService`. This caused the error:

```
404 {"error":{"message":"The model `gemini-3-flash-preview` does not exist or you do not have access to it.","type":"invalid_request_error","code":"model_not_found"}}
```

The error occurred because Groq doesn't have Google models - it was trying to send a Google model name to Groq's API.

## Root Cause
In `packages/aria-agent/src/agents/web/web.agent.ts`:
- Line 305 was hardcoded to call `this.groqService.generateMessage()`
- The WebAgent only had `GroqService` injected in the constructor
- No logic to route to the correct service based on the model provider

## Solution

### 1. Updated WebAgent Constructor
Added `BytezService` and `GoogleService` to the WebAgent constructor:

```typescript
constructor(
  sharedState: SharedStateService,
  private readonly groqService: GroqService,
  private readonly bytezService: BytezService,
  private readonly googleService: GoogleService,
  private readonly pinchTabService: PinchTabService,
  private readonly perceptionAgent: PerceptionAgent,
  private readonly messagesService: MessagesService,
  private readonly browserLogger: BrowserLoggerService,
) {
  super(sharedState, 'WebAgent');
}
```

### 2. Added Provider-Based Routing
Replaced the hardcoded Groq call with provider-aware routing:

```typescript
let response;
if (this.model.provider === 'google') {
  response = await this.googleService.generateMessage(...);
} else if (this.model.provider === 'bytez') {
  response = await this.bytezService.generateMessage(...);
} else {
  response = await this.groqService.generateMessage(...);
}
```

### 3. Updated WebModule
Added `BytezModule` and `GoogleModule` to the WebModule imports so the services are available for dependency injection.

### 4. Fixed Browser Logger
Updated the browser logger to use the actual provider instead of hardcoded 'groq':

```typescript
this.browserLogger.logAgentResponse(taskId, 'WEB_AGENT', {
  model: this.model.model,
  provider: this.model.provider,  // Now dynamic
  contentBlocks: response.contentBlocks || [],
  tokenUsage: response.tokenUsage,
});
```

## Files Modified
1. `packages/aria-agent/src/agents/web/web.agent.ts` - Added imports, updated constructor, added routing logic
2. `packages/aria-agent/src/agents/web/web.module.ts` - Added BytezModule and GoogleModule

## Result
Now when the WEB agent runs with `gemini-3-flash-preview` model:
- It correctly routes to `GoogleService`
- The Google API receives the correct model name
- Function calling works properly with Google's API
- The agent can execute web tasks using Google's Gemini models

## Testing
The fix allows the WEB agent to:
1. Use Google models (gemini-3-flash-preview, gemini-3.1-flash-lite-preview, etc.)
2. Fall back to Groq or Bytez if configured
3. Properly route based on the model provider in AGENT_MODELS config
