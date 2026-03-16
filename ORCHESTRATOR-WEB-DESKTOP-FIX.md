# Orchestrator Web vs Desktop Agent Assignment Fix

## Problem Identified

From your logs, the Orchestrator was incorrectly assigning web search tasks to the Desktop Agent:

```
Task: "open chrome and search for apple stock price"

❌ WRONG Plan Generated:
Step 1: 💻 DESKTOP - "Open Chrome"
Step 2: 💻 DESKTOP - "Type 'Apple stock price' and search"  ← WRONG!

Result: 🌐 Web Agent: 0 steps | 💻 Desktop Agent: 2 steps
```

**Step 2 should have been assigned to Web Agent** because searching happens INSIDE the browser.

## Root Cause

The Orchestrator system prompt had the correct rules, but they were:
1. Buried in the middle of a long prompt
2. Not emphasized enough
3. Missing the EXACT pattern that was failing ("open browser and search")

The Orchestrator (Claude Opus 4.6) was seeing "type in search box" as a TYPING action → Desktop, instead of understanding that typing IN A BROWSER = Web Agent territory.

## The Fix

Added a **CRITICAL section at the very top** of the Orchestrator prompt with:

### 1. Golden Rule
> Once a browser is open, EVERYTHING inside it is Web Agent territory.

### 2. Exact Pattern Examples
Showing the EXACT task pattern that was failing:

**Pattern 1: "Open Chrome and search for X"**
```
✅ CORRECT:
- step_1 (desktop): "Open Chrome browser"
- step_2 (web): "Search for 'X' using browser search"
```

### 3. Quick Decision Tree
Simple visual guide:
- Is action happening INSIDE a web browser? → type: "web"
- Is action happening on DESKTOP? → type: "desktop"

### 4. Typing Actions Clarification
Explicitly listing:
- Typing in browser search box → type: "web"
- Typing in web form → type: "web"
- Typing in terminal → type: "desktop"

### 5. Validation Step Added
Added to the VERIFY PLAN step:
> If you see "search" or "navigate" or "click button on website" with type="desktop", YOU MADE A MISTAKE - fix it!

## Expected Behavior After Fix

For task: "open chrome and search for apple stock price"

```
✅ CORRECT Plan:
Step 1: 💻 DESKTOP - "Open Chrome browser"
Step 2: 🌐 WEB - "Search for 'apple stock price' in browser"

Result: 🌐 Web Agent: 1 step | 💻 Desktop Agent: 1 step
```

## How to Test

1. Restart the aria-agent backend:
   ```bash
   cd packages/aria-agent
   npm run start:dev
   ```

2. Try these test tasks:
   - "open chrome and search for apple stock price"
   - "search google for weather"
   - "go to wikipedia and search for India"

3. Check the logs for the plan output - you should see:
   - Step 1 (if opening browser): 💻 DESKTOP
   - All search/navigation steps: 🌐 WEB

## Files Changed

- `packages/aria-agent/src/config/system-prompts.config.ts`
  - Added CRITICAL section at top of ORCHESTRATOR prompt
  - Added validation step to VERIFY PLAN section
  - Rebuilt dist folder

## Why This Matters

The routing logic in `orchestration.service.ts` is correct:
```typescript
const result = step.type === 'web'
  ? await this.webAgent.execute(step, taskId)
  : await this.desktopAgent.execute(step, taskId);
```

The problem was ALWAYS in the Orchestrator's planning phase. Now it should correctly assign:
- Browser interactions → Web Agent (has PinchTab for stealth web automation)
- Desktop/OS interactions → Desktop Agent (has Computer Use for desktop control)
