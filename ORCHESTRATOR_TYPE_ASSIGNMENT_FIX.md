# Orchestrator Type Assignment Fix

## Problem

The orchestrator was assigning ALL tasks to the Desktop Agent, even web-based tasks like "search Google" or "navigate to Wikipedia". This caused complete task failures because:

1. Desktop Agent doesn't have web browsing capabilities (uses VNC/computer tools)
2. Web Agent uses PinchTab for browser automation
3. Wrong agent = wrong tools = task failure

## Root Cause

### 1. Default Behavior in Parser
**File**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Old Code** (line 348):
```typescript
let stepType = s.type || 'desktop';  // ← DEFAULTS TO DESKTOP!
```

**Problem**: If the LLM didn't explicitly set the `type` field in the JSON output, it would default to `'desktop'`, causing all web tasks to be routed to the Desktop Agent.

### 2. Weak Type Inference
The old code only checked for a `tool` field to infer type, which was rarely present in the LLM's output.

### 3. No Validation
There was no post-processing validation to catch obvious misassignments like "search Google" being assigned to desktop.

## Solution

### 1. Enhanced Type Inference
**File**: `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

Added intelligent type inference that analyzes the step description and context for keywords:

**Web Indicators**:
- navigate, browser, web, url, website, search google, search for
- click button on, fill form, submit form, web page
- http, https, gmail.com, google.com, wikipedia, youtube
- open website, go to website, visit website, load page
- scroll page, click link, web element, web search

**Desktop Indicators**:
- terminal, command, file, folder, directory
- open chrome, open firefox, open application, launch app
- screenshot, desktop, window, click icon, type in
- paste in, keyboard, mouse, cursor, vnc, chromium

The parser now:
1. Checks if `type` field is explicitly set
2. If missing, analyzes description + context for keywords
3. Counts matches for web vs desktop indicators
4. Assigns type based on which has more matches
5. Logs warnings when type is inferred (not explicit)

### 2. Post-Processing Validation
Added validation after parsing to catch common misassignments:

```typescript
// Check for obvious web tasks assigned to desktop
if (step.type === 'desktop') {
  const webKeywords = ['search google', 'search for', 'navigate to', 'go to website', 'web search', 'google.com', 'wikipedia'];
  const hasWebKeyword = webKeywords.some(keyword => description.includes(keyword));
  
  if (hasWebKeyword) {
    this.logger.warn(`🔧 FIXING: Step ${i + 1} was assigned to DESKTOP but contains web keywords - changing to WEB`);
    step.type = 'web';
  }
}
```

This catches cases where the LLM explicitly set the wrong type.

### 3. Strengthened System Prompt
**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

Added explicit section at the top of the ORCHESTRATOR prompt:

```
## 🚨 CRITICAL: EVERY STEP MUST HAVE A TYPE FIELD

**YOU MUST SET type: "web" OR type: "desktop" FOR EVERY SINGLE STEP!**

If you forget to set the type field, the system will try to guess, but it often guesses wrong, causing complete task failure.

**REQUIRED JSON FORMAT FOR EVERY STEP:**
{
  "id": "step_1",
  "type": "web",           ← REQUIRED! Must be "web" or "desktop"
  "description": "...",
  "success_criteria": "...",
  "context": "...",
  "depends_on": []
}
```

This makes it crystal clear that the `type` field is REQUIRED for every step.

## How It Works Now

### Example 1: "Search Google for weather"

**LLM Output** (missing type):
```json
{
  "id": "step_1",
  "description": "Search Google for weather",
  "success_criteria": "Search results visible"
}
```

**Parser Behavior**:
1. Detects missing `type` field
2. Analyzes description: "search google for weather"
3. Finds web indicators: "search google" (2 matches)
4. Finds desktop indicators: none
5. **Infers type as 'web'** ✅
6. Logs warning: "Step 1 missing type field - inferred as 'web' from description"

**Result**: Task correctly routed to Web Agent

### Example 2: "Open Chrome and navigate to Wikipedia"

**LLM Output** (wrong type):
```json
{
  "id": "step_1",
  "type": "desktop",
  "description": "Navigate to Wikipedia",
  "success_criteria": "Wikipedia homepage visible"
}
```

**Parser Behavior**:
1. Type is explicitly set to 'desktop'
2. Post-processing validation runs
3. Detects "navigate to" and "wikipedia" in description
4. **Fixes type to 'web'** ✅
5. Logs warning: "FIXING: Step 1 was assigned to DESKTOP but contains web keywords - changing to WEB"

**Result**: Task correctly routed to Web Agent

### Example 3: "Open terminal and create file"

**LLM Output** (correct type):
```json
{
  "id": "step_1",
  "type": "desktop",
  "description": "Open terminal and run echo 'hello' > file.txt",
  "success_criteria": "File created successfully"
}
```

**Parser Behavior**:
1. Type is explicitly set to 'desktop'
2. Analyzes description: "open terminal and run echo"
3. Finds desktop indicators: "terminal", "command"
4. **Type is correct** ✅
5. No warnings logged

**Result**: Task correctly routed to Desktop Agent

## Testing

To verify the fix works:

1. **Test web task**: "Search Google for India"
   - Expected: Orchestrator assigns type="web"
   - Expected: Task routed to Web Agent (uses PinchTab)

2. **Test desktop task**: "Create a file named test.txt"
   - Expected: Orchestrator assigns type="desktop"
   - Expected: Task routed to Desktop Agent (uses VNC/computer tools)

3. **Test mixed task**: "Open Chrome and search for weather"
   - Expected: Step 1 type="desktop" (open Chrome)
   - Expected: Step 2 type="web" (search for weather)

## Monitoring

Watch the logs for these indicators:

**Good** (type explicitly set):
```
🎯 [OrchestratorAgent] Generated plan:
   Step 1: [web] Navigate to Google and search for weather
```

**Warning** (type inferred):
```
⚠️  Step 1 missing type field - inferred as 'web' from description
```

**Fix Applied** (wrong type corrected):
```
🔧 FIXING: Step 1 was assigned to DESKTOP but contains web keywords - changing to WEB
   Description: "Search Google for weather"
```

## Files Modified

1. `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`
   - Enhanced type inference logic
   - Added post-processing validation
   - Added detailed logging

2. `packages/aria-agent/src/config/system-prompts.config.ts`
   - Added explicit type field requirement section
   - Strengthened web vs desktop assignment rules
   - Removed problematic JSON examples causing compilation errors

## Related Issues Fixed

- Fixed TypeScript compilation errors caused by triple backticks in template literals
- Removed verbose JSON examples that were breaking the build
- Added comprehensive logging for debugging type assignment issues

## Next Steps

1. Monitor orchestrator logs to see how often type inference is triggered
2. If type is frequently missing, consider adding few-shot examples to the prompt
3. If wrong types are frequently corrected, add more keywords to the validation lists
4. Consider adding a separate validation agent to double-check type assignments before execution
