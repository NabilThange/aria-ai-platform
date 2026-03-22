# ARIA Development Guide - Docker Workflows

## 🎯 Quick Answer: Do I Need to Rebuild Docker Every Time?

**Short Answer:** YES for full Docker mode, but there's a MUCH FASTER way for development!

**Long Answer:** It depends on your workflow:

| Workflow | Code Changes | Rebuild Time | Best For |
|----------|--------------|--------------|----------|
| **Full Docker** | Requires rebuild | 5-10 minutes | Production testing, demos |
| **Hybrid Mode** | Auto-reload (no rebuild!) | Instant | Active development |
| **Selective Rebuild** | Rebuild only changed service | 2-3 minutes | Quick fixes |

---

## 🚀 Recommended Development Workflow (FASTEST)

### Hybrid Mode: Docker Infrastructure + Local Dev Servers

This is the FASTEST way to develop. You get instant hot-reload without rebuilding Docker images.

**Setup (One Time):**

```bash
# 1. Start ONLY infrastructure in Docker (postgres, redis, aria-desktop)
cd docker
docker-compose -f docker-compose.development.yml up -d

# This starts:
# ✅ aria-desktop (port 9990, 9867)
# ✅ postgres (port 5432)
# ✅ redis (port 6379)
# ❌ aria-agent (you'll run this locally)
# ❌ aria-ui (you'll run this locally)
```

**Daily Development (3 Terminals):**

```bash
# Terminal 1: Backend with hot reload
cd packages/aria-agent
npm run start:dev
# ✅ Changes reload automatically!
# ✅ TypeScript errors show immediately
# ✅ Runs on http://localhost:9991

# Terminal 2: Frontend with hot reload
cd packages/aria-ui
npm run dev
# ✅ Changes reload automatically!
# ✅ Fast Refresh for React components
# ✅ Runs on http://localhost:9992

# Terminal 3: Monitor Docker services (optional)
docker-compose -f docker/docker-compose.development.yml logs -f
```

**Benefits:**
- ✅ **Instant feedback** - Code changes reload in 1-2 seconds
- ✅ **No rebuilds** - Save 5-10 minutes per change
- ✅ **Full IDE support** - TypeScript errors, autocomplete, debugging
- ✅ **Same URLs** - http://localhost:9991 (agent), http://localhost:9992 (ui)
- ✅ **Real infrastructure** - Uses actual Postgres, Redis, Desktop in Docker

**When to Use:**
- Writing new features
- Fixing bugs
- Refactoring code
- Daily development work

---

## 🐳 Full Docker Mode (Production-Like)

Use this when you want to test the complete containerized stack.

**Start Everything:**

```bash
cd docker
docker-compose -f docker-compose.yml up -d
```

**When Code Changes:**

```bash
# Option A: Rebuild only the changed service (FASTER)
docker-compose -f docker-compose.yml build aria-agent  # If you changed backend
docker-compose -f docker-compose.yml build aria-ui     # If you changed frontend
docker-compose -f docker-compose.yml up -d             # Restart

# Option B: Rebuild everything (SLOWER)
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

**Rebuild Times:**
- aria-agent: ~3-4 minutes (multi-stage build, Prisma generation)
- aria-ui: ~2-3 minutes (Next.js build)
- aria-desktop: ~8-10 minutes (full Ubuntu desktop, Chromium, VSCode)

**When to Use:**
- Testing production builds
- Verifying Docker configuration
- Demos and presentations
- Before deploying to production

---

## 📊 Workflow Comparison

### Scenario 1: You Changed Backend Code (aria-agent)

**Hybrid Mode (Recommended):**
```bash
# Already running: npm run start:dev
# Just save the file → auto-reloads in 1-2 seconds ✅
```

**Full Docker Mode:**
```bash
docker-compose -f docker-compose.yml build aria-agent  # 3-4 minutes
docker-compose -f docker-compose.yml up -d             # 10 seconds
# Total: ~4 minutes ❌
```

### Scenario 2: You Changed Frontend Code (aria-ui)

**Hybrid Mode (Recommended):**
```bash
# Already running: npm run dev
# Just save the file → Fast Refresh in <1 second ✅
```

**Full Docker Mode:**
```bash
docker-compose -f docker-compose.yml build aria-ui  # 2-3 minutes
docker-compose -f docker-compose.yml up -d          # 10 seconds
# Total: ~3 minutes ❌
```

### Scenario 3: You Changed Dockerfile or Dependencies

**Must Use Full Docker Mode:**
```bash
docker-compose -f docker-compose.yml build aria-agent  # Required
docker-compose -f docker-compose.yml up -d
```

---

## 🔍 Health Checks & Debugging

### Check if Services are Running

```bash
# Frontend (aria-ui)
curl http://localhost:9992
# Expected: HTML response from Next.js

