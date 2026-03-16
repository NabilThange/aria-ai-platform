# PinchTab Visibility & Trust Guide

## Overview

This guide explains how to make browser automation visible to users through VNC, improving transparency and trust.

---

## What is PinchTab?

**PinchTab** is a standalone HTTP server (12MB Go binary) that gives AI agents control over Chrome:
- Runs on port 9867
- Provides structured text snapshots (~800 tokens/page vs 10k+ for screenshots)
- Supports both headless and headed modes
- Token-efficient browser automation

---

## Current Architecture

### Two Separate Environments

1. **WebAgent + PinchTab** (Browser tasks)
   - Navigate websites
   - Click elements
   - Fill forms
   - Extract data
   - **Currently**: Runs headless (invisible)

2. **DesktopAgent + Computer Tools** (OS tasks)
   - Mouse movements
   - Keyboard input
   - Terminal commands
   - File operations
   - **Currently**: Visible through VNC

---

## Making Browser Actions Visible

### Solution: Enable Headed Mode

PinchTab can launch Chrome with a visible window that appears on the desktop and is visible through VNC.

### Implementation

**1. Update Environment Variable**

Add to `packages/aria-agent/.env`:
```bash
# Enable visible browser window for PinchTab
PINCHTAB_HEADED_MODE=true
```

**2. Restart Services**

```bash
# Restart aria-agent to pick up new env var
docker-compose restart aria-agent

# Or if running locally
npm run dev
```

**3. Verify**

When WebAgent starts a browser task, you should see:
- Log: `Initializing PinchTab in HEADED (visible) mode`
- Chrome window appears on desktop
- All browser actions visible through VNC

---

## Benefits of Headed Mode

### Trust & Transparency
- ✅ User sees exactly what the agent is doing
- ✅ No "black box" browser automation
- ✅ Easy to verify agent behavior
- ✅ Builds confidence in the system

### Debugging
- ✅ See why actions fail (element not found, page not loaded, etc.)
- ✅ Understand agent decision-making
- ✅ Catch edge cases visually

### User Experience
- ✅ Real-time progress indication
- ✅ User can intervene if needed
- ✅ More engaging than logs alone

---

## Performance Considerations

### Headed vs Headless

| Aspect | Headless | Headed |
|--------|----------|--------|
| Speed | Faster (~10-15%) | Slightly slower |
| Visibility | ❌ Invisible | ✅ Visible |
| Trust | Lower | Higher |
| Debugging | Harder | Easier |
| Resource Usage | Lower | Slightly higher |

**Recommendation**: Use headed mode for production to maximize trust. The slight performance hit is worth it.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                           ↓                                  │
│                    VNC Connection                            │
│                           ↓                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Desktop (VM)                         │ │
│  │                                                          │ │
│  │  ┌──────────────────┐      ┌──────────────────┐       │ │
│  │  │  Chrome Window   │      │  Terminal        │       │ │
│  │  │  (PinchTab)      │      │  (DesktopAgent)  │       │ │
│  │  │                  │      │                  │       │ │
│  │  │  ✓ Navigate      │      │  ✓ Mouse move    │       │ │
│  │  │  ✓ Click         │      │  ✓ Keyboard      │       │ │
│  │  │  ✓ Fill forms    │      │  ✓ Commands      │       │ │
│  │  │  ✓ Submit        │      │  ✓ File ops      │       │ │
│  │  └──────────────────┘      └──────────────────┘       │ │
│  │         ↑                           ↑                   │ │
│  └─────────┼───────────────────────────┼──────────────────┘ │
│            │                           │                     │
│  ┌─────────┼───────────────────────────┼──────────────────┐ │
│  │         │                           │                   │ │
│  │    WebAgent                   DesktopAgent             │ │
│  │    (Groq GPT-OSS 120B)        (Claude Opus 4.6)       │ │
│  │         │                           │                   │ │
│  │    PinchTabService            Computer Tools           │ │
│  │    (HTTP → :9867)             (HTTP → :3001)           │ │
│  │                                                          │ │
│  │              OrchestrationService                       │ │
│  │              (Sequential Pipeline)                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Task Flow Example

### Task: "Check my Gmail and download the latest invoice"

**Phase 1: Clarification**
- ClarifierAgent: "Task requires browser (Gmail) + desktop (file management)"

**Phase 2: Planning**
- OrchestratorAgent creates plan:
  1. Navigate to Gmail (WebAgent)
  2. Find invoice email (WebAgent)
  3. Click download link (WebAgent)
  4. Move file to Desktop (DesktopAgent)

