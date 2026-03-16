# Quick Fix Summary: Tool Calling Migration

## What Was Wrong

Your logs showed the model outputting prose + JSON in markdown fences:
```
"It seems the previous type action didn't work. Let me try..."
```json
{ "action": "click", ... }
```
```

Your parser expected raw JSON only → parsing failed → fell back to `wait(2000ms)` → agent idled instead of acting.

## What We Fixed

**Switched from text-based JSON parsing to proper tool calling.**

The model now calls structured functions (tools) instead of outputting JSON text. This is what tools/function calling are designed for.

## Files Changed

1. **`packages/aria-agent/src/groq/pinchtab.tools.ts`** (NEW)
   - Defines 7 PinchTab tools for the LLM to call

2. **`packages/aria-agent/src/groq/groq.service.ts`**
   - Added `customTools` parameter to allow passing PinchTab tools

3. **`packages/aria-agent/src/agents/web/web.agent.ts`**
   - Removed JSON parsing logic
   - Added tool call handling
   - Now calls LLM with `useTools: true` and `pinchTabTools`

4. **`packages/aria-agent/src/config/system-prompts.config.ts`**
   - Updated WEB agent prompt to instruct tool usage instead of JSON output
   - Removed "No Markdown" rule from shared guidelines

## How It Works Now

**Before** (text-based):
```
LLM → "Let me click... ```json { action: 'click' }```" → Parser fails → wait(2000ms)
```

**After** (tool calling):
```
LLM → toolCall: { name: 'pinchtab_click', input: { ref: 'e5' } } → Execute directly
```

## Testing

Run your agent and check logs for:
```
🌐 [WebAgent] Iteration 1 response:
   Tool: pinchtab_navigate
   Input: {"url":"https://example.com"}
   → Navigating to: https://example.com
✅ [WebAgent] Tool execution completed: pinchtab_navigate
```

If you see this pattern, tool calling is working!

## Next Steps

1. **Test WebAgent** with a simple task (navigate to a URL, click a button)
2. **Monitor logs** for tool calls vs text responses
3. **Migrate DesktopAgent** using the same pattern (see TOOL-CALLING-MIGRATION.md)
4. **Add defensive parsing** to Orchestrator/Clarifier/Verifier (they still use JSON output)

## Rollback

If issues arise, change line 147 in `web.agent.ts`:
```typescript
true, // Enable tool calling
```
to:
```typescript
false, // Disable tool calling
```

And restore the old `parseDecision()` method from git history.

## Why This Is Better

✅ No JSON parsing failures  
✅ Schema validation by API  
✅ Model trained for tool use  
✅ Cleaner code  
✅ Better error messages  

## Your Question: "Why don't we use the tools we already have?"

**You were right!** You DO have tools (computer control, PinchTab), but they weren't being exposed to the LLM. The agents were calling the LLM with `useTools: false` and parsing text responses.

Now:
- **WebAgent** uses PinchTab tools via LLM tool calling
- **DesktopAgent** should use computer tools via LLM tool calling (next migration)
- **Tools are called BY the LLM**, not manually after parsing text

This is the correct architecture. The model decides which tool to call, and you execute it directly.