# Backend API (aria-agent)
curl http://localhost:9991/health
# Expected: {"status":"ok","timestamp":"2026-03-18T..."}

# Desktop VNC (aria-desktop)
curl http://localhost:9990
# Expected: noVNC HTML page

# PinchTab Browser Automation
curl http://localhost:9867/health
# Expected: {"status":"healthy"}

# Postgres Database
docker exec aria-postgres pg_isready
# Expected: /var/run/postgresql:5432 - accepting connections

# Redis Cache
docker exec aria-redis redis-cli ping
# Expected: PONG

# All containers status
docker-compose -f docker/docker-compose.yml ps
# Shows all 5 services with UP status
```

### View Logs

```bash
# All services (follow mode)
docker-compose -f docker/docker-compose.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.yml logs -f aria-agent
docker-compose -f docker/docker-compose.yml logs -f aria-ui
docker-compose -f docker/docker-compose.yml logs -f aria-desktop

# Last 50 lines only
docker logs aria-agent --tail 50

# Search logs for errors
docker logs aria-agent 2>&1 | grep -i error
```

### Common Issues

**Issue:** "Cannot connect to backend"
```bash
# Check if aria-agent is running
curl http://localhost:9991/health

# Check logs for errors
docker logs aria-agent --tail 50

# Restart the service
docker-compose -f docker/docker-compose.yml restart aria-agent
```

**Issue:** "Database connection failed"
```bash
# Check if Postgres is ready
docker exec aria-postgres pg_isready

# Run migrations
docker exec aria-agent npx prisma migrate deploy

# Check database logs
docker logs aria-postgres --tail 50
```

**Issue:** "Redis connection failed"
```bash
# Check if Redis is running
docker exec aria-redis redis-cli ping

# Restart Redis
docker-compose -f docker/docker-compose.yml restart redis
```

---

## 🛠️ Docker Commands Cheat Sheet

### Starting & Stopping

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Stop all services (keeps data)
docker-compose -f docker/docker-compose.yml down

# Stop and remove volumes (DELETES DATA!)
docker-compose -f docker/docker-compose.yml down -v

# Restart all services
docker-compose -f docker/docker-compose.yml restart

# Restart single service
docker-compose -f docker/docker-compose.yml restart aria-agent
```

### Building

```bash
# Build all images
docker-compose -f docker/docker-compose.yml build

# Build single image
docker-compose -f docker/docker-compose.yml build aria-agent

# Build without cache (clean build)
docker-compose -f docker/docker-compose.yml build --no-cache aria-agent

# Build and start
docker-compose -f docker/docker-compose.yml up -d --build
```

### Debugging

```bash
# Enter container shell
docker exec -it aria-agent sh
docker exec -it aria-ui sh
docker exec -it aria-desktop bash

# Run command in container
docker exec aria-agent npx prisma migrate deploy
docker exec aria-postgres psql -U postgres -d ariadb -c "SELECT * FROM \"Task\";"

# Copy files from container
docker cp aria-agent:/app/aria-agent/dist ./local-dist

# Inspect container
docker inspect aria-agent
```

### Cleanup

```bash
# Remove stopped containers
docker-compose -f docker/docker-compose.yml rm

# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Nuclear option: remove everything
docker system prune -a --volumes
```

---

## 📁 File Structure Reference

