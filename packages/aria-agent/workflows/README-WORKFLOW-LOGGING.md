# Workflow Tool Logging Guide

## Overview

This guide explains how to add frontend visibility for individual tool calls within workflows. By default, only the overall workflow result is shown in the UI. With logging, users can see each tool execution (type, screenshot, wait, etc.) in real-time — making workflows look professional and giving users confidence that things are actually happening.

## Why Add Logging?

**Without Logging:**
- Frontend only shows: "Workflow: send-email-n8n - Started" → "Workflow: send-email-n8n - Completed"
- Users can't see individual steps like `launchApplication`, `pasteText`, `screenshot`
- Feels like a black box — users don't know if it's working or stuck

**With Logging:**
- Frontend shows each tool call with:
  - Tool name (e.g., "launchApplication", "type", "screenshot")
  - Input parameters (e.g., `{ application: 'terminal' }`)
  - Success/failure status
  - Output/error details
  - Execution duration
- Users see progress in real-time
- Debugging becomes trivial — you can see exactly where it failed
- **It looks really cool!** 🚀

## How to Add Logging to Your Workflow

### Quick Migration Checklist

1. Import `WorkflowLogger` at the top
2. Extract `browserLogger` and `taskId` from services
3. Create logger instance with workflow name
4. Wrap every tool call with `logger.logToolCall()`
5. Test in frontend to see the magic ✨

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

## How to Add Logging to Existing Workflows

### Example: Adding Logging to `deep-research.workflow.ts`

**Before (no logging):**
```typescript
export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  
  // Launch browser
  const instance = await pinchTab.launchInstance(`deep-research-${Date.now()}`, 'headed');
  pinchTab.setCurrentInstance(instance.id);
  await pinchTab.wait(3000);
  
  // Navigate to Wikipedia
  await pinchTab.navigate('https://en.wikipedia.org');
  await pinchTab.wait(5000);
  
  // Type search query
  await pinchTab.type('#searchInput', topic);
  await pinchTab.press('Enter');
  await pinchTab.wait(8000);
  
  // Take snapshot
  const snapshot = await pinchTab.snapshot('all');
}
```

**After (with logging):**
```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { pinchTab, desktop, browserLogger, taskId } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'deep-research');
  
  // Launch browser (logged)
  const instance = await logger.logToolCall(
    'launchInstance',
    { profile: `deep-research-${Date.now()}`, mode: 'headed' },
    () => pinchTab.launchInstance(`deep-research-${Date.now()}`, 'headed')
  );
  pinchTab.setCurrentInstance(instance.id);
  
  await logger.logToolCall('wait', { duration: 3000 }, () => pinchTab.wait(3000));
  
  // Navigate to Wikipedia (logged)
  await logger.logToolCall('navigate', { url: 'https://en.wikipedia.org' }, () =>
    pinchTab.navigate('https://en.wikipedia.org')
  );
  
  await logger.logToolCall('wait', { duration: 5000 }, () => pinchTab.wait(5000));
  
  // Type search query (logged)
  await logger.logToolCall('type', { selector: '#searchInput', text: topic }, () =>
    pinchTab.type('#searchInput', topic)
  );
  
  await logger.logToolCall('press', { key: 'Enter' }, () => pinchTab.press('Enter'));
  await logger.logToolCall('wait', { duration: 8000 }, () => pinchTab.wait(8000));
  
  // Take snapshot (logged)
  const snapshot = await logger.logToolCall('snapshot', { mode: 'all' }, () =>
    pinchTab.snapshot('all')
  );
}
```

### Example: Adding Logging to `send-email-n8n.workflow.ts`

**Before:**
```typescript
await desktop.launchApplication('terminal');
await desktop.wait(3000);
await desktop.type('curl -X POST ...');
await desktop.pressKeys(['Return']);
```

**After:**
```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

const logger = new WorkflowLogger(browserLogger, taskId, 'send-email-n8n');

await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
  desktop.launchApplication('terminal')
);

await logger.logToolCall('wait', { duration: 3000 }, () => desktop.wait(3000));

await logger.logToolCall('type', { text: 'curl -X POST ...' }, () =>
  desktop.type('curl -X POST ...')
);

await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
  desktop.pressKeys(['Return'])
);
```

### Example: Adding Logging to Custom Workflows

