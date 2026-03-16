# Docker Rebuild Guide

## When Do You Need to Rebuild?

You need to rebuild the Docker image when:
- ✅ You changed files in `packages/ariad/` (Dockerfile, supervisord config, etc.)
- ✅ You updated the PinchTab command fix
- ✅ You added the permissions fix
- ❌ You only changed environment variables (.env files) - just restart
- ❌ You only changed aria-agent or aria-ui code - no rebuild needed

## Quick Rebuild (Recommended)

```bash
cd docker
docker-compose build aria-desktop
docker-compose up -d aria-desktop
```

This takes about 5-10 minutes.

## What Gets Fixed by Rebuilding

The rebuild includes these permanent fixes:
1. **PinchTab command** - Changed from `pinchtab serve --port 19867` to `pinchtab server`
2. **Permissions fix** - Automatically runs `chown -R user:user /home/user` on startup
3. **All future restarts** - These fixes will persist even after `docker restart`

## Current Status (For You Right Now)

**You already fixed the permissions manually:**
```bash
docker exec aria-desktop chown -R user:user /home/user
```

**This means:**
- ✅ Chrome, VSCode, Gmail will work NOW (until you restart the container)
- ❌ After `docker restart aria-desktop`, you'll need to run the fix again
- ✅ After rebuilding, the fix runs automatically on every startup

## Should You Rebuild Now?

**Option A: Rebuild now (recommended)**
```bash
cd docker
docker-compose build aria-desktop
docker-compose up -d aria-desktop

# Wait 15 seconds, then test
curl http://localhost:9867/health
```

**Option B: Keep using current container**
- Works fine for now
- But you'll need to run this after every restart:
  ```bash
  docker exec aria-desktop chown -R user:user /home/user
  ```

## Testing After Rebuild

```bash
# 1. Check PinchTab
curl http://localhost:9867/health
# Should return: {"status":"ok",...}

# 2. Check VNC (open in browser)
# http://localhost:9990

# 3. Try opening Chrome in VNC
# Click the Chrome icon on desktop - should open without errors

# 4. Check logs for errors
docker logs aria-desktop --tail 50
# Should NOT see "Permission denied" errors
```

## If You Get Errors After Rebuild

**"Empty reply from server" for PinchTab:**
```bash
# Check if PinchTab is running
docker exec aria-desktop ps aux | grep pinchtab

# Check logs
docker logs aria-desktop | grep -i pinchtab

# If not running, check supervisord
docker exec aria-desktop supervisorctl status
```

**"Permission denied" errors still appearing:**
```bash
# Check if fix-permissions ran
docker logs aria-desktop | grep -i "fix-permissions"

# Manually verify permissions
docker exec aria-desktop ls -la /home/user/.config
# Should show "user user" not "root root"
```

## Summary

**Right now:** Chrome/VSCode/Gmail work because you fixed permissions manually.

**After rebuild:** Permissions fix runs automatically on every startup, so you never have to worry about it again.

**Recommendation:** Rebuild when convenient (takes 5-10 minutes), but not urgent if everything is working.