**Phase 3: Execution**

**Step 1-3: WebAgent (Visible Browser)**
```
User sees through VNC:
├─ Chrome window opens
├─ Navigate to gmail.com
├─ Click "Sign in" button
├─ Fill email field
├─ Click "Next"
├─ Search for "invoice"
├─ Click first result
├─ Click "Download" attachment
└─ File downloads to ~/Downloads
```

**Step 4: DesktopAgent (Visible Desktop)**
```
User sees through VNC:
├─ Mouse moves to Files app
├─ Opens Downloads folder
├─ Right-clicks invoice.pdf
├─ Selects "Move to Desktop"
└─ File appears on Desktop
```

**All actions visible in real-time!**

---

## Troubleshooting

### Chrome Window Not Appearing

**Check 1**: Verify environment variable
```bash
# In aria-agent container
echo $PINCHTAB_HEADED_MODE
# Should output: true
```

**Check 2**: Verify display server
```bash
# Check if X11/Wayland is running
echo $DISPLAY
# Should output: :0 or :1
```

**Check 3**: Check PinchTab logs
```bash
docker-compose logs aria-agent | grep PinchTab
# Should see: "Initializing PinchTab in HEADED (visible) mode"
```

### Chrome Window Appears But Actions Not Visible

**Possible causes**:
1. VNC not connected to correct display
2. Chrome window minimized
3. Chrome window on different workspace

**Fix**: Restart PinchTab instance
```bash
# In aria-agent container
curl -X DELETE http://localhost:9867/instances/<instance-id>
# Next task will create new instance
```

---

## Configuration Reference

### Environment Variables

```bash
# Enable visible browser window
PINCHTAB_HEADED_MODE=true

# PinchTab server URL (default: http://pinchtab:9867)
PINCHTAB_BASE_URL=http://localhost:9867

# PinchTab authentication token (optional)
BRIDGE_TOKEN=your-secret-token

# PinchTab bind address (default: 127.0.0.1)
BRIDGE_BIND=127.0.0.1

# PinchTab port (default: 9867)
BRIDGE_PORT=9867

# PinchTab profile directory
BRIDGE_PROFILE=~/.pinchtab/automation-profile
```

### Docker Compose

Ensure PinchTab service has display access:

```yaml
services:
  pinchtab:
    image: pinchtab/pinchtab:latest
    ports:
      - "9867:9867"
    environment:
      - BRIDGE_HEADLESS=false  # Enable headed mode
      - DISPLAY=:0             # X11 display
    volumes:
      - /tmp/.X11-unix:/tmp/.X11-unix  # X11 socket
```

---

## Best Practices

### When to Use Headed Mode

✅ **Always use in production** - Trust is critical
✅ **During development** - Easier debugging
✅ **For demos** - Show users what's happening
✅ **For sensitive tasks** - User can verify actions

### When Headless Might Be OK

⚠️ **Batch processing** - 100s of tasks, no user watching
⚠️ **CI/CD pipelines** - Automated testing
⚠️ **Background jobs** - Scheduled tasks

**But even then, headed mode is recommended for auditability**

---

## Summary

### What Changed

1. ✅ PinchTabService now supports `headed` parameter
2. ✅ WebAgent reads `PINCHTAB_HEADED_MODE` env var
3. ✅ Chrome window visible through VNC when enabled
4. ✅ All browser actions visible in real-time

### What to Do

1. Set `PINCHTAB_HEADED_MODE=true` in `.env`
2. Restart aria-agent service
3. Test with a browser task
4. Verify Chrome window appears on desktop

### Result

**Users can now see ALL agent actions:**
- ✅ Browser automation (WebAgent + PinchTab)
- ✅ Desktop automation (DesktopAgent + Computer Tools)
- ✅ Complete transparency
- ✅ Maximum trust

---

## Next Steps

1. **Test headed mode** with a simple task
2. **Monitor performance** - measure any slowdown
3. **Gather user feedback** - does visibility improve trust?
4. **Consider recording** - save VNC sessions for audit trail

---

## Related Documentation

- [Multi-Agent Architecture](./MULTI-AGENT-MIGRATION-GUIDE.md)
- [Desktop VNC Troubleshooting](../DESKTOP-VNC-TROUBLESHOOTING.md)
- [PinchTab Official Docs](https://github.com/pinchtab/pinchtab)
