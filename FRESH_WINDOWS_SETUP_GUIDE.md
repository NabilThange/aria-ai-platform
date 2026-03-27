# 🚀 ARIA Setup Guide for Brand New Windows Laptop

**Complete step-by-step guide for setting up ARIA on a fresh Windows machine with NOTHING installed.**

---

## 📋 WHAT YOU'LL NEED

- Windows 10 or 11
- Good internet connection
- Admin privileges
- The `.env` files (your friend will provide these)

---

## 🔧 STEP 1: INSTALL PREREQUISITES (IN ORDER!)

### 1.1 Install Git
1. Download: https://git-scm.com/download/win
2. Run installer, use default settings
3. **IMPORTANT:** Check "Add Git to PATH" during installation
4. Verify: Open Command Prompt and type `git --version`

### 1.2 Install Node.js 20+
1. Download: https://nodejs.org/ (get LTS version - should be 20.x or higher)
2. Run installer, use default settings
3. **IMPORTANT:** Check "Automatically install necessary tools" (includes Python)
4. Verify: Open Command Prompt and type:
   ```cmd
   node --version
   npm --version
   ```
   Should show v20.x.x or higher

### 1.3 Install Docker Desktop
1. Download: https://www.docker.com/products/docker-desktop
2. Run installer
3. **IMPORTANT:** Enable WSL 2 if prompted (Windows Subsystem for Linux)
4. Restart computer when prompted
5. Start Docker Desktop (it should auto-start after restart)
6. Wait for Docker to fully start (whale icon in system tray should be steady)
7. Verify: Open Command Prompt and type `docker --version`

