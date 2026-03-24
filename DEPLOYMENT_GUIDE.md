# 🚀 ARIA Deployment Guide - Hybrid Free Forever Setup

**Target Audience:** Developer responsible for deployment (NO code changes required)

**Deployment Strategy:** Hybrid approach with 100% free forever hosting
- ✅ Frontend (aria-ui) → Vercel
- ✅ Database → Railway.com or Supabase
- ✅ Redis → Upstash or Railway.com
- ✅ Backend (aria-agent) + Desktop (aria-desktop) → Local machine with Cloudflare Tunnel

---

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] GitHub account
- [ ] Vercel account (sign up at vercel.com)
- [ ] Railway account (sign up at railway.app) OR Supabase + Upstash accounts
- [ ] Cloudflare account (for tunnels - sign up at cloudflare.com)
- [ ] Access to the ARIA project codebase
- [ ] Windows machine that can stay online (for backend + desktop)
- [ ] Docker Desktop installed on Windows
- [ ] Node.js 18+ installed
- [ ] Git installed

---

## 🗂️ Project Structure Overview

```
Aria/
├── packages/
│   ├── aria-ui/          ← Frontend (Next.js) - Deploy to Vercel
│   ├── aria-agent/       ← Backend (NestJS) - Run locally with tunnel
│   ├── ariad/            ← Desktop service - Run locally in Docker
│   └── shared/           ← Shared utilities
├── docker/
│   ├── docker-compose.yml
│   └── .env              ← Docker environment variables
├── DEPLOYMENT_GUIDE.md   ← This file
└── .github/
    └── workflows/        ← CI/CD pipelines (optional)
```

---

## 📝 Deployment Steps Overview

1. **Phase 1:** Create GitHub Repository
2. **Phase 2:** Deploy Database & Redis (Cloud)
3. **Phase 3:** Deploy Frontend to Vercel
4. **Phase 4:** Setup Local Backend + Desktop with Cloudflare Tunnel
5. **Phase 5:** Connect Everything & Test

---


## PHASE 1: Create GitHub Repository

### Step 1.1: Prepare the Codebase

**Location:** `C:\Users\thang\Projects\Aria\Aria\`

```bash
# Open terminal in project root
cd C:\Users\thang\Projects\Aria\Aria

# Check current git status
git status
```

### Step 1.2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `aria-ai-platform` (or your preferred name)
3. Description: "ARIA - AI Desktop Agent Platform"
4. Visibility: **Public** (required for free Vercel hosting)
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 1.3: Push to GitHub

```bash
# If this is a new git repo, initialize it
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ARIA platform"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/aria-ai-platform.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**✅ Checkpoint:** Verify your code is visible on GitHub at `https://github.com/YOUR_USERNAME/aria-ai-platform`

---


## PHASE 2: Deploy Database & Redis (Cloud)

**Choose ONE option below:**

---

### OPTION A: Railway.com (Easiest - All in One Place)

#### Step 2A.1: Create Railway Project

1. Go to https://railway.app
2. Click "Start a New Project"
3. Click "Deploy from GitHub repo" → Skip for now
4. Click "Empty Project"
5. Name it: `aria-infrastructure`

#### Step 2A.2: Add PostgreSQL Database

