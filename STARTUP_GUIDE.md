# 🚀 Aria Startup Guide

## Quick Start (3 Terminals Required)

### Terminal 1: Docker Services (Database + Desktop)

```bash
# Start PostgreSQL
cd docker
docker-compose -f docker-compose.yml up postgres -d

# Build Aria Desktop (this takes 5-10 minutes the first time)
docker-compose -f docker-compose.core.yml build aria-desktop

# Start Aria Desktop
docker-compose -f docker-compose.core.yml up aria-desktop -d
```

**Note:** The first build will take several minutes as it installs all dependencies and builds the desktop environment.

**Verify:**
```bash
docker ps
# Should show:
# - aria-postgres (port 5432)
# - aria-desktop (port 9990)
```

### Terminal 2: Backend (Aria Agent)

```bash
cd packages/aria-agent
npm run start:dev
```

**Expected output:**
```
[Nest] INFO [NestApplication] Nest application successfully started
[Nest] INFO Listening on port 9991
```

### Terminal 3: Frontend (Aria UI)

```bash
cd packages/aria-ui
npm run dev
```

**Expected output:**
```
Ready on http://localhost:9992
```

## Troubleshooting

### Error: ECONNREFUSED on port 9991

**Problem:** The UI can't connect to the backend.

**Solution:** Make sure Terminal 2 (aria-agent) is running and shows "Listening on port 9991"

### Error: Database connection failed

**Problem:** Backend can't connect to PostgreSQL.

**Solution:** 
1. Check if postgres is running: `docker ps | grep aria-postgres`
2. Restart if needed: `docker restart aria-postgres`
3. Check the DATABASE_URL in `packages/aria-agent/.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
   ```

### Error: Desktop not loading

**Problem:** Desktop tab shows connection error.

**Solution:**
1. Check if aria-desktop is running: `docker ps | grep aria-desktop`
2. Check logs: `docker logs aria-desktop --tail 50`
3. Restart: `docker restart aria-desktop`

## Environment Variables Checklist

### packages/aria-agent/.env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
GOOGLE_API_KEY=your_key_here
ARIA_DESKTOP_BASE_URL=http://localhost:9990
ARIA_ANALYTICS_ENDPOINT=
```

### packages/aria-ui/.env
```env
ARIA_AGENT_BASE_URL=http://localhost:9991
ARIA_DESKTOP_VNC_URL=ws://localhost:9990/websockify
NEXT_PUBLIC_API_URL=http://localhost:9991
```

## Ports Reference

- **9990**: Aria Desktop (ariad + noVNC)
- **9991**: Aria Agent (Backend API)
- **9992**: Aria UI (Frontend)
- **5432**: PostgreSQL Database

## First Time Setup

If this is your first time running after the rebrand:

1. **Run database migrations (REQUIRED):**
   ```bash
   cd packages/aria-agent
   npx prisma migrate dev
   ```
   
   This creates all the necessary tables in the `ariadb` database.

2. **Rebuild Docker images:**
   ```bash
   cd docker
   docker-compose -f docker-compose.core.yml build aria-desktop
   ```

3. **Clear Next.js cache:**
   ```bash
   cd packages/aria-ui
   rm -rf .next
   ```

## Access Points

- **UI Dashboard**: http://localhost:9992
- **Backend API**: http://localhost:9991
- **Desktop VNC**: http://localhost:9990

## Quick Commands

**Stop all services:**
```bash
# Stop Docker containers
docker stop aria-desktop aria-postgres

# Stop Node processes (Ctrl+C in each terminal)
```

**View logs:**
```bash
# Docker logs
docker logs aria-desktop --tail 50
docker logs aria-postgres --tail 50

# Backend logs: Check Terminal 2
# Frontend logs: Check Terminal 3
```

**Restart everything:**
```bash
# Terminal 1
docker restart aria-postgres aria-desktop

# Terminal 2 (Ctrl+C then)
cd packages/aria-agent
npm run start:dev

# Terminal 3 (Ctrl+C then)
cd packages/aria-ui
npm run dev
```

---

**Note:** Keep all 3 terminals open while using Aria!
