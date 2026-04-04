# ARIA Workflows Guide

This guide covers how to create and use workflows in ARIA, with special focus on PinchTab JavaScript evaluation.

## Table of Contents
- [Workflow Basics](#workflow-basics)
- [PinchTab JavaScript Evaluation](#pinchtab-javascript-evaluation)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Workflow Basics

### Workflow Structure

Every workflow must export two things:

```typescript
import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'my-workflow',
  description: 'What this workflow does',
  version: '1.0.0',
  timeout_ms: 60000, // 1 minute
  variables: [
    {
      name: 'myVariable',
      type: 'string',
      required: true,
      description: 'Description of the variable',
    },
  ],
};

export async function execute(
  variables: { myVariable: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop, browserLogger, taskId, messagesService } = services;
  
  try {
    // Your workflow logic here
    
    return {
      success: true,
      message: 'Workflow completed successfully',
      data: { /* your result data */ },
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

### Available Services

- `pinchTab`: Browser automation (PinchTab API)
- `desktop`: Desktop control (VNC + keyboard/mouse)
- `browserLogger`: Log messages to browser UI
- `messagesService`: Create thinking messages
- `taskId`: Current task ID
- `eventEmitter`: Event emitter for webhooks

---

## PinchTab JavaScript Evaluation

### Overview

PinchTab allows you to execute JavaScript code directly in the browser context. This is powerful for:
- Extracting data from pages
- Manipulating DOM elements
- Triggering browser events
- Creating custom UI overlays

### Prerequisites

**IMPORTANT**: JavaScript evaluation must be enabled in PinchTab config:

1. Edit `pinchtab-config.json` in workspace root:
```json
{
  "security": {
    "allowEvaluate": true
  }
}
```

2. Mount config in Docker (add to `docker/docker-compose.yml`):
```yaml
aria-desktop:
  volumes:
    - ../pinchtab-config.json:/home/user/.pinchtab/config.json
```

3. Restart aria-desktop container:
```bash
cd docker
docker-compose restart aria-desktop
```

4. Verify config is applied:
```bash
docker exec aria-desktop cat /home/user/.pinchtab/config.json | grep allowEvaluate
# Should show: "allowEvaluate": true,
```

### Basic Usage

```typescript
// Execute JavaScript and get result
const result = await pinchTab.evalJavaScript('document.title');
console.log(`Page title: ${result}`);

// Execute complex JavaScript
const data = await pinchTab.evalJavaScript(`
  ({
    title: document.title,
    url: location.href,
    linkCount: document.querySelectorAll('a').length
  })
`);
console.log(`Found ${data.linkCount} links`);
```

### CRITICAL: Avoid Blocking Code

**❌ BAD - This will timeout:**
```typescript
// alert() blocks JavaScript execution until user clicks OK
// The HTTP request will timeout waiting for response
await pinchTab.evalJavaScript('alert("Hello World")');
```

**✅ GOOD - Non-blocking alternatives:**
```typescript
// Option 1: Create a custom overlay
await pinchTab.evalJavaScript(`
  (function() {
    const div = document.createElement('div');
    div.innerHTML = '<h1 style="color: white;">Hello World!</h1>';
    div.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #4CAF50; padding: 40px; border-radius: 10px; z-index: 999999;';
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 5000); // Auto-remove after 5 seconds
    return { success: true };
  })();
`);

// Option 2: Use console.log (visible in browser DevTools)
await pinchTab.evalJavaScript('console.log("Hello World"); "logged"');

// Option 3: Modify page content
await pinchTab.evalJavaScript(`
  document.body.style.backgroundColor = 'lightblue';
  'Background changed';
`);
```

### Getting Feedback from JavaScript

**1. Return Values**
```typescript
// Simple values
const count = await pinchTab.evalJavaScript('document.links.length');
console.log(`Link count: ${count}`);

// Objects
const pageInfo = await pinchTab.evalJavaScript(`
  ({
    title: document.title,
    url: location.href,
    hasForm: document.querySelector('form') !== null
  })
`);
console.log(`Page: ${pageInfo.title}`);

// Arrays
const links = await pinchTab.evalJavaScript(`
  Array.from(document.querySelectorAll('a')).map(a => ({
    text: a.textContent.trim(),
    href: a.href
  }))
`);
console.log(`Found ${links.length} links`);
```

**2. Error Handling**
```typescript
try {
  const result = await pinchTab.evalJavaScript(`
    const element = document.querySelector('#my-element');
    if (!element) throw new Error('Element not found');
    return element.textContent;
  `);
  console.log(`Element text: ${result}`);
} catch (error) {
  console.error(`JavaScript eval failed: ${error.message}`);
}
```

**3. Async Operations**
```typescript
// Use IIFE with async/await
const data = await pinchTab.evalJavaScript(`
  (async function() {
    const response = await fetch('/api/data');
    const json = await response.json();
    return json;
  })();
`);
```

### Advanced Patterns

**1. Extract Structured Data**
```typescript
const businesses = await pinchTab.evalJavaScript(`
  Array.from(document.querySelectorAll('.business-card')).map(card => ({
    name: card.querySelector('.name')?.textContent?.trim(),
    address: card.querySelector('.address')?.textContent?.trim(),
    phone: card.querySelector('.phone')?.textContent?.trim(),
    rating: parseFloat(card.querySelector('.rating')?.textContent) || 0
  }))
`);
```

**2. Wait for Elements**
```typescript
const elementFound = await pinchTab.evalJavaScript(`
  (async function() {
    for (let i = 0; i < 10; i++) {
      const el = document.querySelector('#dynamic-content');
      if (el) return { found: true, text: el.textContent };
      await new Promise(r => setTimeout(r, 500));
    }
    return { found: false };
  })();
`);
```

**3. Trigger Events**
```typescript
await pinchTab.evalJavaScript(`
  const button = document.querySelector('#submit-btn');
  if (button) {
    button.click();
    return { clicked: true };
  }
  return { clicked: false };
`);
```

**4. Export Data as Download**
```typescript
await pinchTab.evalJavaScript(`
  (function() {
    const data = { /* your data */ };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    return { exported: true };
  })();
`);
```

### Console-Based Approach (Alternative)

If `evalJavaScript` doesn't work or you need more control, use Desktop agent to interact with browser console:

```typescript
// 1. Click on page to ensure focus
await desktop.clickMouse({ x: 500, y: 400 }, 'left');
await pinchTab.wait(500);

// 2. Open console with Ctrl+Shift+J
await desktop.pressKeys(['Control', 'Shift', 'J']);
await pinchTab.wait(2000);

// 3. Type "allow pasting" to enable paste
await desktop.typeText('allow pasting');
await pinchTab.wait(500);
await desktop.pressKeys(['Return']);
await pinchTab.wait(1500);

// 4. Paste your JavaScript
const script = `console.log("Hello World"); "done"`;
await desktop.pasteText(script);
await pinchTab.wait(500);

// 5. Execute with Enter
await desktop.pressKeys(['Return']);
await pinchTab.wait(2000);

// 6. Close console
await desktop.pressKeys(['Control', 'Shift', 'J']);
```

---

## Best Practices

### 1. Always Use Try-Catch
```typescript
try {
  const result = await pinchTab.evalJavaScript('...');
  // Handle success
} catch (error) {
  console.error(`Eval failed: ${error.message}`);
  // Handle failure
}
```

### 2. Return Meaningful Data
```typescript
// ❌ BAD - No feedback
await pinchTab.evalJavaScript('document.title = "New Title"');

// ✅ GOOD - Returns confirmation
const result = await pinchTab.evalJavaScript(`
  document.title = "New Title";
  ({ success: true, oldTitle: document.title })
`);
```

### 3. Use IIFEs for Complex Logic
```typescript
const result = await pinchTab.evalJavaScript(`
  (function() {
    // Your complex logic here
    const data = processData();
    return { success: true, data };
  })();
`);
```

### 4. Handle Missing Elements Gracefully
```typescript
const result = await pinchTab.evalJavaScript(`
  const el = document.querySelector('#my-element');
  if (!el) return { found: false, error: 'Element not found' };
  return { found: true, text: el.textContent };
`);

if (!result.found) {
  console.warn('Element not found, trying alternative approach...');
}
```

### 5. Close Tabs Before Stopping Instance
```typescript
// Get all tabs
const tabs = await pinchTab.listTabs(instance.id);

// Close each tab
for (const tab of tabs) {
  const tabId = tab.id || tab.tabId;
  if (tabId) {
    try {
      await fetch(`${pinchTab['baseUrl']}/tabs/${tabId}/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await pinchTab['ensureAuthToken']()}`,
        },
      });
      await pinchTab.wait(500);
    } catch (error) {
      console.warn(`Failed to close tab: ${error.message}`);
    }
  }
}

