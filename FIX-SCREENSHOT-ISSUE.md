# Screenshot Issue Fix

## Problem

The workflow was timing out when trying to take screenshots using PinchTab:

```
[00:41:27.388] WARN: Request failed (attempt 1/3): The operation was aborted due to timeout
[00:41:28.404] WARN: Request failed (attempt 2/3): The operation was aborted due to timeout
[00:41:30.420] WARN: Request failed (attempt 3/3): The operation was aborted due to timeout
[00:41:30.421] ERROR: Failed to take screenshot: PinchTab request failed after 3 attempts to http://localhost:9867/tabs/35DF56EC0A491816E8B7451C02EBA86C/screenshot: The operation was aborted due to timeout
```

## Root Cause

Two functions were using `pinchTab.takeScreenshot(tabId)` which was timing out:
1. `waitForPerplexityToLoad()` - Step 5
2. `checkPerplexityLogin()` - Step 6

PinchTab screenshot API was slow/unreliable for fullscreen browser windows.

## Solution

Changed both functions to use `desktop.screenshot()` instead, matching the freelancer workflow pattern.

### Before (BROKEN):
```typescript
async function waitForPerplexityToLoad(
  pinchTab: any,
  tabId: string,
  maxAttempts: number = 10,
): Promise<boolean> {
  // ...
  const screenshotRaw = await pinchTab.takeScreenshot(tabId);
  
  // Complex parsing for different formats
  let base64Image: string;
  if (typeof screenshotRaw === 'string') {
    base64Image = screenshotRaw;
  } else if (screenshotRaw && typeof screenshotRaw === 'object') {
    base64Image = (screenshotRaw as any).screenshot || (screenshotRaw as any).image || '';
  }
  
  // Remove data URL prefix
  if (base64Image.startsWith('data:')) {
    base64Image = base64Image.split(',')[1] || base64Image;
  }
  // ...
}
```

### After (FIXED):
```typescript
async function waitForPerplexityToLoad(
  desktop: any,
  maxAttempts: number = 10,
): Promise<boolean> {
  // ...
  const screenshotRaw = await desktop.screenshot();
  
  // Desktop returns consistent format
  const screenshot = screenshotRaw as { image: string; width: number; height: number };
  
  if (!screenshot || !screenshot.image) {
    console.warn(`  Screenshot capture failed`);
    continue;
  }
  
  const base64Image = screenshot.image;
  console.log(`  Screenshot captured: ${base64Image.length} bytes (${screenshot.width}x${screenshot.height})`);
  // ...
}
```

## Changes Made

### 1. `waitForPerplexityToLoad()` Function
- **Changed signature**: Removed `pinchTab` and `tabId` parameters, added `desktop` parameter
- **Changed screenshot call**: `pinchTab.takeScreenshot(tabId)` → `desktop.screenshot()`
- **Simplified parsing**: Desktop returns consistent `{ image, width, height }` format
- **Removed**: Data URL prefix handling (not needed for desktop screenshots)

### 2. `checkPerplexityLogin()` Function
- **Changed signature**: Removed `pinchTab` and `tabId` parameters, added `desktop` parameter
- **Changed screenshot call**: `pinchTab.takeScreenshot(tabId)` → `desktop.screenshot()`
- **Simplified parsing**: Same as above
- **Updated prompt**: Changed from "Perplexity AI page" to "desktop screenshot showing a browser with Perplexity AI"

### 3. Function Calls Updated
```typescript
// Before
await waitForPerplexityToLoad(pinchTab, tabId, 10);
const isLoggedIn = await checkPerplexityLogin(pinchTab, tabId);

// After
await waitForPerplexityToLoad(desktop, 10);
const isLoggedIn = await checkPerplexityLogin(desktop);
```

## Why Desktop Screenshot is Better

1. **More reliable**: Desktop screenshot captures the entire screen, not just browser tab
2. **Faster**: No need to communicate with PinchTab API
3. **Consistent format**: Always returns `{ image, width, height }`
4. **Works with fullscreen**: Browser is in fullscreen mode (F11), desktop screenshot handles this better
5. **Proven pattern**: Freelancer workflow uses this successfully

## Other Functions Already Using Desktop Screenshot

These functions were already correct:
- `waitForPerplexityResponse()` - Uses `desktop.screenshot()` ✅
- OpenCode launch detection - Uses `desktop.screenshot()` ✅
- OpenCode verification - Uses `desktop.screenshot()` ✅

## Testing

After this fix, the workflow should:
1. ✅ Successfully take screenshots in Step 5 (page load check)
2. ✅ Successfully take screenshots in Step 6 (login check)
3. ✅ Continue to work for Steps 8, 10, 14, 15 (already using desktop.screenshot)

## Summary

The fix changes two functions to use `desktop.screenshot()` instead of `pinchTab.takeScreenshot()`, making them consistent with the rest of the workflow and the freelancer workflow pattern. This resolves the timeout issues and makes screenshot capture more reliable.
