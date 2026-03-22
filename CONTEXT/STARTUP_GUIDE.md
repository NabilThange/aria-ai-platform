# 🚀 Aria Startup Guide

## 🎯 Quick Start (ONE COMMAND - RECOMMENDED!)

### Option A: Docker All-in-One (Easiest!)

**This starts EVERYTHING: Frontend, Backend, Database, Redis, Desktop!**

1. **Add your API keys** to `docker/.env`:
   ```env
   GOOGLE_API_KEY=your_key_here
   GROQ_API_KEY=your_key_here
   BYTEZ_API_KEY=your_key_here
   ```

2. **Start everything:**
   ```bash
   cd docker
   start-all.bat
   ```
   Or: `docker-compose -f docker-compose.yml up -d`

3. **Run migrations (FIRST TIME ONLY):**
   ```bash
   docker exec aria-agent npx prisma migrate deploy
   ```

4. **Open browser:** http://localhost:9992

**That's it!** All 5 services running in Docker Desktop under "aria" dropdown! 🎉

---

## Option B: Development Mode (3 Terminals)

**Use this if you're actively developing and need hot reload.**

### Terminal 1: Docker Services (Database + Desktop + PinchTab + Redis)

```bash
cd docker

# Build Aria Desktop (this takes 5-10 minutes the first time)
docker-compose -f docker-compose.yml build aria-desktop

# Start Docker services only (NOT backend/frontend)
docker-compose -f docker-compose.yml up postgres redis aria-desktop -d
```

**Note:** The first build will take several minutes as it installs all dependencies and builds the desktop environment.

**Verify:**
```bash
docker ps
# Should show:
# - aria-postgres (port 5432)
# - aria-redis (port 6379)
# - aria-desktop (ports 9990, 9867)

# Check Desktop
curl http://localhost:9990
# Should return HTML

# Check PinchTab health
curl http://localhost:9867/health
# Should return: {"status":"ok"}

# Check Redis health
docker exec aria-redis redis-cli ping
# Should return: PONG
```

### Terminal 2: Backend (Aria Agent)

**IMPORTANT:** Before starting the backend, ensure database migrations are applied (see "First Time Setup" section below).

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

### Error: Redis connection failed

**Problem:** Backend can't connect to Redis (required for multi-agent system).

**Solution:** 
1. Check if Redis is running: `docker ps | grep redis`
2. Test connection: `redis-cli ping` (should return PONG)
3. Restart if needed: `docker restart redis`
4. Check the REDIS_URL in `packages/aria-agent/.env`:
   ```
   REDIS_URL=redis://localhost:6379
   ```
5. If multi-agent is disabled, set `ENABLE_MULTI_AGENT=false` in .env

### Error: Database connection failed

**Problem:** Backend can't connect to PostgreSQL.

**Solution:** 
1. Check if postgres is running: `docker ps | grep aria-postgres`
2. Check if postgres is ready: `docker exec aria-postgres pg_isready`
3. Restart if needed: `docker restart aria-postgres`
4. Check the DATABASE_URL in `packages/aria-agent/.env`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
   ```

### Error: Database tables not found / Prisma errors

**Problem:** Backend crashes with "Table doesn't exist" or Prisma errors.

**Solution:** You forgot to run migrations! This happens after Docker factory reset.
```bash
cd packages/aria-agent
npx prisma migrate dev
```

**Verify tables exist:**
```bash
docker exec -it aria-postgres psql -U postgres -d ariadb -c "\dt"
```

### Error: Desktop not loading

**Problem:** Desktop tab shows connection error.

**Solution:**
1. Check if aria-desktop is running: `docker ps | grep aria-desktop`
2. Check logs: `docker logs aria-desktop --tail 50`
3. Restart: `docker restart aria-desktop`

### Error: PinchTab not responding

**Problem:** Web automation tasks fail or PinchTab health check fails.

**Solution:**
1. PinchTab runs inside aria-desktop container on port 9867
2. Check health: `curl http://localhost:9867/health`
3. Check logs: `docker logs aria-desktop --tail 50 | grep -i pinchtab`
4. Restart: `docker restart aria-desktop`

**If you get "Empty reply from server":**

This was a bug in the supervisord config that has been fixed. If you built the Docker image before this fix:

1. **Option A: Rebuild the Docker image (recommended)**
   ```bash
   cd docker
   docker-compose build aria-desktop
   docker-compose up -d aria-desktop
   ```

2. **Option B: Temporary fix (until next rebuild)**
   ```bash
   # Fix the config inside the running container
   docker exec aria-desktop sed -i 's/pinchtab serve --port 19867/pinchtab server/' /etc/supervisor/conf.d/supervisord.conf
   
   # Fix permissions
   docker exec aria-desktop chown -R user:user /home/user/.pinchtab
   
   # Restart container
   docker restart aria-desktop
   
   # Wait 15 seconds, then verify
   curl http://localhost:9867/health
   ```

**Note:** The fix is now permanent in the Dockerfile. New builds will work correctly.

### Error: Web tasks using screenshots instead of PinchTab

**Problem:** Web tasks are still using high token counts (10k+ per action).

**Solution:**
1. Verify PinchTab is healthy: `curl http://localhost:9867/health`
2. Check agent logs for PinchTab connection: `docker logs aria-agent | grep -i pinchtab`
3. Ensure task description contains web keywords (gmail, email, browser, http, etc.)
4. Restart aria-agent: `docker restart aria-agent`

## Environment Variables Checklist

### packages/aria-agent/.env
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb
GOOGLE_API_KEY=your_key_here
GROQ_API_KEY=your_key_here
BYTEZ_API_KEY=your_key_here
ARIA_DESKTOP_BASE_URL=http://localhost:9990
PINCHTAB_BASE_URL=http://localhost:9867
ARIA_ANALYTICS_ENDPOINT=

