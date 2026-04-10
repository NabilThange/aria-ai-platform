# PinchTab Perplexity Testing - Quick Summary

## What You Asked For

You wanted PowerShell commands to manually test:
1. Opening a Perplexity PinchTab instance
2. Running the exact JavaScript from Step 7A to export conversations
3. Automatic token retrieval and injection into commands

## What I Created

### 1. `QUICK-TEST.ps1` ⭐ START HERE
**Best for**: Quick testing with minimal setup

```powershell
.\QUICK-TEST.ps1
```

This automated script:
- ✅ Gets auth token automatically
- ✅ Creates/finds profile
- ✅ Opens Perplexity
- ⏸️ Pauses for you to type a query
- ✅ Exports conversation with Step 7A JavaScript
- ✅ Stops browser

**Time**: ~2 minutes

---

### 2. `test-pinchtab-perplexity.ps1`
**Best for**: Full automated testing with detailed logging

```powershell
.\test-pinchtab-perplexity.ps1
```

Features:
- Colored output with status indicators
- Detailed error handling
- Step-by-step progress tracking
- Automatic cleanup

**Time**: ~2 minutes

---

### 3. `test-pinchtab-curl-commands.ps1`
**Best for**: Learning the API / Manual control

```powershell
.\test-pinchtab-curl-commands.ps1
```

This displays all commands with explanations. Copy/paste each block individually.

Features:
- See every API call
- Understand the flow
- Debug specific steps
- Full control over timing

**Time**: ~5-10 minutes (manual)

---

### 4. `TESTING-PINCHTAB-PERPLEXITY.md`
**Best for**: Understanding how everything works

Complete documentation including:
- Prerequisites
- API endpoint reference
- Troubleshooting guide
- Testing workflow
- Example queries

---

## Quick Start (3 Steps)

### Step 1: Start Services
```powershell
cd docker
docker-compose up postgres redis aria-desktop -d
```

### Step 2: Verify Services
```powershell
curl http://localhost:9867/health  # PinchTab
curl http://localhost:9990         # Aria Desktop
```

### Step 3: Run Test
```powershell
.\QUICK-TEST.ps1
```

## The JavaScript (Step 7A)

The script does exactly what's in your workflow:

1. **Finds conversation elements** using `h1.group/query` selector
2. **Extracts data**:
   - Query text
   - Answer text from `.prose` elements
   - Citations with URLs
   - Code blocks with language tags
3. **Formats as Markdown** with proper structure
4. **Auto-downloads** the file

## Token Retrieval

All scripts automatically get the token using this logic:

```powershell
# Option 1: Environment variable
$TOKEN = $env:PINCHTAB_AUTH_TOKEN

# Option 2: Fetch from Aria Desktop config (automatic fallback)
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
$TOKEN = $config.server.token
```

No manual token entry needed!

## API Calls Made

Each test makes these calls in order:

1. `GET /api/pinchtab-config` - Get auth token
2. `GET /profiles` - List profiles
3. `POST /profiles` - Create profile (if needed)
4. `GET /profiles/{id}/instance` - Check status
5. `POST /profiles/{id}/stop` - Stop existing instance
6. `POST /instances/start` - Start new instance
7. `POST /navigate` - Open Perplexity
8. `POST /eval` - Execute JavaScript (Step 7A)
9. `POST /profiles/{id}/stop` - Cleanup

## Expected Output

When successful:

```json
{
  "success": true,
  "filename": "Aria_Research_What_is_the_capital_of_France.md",
  "turns": 1,
  "citations": 3
}
```

And a markdown file downloads to your Downloads folder.

## Troubleshooting

### Services Not Running
```powershell
docker ps  # Check what's running
docker-compose up aria-desktop -d  # Start Aria Desktop
```

### Token Issues
```powershell
# Check environment
$env:PINCHTAB_AUTH_TOKEN

# Check config endpoint
Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
```

### Browser Not Opening
- Wait longer (increase sleep times)
- Check Docker logs: `docker logs aria-desktop`
- Verify port 9867 is accessible

### JavaScript Fails
- Make sure you typed a query in Perplexity
- Wait for response to complete
- Check if Perplexity changed their HTML structure

## Files Overview

| File | Purpose | Run Time |
|------|---------|----------|
| `QUICK-TEST.ps1` | Fast automated test | 2 min |
| `test-pinchtab-perplexity.ps1` | Full automated test with logging | 2 min |
| `test-pinchtab-curl-commands.ps1` | Manual command reference | 5-10 min |
| `TESTING-PINCHTAB-PERPLEXITY.md` | Complete documentation | - |
| `TESTING-SUMMARY.md` | This file | - |

## Next Steps

1. ✅ Run `QUICK-TEST.ps1` to verify everything works
2. ✅ Try different queries to test various scenarios
3. ✅ Check the exported markdown files
4. ✅ Integrate into your workflow
5. ✅ Add custom error handling if needed

## Example Test Queries

Try these to test different scenarios:

**Simple Query**:
```
What is the capital of France?
```

**Structured Data Query**:
```
Find 5 coffee shops in San Francisco with addresses
```

**Multi-Turn Query**:
```
Tell me about Python. [wait for response]
Now explain decorators. [wait for response]
```

## Support

If you encounter issues:
1. Check `TESTING-PINCHTAB-PERPLEXITY.md` for detailed troubleshooting
2. Verify all services are running
3. Check Docker logs
4. Ensure ports are not blocked

---

**Ready to test?** Run `.\QUICK-TEST.ps1` now! 🚀
