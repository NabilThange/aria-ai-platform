# Quick Start: Local Desktop with Hosted Frontend

Follow these steps to use the hosted ARIA frontend with your local desktop.

## Step 1: Start the Desktop Daemon

```bash
# Option A: Using Docker (Recommended)
docker-compose up ariad

# Option B: Manual
cd packages/ariad
npm start
```

**Verify it's running:**
- Open: http://localhost:9990/novnc/vnc.html?host=localhost&port=9990&path=websockify&resize=scale
- You should see the desktop

## Step 2: Start the Local Proxy

Open a NEW terminal:

```bash
cd packages/aria-local-proxy
npm install  # Only needed first time
npm start
```

**You should see:**
```
🔗 ARIA Local Proxy running on http://localhost:9991
📡 Proxying to desktop daemon at http://localhost:9990
🌐 WebSocket endpoint: ws://localhost:9991/websockify
```

## Step 3: Use the Hosted Frontend

1. Open: https://ai-aria.vercel.app/desktop
2. Click the **"Local Desktop"** toggle
3. You should see your local desktop!

## What's Running?

```
┌─────────────────────────────────────┐
│  Your Local Machine                 │
├─────────────────────────────────────┤
│                                     │
│  Desktop Daemon (ariad)             │
│  Port: 9990                         │
│  ↑                                  │
│  │ (forwards to)                   │
│  │                                  │
│  Local Proxy                        │
│  Port: 9991                         │
│  ↑                                  │
└──┼──────────────────────────────────┘
   │
   │ WebSocket (ws://localhost:9991)
   │
┌──┼──────────────────────────────────┐
│  │ Browser                          │
│  │ https://ai-aria.vercel.app       │
└─────────────────────────────────────┘
```

## Quick Commands

**Check what's running:**
```bash
# Windows (PowerShell)
netstat -ano | findstr "9990 9991"

# Mac/Linux
lsof -i :9990
lsof -i :9991
```

**Stop everything:**
```bash
# Stop desktop (if using Docker)
docker-compose stop ariad

# Stop proxy (Ctrl+C in the terminal)
```

## Troubleshooting

**Desktop not showing:**
1. Check both services are running (Step 1 & 2)
2. Try refreshing the browser
3. Check browser console for errors (F12)

**"Bad Gateway" error:**
- Desktop daemon (9990) is not running
- Start it with: `docker-compose up ariad`

**"Connection refused":**
- Local proxy (9991) is not running
- Start it with: `cd packages/aria-local-proxy && npm start`

## Environment Variables

### For Vercel (Frontend):
```env
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
NEXT_PUBLIC_API_URL=https://aria-agent.onrender.com
```

### For Render (Agent):
```env
DATABASE_URL=postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a/ariadb_d5mw
GOOGLE_API_KEY=your_key_here
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://ai-aria.vercel.app
```

**NO localhost:9990 or localhost:9991 variables needed on Vercel or Render!**

The connection happens entirely in the user's browser → local proxy → local desktop.

## Summary

✅ **Push to GitHub:** Yes, push the aria-ui changes
✅ **Deploy to Vercel:** Yes, it will auto-deploy from GitHub
✅ **Local Proxy:** Users run this on their machine (not hosted)
✅ **Desktop Daemon:** Users run this on their machine (not hosted)

The hosted services (Vercel + Render) don't need to know about localhost ports!
