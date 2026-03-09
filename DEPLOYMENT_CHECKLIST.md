# ARIA Hybrid Deployment Checklist

## What We Built

A hybrid architecture where:
- ✅ Frontend (Vercel) - Hosted
- ✅ Agent API (Render) - Hosted  
- ✅ Database (Render PostgreSQL) - Hosted
- ✅ Desktop Daemon (ariad) - Runs locally on user's machine
- ✅ Local Proxy - Runs locally on user's machine (forwards desktop connections)

## Changes Made

### 1. Frontend Changes (aria-ui)
- ✅ Added desktop mode toggle to `/desktop` page
- ✅ Added desktop mode toggle to `/tasks/[id]` page
- ✅ Updated `VncViewer.tsx` to support online/offline modes
- ✅ Updated `DesktopContainer.tsx` to accept mode prop
- ✅ Mode preference saved in localStorage

### 2. New Package: Local Proxy
- ✅ Created `packages/aria-local-proxy`
- ✅ Forwards WebSocket connections from port 9991 → 9990
- ✅ Solves HTTPS → WS mixed content security issue

## Deployment Steps

### Step 1: Push to GitHub ✅ DO THIS

```bash
git add .
git commit -m "Add hybrid desktop mode with online/offline toggle"
git push origin main
```

### Step 2: Vercel Environment Variables ✅ ALREADY SET (No changes needed)

Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables

**Current variables (keep as-is):**
```env
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
NEXT_PUBLIC_API_URL=https://aria-agent.onrender.com
```

**DO NOT ADD:**
- ❌ No localhost:9990 variables
- ❌ No localhost:9991 variables
- ❌ No ARIA_DESKTOP_VNC_URL (unless you host desktop in future)

### Step 3: Render Environment Variables ✅ ALREADY SET (No changes needed)

Go to: https://dashboard.render.com → Your Service → Environment

**Current variables (keep as-is):**
```env
DATABASE_URL=postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a/ariadb_d5mw
GOOGLE_API_KEY=your_actual_key_here
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://ai-aria.vercel.app
```

**DO NOT ADD:**
- ❌ No localhost:9990 variables
- ❌ No localhost:9991 variables
- ❌ No ARIA_DESKTOP_API_URL

### Step 4: Vercel Auto-Deploy ✅ AUTOMATIC

After pushing to GitHub, Vercel will automatically:
1. Detect the push
2. Build the frontend
3. Deploy to https://ai-aria.vercel.app
4. Takes ~2-3 minutes

## User Setup (What Users Need to Do)

### Option 1: Quick Start (Recommended)

**Terminal 1 - Start Desktop:**
```bash
docker-compose up ariad
```

**Terminal 2 - Start Proxy:**
```bash
cd packages/aria-local-proxy
npm install  # First time only
npm start
```

**Browser:**
1. Go to: https://ai-aria.vercel.app/desktop
2. Click "Local Desktop" toggle
3. Desktop appears!

### Option 2: Manual Setup

**Terminal 1 - Start Desktop:**
```bash
cd packages/ariad
npm install  # First time only
npm start
```

**Terminal 2 - Start Proxy:**
```bash
cd packages/aria-local-proxy
npm install  # First time only
npm start
```

**Browser:**
1. Go to: https://ai-aria.vercel.app/desktop
2. Click "Local Desktop" toggle
3. Desktop appears!

## How It Works

```
User's Browser (HTTPS)
    ↓
https://ai-aria.vercel.app/desktop
    ↓
Clicks "Local Desktop" toggle
    ↓
JavaScript connects to: ws://localhost:9991/websockify
    ↓
Local Proxy (port 9991)
    ↓
Forwards to: Desktop Daemon (port 9990)
    ↓
VNC connection established!
```

## Testing After Deployment

### 1. Test Frontend
```bash
curl https://ai-aria.vercel.app
# Should return 200 OK
```

### 2. Test Agent API
```bash
curl https://aria-agent.onrender.com/health
# Should return: {"status":"ok"}
```

### 3. Test Local Desktop (User Side)

**Start services:**
```bash
# Terminal 1
docker-compose up ariad

# Terminal 2
cd packages/aria-local-proxy
npm start
```

**Test in browser:**
1. Open: https://ai-aria.vercel.app/desktop
2. Toggle to "Local Desktop"
3. Should see desktop!

### 4. Test Tasks Page

1. Create a task at: https://ai-aria.vercel.app/aria-agent
2. Go to task page: https://ai-aria.vercel.app/tasks/[task-id]
3. Toggle between "Online" and "Local" desktop modes
4. Desktop should work in "Local" mode

## Troubleshooting

### Frontend not updating after push
- Check Vercel deployment logs
- Verify build succeeded
- Hard refresh browser (Ctrl+Shift+R)

### "Cannot connect to desktop" in Local mode
```bash
# Check if services are running
docker-compose ps  # Should show ariad
lsof -i :9991      # Should show node process

# Restart services
docker-compose restart ariad
# Restart proxy (Ctrl+C and npm start again)
```

### "Bad Gateway" error
- Desktop daemon (9990) is not running
- Start it: `docker-compose up ariad`

### "Connection refused" error
- Local proxy (9991) is not running
- Start it: `cd packages/aria-local-proxy && npm start`

### Desktop works locally but not on Vercel
- Clear browser cache
- Check browser console for errors (F12)
- Verify both local services are running

## What NOT to Do

❌ **DO NOT** add localhost variables to Vercel
❌ **DO NOT** add localhost variables to Render
❌ **DO NOT** try to host the proxy on Vercel/Render
❌ **DO NOT** expect "Online Desktop" to work (not hosted yet)

## What to Tell Users

> "To use ARIA desktop features:
> 
> 1. Run `docker-compose up ariad` (desktop daemon)
> 2. Run `cd packages/aria-local-proxy && npm start` (proxy)
> 3. Visit https://ai-aria.vercel.app/desktop
> 4. Toggle to 'Local Desktop'
> 
> Your desktop runs locally while using our hosted AI agent!"

## Future: Hosting the Desktop

When you're ready to host the desktop daemon:

1. Deploy ariad to Railway/Render/Fly.io
2. Add to Vercel env vars:
   ```env
   ARIA_DESKTOP_VNC_URL=wss://your-hosted-desktop.com/websockify
   ```
3. Users can then use "Online Desktop" mode
4. No code changes needed!

## Summary

✅ **Push to GitHub:** Yes
✅ **Vercel env vars:** No changes needed
✅ **Render env vars:** No changes needed
✅ **User setup:** Run 2 local services
✅ **Works immediately:** After Vercel deploys

The connection is entirely client-side (browser → localhost), so hosted services don't need to know about it!
