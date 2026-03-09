# Hybrid Deployment Guide: Hosted Services + Local Desktop

This guide explains how to run ARIA with hosted frontend, agent, and database while users run the desktop daemon locally.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    HOSTED SERVICES                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Vercel)                                       │
│  https://ai-aria.vercel.app                             │
│  ├─ /aria-agent (Chat Interface)                        │
│  └─ /desktop (Desktop Viewer with Online/Offline toggle)│
│                                                          │
│  Agent API (Render)                                      │
│  https://aria-agent.onrender.com                        │
│  └─ Handles AI requests, task management                │
│                                                          │
│  Database (Render PostgreSQL)                           │
│  postgresql://ariadb_d5mw_user:***@dpg-.../ariadb_d5mw │
│  └─ Stores tasks, messages, user data                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
                            ↕
                    (WebSocket/HTTP)
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   LOCAL USER MACHINE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Desktop Daemon (ariad)                                  │
│  ws://localhost:9990/websockify                         │
│  └─ VNC server for desktop automation                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Environment Variables Configuration

### 1. Frontend (aria-ui) - Vercel

**File**: `packages/aria-ui/.env.production`

```env
# Backend API Connection (Hosted on Render)
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
NEXT_PUBLIC_API_URL=https://aria-agent.onrender.com

# Desktop Daemon Connection (Optional - for future hosted desktop)
# Leave this for future use when you host the desktop daemon
ARIA_DESKTOP_VNC_URL=wss://ariad-production.up.railway.app/websockify
```

**Vercel Dashboard Configuration**:
1. Go to: https://vercel.com/dashboard → Your Project → Settings → Environment Variables
2. Add these variables:
   - `ARIA_AGENT_BASE_URL` = `https://aria-agent.onrender.com`
   - `NEXT_PUBLIC_API_URL` = `https://aria-agent.onrender.com`

