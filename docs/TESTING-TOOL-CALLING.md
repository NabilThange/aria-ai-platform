# Testing Tool Calling Implementation

## Quick Test Scenarios

### Test 1: Simple Navigation
**Task**: "Navigate to google.com"

**Expected Log Output**:
```
🌐 [WebAgent] Iteration 1 response:
   Tool: pinchtab_navigate
   Input: {"url":"https://google.com"}
   → Navigating to: https://google.com
✅ [WebAgent] Tool execution completed: pinchtab_navigate

🌐 [WebAgent] Iteration 2 response:
   Text response: COMPLETE: Successfully navigated to Google homepage
```

**What to Check**:
- ✅ Tool call appears (not JSON text)
- ✅ Navigation executes
- ✅ Completion detected via text response

---

### Test 2: Form Interaction
**Task**: "Search for 'AI agents' on Google"

**Expected Log Output**:
```
🌐 [WebAgent] Iteration 1 response:
   Tool: pinchtab_navigate
   Input: {"url":"https://google.com"}

🌐 [WebAgent] Iteration 2 response:
   Tool: pinchtab_fill
   Input: {"ref":"e3","value":"AI agents"}
   → Filling element e3 with: AI agents

🌐 [WebAgent] Iteration 3 response:
   Tool: pinchtab_submit
   Input: {"ref":"e5"}
   → Submitting form: e5

🌐 [WebAgent] Iteration 4 response:
   Text response: COMPLETE: Search results displayed for 'AI agents'
```

**What to Check**:
- ✅ Multiple tool calls in sequence
- ✅ Element references from snapshot used correctly
- ✅ Form submission works
- ✅ Completion detected

---

### Test 3: Error Handling
**Task**: "Click element that doesn't exist"

**Expected Behavior**:
- Tool call with invalid ref
- PinchTab returns error
- Agent retries or reports failure
- No JSON parsing errors

---

## Log Patterns to Look For

### ✅ SUCCESS: Tool Calling Working
```
📤 Sending 1 messages to Groq (model: llama-3.3-70b-versatile)
   Using 7 tools: pinchtab_navigate, pinchtab_click, pinchtab_fill, ...
🌐 [WebAgent] Iteration 1 response:
   Tool: pinchtab_navigate
   Input: {"url":"https://example.com"}
✅ [WebAgent] Tool execution completed: pinchtab_navigate
```

### ❌ FAILURE: Still Parsing JSON
```
🌐 [WebAgent] Iteration 1 response:
Let me navigate to the website...
```json
{ "action": "navigate", "url": "https://example.com" }
```
Failed to parse decision: Unexpected token L in JSON at position 0
```

### ⚠️ WARNING: Model Not Calling Tools
```
🌐 [WebAgent] Iteration 1 response:
   Text response: I should navigate to the website first
   Model returned text without tool call, waiting...
```
This means the model is reasoning but not taking action. Check system prompt.

---

## Debugging Commands

### Check if PinchTab is Running
```bash
curl http://localhost:9867/health
```

### Check Environment Variables
```bash
echo $PINCHTAB_HEADED_MODE  # Should be 'true' for visible browser
echo $GROQ_API_KEY          # Should be set
```

### Run Agent with Debug Logging
```bash
LOG_LEVEL=debug npm run start:dev
```

---

## Common Issues & Fixes

### Issue 1: "No tool calls, only text responses"
**Cause**: System prompt not clear about tool usage  
**Fix**: Check that WEB agent prompt says "YOU MUST USE THE PROVIDED TOOLS"

### Issue 2: "Tool call with wrong parameters"
**Cause**: Tool schema doesn't match PinchTab expectations  
**Fix**: Verify `pinchtab.tools.ts` parameter names match PinchTab service

### Issue 3: "Still seeing JSON parsing errors"
**Cause**: Agent still calling with `useTools: false`  
**Fix**: Check line 147 in `web.agent.ts` - should be `true`

### Issue 4: "Model calls tool but execution fails"
**Cause**: Element reference doesn't exist in snapshot  
**Fix**: Check snapshot contains the element before calling tool

---

## Comparison: Before vs After

### BEFORE (Text-Based JSON)
```typescript
// Agent calls LLM
const response = await groqService.generateMessage(..., false);

// Parse text response
const content = response.contentBlocks[0].text;
const cleanContent = content.replace(/```json/g, '').replace(/```/g, '');
const decision = JSON.parse(cleanContent); // ❌ FAILS HERE

// Execute action
await pinchTabService.navigate(decision.url);
```

**Problems**:
- Model outputs prose before JSON
- Markdown fences break parser
- Fallback to wait(2000ms) wastes time

### AFTER (Tool Calling)
```typescript
// Agent calls LLM with tools
const response = await groqService.generateMessage(..., true, undefined, pinchTabTools);

// Handle tool call directly
const toolCall = response.contentBlocks[0].toolUse;
await executeToolCall(toolCall); // ✅ WORKS
```

**Benefits**:
- No parsing needed
- Schema validated by API
- Direct execution

---

## Performance Metrics to Track

### Before Tool Calling
- JSON parsing failures: ~30-40% of iterations
- Average iterations per step: 8-12
- Wasted wait() calls: 3-5 per step
- Total time per step: 20-30 seconds

### After Tool Calling (Expected)
- JSON parsing failures: 0%
- Average iterations per step: 4-6
- Wasted wait() calls: 0-1 per step
- Total time per step: 10-15 seconds

---

## Next: Migrate DesktopAgent

Once WebAgent is working, apply the same pattern to DesktopAgent:

1. Use existing `getComputerUseTools()` from BytezService
2. Call Bytez with `useTools: true`
3. Handle tool calls instead of parsing JSON
4. Update DESKTOP agent system prompt

See `TOOL-CALLING-MIGRATION.md` for details.
