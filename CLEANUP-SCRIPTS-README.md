# Perplexity Instance Cleanup Scripts

These scripts help you clean up PinchTab browser instances and tabs for the Perplexity profile.

## Available Scripts

### 1. PowerShell Script (Recommended for Windows)
**File:** `cleanup-perplexity.ps1`

**Features:**
- ✅ Automatically finds perplexity-profile
- ✅ Lists and closes all tabs automatically
- ✅ Stops the instance
- ✅ Verifies cleanup completion
- ✅ Color-coded output

**Usage:**
```powershell
.\cleanup-perplexity.ps1
```

**First-time setup (if you get execution policy error):**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

### 2. Batch Script (Basic Windows)
**File:** `cleanup-perplexity.bat`

**Features:**
- ✅ Interactive prompts
- ✅ Manual tab closing (requires copying tab IDs)
- ✅ Saves JSON responses for inspection

**Usage:**
```cmd
cleanup-perplexity.bat
```

---

## Manual Cleanup (Using curl)

If you prefer manual control, use these curl commands:

### Step 1: List all profiles
```bash
curl http://localhost:9867/profiles
```

### Step 2: Get profile instance status
```bash
curl http://localhost:9867/profiles/{PROFILE_ID}/instance
```

### Step 3: List all tabs in instance
```bash
curl http://localhost:9867/instances/{INSTANCE_ID}/tabs
```

### Step 4: Close each tab
```bash
curl -X POST http://localhost:9867/tabs/{TAB_ID}/close
```

### Step 5: Stop instance
```bash
curl -X POST http://localhost:9867/profiles/{PROFILE_ID}/stop
```

---

## Common Use Cases

### Quick Cleanup Before Running Workflow
```powershell
# PowerShell
.\cleanup-perplexity.ps1

# Then run your workflow
curl -X POST http://localhost:9991/workflows/perplexity-linkedin-post/execute -H "Content-Type: application/json" -d "{\"variables\": {\"topic\": \"AI Trends 2026\"}}"
```

### Emergency Stop (Instance Frozen)
```bash
# Find the profile ID
curl http://localhost:9867/profiles

# Force stop
curl -X POST http://localhost:9867/profiles/prof_xxx/stop
```

### Check Current Status
```bash
# Check if instance is running
curl http://localhost:9867/profiles/prof_xxx/instance

# Response examples:
# Running: {"running": true, "id": "inst_xxx", "port": "..."}
# Stopped: {"running": false}
```

---

## Troubleshooting

### "Profile not found"
- Make sure PinchTab is running: `curl http://localhost:9867/health`
- Check if profile exists: `curl http://localhost:9867/profiles`
- The profile is created automatically on first workflow run

### "Failed to close tabs"
- Some tabs may already be closed
- Try stopping the instance directly: `curl -X POST http://localhost:9867/profiles/{PROFILE_ID}/stop`

### "Instance won't stop"
- Wait 10 seconds and check again
- Restart PinchTab service if needed
- Check Docker: `docker ps | grep pinchtab`

### PowerShell execution policy error
```powershell
# Allow scripts for current user only
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or run with bypass (one-time)
powershell -ExecutionPolicy Bypass -File .\cleanup-perplexity.ps1
```

---

## Integration with Workflows

The cleanup is already built into the workflow at the end:

```typescript
// From perplexity-linkedin-post.workflow.ts
// Step 13: Close All Tabs Before Stopping Instance
const tabs = await pinchTab.listTabs(instance.id);
for (const tab of tabs) {
  await pinchTab.closeTab(tab.id);
}

// Step 14: Stop Browser Instance
await pinchTab.stopInstanceByProfile(profileId);
```

However, if a workflow crashes or is interrupted, tabs may remain open. Use these cleanup scripts to recover.

---

## Best Practices

1. **Run cleanup before starting a new workflow** to ensure clean state
2. **Don't manually close the browser window** - use the scripts to properly stop the instance
3. **Check tab count regularly** - too many tabs can slow down PinchTab
4. **Keep profile persistent** - don't delete perplexity-profile (it stores your login session)

---

## Advanced: Automated Cleanup Hook

You can create a pre-workflow hook to auto-cleanup:

```json
{
  "name": "Pre-Workflow Cleanup",
  "version": "1.0.0",
  "when": {
    "type": "preTaskExecution"
  },
  "then": {
    "type": "runCommand",
    "command": "powershell -ExecutionPolicy Bypass -File cleanup-perplexity.ps1"
  }
}
```

---

## API Reference

### PinchTab Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/profiles` | GET | List all profiles |
| `/profiles/{id}/instance` | GET | Check instance status |
| `/profiles/{id}/start` | POST | Start instance with profile |
| `/profiles/{id}/stop` | POST | Stop instance by profile |
| `/instances/{id}/tabs` | GET | List tabs in instance |
| `/tabs/{id}/close` | POST | Close specific tab |

### Response Examples

**Profile List:**
```json
[
  {
    "id": "prof_abc123",
    "name": "perplexity-profile",
    "description": "Persistent Perplexity session",
    "createdAt": "2026-04-02T10:30:00Z"
  }
]
```

**Instance Status:**
```json
{
  "running": true,
  "id": "inst_xyz789",
  "port": "9222",
  "profileId": "prof_abc123"
}
```

**Tab List:**
```json
[
  {
    "id": "tab_001",
    "url": "https://www.perplexity.ai",
    "title": "Perplexity AI"
  }
]
```

---

## Support

If you encounter issues:
1. Check PinchTab logs: `docker logs aria-pinchtab`
2. Verify PinchTab is running: `curl http://localhost:9867/health`
3. Restart PinchTab: `docker restart aria-pinchtab`
4. Check the workflow logs in the Aria UI

---

**Created:** 2026-04-02  
**Last Updated:** 2026-04-02  
**Version:** 1.0.0