```
docker/
├── docker-compose.yml              # Full stack (all 5 services)
├── docker-compose.development.yml  # Infrastructure only (3 services)
├── .env                            # Your API keys (DO NOT COMMIT)
├── .env.example                    # Template for .env
├── README.md                       # Setup guide
├── DEVELOPMENT_GUIDE.md            # This file
├── DOCKER_FIXES_SUMMARY.md         # Changelog of fixes
├── SECURITY_NOTICE.md              # Security remediation
├── start-all.ps1                   # Windows startup script
└── start-all.sh                    # Linux/Mac startup script

packages/
├── aria-agent/
│   ├── Dockerfile                  # Backend container definition
│   ├── src/                        # Source code (hot reload in hybrid mode)
│   └── dist/                       # Built code (used in Docker)
├── aria-ui/
│   ├── Dockerfile                  # Frontend container definition
│   ├── src/                        # Source code (hot reload in hybrid mode)
│   └── .next/                      # Built code (used in Docker)
└── ariad/
    └── Dockerfile                  # Desktop container definition
```

---

## 🎓 Docker Concepts for Beginners

### What is a Docker Image?

A Docker image is like a **snapshot** of your application with all its dependencies. Think of it as a ZIP file containing:
- Your code
- Node.js runtime
- npm packages
- System libraries

**When you change code, you need to rebuild the image to create a new snapshot.**

### What is a Docker Container?

A container is a **running instance** of an image. Think of it as:
- Image = Program installer (e.g., chrome-installer.exe)
- Container = Running program (e.g., Chrome browser window)

### Why Rebuilding Takes Time?

When you run `docker-compose build aria-agent`, Docker:
1. Copies your code into the image
2. Runs `npm install` (downloads all packages)
3. Runs `npm run build` (compiles TypeScript)
4. Generates Prisma client
5. Creates the final image

**This is why hybrid mode is faster - it skips all this and just runs your code directly!**

### Docker Layer Caching

Docker caches each step (layer) of the build. If nothing changed in that step, it reuses the cached layer.

**Example:**
```dockerfile
COPY package.json ./        # Layer 1: Only rebuilds if package.json changed
RUN npm install             # Layer 2: Only rebuilds if Layer 1 changed
COPY src/ ./src/            # Layer 3: Rebuilds every time src/ changes
RUN npm run build           # Layer 4: Rebuilds if Layer 3 changed
```

**Tip:** Put files that change frequently (like src/) AFTER files that rarely change (like package.json).

---

## 🚦 Decision Tree: Which Mode Should I Use?

```
Are you actively writing code?
├─ YES → Use Hybrid Mode (docker-compose.development.yml + npm run dev)
│         ✅ Instant hot reload
│         ✅ No rebuilds needed
│
└─ NO → Are you testing the full stack?
    ├─ YES → Use Full Docker Mode (docker-compose.yml)
    │         ✅ Production-like environment
    │         ⚠️ Requires rebuild on code changes
    │
    └─ NO → Are you deploying to production?
              └─ Use Full Docker Mode with CI/CD
                  ✅ Automated builds
                  ✅ Consistent deployments
```

---

## 📚 Additional Resources

- **Docker Documentation:** https://docs.docker.com/
- **Docker Compose Reference:** https://docs.docker.com/compose/compose-file/
- **NestJS Hot Reload:** https://docs.nestjs.com/recipes/hot-reload
- **Next.js Fast Refresh:** https://nextjs.org/docs/architecture/fast-refresh

---

## 💡 Pro Tips

1. **Use hybrid mode for development** - Save hours of rebuild time
2. **Only rebuild what changed** - Don't rebuild all 5 services if you only changed one
3. **Use Docker layer caching** - Put frequently-changed files last in Dockerfile
4. **Monitor logs in real-time** - Use `docker-compose logs -f` to catch errors early
5. **Clean up regularly** - Run `docker system prune` to free disk space
6. **Use .dockerignore** - Exclude node_modules/ and dist/ from Docker context (faster builds)

---

**Questions?** Check the main README.md or ask in the project Discord/Slack!