**Important Notes**:
- `NEXT_PUBLIC_*` variables are exposed to the browser
- NO localhost references needed in Vercel env vars
- The desktop connection happens entirely client-side (browser → user's local machine)
- Users connect to `ws://localhost:9991/websockify` (local proxy) when in "Local Desktop" mode

---

### 2. Agent API (aria-agent) - Render

**File**: `packages/aria-agent/.env.production`

```env
# Database Connection (Render PostgreSQL)
DATABASE_URL=postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a/ariadb_d5mw

# Google Gemini API
GOOGLE_API_KEY=your_actual_google_api_key_here

# Groq Cloud API (Optional)
GROQ_API_KEY=your_actual_groq_api_key_here

# OpenRouter API (Optional)
OPENROUTER_API_KEY=your_actual_openrouter_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=production

# CORS Configuration (Allow Vercel frontend)
ALLOWED_ORIGINS=https://ai-aria.vercel.app,https://ai-aria.vercel.app/aria-agent

# Desktop Daemon URL (for agent to send commands)
# NOT NEEDED for hybrid setup - desktop runs on user's machine
# Only needed if you host the desktop daemon in the future
# ARIA_DESKTOP_API_URL=http://your-hosted-desktop-url:9990
```

**Render Dashboard Configuration**:
1. Go to: https://dashboard.render.com → Your Service → Environment
2. Add these environment variables:
   - `DATABASE_URL` = (your PostgreSQL connection string)
   - `GOOGLE_API_KEY` = (your API key)
   - `GROQ_API_KEY` = (optional)
   - `OPENROUTER_API_KEY` = (optional)
   - `PORT` = `3001`
   - `NODE_ENV` = `production`
   - `ALLOWED_ORIGINS` = `https://ai-aria.vercel.app`

**Important**: Do NOT add `ARIA_DESKTOP_API_URL` or any localhost references. The agent doesn't directly connect to the desktop in this hybrid setup - the frontend handles the WebSocket connection to the user's local desktop.

---

### 3. Database (PostgreSQL) - Render

**Connection String**:
```
postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a/ariadb_d5mw
```

**No additional environment variables needed** - just use this connection string in your agent service.

**Database Setup**:
```bash
# Run migrations (from your local machine or Render shell)
cd packages/aria-agent
npx prisma migrate deploy
npx prisma generate
```

---

### 4. Local Desktop (ariad) - User's Machine

Users need to run TWO things locally:
1. The desktop daemon (ariad) on port 9990
2. A local proxy on port 9991 (to handle CORS and WebSocket forwarding)

**Why the proxy?** When accessing `https://ai-aria.vercel.app` (HTTPS), browsers block direct connections to `ws://localhost:9990` due to mixed content security. The proxy on port 9991 solves this.

#### Setup Option A: Docker Compose (Recommended)

Add this to your `docker-compose.yml`:

```yaml
services:
  ariad:
    # ... existing ariad config ...
    ports:
      - "9990:9990"
  
  aria-local-proxy:
    build: ./packages/aria-local-proxy
    ports:
      - "9991:9991"
    depends_on:
      - ariad
    environment:
      - TARGET_URL=http://ariad:9990
```

Then run:
```bash
docker-compose up ariad aria-local-proxy
```

#### Setup Option B: Run Separately

**Terminal 1 - Desktop Daemon:**
```bash
cd packages/ariad
npm install
npm run start
# Runs on http://localhost:9990
```

**Terminal 2 - Local Proxy:**
```bash
cd packages/aria-local-proxy
npm install
npm run start
# Runs on http://localhost:9991
# Forwards to http://localhost:9990
```

---

## How the Toggle Works

### Online Mode (Default)
- Frontend connects to: `wss://ai-aria.vercel.app/api/proxy/websockify`
- This proxy forwards to your hosted desktop daemon (when available)
- Currently, this will fail until you host the desktop daemon

### Offline Mode (Local Desktop)
- Frontend connects directly to: `ws://localhost:9990/websockify`
- Bypasses the hosted proxy entirely
- Requires user to run ariad locally
- Works immediately without waiting for hosted desktop

### User Experience
1. User visits: https://ai-aria.vercel.app/desktop
2. Sees toggle: **Online Desktop** | **Local Desktop**
3. Clicks "Local Desktop"
4. Frontend connects to their local `ws://localhost:9990/websockify`
5. Desktop automation works immediately!

---

## Summary of Changes

### What Changed:
1. ✅ Added desktop mode toggle on `/desktop` page
2. ✅ VncViewer now supports `mode` prop (online/offline)
3. ✅ Local mode connects directly to `ws://localhost:9990`
4. ✅ Online mode uses hosted proxy (for future)
5. ✅ User preference saved in localStorage

### What Stays the Same:
- Frontend hosted on Vercel
- Agent API hosted on Render
- Database hosted on Render PostgreSQL
- All environment variables remain unchanged

### What Users Need to Do:
1. Visit https://ai-aria.vercel.app/desktop
2. Click "Local Desktop" toggle
3. Run `docker-compose up ariad` locally
4. Desktop automation works!

---

## Testing the Setup

### Test Frontend
```bash
curl https://ai-aria.vercel.app/aria-agent
# Should return the chat interface
```

### Test Agent API
```bash
curl https://aria-agent.onrender.com/health
# Should return: {"status":"ok"}
```

### Test Database Connection
```bash
# From agent service
npx prisma studio
# Should open Prisma Studio with your database
```

### Test Local Desktop
```bash
# Start local desktop
docker-compose up ariad

# In browser, visit:
# https://ai-aria.vercel.app/desktop
# Toggle to "Local Desktop"
# Should see VNC connection
```

---

## Future: Hosting the Desktop Daemon

When you're ready to host the desktop daemon:

1. Deploy ariad to Railway/Render/Fly.io
2. Update `ARIA_DESKTOP_VNC_URL` in Vercel env vars
3. Users can then use "Online Desktop" mode
4. No code changes needed - toggle already supports both modes!

---

## Troubleshooting

### "Cannot connect to desktop" in Local Mode
- Ensure ariad is running: `docker-compose ps`
- Check port 9990 is not blocked by firewall
- Verify WebSocket connection: `ws://localhost:9990/websockify`

### "Cannot connect to desktop" in Online Mode
- This is expected until you host the desktop daemon
- Use "Local Desktop" mode for now

### Agent API not responding
- Check Render logs: https://dashboard.render.com
- Verify DATABASE_URL is correct
- Ensure GOOGLE_API_KEY is set

### Database connection errors
- Verify PostgreSQL is running on Render
- Check connection string is correct
- Run migrations: `npx prisma migrate deploy`

---

## Quick Reference

| Service | URL | Environment |
|---------|-----|-------------|
| Frontend | https://ai-aria.vercel.app | Vercel |
| Agent API | https://aria-agent.onrender.com | Render |
| Database | postgresql://... | Render PostgreSQL |
| Desktop (Local) | ws://localhost:9990/websockify | User's Machine |
| Desktop (Hosted) | wss://ariad-production.up.railway.app/websockify | Future |

---

## Need Help?

- Frontend issues: Check Vercel logs
- Agent issues: Check Render logs
- Desktop issues: Check Docker logs (`docker-compose logs ariad`)
- Database issues: Use Prisma Studio (`npx prisma studio`)