**Pattern for any workflow:**
```typescript
import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export const metadata: WorkflowMetadata = {
  name: 'my-custom-workflow',
  description: 'Does something cool',
  version: '1.0.0',
  timeout_ms: 60000,
  variables: [
    { name: 'input', type: 'string', required: true, description: 'Some input' },
  ],
};

export async function execute(
  variables: { input: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  // Step 1: Extract services + create logger
  const { desktop, pinchTab, browserLogger, taskId } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'my-custom-workflow');

  try {
    // Step 2: Wrap every tool call
    await logger.logToolCall('toolName', { param: 'value' }, () =>
      desktop.someMethod()
    );

    // Step 3: Return result
    return {
      success: true,
      message: 'Workflow completed successfully',
      data: { result: 'some data' },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Workflow failed: ${error.message}`,
    };
  }
}
```

## Advanced Patterns

### Logging Loops

```typescript
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  
  await logger.logToolCall(
    'navigate',
    { url, step: `${i + 1}/${urls.length}` },
    () => pinchTab.navigate(url)
  );
  
  await logger.logToolCall('wait', { duration: 5000 }, () => pinchTab.wait(5000));
  
  const content = await logger.logToolCall(
    'getPageText',
    { url },
    () => pinchTab.getPageText()
  );
}
```

### Logging Conditional Actions

```typescript
if (needsLogin) {
  await logger.logToolCall('type', { field: 'username', value: username }, () =>
    pinchTab.type('#username', username)
  );
  
  await logger.logToolCall('type', { field: 'password', value: '[REDACTED]' }, () =>
    pinchTab.type('#password', password)
  );
  
  await logger.logToolCall('click', { element: 'login-button' }, () =>
    pinchTab.click('#login-btn')
  );
}
```

### Logging with Custom Messages

```typescript
// Add context to make logs more readable
await logger.logToolCall(
  'navigate',
  { url: searchUrl, purpose: 'Searching for research papers' },
  () => pinchTab.navigate(searchUrl)
);

await logger.logToolCall(
  'type',
  { selector: '#search', query: topic, note: 'Entering search query' },
  () => pinchTab.type('#search', topic)
);
```

## Troubleshooting

**Tools not showing in frontend?**
1. Check that `browserLogger` and `taskId` are extracted from services
2. Verify `WorkflowLogger` is imported correctly
3. Ensure tool calls are wrapped with `logger.logToolCall()`
4. Check browser console for WebSocket connection errors
5. Verify the workflow is actually running (check backend logs)

**Tool calls showing but no results?**
1. Verify the tool function is actually being called (not just logged)
2. Check that the tool function returns a value
3. Look for errors in backend logs
4. Make sure the arrow function syntax is correct: `() => service.method()`

**Duplicate tool calls?**
1. Make sure you're not calling the tool twice (once logged, once direct)
2. Use the pattern: `await logger.logToolCall('name', input, () => service.method())`
3. Don't call the service method before wrapping it

**Logs look messy?**
1. Use descriptive tool names that match the actual action
2. Include relevant context in parameters (e.g., `{ step: '1/5', action: 'scraping' }`)
3. Redact sensitive data (passwords, API keys) in logged parameters
4. Keep parameter objects simple and readable

## Tips for Making Workflows Look Cool

1. **Use descriptive tool names**: `'searchWikipedia'` is better than `'navigate'`
2. **Add step numbers**: `{ step: '3/10', action: 'scraping article' }`
3. **Include context**: `{ url, purpose: 'Finding research papers' }`
4. **Log waits with reasons**: `{ duration: 5000, reason: 'Waiting for page load' }`
5. **Group related actions**: Use consistent naming like `'search_query'`, `'search_results'`, `'search_extract'`
6. **Redact sensitive data**: `{ password: '[REDACTED]', username: 'user@example.com' }`

## What Gets Displayed in Frontend

The frontend shows each logged tool call in a clean, real-time feed:

```
WORKFLOW:deep-research → launchInstance ✓ 1234ms
  Parameters: { profile: 'deep-research-1234567890', mode: 'headed' }
  Result: { id: 'instance-abc123', success: true }

WORKFLOW:deep-research → navigate ✓ 2345ms
  Parameters: { url: 'https://en.wikipedia.org' }
  Result: { success: true }

WORKFLOW:deep-research → type ✓ 456ms
  Parameters: { selector: '#searchInput', text: 'quantum computing' }
  Result: { success: true }

WORKFLOW:deep-research → snapshot ✓ 3456ms
  Parameters: { mode: 'all' }
  Result: { elements: 1234, success: true }
```

This makes workflows feel professional, transparent, and trustworthy. Users can see exactly what's happening at every step, and debugging becomes trivial because you can see exactly where things went wrong.

**Now go make your workflows look cool!** 🚀

## Adding Conversational Status Messages (The Right Way!)

Want to make your workflow feel like a friendly assistant narrating what's happening? Use the `think()` method for natural, conversational updates that appear as real messages, not technical logs!

### Using the think() Method

The `WorkflowLogger` has a built-in `think()` method that creates beautiful, conversational messages:

```typescript
// CRITICAL: Extract messagesService from services
const { desktop, pinchTab, browserLogger, taskId, messagesService } = services;

// Create logger WITH messagesService for think() support
const logger = new WorkflowLogger(browserLogger, taskId, 'my-workflow', messagesService);

