# OpenCode Completion Detection - Improvement Plan

## Current Problem

**Issue**: OpenCode completion detection takes too long (up to 150 seconds) even when task finishes quickly.

**Impact**: 
- Workflow timeout risk (300s total, ~153s used in your test)
- Poor user experience (waiting unnecessarily)
- Risk of failure during demo/pitch

## Current Implementation Analysis

### How It Works Now (opencode-request.workflow.ts):
1. Submit prompt to OpenCode
2. Wait with AI-controlled adaptive loop:
   - Takes screenshots every 10-300 seconds
   - AI analyzes screenshot to determine progress (0-100%)
   - AI decides next wait interval based on progress
   - Maximum 3 minutes (180 seconds) total
3. Returns when AI detects "COMPLETED" status or timeout

### Problems:
- **No direct signal from OpenCode** - relies on visual analysis
- **AI can misinterpret screenshots** - may think task is still running
- **Long wait intervals** - AI suggests 120-180s for early stages
- **No file system monitoring** - doesn't check if files are created
- **No process monitoring** - doesn't check if OpenCode process exits

## Proposed Solutions (Ranked by Feasibility)

### Solution 1: File System Monitoring (EASIEST - Implement First)
**Concept**: Monitor Desktop for new files instead of waiting for AI analysis

**Implementation**:
```typescript
async function waitForFileCreation(
  desktop: any,
  expectedExtension: string,
  maxWaitMs: number = 120000 // 2 minutes max
): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    // List files on Desktop with expected extension
    const files = await desktop.executeCommand(
      `find /home/user/Desktop -name "*.${expectedExtension}" -mmin -2 -type f`
    );
    
    if (files && files.trim().length > 0) {
      console.log(`✅ File detected: ${files.trim()}`);
      return files.trim().split('\n')[0]; // Return first match
    }
    
    await desktop.wait(pollInterval);
  }
  
  return null; // Timeout
}
```

**Pros**:
- Fast detection (5-10 seconds after file creation)
- No AI analysis needed
- Reliable signal
- Easy to implement

**Cons**:
- Doesn't work if OpenCode fails without creating file
- Need to know expected file extension

**Recommendation**: ✅ Implement this FIRST for demo

---

### Solution 2: Process Monitoring (MEDIUM - Good Backup)
**Concept**: Monitor OpenCode process - when it exits, task is done

**Implementation**:
```typescript
async function waitForProcessExit(
  desktop: any,
  processName: string = 'opencode',
  maxWaitMs: number = 120000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 3000; // Check every 3 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    // Check if process is still running
    const result = await desktop.executeCommand(
      `pgrep -f ${processName} || echo "NOT_RUNNING"`
    );
    
    if (result.includes('NOT_RUNNING')) {
      console.log(`✅ OpenCode process exited`);
      return true;
    }
    
    await desktop.wait(pollInterval);
  }
  
  return false; // Timeout
}
```

**Pros**:
- Accurate signal (process exit = task done)
- Works even if file creation fails
- Fast detection (3-5 seconds after exit)

**Cons**:
- OpenCode might stay running after task completes
- Need to handle cases where OpenCode doesn't exit

**Recommendation**: ✅ Use as backup if file monitoring fails

---

### Solution 3: OpenCode API/Webhook (HARD - Future Enhancement)
**Concept**: OpenCode sends HTTP callback when task completes

**Implementation**:
1. Modify OpenCode to accept callback URL parameter
2. OpenCode POSTs to callback URL when done
3. Workflow listens for callback

**Pros**:
- Instant notification (0 delay)
- Most reliable signal
- Can include task status/errors

**Cons**:
- Requires OpenCode modification (not feasible for demo)
- Need to run HTTP server in workflow
- Complex implementation

**Recommendation**: ❌ Not feasible for immediate demo

---

### Solution 4: Terminal Output Monitoring (MEDIUM-HARD)
**Concept**: Monitor terminal output for completion messages

**Implementation**:
```typescript
async function waitForTerminalCompletion(
  desktop: any,
  completionPhrases: string[] = ['Task completed', 'All done', 'Finished'],
  maxWaitMs: number = 120000
): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 5000;
  
  while (Date.now() - startTime < maxWaitMs) {
    // Take screenshot and analyze terminal text
    const screenshot = await desktop.screenshot();
    const terminalText = await analyzeTerminalText(screenshot);
    
    for (const phrase of completionPhrases) {
      if (terminalText.includes(phrase)) {
        console.log(`✅ Completion phrase detected: "${phrase}"`);
        return true;
      }
    }
    
    await desktop.wait(pollInterval);
  }
  
  return false;
}
```

**Pros**:
- Can detect specific completion messages
- Works if OpenCode prints status

**Cons**:
- Requires OCR or AI vision
- Completion messages may vary
- Less reliable than file/process monitoring