### 1.4 Install Cloudflare Tunnel (cloudflared)
1. Download: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Choose "Windows 64-bit"
3. Rename downloaded file to `cloudflared.exe`
4. Move to `C:\Windows\System32\` (requires admin)
5. Verify: Open Command Prompt and type `cloudflared --version`

---

## 📥 STEP 2: CLONE THE REPOSITORY

1. Open Command Prompt or PowerShell
2. Navigate to where you want the project:
   ```cmd
   cd C:\Users\YourName\Projects
   ```
   (Create the Projects folder if it doesn't exist: `mkdir Projects`)

3. Clone the repository:
   ```cmd
   git clone https://github.com/NabilThange/aria-ai-platform
   cd aria
   ```

---

## 🔑 STEP 3: SETUP ENVIRONMENT FILES

Your friend will provide you with these files. Copy them to the correct locations:

### 3.1 Backend Environment File
- **File:** `.env` (from your friend)
- **Location:** `packages/aria-agent/.env`
- **How:** Copy the file your friend gave you into `packages/aria-agent/` folder

### 3.2 Frontend Environment File
- **File:** `.env` (from your friend)
- **Location:** `packages/aria-ui/.env`
- **How:** Copy the file your friend gave you into `packages/aria-ui/` folder

### 3.3 Docker Environment File
- **File:** `.env` (from your friend)
- **Location:** `docker/.env`
- **How:** Copy the file your friend gave you into `docker/` folder

**Your folder structure should look like:**
```
aria/
├── docker/
│   └── .env ✅
├── packages/
│   ├── aria-agent/
│   │   └── .env ✅
│   └── aria-ui/
│       └── .env ✅
```

---

## 📦 STEP 4: INSTALL DEPENDENCIES

Open Command Prompt in the project root (`C:\Users\YourName\Projects\aria`):

### 4.1 Install Backend Dependencies
```cmd
cd packages\aria-agent
npm install
cd ..\..
```
(This will take 2-5 minutes)

### 4.2 Install Frontend Dependencies
```cmd
cd packages\aria-ui
npm install
cd ..\..
```
(This will take 2-5 minutes)

### 4.3 Install Shared Dependencies
```cmd
cd packages\shared
npm install
npm run build
cd ..\..
```

---

## 🐳 STEP 5: START DOCKER SERVICES

### 5.1 Make Sure Docker Desktop is Running
- Look for the whale icon in your system tray
- It should be steady (not animating)
- If not running, start Docker Desktop and wait

### 5.2 Build and Start Docker Containers
```cmd
cd docker
docker-compose build aria-desktop
docker-compose up postgres redis aria-desktop -d
```

**What this does:**
- Builds the desktop container (Ubuntu with browser automation) - takes 5-10 minutes first time
- Starts PostgreSQL database
- Starts Redis cache
- Starts ARIA desktop environment

### 5.3 Verify Docker Containers are Running
```cmd
docker ps
```

You should see 3 containers running:
- `aria-postgres`
- `aria-redis`
- `aria-desktop`

---

## 🗄️ STEP 6: SETUP DATABASE

```cmd
cd ..\packages\aria-agent
npx prisma migrate dev
npx prisma generate
cd ..\..
```

**What this does:**
- Creates database tables
- Generates Prisma client for database access

---

## 🎯 STEP 7: START ARIA (3 TERMINALS NEEDED!)

You need to keep 3 Command Prompt/PowerShell windows open:

### Terminal 1: Backend
```cmd
cd C:\Users\YourName\Projects\aria\packages\aria-agent
npm run start:dev
```
**Keep this window open!** You'll see logs like:
```
[Nest] 12345  - LOG [NestApplication] Nest application successfully started
```

### Terminal 2: Frontend
Open a NEW Command Prompt window:
```cmd
cd C:\Users\YourName\Projects\aria\packages\aria-ui
npm run dev
```
**Keep this window open!** You'll see:
```
ready - started server on 0.0.0.0:9992
```

### Terminal 3: Cloudflare Tunnels (Optional - for remote access)
Open a NEW Command Prompt window:
```cmd
cd C:\Users\YourName\Projects\aria\deployment
.\start-aria.ps1
```
**This script does everything automatically!** It will:
- Start all Docker services
- Start backend
- Create tunnels
- Update Vercel

---

## 🎉 STEP 8: ACCESS ARIA

Open your browser and go to:

- **Frontend UI:** http://localhost:9992
- **Backend API:** http://localhost:9991
- **Desktop VNC:** http://localhost:9990

---

## 🛠️ ALTERNATIVE: USE THE AUTOMATED SCRIPT

Instead of Steps 5-7, you can use the automated PowerShell script:

```powershell
cd deployment
.\start-aria.ps1
```

This script automatically:
1. ✅ Starts Docker services (Postgres, Redis, Desktop)
2. ✅ Starts Backend in a new window
3. ✅ Creates Cloudflare tunnels
4. ✅ Updates Vercel environment variables
5. ✅ Triggers Vercel redeploy

**Wait ~2 minutes for Vercel to redeploy, then access:**
- Frontend: https://aria-ai-platform.vercel.app

---

## 🛑 HOW TO STOP ARIA

### Option 1: Stop Everything with Script
```powershell
cd deployment
.\stop-aria.ps1
```

### Option 2: Manual Stop
1. Close the backend terminal (Ctrl+C)
2. Close the frontend terminal (Ctrl+C)
3. Stop Docker containers:
   ```cmd
   cd docker
   docker-compose down
   ```

---

## 🐛 TROUBLESHOOTING

### "Docker Desktop is not running"
**Solution:** Start Docker Desktop manually, wait for it to fully start (whale icon steady)

### "npm: command not found"
**Solution:** Node.js not installed correctly. Reinstall Node.js and make sure "Add to PATH" is checked

### "git: command not found"
**Solution:** Git not installed correctly. Reinstall Git and make sure "Add to PATH" is checked

### "cloudflared: command not found"
**Solution:** 
1. Download cloudflared.exe
2. Move to `C:\Windows\System32\`
3. Restart Command Prompt

### "Port 5432 already in use"
**Solution:** Another PostgreSQL is running. Either:
- Stop the other PostgreSQL service
- Change port in `docker-compose.yml`

### "Container failed to start"
**Solution:**
1. Check Docker Desktop is running
2. Try rebuilding: `docker-compose build aria-desktop`
3. Check logs: `docker logs aria-desktop`

### "Backend won't start"
**Solution:**
1. Make sure Docker services are running: `docker ps`
2. Check `.env` file exists in `packages/aria-agent/`
3. Try: `cd packages/aria-agent && npm install`

### "Database migration failed"
**Solution:**
1. Make sure PostgreSQL is running: `docker ps`
2. Check DATABASE_URL in `.env` file
3. Try: `npx prisma migrate reset` (WARNING: deletes all data)

---

## 📊 SERVICE PORTS REFERENCE

| Service | Port | URL |
|---------|------|-----|
| Frontend UI | 9992 | http://localhost:9992 |
| Backend API | 9991 | http://localhost:9991 |
| Desktop VNC | 9990 | http://localhost:9990 |
| PinchTab | 9867 | http://localhost:9867 |
| PostgreSQL | 5432 | localhost:5432 |
| Redis | 6379 | localhost:6379 |

---

## 🔐 SECURITY NOTES

- Never share your `.env` files publicly
- Keep API keys secure
- Tunnel URLs change every restart (they're temporary)
- For permanent URLs, use named Cloudflare tunnels

---

## 📚 ADDITIONAL RESOURCES

- **Architecture Documentation:** `CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md`
- **Deployment Guide:** `deployment/DEPLOYMENT_GUIDE.md`
- **Environment Setup:** `ENVIRONMENT_SETUP.md`
- **Docker Configuration:** `docker/docker-compose.yml`

---

## ✅ QUICK CHECKLIST

Before starting ARIA, make sure:
- [ ] Git installed and in PATH
- [ ] Node.js 20+ installed
- [ ] Docker Desktop installed and running
- [ ] Cloudflared installed (optional, for tunnels)
- [ ] Repository cloned
- [ ] All 3 `.env` files in correct locations
- [ ] Dependencies installed (`npm install` in aria-agent and aria-ui)
- [ ] Docker containers built and running
- [ ] Database migrations completed

---

## 🆘 STILL NEED HELP?

1. Check the troubleshooting section above
2. Review `deployment/README.md` for more details
3. Check Docker Desktop for container logs
4. Ask your friend who set this up!

---

**Last Updated:** 2024-03-27  
**Version:** 1.0  
**For:** Fresh Windows Installation