# Multi-Agent System (Optional - defaults to false)
ENABLE_MULTI_AGENT=false
REDIS_URL=redis://localhost:6379

# Telegram Notifications (Optional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

**Note:** When running via Docker Compose, use `http://pinchtab:9867` and `redis://redis:6379` instead of `localhost`.

### packages/aria-ui/.env
```env
ARIA_AGENT_BASE_URL=http://localhost:9991
ARIA_DESKTOP_VNC_URL=ws://localhost:9990/websockify
NEXT_PUBLIC_API_URL=http://localhost:9991
```

## Ports Reference

- **5432**: PostgreSQL Database
- **6379**: Redis (for multi-agent shared state)
- **9867**: PinchTab (Web automation service)
- **9990**: Aria Desktop (ariad + noVNC)
- **9991**: Aria Agent (Backend API)
- **9992**: Aria UI (Frontend)

## First Time Setup

If this is your first time running or after a Docker factory reset:

1. **Build Docker images:**
   ```bash
   cd docker
   docker-compose -f docker-compose.yml build aria-desktop
   ```
   
   This takes 5-10 minutes the first time.

2. **Start Docker services:**
   ```bash
   docker-compose -f docker-compose.yml up postgres redis aria-desktop -d
   ```

3. **Wait for PostgreSQL to be ready:**
   ```bash
   docker exec aria-postgres pg_isready
   # Should return: /var/run/postgresql:5432 - accepting connections
   ```

4. **Run database migrations (REQUIRED - DO NOT SKIP!):**
   ```bash
   cd packages/aria-agent
   npx prisma migrate dev
   ```
   
   This creates all the necessary tables in the `ariadb` database. Without this step, the backend will fail to start with database errors.

5. **Verify database setup:**
   ```bash
   docker exec -it aria-postgres psql -U postgres -d ariadb -c "\dt"
   # Should show tables: Task, Action, TaskLog, _prisma_migrations, etc.
   ```

6. **Clear Next.js cache (if needed):**
   ```bash
   cd packages/aria-ui
   rm -rf .next
   ```

## Access Points

- **UI Dashboard**: http://localhost:9992
- **Backend API**: http://localhost:9991
- **Desktop VNC**: http://localhost:9990
- **PinchTab API**: http://localhost:9867

## What is PinchTab?

PinchTab is a high-performance browser automation service that enables Aria to interact with web pages using **element references** instead of coordinate guessing. This provides:

- **90% token savings** (~800 tokens vs ~10,000 for screenshots)
- **99%+ accuracy** (element refs like "e5" never change)
- **3x faster execution** (2-3s vs 5-10s per action)
- **Stealth mode** to avoid detection on real websites

**When to use:** PinchTab automatically handles web tasks (Gmail, forms, search, etc.). Desktop tasks still use the traditional screenshot approach.

**Learn more:** See `PINCHTAB_INTEGRATION.md` for detailed documentation.

## Quick Commands

**Stop all services:**
```bash
# Stop Docker containers
cd docker
docker-compose -f docker-compose.yml down

# Or stop individually
docker stop aria-desktop aria-postgres aria-redis

# Stop Node processes (Ctrl+C in each terminal)
```

**View logs:**
```bash
# Docker logs
docker logs aria-desktop --tail 50
docker logs aria-postgres --tail 50
docker logs aria-redis --tail 50

# Or view all logs
cd docker
docker-compose -f docker-compose.yml logs -f

# Backend logs: Check Terminal 2
# Frontend logs: Check Terminal 3
```

**Restart everything:**
```bash
# Terminal 1
cd docker
docker-compose -f docker-compose.yml restart

# Or restart individually
docker restart aria-postgres aria-redis aria-desktop

# Terminal 2 (Ctrl+C then)
cd packages/aria-agent
npm run start:dev

# Terminal 3 (Ctrl+C then)
cd packages/aria-ui
npm run dev
```

**Test PinchTab:**
```bash
# Check health
curl http://localhost:9867/health

# Create a web task to test
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Navigate to google.com and take a screenshot",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'

# Monitor agent logs for PinchTab usage
docker logs aria-agent -f | grep -i pinchtab
```

**Test Redis:**
```bash
# Check connection
redis-cli ping

# View multi-agent state (when ENABLE_MULTI_AGENT=true)
redis-cli
> KEYS task:*
> GET task:{taskId}:status
> GET task:{taskId}:execution_plan
> GET task:{taskId}:action_history
```

**Test Multi-Agent System:**
```bash
# 1. Enable multi-agent in .env
echo "ENABLE_MULTI_AGENT=true" >> packages/aria-agent/.env

# 2. Restart backend
cd packages/aria-agent
npm run start:dev

# 3. Create a task via UI or API
# Watch for agent status updates in the UI!
```

---

## Multi-Agent System (Optional)

Aria now supports a sophisticated multi-agent orchestration system with 8 specialized agents:

- **ClarifierAgent**: Resolves user intent ambiguity
- **OrchestratorAgent**: Creates execution plans
- **WebAgent**: Executes web tasks via PinchTab
- **DesktopAgent**: Executes desktop tasks
- **PerceptionAgent**: Analyzes screenshots
- **VerifierAgent**: Validates action results
- **RecoveryAgent**: Generates alternative strategies on failure
- **ReporterAgent**: Creates summaries and sends notifications

**To enable:**
1. Set `ENABLE_MULTI_AGENT=true` in `packages/aria-agent/.env`
2. Ensure Redis is running: `docker ps | grep redis`
3. Restart the backend
4. Create a task and watch agent status updates in real-time!

**See:** `plan/TESTING-GUIDE.md` for detailed testing instructions.

---

**Note:** Keep all 3 terminals open while using Aria!
