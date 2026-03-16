# Web Agent Eager Initialization Implementation

## Overview
Changed WebAgent from lazy initialization to eager initialization of the browser instance. The browser now launches immediately when the WebAgent starts, and comprehensive metadata is provided to the LLM in the system prompt.

## Key Changes

### 1. Eager Initialization on Agent Start
**Location**: `web.agent.ts` - `run()` method

```typescript
async run(input: any, taskId: string): Promise<AgentResult> {
  // EAGER INITIALIZATION: Launch browser instance immediately
  await this.initializeBrowserInstance(taskId);
  // ... rest of execution
}
```

**Behavior**:
- Browser launches as soon as WebAgent.run() is called
- No waiting for specific step descriptions
- Instance is ready before any LLM calls

### 2. New Instance Metadata Collection
**Location**: `web.agent.ts` - `initializeBrowserInstance()` and `collectInstanceMetadata()`

**Collected Metadata**:
```json
{
  "instanceId": "default-abc123",
  "status": "active",
  "mode": "headed",
  "health": "healthy",
  "tabs": {
    "count": 1,
    "currentTabId": "tab-1",
    "list": [
      {
        "id": "tab-1",
        "url": "about:blank",
        "title": "New Tab"
      }
    ]
  },
  "capabilities": [
    "navigate",
    "click",
    "type",
    "scroll",
    "screenshot",
    "wait",
    "submit_form",
    "press_key"
  ],
  "launchedAt": "2026-03-15T10:30:00.000Z"
}
```

### 3. Enhanced System Prompt with Instance Info
**Location**: `web.agent.ts` - `getSystemPrompt()`

The system prompt now includes a comprehensive browser instance section:

```
🌐 BROWSER INSTANCE INFORMATION (PRE-INITIALIZED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ A Chromium browser instance is ALREADY RUNNING and ready for use!

Instance Details:
  • Instance ID: default-abc123
  • Status: active
  • Mode: HEADED (visible browser window)
  • Health: healthy
  • Launched At: 2026-03-15T10:30:00.000Z

Current Tabs:
  • Total Tabs: 1
  • Active Tab: tab-1
  • Open Tabs:
    - [tab-1] New Tab (about:blank)

Available Capabilities:
  ✓ navigate
  ✓ click
  ✓ type
  ✓ scroll
  ✓ screenshot
  ✓ wait
  ✓ submit_form
  ✓ press_key

⚠️  IMPORTANT INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DO NOT call pinchtab_launch_instance - the browser is ALREADY RUNNING
2. Use the existing instance ID: default-abc123
3. You can immediately start using navigation, clicking, typing, etc.
4. If you need a new tab, use pinchtab_navigate with a URL
5. Only launch a NEW instance if explicitly required by the task AND the current instance fails
```

### 4. Updated Decision Prompt Context
**Location**: `web.agent.ts` - `buildDecisionPrompt()`

Each iteration now shows:
```
🌐 BROWSER INSTANCE (PRE-INITIALIZED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Instance: default-abc123 (ACTIVE)
✅ Mode: HEADED
✅ Current Tab: tab-1
✅ Current URL: https://google.com
✅ Page Title: Google

⚠️  CRITICAL: Browser is ALREADY RUNNING - DO NOT launch another instance!
✅ Use existing instance for all actions (navigate, click, type, etc.)
```

### 5. Removed Lazy Initialization Logic
**Location**: `web.agent.ts` - `executeStep()`

**Before**:
```typescript
// Check if we need to open a tab first (for navigation steps)
const needsInitialNavigation = !this.pinchTabService.getTaskTabId(taskId) && 
  (step.description.toLowerCase().includes('navigate') || ...);

if (needsInitialNavigation) {
  await this.ensurePinchTabInstance(taskId); // Lazy init
  // ...
}
```

**After**:
```typescript
// NOTE: Browser instance is EAGERLY initialized in run() method
// No need for lazy initialization - instance is already running

// Check if we need to open a tab first (for navigation steps)
const needsInitialNavigation = !this.pinchTabService.getTaskTabId(taskId) && 
  (step.description.toLowerCase().includes('navigate') || ...);

if (needsInitialNavigation) {
  // No ensurePinchTabInstance call - already initialized
  // ...
}
```

### 6. Updated ensurePinchTabInstance to Safety Check
**Location**: `web.agent.ts` - `ensurePinchTabInstance()`

Now acts as a safety fallback:
```typescript
private async ensurePinchTabInstance(taskId: string): Promise<void> {
  const instance = this.pinchTabService.getTaskInstance(taskId);
  if (!instance) {
    this.logger.warn(`⚠️  Instance not found - this should not happen with eager initialization`);
    // Fallback: initialize now
    await this.initializeBrowserInstance(taskId);
  }
}
```

## Benefits

### 1. Prevents Duplicate Instance Creation
- LLM knows browser is already running
- Clear instructions not to launch another instance
- Reduces 409 conflicts

### 2. Faster Execution
- Browser ready immediately
- No waiting for lazy initialization
- First action can execute right away

### 3. Better LLM Context
- LLM has full visibility into browser state
- Knows instance ID, tabs, capabilities
- Can make better decisions

### 4. Clearer Logging
```
🚀 EAGER INITIALIZATION: Launching HEADED browser for task abc-123
✅ Browser instance launched successfully: default-abc123
📊 Instance metadata collected and ready for LLM
```

## Testing Checklist

- [ ] Browser launches when WebAgent starts
- [ ] Instance metadata is collected correctly
- [ ] System prompt includes instance info
- [ ] LLM doesn't try to launch duplicate instances
- [ ] Navigation works immediately
- [ ] All PinchTab tools work correctly
- [ ] Instance cleanup happens on task completion
- [ ] Multiple tasks don't interfere with each other

## Configuration

Controlled by environment variable:
```env
PINCHTAB_HEADED_MODE=true  # Visible browser window
PINCHTAB_HEADED_MODE=false # Headless mode
```

## Backward Compatibility

✅ All existing PinchTab tool calls still work
✅ ensurePinchTabInstance() calls are now no-ops (safe)
✅ No breaking changes to PinchTabService API
✅ Existing tasks continue to work

## Future Enhancements

1. **Instance Pooling**: Reuse instances across tasks
2. **Profile Management**: Different browser profiles per task type
3. **Resource Monitoring**: Track memory/CPU usage
4. **Auto-restart**: Restart crashed instances automatically
5. **Multi-browser**: Support Firefox, Safari, etc.