// Now stop instance
await pinchTab.stopInstanceByProfile(profileId);
```

---

## Common Patterns

### Pattern 1: Extract and Export Data
```typescript
// 1. Extract data from page
const data = await pinchTab.evalJavaScript(`
  Array.from(document.querySelectorAll('.item')).map(item => ({
    title: item.querySelector('.title')?.textContent,
    price: item.querySelector('.price')?.textContent
  }))
`);

// 2. Trigger download
await pinchTab.evalJavaScript(`
  (function() {
    const data = ${JSON.stringify(data)};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { downloaded: true };
  })();
`);
```

### Pattern 2: Wait for Dynamic Content
```typescript
const content = await pinchTab.evalJavaScript(`
  (async function() {
    for (let i = 0; i < 20; i++) {
      const el = document.querySelector('.dynamic-content');
      if (el && el.textContent.trim()) {
        return { found: true, content: el.textContent };
      }
      await new Promise(r => setTimeout(r, 500));
    }
    return { found: false };
  })();
`);

if (content.found) {
  console.log(`Content: ${content.content}`);
}
```

### Pattern 3: Visual Feedback
```typescript
await pinchTab.evalJavaScript(`
  (function() {
    const overlay = document.createElement('div');
    overlay.id = 'aria-overlay';
    overlay.innerHTML = '<div style="text-align: center;"><h2>Processing...</h2><p>Please wait</p></div>';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); color: white; display: flex; align-items: center; justify-content: center; z-index: 999999;';
    document.body.appendChild(overlay);
    return { overlayCreated: true };
  })();
`);

