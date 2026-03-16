# Desktop VNC Connection Troubleshooting Guide

## Error: "Connection closed (code: 1006)" or "Tried changing state of a disconnected RFB object"

This error occurs when the VNC WebSocket connection fails. Here's how to fix it:

---

## Quick Fix (Run This First)

### Windows:
```bash
.\restart-dev.bat
```

### Linux/Mac:
```bash
chmod +x restart-dev.sh
./restart-dev.sh
```

Then restart your development servers:
1. Terminal 1: `cd packages/aria-agent && npm run dev`
2. Terminal 2: `cd packages/aria-ui && npm run dev`

---

## Manual Troubleshooting Steps

### 1. Check Docker Containers Are Running

```bash
docker ps
```

You should see:
- `aria-desktop` on port 9990
- `aria-postgres` on port 5432
- `aria-redis` on port 6379

If not running:
```bash
cd docker
docker-compose -f docker-compose.development.yml up -d
```

### 2. Verify Desktop WebSocket is Accessible

Test the WebSocket endpoint:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:9990/websockify
```

Expected response: `HTTP/1.1 101 Switching Protocols`

If you get connection refused:
- Desktop container is not running
- Port 9990 is blocked by firewall
- Another service is using port 9990

### 3. Check Environment Variables

**packages/aria-ui/.env.local** should have:
```env
NEXT_PUBLIC_DESKTOP_VNC_URL=ws://localhost:9990/websockify
```

**packages/aria-agent/.env** should have:
```env
ARIA_DESKTOP_BASE_URL=http://localhost:9990
```

### 4. Verify VncViewer Component

The VncViewer should connect directly to the desktop daemon, NOT through a Next.js proxy.

Check `packages/aria-ui/src/components/vnc/VncViewer.tsx`:
```typescript
const desktopVncUrl = process.env.NEXT_PUBLIC_DESKTOP_VNC_URL || "ws://localhost:9990/websockify";
```

### 5. Check Desktop Logs

```bash
docker logs aria-desktop
```

Look for:
- `websockify started on port 6080`
- `x11vnc started on port 5900`
- `ariad listening on port 9990`

### 6. Restart Everything

If nothing works, nuclear option:

```bash
# Stop everything
docker-compose -f docker/docker-compose.development.yml down -v

# Remove volumes (WARNING: deletes data)
docker volume rm aria_postgres_data aria_redis_data

# Start fresh
docker-compose -f docker/docker-compose.development.yml up -d

# Wait 10 seconds
sleep 10

# Check status
docker ps
docker logs aria-desktop
```

---

## Common Issues

### Issue: "WebSocket connection failed"
**Cause**: Desktop container not running or port blocked
**Fix**: Run `docker-compose up -d` and check firewall

### Issue: "Connection closed immediately"
**Cause**: VNC server not ready inside container
**Fix**: Wait 10-15 seconds after starting container, check logs

### Issue: "404 Not Found on /websockify"
**Cause**: ariad not proxying WebSocket correctly
**Fix**: Check ariad configuration, restart container

### Issue: "CORS error"
**Cause**: Browser blocking WebSocket from different origin
**Fix**: Use `ws://localhost:9990` not `ws://127.0.0.1:9990`

### Issue: "RFB object disconnected"
**Cause**: Component trying to change state after disconnect
**Fix**: Already fixed in VncViewer.tsx with guards

---

## Architecture

```
Browser (VncViewer)
    ↓ WebSocket
ws://localhost:9990/websockify
    ↓
ariad (port 9990) - HTTP server + WebSocket proxy
    ↓
websockify (port 6080) - WebSocket to TCP bridge
    ↓
x11vnc (port 5900) - VNC server
    ↓
X11 Display :0 - Desktop environment
```

---

## Verification Checklist

- [ ] Docker containers running (`docker ps`)
- [ ] Desktop logs show no errors (`docker logs aria-desktop`)
- [ ] WebSocket endpoint responds (`curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:9990/websockify`)
- [ ] Environment variables set correctly
- [ ] aria-agent running on port 9991
- [ ] aria-ui running on port 3000
- [ ] Browser console shows WebSocket connection attempt
- [ ] No firewall blocking port 9990

---

## Still Not Working?

1. Check browser console for detailed error messages
2. Check Network tab for WebSocket connection details
3. Try different browser (Chrome vs Firefox)
4. Disable browser extensions
5. Check if antivirus is blocking WebSocket connections

---

## Production Deployment

For production with HTTPS:
- Use `wss://` instead of `ws://`
- Set up reverse proxy (nginx, caddy) for WebSocket
- Update `NEXT_PUBLIC_DESKTOP_VNC_URL` to production URL
- Ensure SSL certificates are valid

Example nginx config:
```nginx
location /websockify {
    proxy_pass http://desktop:9990;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```
