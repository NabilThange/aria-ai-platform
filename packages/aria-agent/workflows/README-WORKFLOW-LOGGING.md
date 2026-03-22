# Workflow Tool Logging Guide

## Overview

This guide explains how to add frontend visibility for individual tool calls within workflows. By default, only the overall workflow result is shown in the UI. With logging, users can see each tool execution (type, screenshot, wait, etc.) in real-time.

## Why Add Logging?

**Without Logging:**
- Frontend only shows: "Workflow: send-email-n8n - Started" → "Workflow: send-email-n8n - Completed"
- Users can't see individual steps like `launchApplication`, `pasteText`, `screenshot`

**With Logging:**
- Frontend shows each tool call with:
  - Tool name (e.g., "launchApplication", "type", "screenshot")
  - Input parameters (e.g., `{ application: 'terminal' }`)
  - Success/failure status
  - Output/error details
  - Execution duration

## How to Add Logging to Your Workflow

### Step 1: Import WorkflowLogger

```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';
```

### Step 2: Extract Services

```typescript
export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { desktop, pinchTab, browserLogger, taskId } = services;
  
  // Create logger instance
  const logger = new WorkflowLogger(browserLogger, taskId, 'your-workflow-name');
  
  // ... rest of workflow
}
```

### Step 3: Wrap Tool Calls

**Before (no logging):**
```typescript
await desktop.launchApplication('terminal');
await desktop.wait(3000);
const screenshot = await desktop.screenshot();
```

**After (with logging):**
```typescript
await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
  desktop.launchApplication('terminal')
);

await logger.logToolCall('wait', { duration: 3000 }, () =>
  desktop.wait(3000)
);

const screenshot = await logger.logToolCall('screenshot', {}, () =>
  desktop.screenshot()
);
```

## Complete Example

```typescript
import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'example-workflow',
  description: 'Example workflow with tool logging',
  version: '1.0.0',
  timeout_ms: 30000,
  variables: [
    { name: 'url', type: 'string', required: true, description: 'URL to visit' },
  ],
};

export async function execute(
  variables: { url: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { desktop, browserLogger, taskId } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'example-workflow');

  try {
    // Open browser (logged)
    await logger.logToolCall('launchApplication', { application: 'firefox' }, () =>
      desktop.launchApplication('firefox')
    );

    // Wait for browser to load (logged)
    await logger.logToolCall('wait', { duration: 3000 }, () =>
      desktop.wait(3000)
    );

    // Type URL (logged)
    await logger.logToolCall('type', { text: variables.url }, () =>
      desktop.type(variables.url)
    );

    // Press Enter (logged)
    await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
      desktop.pressKeys(['Return'])
    );

    // Wait for page load (logged)
    await logger.logToolCall('wait', { duration: 5000 }, () =>
      desktop.wait(5000)
    );

    // Take screenshot (logged)
    const screenshot = await logger.logToolCall('screenshot', {}, () =>
      desktop.screenshot()
    );

    return {
      success: true,
      message: `Visited ${variables.url}`,
      data: { screenshot: screenshot.base64 },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Failed to visit URL: ${error.message}`,
    };
  }
}
```

## Frontend Display

Once logging is added, the frontend will show:

```
WORKFLOW:example-workflow → launchApplication ✓ 1234ms
  Parameters: { application: 'firefox' }
  Result: { success: true }

WORKFLOW:example-workflow → wait ✓ 3001ms
  Parameters: { duration: 3000 }
  Result: { success: true }

WORKFLOW:example-workflow → type ✓ 456ms
  Parameters: { text: 'https://example.com' }
  Result: { success: true }

WORKFLOW:example-workflow → pressKeys ✓ 123ms
  Parameters: { keys: ['Return'] }
  Result: { success: true }

WORKFLOW:example-workflow → screenshot ✓ 2345ms
  Parameters: {}
  Result: { base64: '...' }
```

## Best Practices

1. **Log All User-Visible Actions**: launchApplication, type, click, screenshot
2. **Log Waits**: Helps users understand timing delays
3. **Use Descriptive Tool Names**: Match the actual service method name
4. **Include Relevant Input**: Don't log sensitive data (passwords, API keys)
5. **Keep Tool Names Consistent**: Use the same name across workflows

## Common Tool Names

### Desktop Service
- `launchApplication` - Open an application
- `type` - Type text
- `pasteText` - Paste from clipboard
- `pressKeys` - Press keyboard keys
- `click` - Click at coordinates
- `screenshot` - Capture screen
- `wait` - Wait for duration
- `moveMouse` - Move mouse cursor

### PinchTab Service
- `navigate` - Navigate to URL
- `click` - Click element
- `type` - Type into input
- `scroll` - Scroll page
- `waitForElement` - Wait for element
- `getPageContent` - Get page HTML
- `executeScript` - Run JavaScript

## Troubleshooting

**Tools not showing in frontend?**
1. Check that `browserLogger` and `taskId` are extracted from services
2. Verify `WorkflowLogger` is imported correctly
3. Ensure tool calls are wrapped with `logger.logToolCall()`
4. Check browser console for WebSocket connection errors

**Tool calls showing but no results?**
1. Verify the tool function is actually being called (not just logged)
2. Check that the tool function returns a value
3. Look for errors in backend logs

**Duplicate tool calls?**
1. Make sure you're not calling the tool twice (once logged, once direct)
2. Use the pattern: `await logger.logToolCall('name', input, () => service.method())`
