# 🚀 ARIA Docker - One Command Setup

## ⚠️ SECURITY NOTICE

**IMPORTANT:** Your `.env` file contains sensitive API keys. 
- ✅ `.env` is now in `.gitignore` - never commit it to version control
- 🔄 If you previously committed `.env`, revoke and regenerate all API keys immediately:
  - Groq: https://console.groq.com/keys
  - Google: https://aistudio.google.com/app/apikey
  - Bytez: https://bytez.com

## Quick Start (Easiest Way!)

### 1️⃣ Add Your API Keys

Copy the example file and add your API keys:

```bash
cd docker
cp .env.example .env
# Now edit .env and add your actual keys
```

```env
GOOGLE_API_KEY=your_actual_key_here
GROQ_API_KEY=your_actual_key_here
BYTEZ_API_KEY=your_actual_key_here
```

### 2️⃣ Start Everything

**Windows:** Double-click `start-all.bat`

**Or run in terminal:**
```bash
cd docker
docker-compose -f docker-compose.yml up -d
```

### 3️⃣ Open ARIA

Go to: **http://localhost:9992**

That's it! All 5 services are running! 🎉

---

## What Gets Started?

When you run `start-all.bat`, Docker starts ALL these services:

| Service | Port | What It Does |
|---------|------|--------------|
| **aria-ui** | 9992 | Frontend (Next.js) - Open this in browser! |
| **aria-agent** | 9991 | Backend API (NestJS) |
| **aria-desktop** | 9990, 9867 | Ubuntu Desktop + PinchTab |
| **postgres** | 5432 | Database |
| **redis** | 6379 | Cache for multi-agent system |

---

## Docker Desktop View

After running `start-all.bat`, you'll see this in Docker Desktop:

```
📦 aria (dropdown)
  ├── aria-ui ✅
  ├── aria-agent ✅
  ├── aria-desktop ✅
  ├── postgres ✅
  └── redis ✅
```

Click the dropdown to see all services grouped together!

---

## First Time Setup

### Step 1: Add API Keys

Edit `docker/.env`:
```env
GOOGLE_API_KEY=AIzaSy...your_key
GROQ_API_KEY=gsk_...your_key
BYTEZ_API_KEY=sk-...your_key
```

### Step 2: Build & Start

```bash
cd docker
start-all.bat
.\start-all.bat [Batch File (For CMD or PowerShell)]
```

First build takes 5-10 minutes. Subsequent starts are instant!

### Step 3: Run Database Migrations (FIRST TIME ONLY!)

**Important:** After first start, you need to create database tables:

```bash
# Wait for containers to start (30 seconds)
# Then run migrations:
docker exec aria-agent npx prisma migrate deploy
```

Or if you prefer, run migrations from your host machine:
```bash
cd packages/aria-agent
npx prisma migrate deploy
```

---

## Common Commands

### Start Everything
```bash
cd docker
docker-compose -f docker-compose.yml up -d
```

### Stop Everything
```bash
cd docker
docker-compose -f docker-compose.yml down
```

### View Logs (All Services)
```bash
docker-compose -f docker-compose.yml logs -f
```

### View Logs (Single Service)
```bash
docker-compose -f docker-compose.yml logs -f aria-agent
```

### Restart Everything
```bash
docker-compose -f docker-compose.yml restart
```

### Check Status
```bash
docker-compose -f docker-compose.yml ps
```

### Rebuild After Code Changes
```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d
```

---

## Troubleshooting

### ❌ "Cannot connect to backend"

**Solution:** Wait 30 seconds for services to start, then refresh browser.

Check if backend is ready:
```bash
curl http://localhost:9991/health
```

### ❌ "Database connection failed"

**Solution:** Run migrations (first time only):
```bash
docker exec aria-agent npx prisma migrate deploy
```

### ❌ "Redis connection failed"

**Solution:** Check if Redis is running:
```bash
docker exec aria-redis redis-cli ping
# Should return: PONG
```

### ❌ "PinchTab not responding"

**Solution:** Check desktop container logs:
```bash
docker logs aria-desktop --tail 50
```

### ❌ Services not showing in Docker Desktop dropdown

**Solution:** Make sure you're using `docker-compose up` (not `docker run`):
```bash
cd docker
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml up -d
```

---

## Environment Variables

All configuration is in `docker/.env`:

### Required (Add your keys!)
- `GOOGLE_API_KEY` - Google Gemini API key
- `GROQ_API_KEY` - Groq API key  
- `BYTEZ_API_KEY` - Bytez API key (for Claude)

### Optional
- `ENABLE_MULTI_AGENT=true` - Enable multi-agent orchestration
- `TELEGRAM_BOT_TOKEN` - For notifications
- `TELEGRAM_CHAT_ID` - For notifications

### Auto-configured (Don't change)
- `DATABASE_URL` - Postgres connection
- `REDIS_URL` - Redis connection
- `ARIA_DESKTOP_BASE_URL` - Desktop service URL
- `PINCHTAB_BASE_URL` - PinchTab service URL

---

## Development vs Production

### Development (Current Setup)
- Uses `docker-compose.yml`
- Builds images from source
- Hot reload NOT enabled (need to rebuild after changes)
- Good for: Testing full stack locally

### Production
- Uses pre-built images from GitHub Container Registry
- Deployed on Railway or Kubernetes
- See: `helm/` directory for Kubernetes deployment

---

## Next Steps

1. ✅ Start services: `start-all.bat`
2. ✅ Open browser: http://localhost:9992
3. ✅ Create a task
4. ✅ Watch the AI work in real-time!

---

## 🔄 Development Workflow

**Important:** When you change code in `aria-agent` or `aria-ui`, you need to rebuild Docker images (takes 5-10 minutes).

**FASTER Alternative:** Use hybrid development mode where only infrastructure runs in Docker:

```bash
# Terminal 1: Start infrastructure (postgres, redis, desktop)
cd docker
docker-compose -f docker-compose.development.yml up -d

# Terminal 2: Run backend locally (hot reload!)
cd packages/aria-agent
npm run start:dev

# Terminal 3: Run frontend locally (hot reload!)
cd packages/aria-ui
npm run dev
```

**See `docker/DEVELOPMENT_GUIDE.md` for complete development workflows and Docker best practices.**

---

For more details, see: `CONTEXT/STARTUP_GUIDE.md` and `docker/DEVELOPMENT_GUIDE.md`