// Do work...

// Remove overlay
await pinchTab.evalJavaScript(`
  document.getElementById('aria-overlay')?.remove();
  'removed';
`);
```

---

## Troubleshooting

### Issue: "evaluate endpoint is disabled"
**Solution**: Enable `allowEvaluate` in PinchTab config (see [Prerequisites](#prerequisites))

### Issue: Request timeout
**Cause**: JavaScript code is blocking (e.g., `alert()`, `confirm()`, `prompt()`)
**Solution**: Use non-blocking alternatives (see [Avoid Blocking Code](#critical-avoid-blocking-code))

### Issue: "404 page not found" on /tabs/.../eval
**Cause**: Wrong endpoint (should be `/evaluate` not `/eval`)
**Solution**: Update PinchTabService or use correct endpoint

### Issue: Tab ID not found
**Cause**: Tab was closed or instance stopped
**Solution**: Always check tab exists before eval:
```typescript
const tabs = await pinchTab.listTabs(instance.id);
if (tabs.length === 0) {
  throw new Error('No tabs available');
}
const tabId = tabs[0].id || tabs[0].tabId;
```

### Issue: JavaScript returns undefined
**Cause**: Script doesn't explicitly return a value
**Solution**: Always return something:
```typescript
// ❌ BAD
await pinchTab.evalJavaScript('console.log("test")');

// ✅ GOOD
await pinchTab.evalJavaScript('console.log("test"); "logged"');
```

---

## Example Workflows

See these workflows for complete examples:
- `test-pinchtab-eval.workflow.ts` - Basic JavaScript eval test
- `freelancer-research-email.workflow.ts` - Complex workflow with console-based export
- `perplexity-linkedin-post.workflow.ts` - Data extraction and manipulation

---

## Testing Your Workflow

Run a workflow via API:
```bash
curl -X POST http://localhost:9991/workflows/my-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"variables":{"myVariable":"value"}}'
```

Or via PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:9991/workflows/my-workflow/execute" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"variables":{"myVariable":"value"}}'
```

---

## Additional Resources

- [PinchTab Documentation](https://github.com/pinchtab/pinchtab)
- [ARIA Architecture](../../CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md)
- [Workflow Interface](../src/workflows/workflow.interface.ts)
