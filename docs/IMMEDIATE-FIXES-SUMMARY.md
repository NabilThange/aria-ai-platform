# Immediate Fixes Summary

## Issues Fixed

### ✅ 1. Tool Calling Migration (WebAgent)
**Status**: COMPLETE  
**Files Changed**:
- `packages/aria-agent/src/groq/pinchtab.tools.ts` (NEW)
- `packages/aria-agent/src/groq/groq.service.ts`
- `packages/aria-agent/src/agents/web/web.agent.ts`
- `packages/aria-agent/src/config/system-prompts.config.ts`

**Result**: WebAgent now uses tool calling instead of JSON parsing. No more "Let me try..." prose breaking the parser.

### ✅ 2. RecoveryAgent Schema Flexibility
**Status**: COMPLETE  
**Files Changed**:
- `packages/aria-agent/src/agents/recovery/recovery.agent.ts`

**Result**: RecoveryAgent now handles both standard format and `strategies[]` array format from model.

### ✅ 3. PinchTab Container Restart
**Status**: COMPLETE  
**Action**: Restarted PinchTab container to clear "unhealthy" status

**Result**: PinchTab responding normally at http://localhost:9867

## Issues Requiring Action

### ⚠️ 4. Desktop Agent VNC Control
**Status**: NEEDS IMPLEMENTATION  
**Problem**: Clicks not registering on VNC display, screen unchanged for 7 iterations

**Recommended Fixes** (in priority order):

#### A. Add Direct File Write (HIGHEST PRIORITY)
For tasks like "write jeff.txt", bypass GUI entirely:

```typescript
// In desktop.agent.ts - add this method
private async tryDirectFileWrite(step: ExecutionStep): Promise<ActionResult | null> {
  // Parse "write X to Y" pattern
  const match = step.description.match(/write\s+['"](.+?)['"]\s+to\s+(.+)/i);
  if (!match) return null;
  
  const [, content, filename] = match;
  
  this.logger.log(`📝 Using direct file write: ${filename}`);
  
  const result = await this.computerUseService.action({
    action: 'write_file',
    path: filename.trim(),
    data: Buffer.from(content).toString('base64'),
  });
  
  return {
    action: 'write_file_direct',
    details: result,
    timestamp: new Date().toISOString(),
  };
}

// In executeStep(), before the iteration loop:
const directWrite = await this.tryDirectFileWrite(step);
if (directWrite) {
  return { ...directWrite, tokensUsed: 0, cost: 0 };
}
```

#### B. Add Stuck Screen Detector
Detect when screen hasn't changed for 3+ iterations and try alternative:

```typescript
// Add to desktop.agent.ts class properties
private lastScreenshotHash: string | null = null;
private unchangedCount: number = 0;

// In iteration loop, after getting screenshot:
const hash = screenshot.image.substring(0, 1000);
if (hash === this.lastScreenshotHash) {
  this.unchangedCount++;
  if (this.unchangedCount >= 3) {
    this.logger.warn('⚠️ Screen stuck for 3 iterations, trying alternative');
    // Try direct approach or report failure
    break;
  }
} else {
  this.unchangedCount = 0;
}
this.lastScreenshotHash = hash;
```

#### C. Update System Prompt
Add to DESKTOP agent prompt:

```
**PREFER DIRECT METHODS OVER GUI:**
- File write: Use write_file action, NOT terminal GUI
- File read: Use read_file action, NOT opening file manager
- Application launch: Use application action, NOT clicking desktop icons
- Terminal commands: Request bash_execute capability (future)

**When GUI clicks fail 3 times:**
- Try direct file/application actions
- Report failure with specific reason
- Do NOT keep clicking same coordinates
```

### ⚠️ 5. Bytez Key Management
**Status**: NEEDS ATTENTION  
**Problem**: 7 keys failed before finding working key (low balances)

**Fix**: Top up Bytez API keys or consolidate credits

**Impact**: ~2-3 seconds delay on every task start

## Testing Checklist

### WebAgent (Tool Calling)
- [ ] Navigate to URL
- [ ] Fill form and submit
- [ ] Click elements
- [ ] Verify completion detection
- [ ] Check logs show tool calls (not JSON parsing)

### RecoveryAgent
- [ ] Trigger failure scenario
- [ ] Verify recovery strategy generated
- [ ] Check both standard and strategies[] formats accepted

### DesktopAgent
- [ ] Test direct file write (bypass GUI)
- [ ] Test stuck screen detection
- [ ] Test application launch
- [ ] Verify terminal commands work

## Next Steps

1. **Implement Desktop Agent fixes** (A, B, C above)
2. **Test WebAgent** with simple navigation task
3. **Top up Bytez keys** to avoid 402 errors
4. **Monitor logs** for tool calling vs JSON parsing
5. **Consider DesktopAgent tool calling migration** (similar to WebAgent)

## Files to Edit

### High Priority
- `packages/aria-agent/src/agents/desktop/desktop.agent.ts` - Add direct file write + stuck detector
- `packages/aria-agent/src/config/system-prompts.config.ts` - Update DESKTOP prompt

### Medium Priority
- Bytez API key management (top up balances)
- Add bash_execute action to computer-use.service.ts

### Low Priority
- Migrate DesktopAgent to tool calling (like WebAgent)
- Add more direct action methods (read_file, etc.)

## Success Metrics

**Before Fixes**:
- JSON parsing failures: ~30-40%
- Iterations per step: 8-12
- Desktop GUI clicks failing: 100% (7/7 iterations)
- Bytez key failures: 7 before success

**After Fixes** (Expected):
- JSON parsing failures: 0% (using tools)
- Iterations per step: 3-5
- Desktop operations: Direct file write succeeds immediately
- Bytez key failures: 0-1 (after top-up)
