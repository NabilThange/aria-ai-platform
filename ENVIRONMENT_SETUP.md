# ARIA Environment Configuration Guide

This guide explains how to configure ARIA for different deployment scenarios.

## Overview

ARIA supports two deployment modes:
1. **Local Development** - Backend and frontend run on host machine, Docker services in containers
2. **Full Docker** - All services run in Docker containers

## Environment Files

### Backend (aria-agent)
- `.env.local` - Local development (uses `localhost` for Docker services)
- `.env.docker` - Docker deployment (uses Docker service names)
- `.env` - Current active configuration (copy from `.env.local` or `.env.docker`)

### Frontend (aria-ui)
- `.env.local` - Local development (connects to `localhost:9991`)
- `.env.docker` - Docker deployment (connects to `aria-agent:9991`)
- `.env` - Current active configuration (copy from `.env.local` or `.env.docker`)

### Docker Compose
- `docker/.env` - API keys and configuration for docker-compose

## Setup Instructions

### Scenario 1: Local Development (Recommended)

**What runs where:**
- ✅ aria-agent: HOST MACHINE (npm run start:dev)
- ✅ aria-ui: HOST MACHINE (npm run dev)
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Setup:**

```bash
# 1. Start Docker services only
cd docker
docker-compose up postgres redis aria-desktop -d

# 2. Configure backend for local development
cd ../packages/aria-agent
cp .env.local .env

# 3. Run database migrations
npx prisma migrate dev
npx prisma generate

# 4. Start backend
npm run start:dev

# 5. Configure frontend for local development (new terminal)
cd ../aria-ui
cp .env.local .env

# 6. Start frontend
npm run dev
```

**Access:**
- Frontend: http://localhost:9992
- Backend API: http://localhost:9991
- Desktop VNC: http://localhost:9990

---

### Scenario 2: Full Docker Deployment

**What runs where:**
- 🐳 aria-agent: DOCKER
- 🐳 aria-ui: DOCKER
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Setup:**

```bash
# 1. Ensure API keys are in docker/.env
cd docker
# Edit .env file and add your API keys

# 2. Build and start all services
docker-compose up --build

# 3. Run database migrations (first time only)
docker exec aria-agent npx prisma migrate deploy
docker exec aria-agent npx prisma generate
```

**Access:**
- Frontend: http://localhost:9992
- Backend API: http://localhost:9991
- Desktop VNC: http://localhost:9990

---

### Scenario 3: Mixed Mode (UI in Docker, Agent on Host)

**What runs where:**
- ✅ aria-agent: HOST MACHINE
- 🐳 aria-ui: DOCKER
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Setup:**

```bash
# 1. Start Docker services (including UI)
cd docker
docker-compose up postgres redis aria-desktop aria-ui -d

# 2. Configure backend for local development
cd ../packages/aria-agent
cp .env.local .env

# 3. Start backend on host
npm run start:dev
```

**Note:** The UI container will connect to `localhost:9991` which maps to your host machine.

---

## Environment Variables Reference

### Backend (aria-agent)

| Variable | Local Value | Docker Value | Description |
|----------|-------------|--------------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/ariadb` | `postgresql://postgres:postgres@postgres:5432/ariadb` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` | Redis connection |
| `ARIA_DESKTOP_BASE_URL` | `http://localhost:9990` | `http://aria-desktop:9990` | Desktop service URL |
| `PINCHTAB_BASE_URL` | `http://localhost:9867` | `http://aria-desktop:9867` | PinchTab service URL |
| `ENABLE_MULTI_AGENT` | `true` | `true` | Enable multi-agent system |
| `PORT` | `9991` | `9991` | Backend server port |

### Frontend (aria-ui)

| Variable | Local Value | Docker Value | Description |
|----------|-------------|--------------|-------------|
| `ARIA_AGENT_BASE_URL` | `http://localhost:9991` | `http://aria-agent:9991` | Backend API URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:9991` | `http://aria-agent:9991` | Public API URL (Socket.io) |
| `ARIA_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | `ws://aria-desktop:9990/websockify` | VNC WebSocket URL |
| `NEXT_PUBLIC_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | `ws://aria-desktop:9990/websockify` | Public VNC URL |

## Troubleshooting

### aria-agent fails to connect to services in Docker

**Symptom:** Connection refused errors for postgres, redis, or aria-desktop

**Solution:** Make sure you're using the correct `.env` file:
- Local development: `cp .env.local .env`
- Docker deployment: Environment variables are injected by docker-compose

### aria-ui can't connect to backend

**Symptom:** API calls fail, Socket.io disconnects

**Solution:** Check that `ARIA_AGENT_BASE_URL` matches your deployment:
- Local: `http://localhost:9991`
- Docker: `http://aria-agent:9991`

### VNC viewer shows connection error

**Symptom:** Desktop viewer fails to connect

**Solution:** Verify `ARIA_DESKTOP_VNC_URL`:
- Local: `ws://localhost:9990/websockify`
- Docker: `ws://aria-desktop:9990/websockify`

### Docker containers can't reach each other

**Symptom:** Services timeout when connecting to other containers

**Solution:** 
1. Ensure all services are on the same Docker network (`aria-network`)
2. Use Docker service names (not `localhost`) in environment variables
3. Check `docker-compose ps` to verify all containers are running

## Quick Reference

### Switch to Local Development
```bash
cd packages/aria-agent && cp .env.local .env
cd ../aria-ui && cp .env.local .env
```

### Switch to Docker Deployment
```bash
# No need to copy - docker-compose injects variables automatically
cd docker && docker-compose up --build
```

### View Current Configuration
```bash
# Backend
cat packages/aria-agent/.env

# Frontend
cat packages/aria-ui/.env

# Docker
cat docker/.env
```

## Best Practices

1. **Never commit `.env` files** - They contain sensitive API keys
2. **Use `.env.local` for development** - Faster iteration with hot reload
3. **Use Docker for production** - Consistent deployment environment
4. **Keep `docker/.env` updated** - Ensure API keys are current
5. **Run migrations after switching modes** - Database schema must be up to date

## Next Steps

After configuring your environment:
1. Follow the [Development Setup Guide](CONTEXT/STARTUP_GUIDE.md)
2. Read the [Architecture Documentation](CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md)
3. Explore [Pre-built Workflows](workflows/README.md)
