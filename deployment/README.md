# ARIA Deployment Scripts

This folder contains automated scripts for starting and stopping the ARIA platform in a hybrid deployment setup.

## 📁 Files

- **`start-aria.ps1`** - Complete startup script (Docker + Backend + Tunnels + Vercel)
- **`stop-aria.ps1`** - Complete shutdown script (stops all services)
- **`DEPLOYMENT_GUIDE.md`** - Full deployment documentation

## 🚀 Quick Start

### Starting ARIA

```powershell
cd deployment
.\start-aria.ps1
```

This will automatically:
1. ✅ Start Docker Desktop container (aria-desktop)
2. ✅ Start Backend API (aria-agent) in a new window
3. ✅ Create Cloudflare tunnel for backend
4. ✅ Create Cloudflare tunnel for desktop
5. ✅ Update Vercel environment variables
6. ✅ Trigger Vercel redeploy

**Wait ~2 minutes for Vercel to redeploy, then access:**
- Frontend: https://aria-ai-platform.vercel.app

### Stopping ARIA

```powershell
cd deployment
.\stop-aria.ps1
```

This will automatically:
1. ✅ Stop all Cloudflare tunnels
2. ✅ Stop Backend API (aria-agent)
3. ✅ Stop Docker Desktop container

## 📋 Prerequisites

Before running these scripts, ensure you have:

- [x] Docker Desktop installed and running
- [x] Node.js 18+ installed
- [x] Cloudflare Tunnel (cloudflared) installed
- [x] PostgreSQL and Redis on Railway (already configured)
- [x] Frontend deployed to Vercel
- [x] `.env` file in `packages/aria-agent/` (copy from `.env.cloud`)

## 🔧 Configuration

### Vercel Credentials

The scripts use these Vercel credentials (already configured):
- **Token:** `vcp_1TKjO3XPLrzq08FSngwOeUASEeSpywLyyQn4SQPAYtZ6QZ4OaP4OJQv6`
- **Project ID:** `prj_TZT2tbT8DvYkdbOKD9SDNtQGMS3W`

### Project Paths

The scripts assume this project structure:
```
C:\Users\thang\Projects\Aria\Aria\
├── deployment/           ← You are here
├── docker/
│   └── docker-compose.core.yml
└── packages/
    └── aria-agent/
        └── .env
```

If your paths are different, edit the scripts and update:
- `$PROJECT_ROOT`
- `$DOCKER_DIR`
- `$BACKEND_DIR`

## 🎯 What Each Script Does

### start-aria.ps1

**Step 1: Start Docker Container**
- Checks if Docker Desktop is running
- Starts `aria-desktop` container using docker-compose
- Waits for container to be ready
- Verifies container is running

**Step 2: Start Backend**
- Checks if `.env` exists (copies from `.env.cloud` if missing)
- Starts backend in a new PowerShell window
- Waits for backend health check (http://localhost:9991/health)

**Step 3: Start Backend Tunnel**
- Creates Cloudflare tunnel for backend (port 9991)
- Extracts tunnel URL from logs
- Example: `https://abc-123-xyz.trycloudflare.com`

**Step 4: Start Desktop Tunnel**
- Creates Cloudflare tunnel for desktop (port 9990)
- Extracts tunnel URL from logs
- Example: `https://def-456-uvw.trycloudflare.com`

**Step 5: Update Vercel**
- Updates 4 environment variables in Vercel:
  - `ARIA_AGENT_BASE_URL`
  - `NEXT_PUBLIC_API_URL`
  - `ARIA_DESKTOP_VNC_URL`
  - `NEXT_PUBLIC_DESKTOP_VNC_URL`

**Step 6: Trigger Redeploy**
- Triggers Vercel redeploy to apply new environment variables
- Takes ~2 minutes to complete

### stop-aria.ps1

**Step 1: Stop Cloudflare Tunnels**
- Finds all `cloudflared` processes
- Stops them forcefully
- Cleans up tunnel log files

**Step 2: Stop Backend**
- Finds Node.js processes running aria-agent
- Stops them forcefully
- Also stops PowerShell windows running the backend

**Step 3: Stop Docker Container**
- Runs `docker-compose down` to stop aria-desktop
- Verifies container is stopped

## 🐛 Troubleshooting

### "Docker Desktop is not running"

**Solution:** Start Docker Desktop manually before running the script.

### "Could not get backend tunnel URL"

**Possible causes:**
- Cloudflared not installed
- Backend not running (port 9991 not accessible)

**Solution:**
```powershell
# Check if cloudflared is installed
cloudflared --version

# Check if backend is running
curl http://localhost:9991/health
```

### "Backend health check timeout"

**Possible causes:**
- Backend taking longer than 60 seconds to start
- Database connection issues
- Missing dependencies

**Solution:**
- Check the backend window for error messages
- Verify `.env` has correct DATABASE_URL and REDIS_URL
- Run `npm install` in `packages/aria-agent/`

### "Container failed to start"

**Possible causes:**
- Docker Desktop not running
- Port 9990 or 9867 already in use
- Docker image not built

**Solution:**
```powershell
# Check Docker status
docker ps

# Check if ports are in use
netstat -ano | findstr "9990"
netstat -ano | findstr "9867"

# Rebuild Docker image
cd docker
docker-compose -f docker-compose.core.yml build aria-desktop
```

### "Vercel API error"

**Possible causes:**
- Invalid Vercel token
- Invalid project ID
- Network issues

**Solution:**
- Verify token and project ID in script
- Check Vercel dashboard: https://vercel.com/dashboard
- Try running the Vercel update manually

## 📊 Service Ports

| Service | Port | URL |
|---------|------|-----|
| Backend API | 9991 | http://localhost:9991 |
| Desktop VNC | 9990 | http://localhost:9990 |
| PinchTab | 9867 | http://localhost:9867 |
| PostgreSQL | 24523 | Railway (remote) |
| Redis | 28015 | Railway (remote) |

## 🔐 Security Notes

- Tunnel URLs change every time you restart (they're temporary)
- For permanent URLs, use named Cloudflare tunnels (see DEPLOYMENT_GUIDE.md Phase 6)
- Never commit Vercel tokens to Git
- Keep your `.env` file secure (already in .gitignore)

## 📚 Additional Resources

- **Full Deployment Guide:** `DEPLOYMENT_GUIDE.md`
- **Architecture Documentation:** `../CONTEXT/ARIA_COMPLETE_ARCHITECTURE.md`
- **Docker Configuration:** `../docker/docker-compose.core.yml`
- **Backend Environment:** `../packages/aria-agent/.env.cloud`

## 💡 Tips

1. **Keep windows open:** The backend and tunnel windows must stay open for ARIA to work
2. **Wait for Vercel:** After starting, wait ~2 minutes for Vercel to redeploy
3. **Check logs:** If something fails, check the backend window for error messages
4. **Use stop script:** Always use `stop-aria.ps1` to cleanly shut down all services
5. **Named tunnels:** For production, consider setting up named tunnels (permanent URLs)

## 🆘 Need Help?

1. Check the troubleshooting section above
2. Review the full deployment guide: `DEPLOYMENT_GUIDE.md`
3. Check service dashboards:
   - Vercel: https://vercel.com/dashboard
   - Railway: https://railway.app/dashboard
   - Cloudflare: https://dash.cloudflare.com

---

**Last Updated:** 2024-03-24  
**Version:** 1.0
