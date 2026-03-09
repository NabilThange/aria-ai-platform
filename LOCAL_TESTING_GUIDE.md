# Local Testing Guide

This guide shows you how to test ARIA completely locally before deploying.

## Prerequisites

1. Node.js 18+ installed
2. Docker Desktop installed (for desktop daemon)
3. PostgreSQL or SQLite for database

## Step-by-Step Local Setup

### Step 1: Kill Any Existing Processes

First, make sure no services are already running on the required ports:

**Windows (PowerShell):**
```powershell
# Check what's using the ports
netstat -ano | findstr "9990 9991 9992 3000"

# Kill processes if needed (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Check what's using the ports
lsof -i :9990
lsof -i :9991
lsof -i :9992
lsof -i :3000

# Kill processes if needed
kill -9 <PID>
```

### Step 2: Configure Environment Variables

I've created `.env.local` files for you. Update them with your API keys:

**Edit `packages/aria-agent/.env.local`:**
```env
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=your_actual_google_api_key_here
PORT=9991
```

**`packages/aria-ui/.env.local` is already configured** (no changes needed)

### Step 3: Start Services (4 Terminals)

Open 4 separate terminal windows:

#### Terminal 1: Database (if using PostgreSQL)
```bash
# If using Docker PostgreSQL
docker-compose up postgres

# Or if using SQLite, skip this step (it's in .env.local)
```

#### Terminal 2: Desktop Daemon
```bash
# Start the desktop daemon
docker-compose up ariad

# Wait for: "VNC server started on port 5900"
```

#### Terminal 3: Agent API
```bash
cd packages/aria-agent

# Install dependencies (first time only)
npm install

# Run database migrations (first time only)
npx prisma migrate dev
npx prisma generate

# Start the agent
npm run start:dev

# Wait for: "Nest application successfully started"
```

#### Terminal 4: Frontend
```bash
cd packages/aria-ui

# Install dependencies (first time only)
npm install

# Start the frontend
npm run dev

# Wait for: "Ready on http://localhost:3000"
```

### Step 4: Verify Everything is Running

**Check ports:**
```bash
# Windows
netstat -ano | findstr "9990 9991 3000"

# Mac/Linux
lsof -i :9990  # Desktop daemon
lsof -i :9991  # Agent API
lsof -i :3000  # Frontend
```

**Expected output:**
- Port 9990: ariad (Docker)
- Port 9991: node (Agent)
- Port 3000: node (Frontend)

### Step 5: Test the Application

1. **Open browser:** http://localhost:3000

2. **Test Dashboard:**
   - Should load without errors
   - Should show "Create New Task" button

3. **Test Desktop Page:**
   - Go to: http://localhost:3000/desktop
   - Toggle to "Local Desktop"
   - Should see the desktop (VNC connection)

4. **Create a Task:**
   - Go to: http://localhost:3000/aria-agent
   - Type a message: "Hello, test task"
   - Click send
   - Should create a task and redirect to task page

5. **Test Task Page:**
   - Should show desktop view
   - Should show chat messages
   - Toggle between "Online" and "Local" desktop modes

## Troubleshooting

### Error: "EADDRINUSE: address already in use :::9991"

**Problem:** Another process is using port 9991

**Solution:**
```bash
# Windows
netstat -ano | findstr :9991
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :9991
kill -9 <PID>
```

### Error: "API request failed: 404 Not Found"

**Problem:** Agent is not running or wrong URL

**Solution:**
1. Check agent is running: `lsof -i :9991` (Mac/Linux) or `netstat -ano | findstr :9991` (Windows)
2. Check `.env.local` has: `ARIA_AGENT_BASE_URL=http://localhost:9991`
3. Restart agent: `cd packages/aria-agent && npm run start:dev`

### Error: "Cannot connect to desktop"

**Problem:** Desktop daemon is not running

**Solution:**
1. Check Docker: `docker-compose ps`
2. Should see `ariad` with status "Up"
3. If not: `docker-compose up ariad`

### Error: "WebSocket connection failed"

**Problem:** Desktop daemon not accessible

**Solution:**
1. Verify desktop is running: http://localhost:9990/novnc/vnc.html?host=localhost&port=9990&path=websockify&resize=scale
2. Should see desktop in browser
3. If not, restart: `docker-compose restart ariad`

### Frontend shows blank page

**Problem:** Build error or missing dependencies

**Solution:**
```bash
cd packages/aria-ui
rm -rf .next node_modules
npm install
npm run dev
```

### Database errors

**Problem:** Database not initialized

**Solution:**
```bash
cd packages/aria-agent
npx prisma migrate reset  # Warning: deletes all data
npx prisma migrate dev
npx prisma generate
```

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Agent API | 9991 | http://localhost:9991 |
| Desktop Daemon | 9990 | http://localhost:9990 |
| Desktop Proxy | 9992 | ws://localhost:9992 (not needed for local testing) |
| PostgreSQL | 5432 | localhost:5432 (if using Docker) |

## Testing Checklist

- [ ] All 4 services running (database, desktop, agent, frontend)
- [ ] Dashboard loads at http://localhost:3000
- [ ] Desktop page shows VNC at http://localhost:3000/desktop
- [ ] Can create a new task
- [ ] Task page shows desktop and chat
- [ ] Desktop toggle works (Online/Local)
- [ ] No console errors in browser (F12)

## What's Different from Production?

| Aspect | Local | Production |
|--------|-------|------------|
| Frontend | localhost:3000 | https://ai-aria.vercel.app |
| Agent | localhost:9991 | https://aria-agent.onrender.com |
| Database | SQLite/Local PG | Render PostgreSQL |
| Desktop | localhost:9990 | User's local machine |

## Next Steps

Once local testing works:

1. ✅ Push to GitHub
2. ✅ Vercel auto-deploys frontend
3. ✅ Render runs agent with production env vars
4. ✅ Users run desktop locally (same as your local setup)

## Quick Start Script

Save this as `start-local.sh` (Mac/Linux) or `start-local.ps1` (Windows):

**Mac/Linux:**
```bash
#!/bin/bash

echo "Starting ARIA local development..."

# Start desktop in background
docker-compose up -d ariad
echo "✓ Desktop daemon started"

# Start agent in background
cd packages/aria-agent
npm run start:dev &
AGENT_PID=$!
echo "✓ Agent API started (PID: $AGENT_PID)"

# Start frontend
cd ../aria-ui
npm run dev

# Cleanup on exit
trap "kill $AGENT_PID; docker-compose stop ariad" EXIT
```

**Windows (PowerShell):**
```powershell
Write-Host "Starting ARIA local development..."

# Start desktop
Start-Process -NoNewWindow docker-compose -ArgumentList "up", "ariad"
Write-Host "✓ Desktop daemon started"

# Start agent
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "start:dev" -WorkingDirectory "packages\aria-agent"
Write-Host "✓ Agent API started"

# Start frontend
Set-Location "packages\aria-ui"
npm run dev
```

## Need Help?

- Check logs in each terminal window
- Look for error messages in browser console (F12)
- Verify all ports are available
- Ensure Docker is running
- Check API keys are set correctly
