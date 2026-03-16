# Fixing VNC/Desktop Control Issues

## Problem Summary

Desktop Agent clicks are not registering on the VNC display. The agent tries clicking coordinates like `[68, 492]` repeatedly but the screen never changes, indicating clicks aren't landing.

## Root Causes

1. **DISPLAY environment variable mismatch** - Computer use service might be targeting wrong display
2. **VNC resolution/offset issues** - Coordinates might be offset from actual VNC screen
3. **Permission issues** - NutService might not have permission to control the display
4. **Stuck screenshot cache** - PerceptionAgent returning same screenshot every iteration

## Diagnostic Steps

### 1. Check DISPLAY Variable in Container

```bash
docker exec -it ariad bash
echo $DISPLAY
# Should be :0.0 or :1
```

### 2. Test Manual Click

```bash
# Inside ariad container
sudo -u user DISPLAY=:0.0 xdotool mousemove 68 492 click 1
# Should click the terminal icon if coordinates are correct
```

### 3. Check VNC Screen Resolution

```bash
# Inside ariad container
sudo -u user DISPLAY=:0.0 xdpyinfo | grep dimensions
# Should show actual screen size (e.g., 1280x720)
```

### 4. Verify NutService is Working

```bash
# Check if NutService can take screenshots
curl http://localhost:3000/api/screenshot
# Should return base64 image
```

## Fixes

### Fix 1: Ensure DISPLAY is Set Correctly

Check `packages/ariad/src/computer-use/computer-use.service.ts` line 330:

```typescript
env: { ...process.env, DISPLAY: ':0.0' }
```

Make sure this matches your actual VNC display. Check with:

```bash
docker exec ariad env | grep DISPLAY
```

### Fix 2: Add Delay After Clicks

The agent might be taking screenshots too quickly after clicks. Add a mandatory delay:

```typescript
// In computer-use.service.ts, after clickMouse()
private async clickMouse(action: ClickMouseAction): Promise<void> {
  // ... existing click logic ...
  
  // Add mandatory delay for UI to update
  await this.delay(500); // Wait 500ms after every click
}
```

### Fix 3: Add Stuck Screen Detector

Add logic to detect when screen hasn't changed for 3+ iterations:

```typescript
// In desktop.agent.ts
private lastScreenshotHash: string | null = null;
private unchangedScreenCount: number = 0;

private async executeStep(...) {
  // ... existing code ...
  
  // After getting screenshot
  const currentHash = this.hashScreenshot(screenshot);
  
  if (currentHash === this.lastScreenshotHash) {
    this.unchangedScreenCount++;
    
    if (this.unchangedScreenCount >= 3) {
      this.logger.warn('Screen unchanged for 3 iterations - trying alternative approach');
      // Try terminal command instead of GUI
      return this.tryTerminalApproach(step);
    }
  } else {
    this.unchangedScreenCount = 0;
  }
  
  this.lastScreenshotHash = currentHash;
}

private hashScreenshot(screenshot: string): string {
  // Simple hash of first 1000 chars
  return screenshot.substring(0, 1000);
}
```

### Fix 4: Add Direct Terminal Command Fallback

For file operations like "write jeff.txt", don't use GUI - use terminal directly:

```typescript
// In desktop.agent.ts
private async tryTerminalApproach(step: ExecutionStep): Promise<ActionResult> {
  // Check if this is a file write operation
  if (step.description.toLowerCase().includes('write') && 
      step.description.toLowerCase().includes('file')) {
    
    const match = step.description.match(/write.*?['"](.+?)['"].*?to.*?['"](.+?)['"]/i);
    if (match) {
      const [, content, filename] = match;
      
      this.logger.log(`Using direct file write instead of GUI`);
      
      // Use write_file action directly
      const result = await this.computerUseService.action({
        action: 'write_file',
        path: filename,
        data: Buffer.from(content).toString('base64'),
      });
      
      return {
        action: 'write_file_direct',
        details: result,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  // For other operations, report failure
  throw new Error('Screen stuck and no alternative approach available');
}
```

### Fix 5: Update Desktop Agent System Prompt

Add instruction to prefer terminal over GUI:

```typescript
// In system-prompts.config.ts, DESKTOP section
**PREFER TERMINAL OVER GUI:**
- For file operations (write, read, copy, move): Use terminal commands or write_file action
- For opening applications: Use application action, not GUI clicks
- For text editing: Use write_file, not opening text editor via GUI
- Only use GUI clicks when absolutely necessary (e.g., interacting with application UI)

**Example - WRONG approach:**
1. Double-click terminal icon
2. Wait for terminal to open
3. Type "echo 'hello' > file.txt"
4. Press Enter

**Example - RIGHT approach:**
1. Use write_file action directly with content="hello" and path="file.txt"
```

## Testing After Fixes

### Test 1: Simple File Write

```bash
# Task: "Write 'hello world' to test.txt on desktop"
# Expected: Should use write_file action directly, not GUI
```

### Test 2: Application Launch

```bash
# Task: "Open Firefox"
# Expected: Should use application action, not clicking desktop icon
```

### Test 3: Terminal Command

```bash
# Task: "List files in home directory"
# Expected: Should use terminal command directly
```

## Monitoring

Add these log statements to track what's happening:

```typescript
this.logger.log(`🖱️ Clicking at [${x}, ${y}]`);
this.logger.log(`📸 Screenshot hash: ${screenshotHash}`);
this.logger.log(`🔄 Unchanged screen count: ${unchangedScreenCount}`);
this.logger.log(`⚡ Using fallback: terminal command`);
```

## Long-Term Solution

Consider adding a `bash_execute` action that runs shell commands directly without opening a terminal GUI:

```typescript
// New action type
interface BashExecuteAction {
  action: 'bash_execute';
  command: string;
  workingDir?: string;
}

// In computer-use.service.ts
private async bashExecute(action: BashExecuteAction): Promise<{ stdout: string; stderr: string }> {
  const execAsync = promisify(exec);
  const { stdout, stderr } = await execAsync(
    `sudo -u user bash -c "${action.command}"`,
    { 
      cwd: action.workingDir || '/home/user',
      env: { ...process.env, DISPLAY: ':0.0' }
    }
  );
  return { stdout, stderr };
}
```

This would allow the agent to run commands without any GUI interaction at all.