1. In your Railway project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Wait for deployment (30 seconds)
4. Click on the PostgreSQL service
5. Go to "Variables" tab
6. Copy these values (you'll need them later):
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

**Construct your DATABASE_URL:**
```
postgresql://PGUSER:PGPASSWORD@PGHOST:PGPORT/PGDATABASE
```

Example:
```
postgresql://postgres:abc123xyz@roundhouse.proxy.rlwy.net:12345/railway
```

**Save this URL - you'll need it in Phase 3 & 4**

#### Step 2A.3: Add Redis

1. In the same Railway project, click "+ New"
2. Select "Database" → "Add Redis"
3. Wait for deployment (30 seconds)
4. Click on the Redis service
5. Go to "Variables" tab
6. Copy the `REDIS_URL` value

Example:
```
redis://default:abc123xyz@redis.railway.internal:6379
```

**Save this URL - you'll need it in Phase 3 & 4**

**✅ Checkpoint:** You should have 2 services running in Railway: PostgreSQL and Redis

---

### OPTION B: Separate Services (More Reliable Long-term)

#### Step 2B.1: Deploy PostgreSQL on Supabase

1. Go to https://supabase.com
2. Click "Start your project"
3. Create new organization (if needed)
4. Click "New project"
   - Name: `aria-database`
   - Database Password: Generate a strong password (SAVE THIS!)
   - Region: Choose closest to you
   - Plan: Free
5. Click "Create new project" (takes 2-3 minutes)
6. Once ready, go to "Settings" → "Database"
7. Scroll to "Connection string" → "URI"
8. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abc123xyz.supabase.co:5432/postgres
   ```
9. Replace `[YOUR-PASSWORD]` with the password you saved earlier

**Save this DATABASE_URL - you'll need it in Phase 3 & 4**

#### Step 2B.2: Deploy Redis on Upstash

1. Go to https://upstash.com
2. Click "Get Started"
3. Sign in with GitHub
4. Click "Create Database"
   - Name: `aria-redis`
   - Type: Regional
   - Region: Choose closest to you
   - TLS: Enabled
5. Click "Create"
6. Once created, click on your database
7. Scroll to "REST API" section
8. Copy the "UPSTASH_REDIS_REST_URL"

**For traditional Redis connection:**
- Go to "Details" tab
- Copy "Endpoint" and "Password"
- Construct URL:
  ```
  redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:6379
  ```

Example:
```
redis://default:abc123xyz@us1-merry-firefly-12345.upstash.io:6379
```

**Save this REDIS_URL - you'll need it in Phase 3 & 4**

**✅ Checkpoint:** You should have PostgreSQL on Supabase and Redis on Upstash

---


## PHASE 3: Deploy Frontend to Vercel

### Step 3.1: Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository: `aria-ai-platform`
4. Click "Import"

### Step 3.2: Configure Build Settings

**Framework Preset:** Next.js (should auto-detect)

**Root Directory:** `packages/aria-ui` ⚠️ IMPORTANT!
- Click "Edit" next to Root Directory
- Type: `packages/aria-ui`
- This tells Vercel where the Next.js app is located

**Build Command:** (leave default)
```
npm run build
```

**Output Directory:** (leave default)
```
.next
```

**Install Command:** (leave default)
```
npm install
```

### Step 3.3: Add Environment Variables

**⚠️ IMPORTANT:** Do NOT click "Deploy" yet! First add environment variables.

Click "Environment Variables" section and add these:

**Temporary placeholders (we'll update these in Phase 4):**

| Name | Value | Notes |
|------|-------|-------|
| `ARIA_AGENT_BASE_URL` | `http://localhost:9991` | Temporary - will update in Phase 4 |
| `NEXT_PUBLIC_API_URL` | `http://localhost:9991` | Temporary - will update in Phase 4 |
| `ARIA_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | Temporary - will update in Phase 4 |
| `NEXT_PUBLIC_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | Temporary - will update in Phase 4 |

**How to add:**
1. Type variable name in "Key" field
2. Type value in "Value" field
3. Click "Add"
4. Repeat for all 4 variables

### Step 3.4: Deploy

1. Click "Deploy"
2. Wait 2-5 minutes for build to complete
3. Once deployed, you'll see "Congratulations!" screen
4. Click "Visit" to see your deployed frontend

**Save your Vercel URL:** `https://your-project-name.vercel.app`

**✅ Checkpoint:** Frontend is deployed but won't work yet (backend not connected)

---


## PHASE 4: Setup Local Backend + Desktop with Cloudflare Tunnel

### Step 4.1: Install Cloudflare Tunnel (cloudflared)

**On Windows:**

**Option A: Using winget (Recommended)**
```bash
winget install --id Cloudflare.cloudflared
```

**Option B: Manual Download**
1. Go to https://github.com/cloudflare/cloudflared/releases
2. Download `cloudflared-windows-amd64.exe`
3. Rename to `cloudflared.exe`
4. Move to `C:\Windows\System32\` (or add to PATH)

**Verify installation:**
```bash
cloudflared --version
```

### Step 4.2: Configure Backend Environment Variables

**Location:** `C:\Users\thang\Projects\Aria\Aria\packages\aria-agent\.env`

**Action:** Update the `.env` file with cloud database URLs from Phase 2

**File path:** `packages/aria-agent/.env`

**Update these lines:**

```env
# Replace with your DATABASE_URL from Phase 2
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_HOST:5432/YOUR_DB

# Replace with your REDIS_URL from Phase 2
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_HOST:6379

# Keep these as localhost (desktop runs locally)
ARIA_DESKTOP_BASE_URL=http://localhost:9990
PINCHTAB_BASE_URL=http://localhost:9867

# Keep your existing API keys (DO NOT CHANGE)
GROQ_API_KEY_1=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
GROQ_API_KEY_2=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
# ... (keep all existing keys)

# Keep these settings
ENABLE_MULTI_AGENT=true
AUTO_APPROVE_PLAN=false
PINCHTAB_HEADED_MODE=true
```

**Example with Railway PostgreSQL:**
```env
DATABASE_URL=postgresql://postgres:abc123xyz@roundhouse.proxy.rlwy.net:12345/railway
REDIS_URL=redis://default:xyz789abc@redis.railway.internal:6379
```

**Example with Supabase + Upstash:**
```env
DATABASE_URL=postgresql://postgres:mypassword@db.abc123xyz.supabase.co:5432/postgres
REDIS_URL=redis://default:mypassword@us1-merry-firefly-12345.upstash.io:6379
```

### Step 4.3: Run Database Migrations

**Location:** `C:\Users\thang\Projects\Aria\Aria\packages\aria-agent\`

```bash
# Navigate to backend directory
cd C:\Users\thang\Projects\Aria\Aria\packages\aria-agent

# Install dependencies (if not already done)
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
```

**Expected output:**
```
✔ Generated Prisma Client
✔ Applied 5 migrations
```

**✅ Checkpoint:** Database tables are created in your cloud database

---


### Step 4.4: Start Local Services

You'll need **4 terminal windows** open simultaneously. Keep them running.

#### Terminal 1: Start Desktop Container (Docker)

```bash
# Navigate to docker directory
cd C:\Users\thang\Projects\Aria\Aria\docker

# Start only the desktop container
docker-compose -f docker-compose.core.yml up aria-desktop -d

# Verify it's running
docker ps
```

**Expected output:**
```
CONTAINER ID   IMAGE              STATUS         PORTS
abc123xyz      aria-desktop:local Up 30 seconds  0.0.0.0:9990->9990/tcp, 0.0.0.0:9867->9867/tcp
```

**✅ Checkpoint:** Desktop container is running
- VNC accessible at: http://localhost:9990
- PinchTab accessible at: http://localhost:9867

#### Terminal 2: Start Backend (Node.js)

```bash
# Navigate to backend directory
cd C:\Users\thang\Projects\Aria\Aria\packages\aria-agent

# Start backend in development mode
npm run start:dev
```

**Expected output:**
```
[Nest] 12345  - LOG [NestFactory] Starting Nest application...
[Nest] 12345  - LOG [InstanceLoader] AppModule dependencies initialized
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
[Nest] 12345  - LOG Application is running on: http://localhost:9991
```

**✅ Checkpoint:** Backend is running at http://localhost:9991

**Test it:**
```bash
# In a new terminal
curl http://localhost:9991/health
```

Should return: `{"status":"ok"}`

#### Terminal 3: Create Cloudflare Tunnel for Backend

```bash
# Create tunnel for backend API
cloudflared tunnel --url http://localhost:9991
```

**Expected output:**
```
2024-03-24T10:30:45Z INF +--------------------------------------------------------------------------------------------+
2024-03-24T10:30:45Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2024-03-24T10:30:45Z INF |  https://abc-123-xyz.trycloudflare.com                                                     |
2024-03-24T10:30:45Z INF +--------------------------------------------------------------------------------------------+
```

**⚠️ IMPORTANT:** Copy this URL! You'll need it in Step 4.6

**Example:** `https://abc-123-xyz.trycloudflare.com`

**Save as:** `BACKEND_TUNNEL_URL`

#### Terminal 4: Create Cloudflare Tunnel for Desktop

```bash
# Create tunnel for desktop VNC
cloudflared tunnel --url http://localhost:9990
```

**Expected output:**
```
2024-03-24T10:31:15Z INF +--------------------------------------------------------------------------------------------+
2024-03-24T10:31:15Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable): |
2024-03-24T10:31:15Z INF |  https://def-456-uvw.trycloudflare.com                                                     |
2024-03-24T10:31:15Z INF +--------------------------------------------------------------------------------------------+
```

**⚠️ IMPORTANT:** Copy this URL! You'll need it in Step 4.6

**Example:** `https://def-456-uvw.trycloudflare.com`

**Save as:** `DESKTOP_TUNNEL_URL`

**✅ Checkpoint:** All 4 terminals are running:
1. Docker Desktop container
2. Backend API (npm run start:dev)
3. Cloudflare tunnel for backend
4. Cloudflare tunnel for desktop

**⚠️ DO NOT CLOSE THESE TERMINALS - Keep them running!**

---


### Step 4.5: Test Tunnel Connections

**Test Backend Tunnel:**
```bash
# In a new terminal
curl https://abc-123-xyz.trycloudflare.com/health
```

Should return: `{"status":"ok"}`

**Test Desktop Tunnel:**
Open in browser: `https://def-456-uvw.trycloudflare.com`

You should see the Ubuntu desktop with noVNC interface.

**✅ Checkpoint:** Both tunnels are publicly accessible

### Step 4.6: Update Vercel Environment Variables

Now that you have the tunnel URLs, update Vercel to connect to your local services.

1. Go to https://vercel.com/dashboard
2. Click on your project: `aria-ai-platform`
3. Go to "Settings" → "Environment Variables"
4. Update these 4 variables:

**Update each variable:**

| Variable Name | New Value | Example |
|---------------|-----------|---------|
| `ARIA_AGENT_BASE_URL` | Your BACKEND_TUNNEL_URL | `https://abc-123-xyz.trycloudflare.com` |
| `NEXT_PUBLIC_API_URL` | Your BACKEND_TUNNEL_URL | `https://abc-123-xyz.trycloudflare.com` |
| `ARIA_DESKTOP_VNC_URL` | Your DESKTOP_TUNNEL_URL + `/websockify` | `wss://def-456-uvw.trycloudflare.com/websockify` |
| `NEXT_PUBLIC_DESKTOP_VNC_URL` | Your DESKTOP_TUNNEL_URL + `/websockify` | `wss://def-456-uvw.trycloudflare.com/websockify` |

**⚠️ IMPORTANT NOTES:**
- For `ARIA_DESKTOP_VNC_URL` and `NEXT_PUBLIC_DESKTOP_VNC_URL`:
  - Change `https://` to `wss://` (WebSocket Secure)
  - Add `/websockify` at the end
- Example: `https://def-456-uvw.trycloudflare.com` becomes `wss://def-456-uvw.trycloudflare.com/websockify`

**How to update:**
1. Click the "⋮" menu next to each variable
2. Click "Edit"
3. Paste the new value
4. Click "Save"

### Step 4.7: Redeploy Vercel

After updating environment variables:

1. Go to "Deployments" tab
2. Click "⋮" menu on the latest deployment
3. Click "Redeploy"
4. Wait 2-3 minutes for redeployment

**✅ Checkpoint:** Vercel is redeployed with new tunnel URLs

---


## PHASE 5: Connect Everything & Test

### Step 5.1: Test Complete System

1. **Open your Vercel URL in browser:**
   - Example: `https://aria-ai-platform.vercel.app`

2. **You should see the ARIA landing page**

3. **Create a test task:**
   - Click "Get Started" or "Dashboard"
   - Click "New Task" or "Create Task"
   - Enter a simple task: "Search Google for 'AI agents'"
   - Click "Create" or "Submit"

4. **Watch the task execute:**
   - You should see agent messages appearing
   - The desktop viewer should show the Ubuntu desktop
   - The AI should start working on the task

**✅ Success Indicators:**
- ✅ Frontend loads without errors
- ✅ Task is created successfully
- ✅ Agent messages appear in real-time
- ✅ Desktop viewer shows Ubuntu desktop
- ✅ Task completes successfully

### Step 5.2: Troubleshooting

#### Problem: "Cannot connect to backend"

**Solution:**
1. Check Terminal 2 (backend) - is it still running?
2. Check Terminal 3 (backend tunnel) - is it still running?
3. Test backend tunnel: `curl https://your-backend-tunnel.trycloudflare.com/health`
4. Check Vercel environment variables - are they correct?

#### Problem: "Desktop viewer not loading"

**Solution:**
1. Check Terminal 1 (Docker) - is container running? `docker ps`
2. Check Terminal 4 (desktop tunnel) - is it still running?
3. Test desktop tunnel in browser: `https://your-desktop-tunnel.trycloudflare.com`
4. Check Vercel environment variables - is `ARIA_DESKTOP_VNC_URL` using `wss://` and `/websockify`?

#### Problem: "Database connection error"

**Solution:**
1. Check `packages/aria-agent/.env` - is `DATABASE_URL` correct?
2. Test database connection:
   ```bash
   cd packages/aria-agent
   npx prisma db pull
   ```
3. If Railway: Check if database is still running in Railway dashboard
4. If Supabase: Check if project is paused (free tier pauses after inactivity)

#### Problem: "Redis connection error"

**Solution:**
1. Check `packages/aria-agent/.env` - is `REDIS_URL` correct?
2. If Railway: Check if Redis is running in Railway dashboard
3. If Upstash: Check if database is active in Upstash dashboard

#### Problem: "Tunnel URL changed after restart"

**Explanation:** Free Cloudflare tunnels generate new URLs each time you restart.

**Solution:** Use named tunnels (see Phase 6 - Optional Improvements)

---


## PHASE 6: Optional Improvements (Persistent Tunnel URLs)

### Why Named Tunnels?

**Problem:** Quick tunnels (`cloudflared tunnel --url`) generate random URLs that change every restart.

**Solution:** Named tunnels give you permanent URLs that never change.

### Step 6.1: Login to Cloudflare

```bash
cloudflared tunnel login
```

This will:
1. Open browser to Cloudflare login
2. Ask you to select a domain (or create free subdomain)
3. Download credentials to your machine

### Step 6.2: Create Named Tunnels

```bash
# Create tunnel for backend
cloudflared tunnel create aria-backend

# Create tunnel for desktop
cloudflared tunnel create aria-desktop
```

**Output:**
```
Created tunnel aria-backend with id abc-123-xyz
Credentials written to: C:\Users\thang\.cloudflared\abc-123-xyz.json
```

**Save the tunnel IDs!**

### Step 6.3: Create DNS Records

**For Backend:**
```bash
cloudflared tunnel route dns aria-backend backend.yourdomain.com
```

**For Desktop:**
```bash
cloudflared tunnel route dns aria-desktop desktop.yourdomain.com
```

**Note:** Replace `yourdomain.com` with your actual domain or use Cloudflare's free subdomain.

### Step 6.4: Create Configuration File

**Location:** `C:\Users\thang\.cloudflared\config.yml`

**Create this file:**

```yaml
# Backend tunnel
tunnel: abc-123-xyz
credentials-file: C:\Users\thang\.cloudflared\abc-123-xyz.json

ingress:
  - hostname: backend.yourdomain.com
    service: http://localhost:9991
  - service: http_status:404

---

# Desktop tunnel (separate config)
tunnel: def-456-uvw
credentials-file: C:\Users\thang\.cloudflared\def-456-uvw.json

ingress:
  - hostname: desktop.yourdomain.com
    service: http://localhost:9990
  - service: http_status:404
```

### Step 6.5: Run Named Tunnels

**Terminal 3 (Backend Tunnel):**
```bash
cloudflared tunnel --config C:\Users\thang\.cloudflared\config-backend.yml run aria-backend
```

**Terminal 4 (Desktop Tunnel):**
```bash
cloudflared tunnel --config C:\Users\thang\.cloudflared\config-desktop.yml run aria-desktop
```

### Step 6.6: Update Vercel Environment Variables

Update with your permanent URLs:

| Variable | Value |
|----------|-------|
| `ARIA_AGENT_BASE_URL` | `https://backend.yourdomain.com` |
| `NEXT_PUBLIC_API_URL` | `https://backend.yourdomain.com` |
| `ARIA_DESKTOP_VNC_URL` | `wss://desktop.yourdomain.com/websockify` |
| `NEXT_PUBLIC_DESKTOP_VNC_URL` | `wss://desktop.yourdomain.com/websockify` |

**✅ Benefit:** These URLs never change, even after restart!

---


## PHASE 7: Daily Operations

### Starting the System

**Every time you want to run ARIA, follow these steps:**

#### Step 1: Start Docker Desktop
- Open Docker Desktop application
- Wait for it to fully start

#### Step 2: Start Desktop Container
```bash
cd C:\Users\thang\Projects\Aria\Aria\docker
docker-compose -f docker-compose.core.yml up aria-desktop -d
```

#### Step 3: Start Backend
```bash
cd C:\Users\thang\Projects\Aria\Aria\packages\aria-agent
npm run start:dev
```

#### Step 4: Start Tunnels

**Quick Tunnels (URLs change each time):**
```bash
# Terminal 3
cloudflared tunnel --url http://localhost:9991

# Terminal 4
cloudflared tunnel --url http://localhost:9990
```

**Then update Vercel environment variables with new URLs and redeploy.**

**OR**

**Named Tunnels (URLs stay the same):**
```bash
# Terminal 3
cloudflared tunnel run aria-backend

# Terminal 4
cloudflared tunnel run aria-desktop
```

**No need to update Vercel - URLs are permanent!**

### Stopping the System

**To stop everything:**

1. **Stop tunnels:** Press `Ctrl+C` in Terminal 3 and 4
2. **Stop backend:** Press `Ctrl+C` in Terminal 2
3. **Stop Docker:**
   ```bash
   cd C:\Users\thang\Projects\Aria\Aria\docker
   docker-compose -f docker-compose.core.yml down
   ```

### Monitoring

**Check if services are running:**

```bash
# Check Docker containers
docker ps

# Check backend health
curl http://localhost:9991/health

# Check desktop
curl http://localhost:9990

# Check backend tunnel
curl https://your-backend-tunnel.trycloudflare.com/health
```

**View logs:**

```bash
# Backend logs (Terminal 2 shows live logs)

# Docker logs
docker logs aria-desktop --tail 50 -f

# Database logs (if Railway)
# Go to Railway dashboard → PostgreSQL → Logs
```

---


## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS (Internet)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Vercel (Free) │
                    │   aria-ui      │
                    │  (Next.js)     │
                    └────────┬───────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
    ┌───────────────────┐     ┌──────────────────┐
    │ Cloudflare Tunnel │     │ Cloudflare Tunnel│
    │   (Backend)       │     │   (Desktop)      │
    └─────────┬─────────┘     └────────┬─────────┘
              │                        │
              ▼                        ▼
    ┌─────────────────┐      ┌─────────────────┐
    │  Your PC        │      │  Your PC        │
    │  aria-agent     │      │  aria-desktop   │
    │  (NestJS)       │      │  (Docker)       │
    │  Port 9991      │      │  Port 9990      │
    └────┬────────────┘      └─────────────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌────────────────┐  ┌──────────────┐
│ Railway/       │  │ Upstash/     │
│ Supabase       │  │ Railway      │
│ PostgreSQL     │  │ Redis        │
│ (Free)         │  │ (Free)       │
└────────────────┘  └──────────────┘
```

**Data Flow:**
1. User visits `https://your-project.vercel.app`
2. Vercel serves Next.js frontend
3. Frontend connects to backend via Cloudflare tunnel
4. Backend processes requests, talks to database/Redis
5. Backend controls desktop via local connection
6. Desktop viewer streams VNC via Cloudflare tunnel

---


## 🔐 Security Considerations

### API Keys

**⚠️ NEVER commit API keys to GitHub!**

**Current API keys in `.env` files:**
- Groq API keys (20+ keys)
- Google API keys (5+ keys)
- Bytez API keys (20+ keys)

**These are already in your local `.env` files - DO NOT push them to GitHub!**

**Verify `.gitignore` includes:**
```
.env
.env.local
.env.docker
*.env
```

### Tunnel Security

**Cloudflare Tunnels are secure by default:**
- ✅ HTTPS/WSS encryption
- ✅ No open ports on your router
- ✅ No port forwarding needed
- ✅ DDoS protection included

**But remember:**
- Your backend is publicly accessible via tunnel URL
- Anyone with the URL can access your API
- Consider adding authentication if needed (future enhancement)

### Database Security

**Railway/Supabase:**
- ✅ Encrypted connections (SSL/TLS)
- ✅ Password-protected
- ✅ Firewall rules enabled

**Best practices:**
- Use strong database passwords
- Don't share connection strings publicly
- Regularly backup your database

---


## 💰 Cost Breakdown (100% Free Forever)

| Service | Plan | Cost | Limits |
|---------|------|------|--------|
| **Vercel** | Hobby | $0 | 100GB bandwidth/month, unlimited deployments |
| **Railway** (Option A) | Free Tier | $0 | 500MB PostgreSQL, 100MB Redis, $5 credit/month |
| **Supabase** (Option B) | Free Tier | $0 | 500MB database, 2GB bandwidth, pauses after 7 days inactivity |
| **Upstash** (Option B) | Free Tier | $0 | 10,000 commands/day, 256MB storage |
| **Cloudflare Tunnel** | Free | $0 | Unlimited bandwidth, unlimited tunnels |
| **GitHub** | Free | $0 | Unlimited public repos |
| **Your PC** | - | Electricity | Must stay on for backend/desktop |

**Total Monthly Cost: $0**

**Limitations:**
- Your computer must stay on for the system to work
- Railway free tier: $5 credit/month (usually enough for small usage)
- Supabase: Database pauses after 7 days of inactivity (wakes up automatically)
- Upstash: 10K Redis commands/day (usually sufficient)

**When you might need to pay:**
- Heavy usage exceeding free tier limits
- Want 24/7 uptime without keeping your PC on
- Need more database storage (>500MB)
- High traffic (>100GB/month on Vercel)

---


## 📝 Checklist Summary

### Pre-Deployment
- [ ] GitHub account created
- [ ] Vercel account created
- [ ] Railway/Supabase account created
- [ ] Upstash account created (if using Option B)
- [ ] Cloudflare account created
- [ ] Docker Desktop installed
- [ ] Node.js 18+ installed
- [ ] Git installed

### Phase 1: GitHub
- [ ] Repository created on GitHub
- [ ] Code pushed to GitHub
- [ ] Repository is public

### Phase 2: Database & Redis
- [ ] PostgreSQL deployed (Railway or Supabase)
- [ ] Redis deployed (Railway or Upstash)
- [ ] DATABASE_URL saved
- [ ] REDIS_URL saved

### Phase 3: Frontend (Vercel)
- [ ] Project imported to Vercel
- [ ] Root directory set to `packages/aria-ui`
- [ ] Environment variables added (temporary values)
- [ ] First deployment successful
- [ ] Vercel URL saved

### Phase 4: Backend & Tunnels
- [ ] Cloudflared installed
- [ ] Backend `.env` updated with cloud database URLs
- [ ] Database migrations run successfully
- [ ] Docker desktop container started
- [ ] Backend started (npm run start:dev)
- [ ] Backend tunnel created
- [ ] Desktop tunnel created
- [ ] Tunnel URLs saved
- [ ] Vercel environment variables updated with tunnel URLs
- [ ] Vercel redeployed

### Phase 5: Testing
- [ ] Frontend loads without errors
- [ ] Can create a task
- [ ] Agent messages appear
- [ ] Desktop viewer works
- [ ] Task completes successfully

### Phase 6: Optional (Named Tunnels)
- [ ] Cloudflare login completed
- [ ] Named tunnels created
- [ ] DNS records configured
- [ ] Config files created
- [ ] Vercel updated with permanent URLs

---


## 🆘 Common Issues & Solutions

### Issue 1: "npm install fails in Vercel"

**Error:** `Cannot find module 'shared'`

**Cause:** Vercel doesn't install workspace dependencies correctly

**Solution:** This will be fixed by code changes (not your responsibility)

---

### Issue 2: "Tunnel URL keeps changing"

**Cause:** Quick tunnels generate random URLs each restart

**Solution:** Use named tunnels (Phase 6) for permanent URLs

---

### Issue 3: "Database connection timeout"

**Cause:** Database might be paused (Supabase) or connection string is wrong

**Solution:**
1. Check if database is active in dashboard
2. Verify `DATABASE_URL` in `packages/aria-agent/.env`
3. Test connection: `npx prisma db pull`

---

### Issue 4: "Redis connection refused"

**Cause:** Redis might be down or connection string is wrong

**Solution:**
1. Check if Redis is active in dashboard
2. Verify `REDIS_URL` in `packages/aria-agent/.env`
3. If Upstash: Make sure you're using the correct URL format

---

### Issue 5: "Desktop viewer shows black screen"

**Cause:** Docker container might not be fully started

**Solution:**
1. Wait 30 seconds after starting container
2. Check container logs: `docker logs aria-desktop`
3. Restart container: `docker restart aria-desktop`

---

### Issue 6: "WebSocket connection failed"

**Cause:** VNC URL might be incorrect or using wrong protocol

**Solution:**
1. Verify `ARIA_DESKTOP_VNC_URL` uses `wss://` (not `https://`)
2. Verify URL ends with `/websockify`
3. Example: `wss://def-456-uvw.trycloudflare.com/websockify`

---

### Issue 7: "Vercel build fails"

**Error:** Various build errors

**Cause:** Missing dependencies or incorrect build configuration

**Solution:** This will be fixed by code changes (not your responsibility)

---

### Issue 8: "Cannot access tunnel URL from browser"

**Cause:** Tunnel might not be running or URL is incorrect

**Solution:**
1. Check if tunnel terminal is still running
2. Look for the URL in tunnel terminal output
3. Test with curl: `curl https://your-tunnel-url.trycloudflare.com/health`

---


## 📞 Support & Resources

### Documentation
- **This Guide:** `DEPLOYMENT_GUIDE.md`
- **Architecture:** `CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md`
- **Environment Setup:** `ENVIRONMENT_SETUP.md`
- **Docker Guide:** `docker/README.md`

### Service Dashboards
- **Vercel:** https://vercel.com/dashboard
- **Railway:** https://railway.app/dashboard
- **Supabase:** https://supabase.com/dashboard
- **Upstash:** https://console.upstash.com
- **Cloudflare:** https://dash.cloudflare.com

### Useful Commands Reference

**Docker:**
```bash
# Start desktop
docker-compose -f docker-compose.core.yml up aria-desktop -d

# Stop desktop
docker-compose -f docker-compose.core.yml down

# View logs
docker logs aria-desktop --tail 50 -f

# Check status
docker ps

# Restart container
docker restart aria-desktop
```

**Backend:**
```bash
# Start backend
cd packages/aria-agent
npm run start:dev

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Check database
npx prisma studio
```

**Cloudflare Tunnels:**
```bash
# Quick tunnel (URL changes each time)
cloudflared tunnel --url http://localhost:9991

# Named tunnel (permanent URL)
cloudflared tunnel run aria-backend

# List tunnels
cloudflared tunnel list

# Delete tunnel
cloudflared tunnel delete aria-backend
```

**Git:**
```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "Your message"

# Push to GitHub
git push origin main

# Pull latest
git pull origin main
```

---


## 🎯 Quick Reference Card

**Save this for daily use:**

### URLs to Remember
- **Frontend (Vercel):** `https://your-project.vercel.app`
- **Backend Tunnel:** `https://your-backend-tunnel.trycloudflare.com`
- **Desktop Tunnel:** `https://your-desktop-tunnel.trycloudflare.com`
- **Local Backend:** `http://localhost:9991`
- **Local Desktop:** `http://localhost:9990`

### Environment Variables (Vercel)
```
ARIA_AGENT_BASE_URL=https://your-backend-tunnel.trycloudflare.com
NEXT_PUBLIC_API_URL=https://your-backend-tunnel.trycloudflare.com
ARIA_DESKTOP_VNC_URL=wss://your-desktop-tunnel.trycloudflare.com/websockify
NEXT_PUBLIC_DESKTOP_VNC_URL=wss://your-desktop-tunnel.trycloudflare.com/websockify
```

### Daily Startup (4 Terminals)
```bash
# Terminal 1: Docker
cd C:\Users\thang\Projects\Aria\Aria\docker
docker-compose -f docker-compose.core.yml up aria-desktop -d

# Terminal 2: Backend
cd C:\Users\thang\Projects\Aria\Aria\packages\aria-agent
npm run start:dev

# Terminal 3: Backend Tunnel
cloudflared tunnel --url http://localhost:9991

# Terminal 4: Desktop Tunnel
cloudflared tunnel --url http://localhost:9990
```

### Health Checks
```bash
# Backend
curl http://localhost:9991/health

# Backend Tunnel
curl https://your-backend-tunnel.trycloudflare.com/health

# Desktop
curl http://localhost:9990

# Docker
docker ps
```

---

## ✅ Deployment Complete!

**What you've accomplished:**
1. ✅ Frontend deployed to Vercel (globally accessible)
2. ✅ Database deployed to cloud (Railway/Supabase)
3. ✅ Redis deployed to cloud (Railway/Upstash)
4. ✅ Backend running locally with public tunnel
5. ✅ Desktop running locally with public tunnel
6. ✅ All services connected and working

**Your ARIA platform is now accessible to everyone at:**
`https://your-project.vercel.app`

**Total Cost: $0 (Free Forever!)**

---

## 🚀 Next Steps

1. **Share your app:** Give users your Vercel URL
2. **Monitor usage:** Check Railway/Supabase dashboards for database usage
3. **Keep PC running:** Backend and desktop need your PC to be on
4. **Consider named tunnels:** For permanent URLs (Phase 6)
5. **Setup auto-start:** Configure tunnels to start automatically on PC boot (optional)

---

## 📧 Questions?

If you encounter issues not covered in this guide:
1. Check the "Common Issues & Solutions" section
2. Review service dashboards for errors
3. Check Docker logs: `docker logs aria-desktop`
4. Check backend logs in Terminal 2
5. Contact the developer who wrote this code (not you - you're just deploying!)

---

**Document Version:** 1.0  
**Last Updated:** 2024-03-24  
**Author:** ARIA Development Team  
**For:** Deployment Team

---

**END OF DEPLOYMENT GUIDE**
