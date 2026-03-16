# Orchestrator Agent Fixes

## Date: 2025-03-15

## Problem Summary
The Orchestrator was generating incorrect execution plans because it didn't understand:
1. Web Agent is self-sufficient and manages its own browser lifecycle via PinchTab
2. Web Agent doesn't need OS-level browser launch commands (xdg-open/start/open)
3. The parser crashed when LLM returned non-string fallback fields

## Root Causes

### 1. Orchestrator Ignorance
The Orchestrator didn't know that WebAgent uses PinchTab internally and tried to plan OS-level browser launch steps that don't exist in this system.

**Symptoms:**
- Generated steps like "use xdg-open to launch browser"
- Added unnecessary "initialize browser" steps before web navigation
- Assigned web tasks to Desktop Agent

### 2. Wrong Step Type Assignment
Steps were being typed as "desktop" for web tasks, causing routing failures.

**Example:**
- Step 1: "Open Google" → typed as "desktop" (WRONG)
- Step 2: "Search for INDIA" → typed as "desktop" (WRONG)

Both should be "web" type.

### 3. Replan Parser Crash
The parser expected `s.fallback` to be a string but LLM sometimes returned an object, causing:
```
Failed to parse execution plan: (s.context || s.fallback || "").toLowerCase is not a function
```

## Fixes Applied

### Fix 1: Added Agent Capabilities Section to System Prompt

**Location:** `packages/aria-agent/src/config/system-prompts.config.ts`

**Added section:**
```
## AGENT CAPABILITIES

### WEB_AGENT
The Web Agent is FULLY SELF-SUFFICIENT. It manages its own browser lifecycle internally via PinchTab (a browser automation binary running at http://localhost:9867).

**You NEVER need to:**
- Tell it to "launch a browser"
- Tell it to "use xdg-open, start, or open"
- Add a separate "initialize browser" step before navigation
- Worry about PinchTab instance creation — the Web Agent handles this automatically

**What it CAN do (just describe the goal):**
- Navigate to any URL
- Search on Google or any site
- Click elements, fill forms, read page content
- Handle multi-step web workflows end-to-end

**Correct step for "open Google and search INDIA":**
→ Single step: "Navigate to https://www.google.com/search?q=INDIA"
   OR: "Open Google and search for INDIA"

**WRONG — never plan steps like these:**
→ "Launch browser using xdg-open/start/open"
→ "Initialize PinchTab instance"
→ "Open default OS browser"

---

### DESKTOP_AGENT
Controls the VNC desktop environment via http://localhost:9990/computer-use.

**Tools available:**
- screenshot — capture screen
- application — open apps (chromium, gmail, vscode, terminal, thunar, mousepad, desktop)
- paste_text — instant text paste (PREFERRED over type_text)
- type_text — slow character-by-character typing (avoid)
- type_keys — key presses (Return, Tab, Escape, LeftControl+c, etc.)
- click_mouse — click at absolute coordinates {x, y}
- scroll — scroll up/down

**Use Desktop Agent for:**
- Opening desktop applications
- Interacting with native UI that is NOT a web browser
- File manager, text editor, terminal commands
- Anything requiring screen coordinates

**Important:** For web tasks, prefer WEB_AGENT. Desktop Agent is for native desktop interactions.

---

### Task Type Routing
| Task | Agent |
|---|---|
| Open a website | WEB_AGENT |
| Search the web | WEB_AGENT |
| Fill a web form | WEB_AGENT |
| Open a desktop app | DESKTOP_AGENT |
| Click on desktop UI | DESKTOP_AGENT |
| Type in a native window | DESKTOP_AGENT |
```

**Impact:**
- Orchestrator now understands Web Agent is self-sufficient
- Will not generate OS-level browser launch steps
- Will correctly route web tasks to Web Agent
- Prompt length increased from 8,733 to 10,850 characters

### Fix 2: Fixed Parser Type Safety

**Location:** `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Before:**
```typescript
const context = (s.context || s.fallback || '').toLowerCase();
```

**After:**
```typescript
// Fix: Guard against non-string fallback values
const fallback = typeof s.fallback === 'string' ? s.fallback : '';
const contextStr = typeof s.context === 'string' ? s.context : '';
const context = (contextStr || fallback || '').toLowerCase();
```

**Impact:**
- Parser no longer crashes when LLM returns object-type fallback fields
- Handles both string and non-string values gracefully
- Prevents `.toLowerCase()` errors on non-string types

## Expected Outcomes

### Before Fixes
```
Task: "open google and search INDIA"

Generated Plan:
- Step 1 [desktop]: Launch browser using xdg-open
- Step 2 [desktop]: Navigate to Google
- Step 3 [desktop]: Search for INDIA

Result: FAILURE (Desktop Agent doesn't have xdg-open tool)
```

### After Fixes
```
Task: "open google and search INDIA"

Generated Plan:
- Step 1 [web]: Navigate to https://www.google.com/search?q=INDIA

Result: SUCCESS (Web Agent handles everything internally)
```

## Testing Recommendations

1. **Test simple web tasks:**
   - "open google and search INDIA"
   - "send email to test@example.com"
   - "navigate to wikipedia and search for Python"

2. **Test mixed tasks:**
   - "create a file and upload it to Google Drive"
   - "run a terminal command and email the output"

3. **Test replanning:**
   - Force a step failure and verify replan doesn't crash
   - Verify replanned steps have correct types

4. **Monitor logs for:**
   - No more "xdg-open" or "start" commands in web steps
   - Correct type assignment (web vs desktop)
   - No parser crashes on replanning

## Rollback Instructions

If issues occur, revert these commits:
1. `packages/aria-agent/src/config/system-prompts.config.ts` - Remove Agent Capabilities section
2. `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` - Revert parser type guards

## Related Files
- `packages/aria-agent/src/config/system-prompts.config.ts` - System prompt configuration
- `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` - Orchestrator agent implementation
- `packages/aria-agent/src/agents/web/web.agent.ts` - Web agent (uses PinchTab)
- `packages/aria-agent/src/services/pinchtab.service.ts` - PinchTab service wrapper