**Recommendation**: ⚠️ Use only if other methods fail

---

## Recommended Implementation for Demo

### Phase 1: Hybrid Approach (File + Process Monitoring)

```typescript
async function waitForOpenCodeCompletion(
  desktop: any,
  expectedExtension: string,
  maxWaitMs: number = 120000 // 2 minutes
): Promise<{ completed: boolean; filePath?: string }> {
  console.log(`⏳ Monitoring for OpenCode completion (max ${maxWaitMs/1000}s)...`);
  
  const startTime = Date.now();
  const pollInterval = 5000; // Check every 5 seconds
  
  while (Date.now() - startTime < maxWaitMs) {
    // Method 1: Check for file creation
    try {
      const findResult = await desktop.executeCommand(
        `find /home/user/Desktop -name "*.${expectedExtension}" -mmin -2 -type f`
      );
      
      if (findResult && findResult.trim().length > 0) {
        const filePath = findResult.trim().split('\n')[0];
        console.log(`✅ File detected: ${filePath}`);
        
        // Wait 5 more seconds to ensure file is fully written
        await desktop.wait(5000);
        
        return { completed: true, filePath };
      }
    } catch (err) {
      console.warn(`⚠️ File check failed: ${err.message}`);
    }
    
    // Method 2: Check if OpenCode process exited
    try {
      const processCheck = await desktop.executeCommand(
        `pgrep -f opencode || echo "NOT_RUNNING"`
      );
      
      if (processCheck.includes('NOT_RUNNING')) {
        console.log(`✅ OpenCode process exited`);
        
        // Process exited, do final file check
        const finalCheck = await desktop.executeCommand(
          `find /home/user/Desktop -name "*.${expectedExtension}" -mmin -5 -type f`
        );
        
        if (finalCheck && finalCheck.trim().length > 0) {
          return { completed: true, filePath: finalCheck.trim().split('\n')[0] };
        }
        
        // Process exited but no file found - possible error
        return { completed: false };
      }
    } catch (err) {
      console.warn(`⚠️ Process check failed: ${err.message}`);
    }
    
    // Wait before next check
    const elapsed = Date.now() - startTime;
    console.log(`⏳ Still waiting... (${Math.floor(elapsed/1000)}s elapsed)`);
    await desktop.wait(pollInterval);
  }
  
  console.log(`⏰ Timeout reached after ${maxWaitMs/1000}s`);
  return { completed: false };
}
```

### Benefits:
- **Fast**: Detects completion in 5-10 seconds
- **Reliable**: Two independent detection methods
- **Safe**: Falls back to timeout if both fail
- **Demo-ready**: No OpenCode modifications needed

---

## Timeout Strategy

### Current Timeouts:
- email-doc-deep-research: 300s (5 min) → **INCREASE TO 480s (8 min)**
- opencode-request: 180s (3 min) → **REDUCE TO 120s (2 min)** with new detection

### Recommended Timeouts:
```
Total workflow: 480s (8 min)
├─ Deep research: ~60s
├─ YouTube: ~40s
├─ Summarize: ~10s
├─ OpenCode: ~120s (with new detection: ~30-60s actual)
├─ File scan: ~10s
└─ Buffer: ~240s
```

---

## Action Items for Demo

### Critical (Do Before Demo):
1. ✅ Increase email-doc-deep-research timeout to 480s (8 min)
2. ✅ Fix scanForGeneratedFile to use typeText instead of pasteText
3. ✅ Add "Hit Enter" before terminal commands
4. ✅ Implement hybrid file+process monitoring in opencode-request

### Nice to Have:
5. ⚠️ Add progress logging every 10 seconds
6. ⚠️ Add early exit if file detected before AI analysis
7. ⚠️ Reduce AI wait intervals (30-60s max instead of 120-180s)

---

## Testing Checklist

Before demo, test:
- [ ] PDF generation completes in <60s
- [ ] File is detected within 10s of creation
- [ ] Workflow completes in <4 minutes total
- [ ] No timeout errors
- [ ] Email is sent successfully
- [ ] Terminal commands work without ^M errors

---

## Fallback Plan (If Issues During Demo)

If timeout occurs during demo:
1. Increase timeout to 600s (10 min) as emergency fix
2. Reduce maxLinks to 1 and maxVideos to 1
3. Skip YouTube research (set includeYouTube: false)
4. Use simpler topics (shorter research time)

**Emergency command**:
```powershell
# Minimal test (fastest)
Invoke-RestMethod -Method POST -Uri "http://localhost:9991/workflows/email-doc-deep-research/execute" `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{"variables":{"topic":"AI","email":"thangenabil@gmail.com","documentType":"pdf","includeYouTube":false,"maxLinks":1,"maxVideos":0}}'
```