// Now you can use think() for conversational messages
await logger.think(`🤔 Hmm, let me think about what you want...`);
await logger.think(`✅ Got it! I've enhanced your request with technical details`);
await logger.think(`⏳ Waiting for the page to load... give it a moment`);
await logger.think(`👀 I can see the login form now`);
await logger.think(`🎉 Perfect! Task completed successfully`);
```

### Helper Function (Optional)

For convenience, you can create a helper at the top of your workflow:

```typescript
import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

/**
 * Helper to send conversational status messages to the frontend
 * Uses the WorkflowLogger.think() method for natural language updates
 */
async function logMessage(logger: WorkflowLogger, message: string): Promise<void> {
  await logger.think(message);
}

export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { desktop, pinchTab, browserLogger, taskId, messagesService } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'my-workflow', messagesService);

  await logMessage(logger, `🔍 Alright, let me search for "${variables.query}"...`);
  // ... rest of workflow
}
```

### Example: Search Workflow with Conversational Messages

```typescript
export async function execute(variables: any, services: WorkflowServices): Promise<WorkflowResult> {
  const { pinchTab, browserLogger, taskId, messagesService } = services;
  const logger = new WorkflowLogger(browserLogger, taskId, 'google-search', messagesService);

  try {
    await logger.think(`🔍 Alright, let me search for "${variables.query}"...`);

    // Launch browser
    await logger.logToolCall('launchInstance', { mode: 'headed' }, () =>
      pinchTab.launchInstance('search-session', 'headed')
    );
    
    await logger.think(`🌐 Browser is opening...`);

    // Navigate to Google
    await logger.logToolCall('navigate', { url: 'https://google.com' }, () =>
      pinchTab.navigate('https://google.com')
    );
    
    await logger.think(`✅ I'm on Google now`);

    // Type search query
    await logger.logToolCall('type', { selector: 'textarea[name="q"]', text: variables.query }, () =>
      pinchTab.type('textarea[name="q"]', variables.query)
    );
    
    await logger.think(`⌨️ Typing your search query...`);

    // Submit search
    await logger.logToolCall('press', { key: 'Enter' }, () => pinchTab.press('Enter'));
    
    await logger.think(`🔎 Searching...`);

    // Wait for results
    await logger.logToolCall('wait', { duration: 3000 }, () => pinchTab.wait(3000));
    
    await logger.think(`📊 Got the results! Let me grab them for you`);

    // Get results
    const results = await logger.logToolCall('getPageText', {}, () => pinchTab.getPageText());
    
    await logger.think(`✅ All done! Found ${results.length} characters of results`);

    return {
      success: true,
      message: 'Search completed successfully',
      data: { results },
    };
  } catch (error) {
    await logger.think(`❌ Oops, something went wrong: ${error.message}`);
    return {
      success: false,
      error: error.message,
      message: `Search failed: ${error.message}`,
    };
  }
}
```

### Frontend Display

Messages appear as natural conversation in the chat stream with a brain icon 🧠:

```
WORKFLOW (thinking): 🔍 Alright, let me search for "quantum computing"...

WORKFLOW:google-search → launchInstance ✓ 1234ms

WORKFLOW (thinking): 🌐 Browser is opening...

WORKFLOW:google-search → navigate ✓ 2345ms

WORKFLOW (thinking): ✅ I'm on Google now

WORKFLOW:google-search → type ✓ 456ms

WORKFLOW (thinking): ⌨️ Typing your search query...

WORKFLOW (thinking): ✅ All done! Found 12,456 characters of results
```

The `think()` messages appear as conversational updates with a brain icon 🧠, while tool calls show technical details. This creates a perfect balance between transparency and user-friendliness!

### Message Style Guidelines

1. **Use emojis** - They make messages more visual and fun (🎉 ✅ ⏳ 🔍 👀 ⚙️ 🚀)
2. **Be conversational** - Write like you're talking to a friend
3. **Show personality** - "Hmm...", "Perfect!", "Uh oh...", "Alright..."
4. **Provide context** - Tell users WHY you're waiting or WHAT you're doing
5. **Update on progress** - Let users know things are moving forward
6. **Celebrate success** - Make completion feel rewarding
7. **Be honest about errors** - Don't hide problems, explain them simply

### CRITICAL: Don't Forget messagesService!

The `think()` method ONLY works if you pass `messagesService` to the WorkflowLogger constructor:

```typescript
// ❌ WRONG - think() won't work
const logger = new WorkflowLogger(browserLogger, taskId, 'my-workflow');

// ✅ CORRECT - think() will work
const { browserLogger, taskId, messagesService } = services;
const logger = new WorkflowLogger(browserLogger, taskId, 'my-workflow', messagesService);
```

**Now your workflows will feel like a helpful friend, not a robot!** 🎭✨
