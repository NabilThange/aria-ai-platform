# 🚀 Aria Deployment Guide

## Overview

Your Aria app has **4 main components** that need to be deployed:

1. **aria-ui** (Frontend) - Next.js app
2. **aria-agent** (Backend) - NestJS API server
3. **aria-desktop** (Desktop Service) - Ubuntu desktop with VNC
4. **PostgreSQL Database**

## 🎯 Recommended Deployment Strategy

### Option 1: Render (Easiest - All-in-One) ⭐ RECOMMENDED

Deploy everything on Render's free tier:

#### What to Deploy Where:

| Component        | Service Type        | Path                  | Free Tier       |
| ------------------| ---------------------| -----------------------| -----------------|
| **aria-agent**   | Web Service         | `packages/aria-agent` | ✅ 750 hrs/month |
| **aria-ui**      | Web Service         | `packages/aria-ui`    | ✅ 750 hrs/month |
| **aria-desktop** | Web Service         | `packages/ariad`      | ✅ 750 hrs/month |
| **PostgreSQL**   | PostgreSQL Database | N/A                   | ✅ 90 days free  |

**Pros:**
- Everything in one place
- Free PostgreSQL database included
- Docker support for desktop service
- Easy environment variable management
- Auto-deploy from GitHub

**Cons:**
- Free tier services sleep after 15 min inactivity
- Limited resources (512 MB RAM per service)

---

### Option 2: Vercel + Render (Split Deployment)

Best performance for frontend:

| Component | Platform | Path | Free Tier |
|-----------|----------|------|-----------|
| **aria-ui** | Vercel | `packages/aria-ui` | ✅ Unlimited |
| **aria-agent** | Render | `packages/aria-agent` | ✅ 750 hrs/month |
| **aria-desktop** | Render | `packages/ariad` | ✅ 750 hrs/month |
| **PostgreSQL** | Render | N/A | ✅ 90 days free |

**Pros:**
- Vercel has best Next.js performance
- Frontend never sleeps
- Global CDN for UI

**Cons:**
- Need to manage CORS between platforms
- More complex setup

---

## 📋 Step-by-Step Deployment

### Prerequisites

1. Create accounts:
   - [Render](https://render.com) (for backend + database)
   - [Vercel](https://vercel.com) (optional, for frontend)
   - [GitHub](https://github.com) (to connect your repo)

2. Push your code to GitHub

3. Get your API keys:
   - Google Gemini API: https://aistudio.google.com/apikey
   - (Optional) Groq API: https://console.groq.com/keys

---

## 🔧 Deployment Instructions

### A. Deploy on Render (All-in-One)

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Name: `aria-database`
3. Database: `ariadb`
4. User: `postgres`
5. Region: Choose closest to you
6. Plan: **Free**
7. Click "Create Database"
8. **Copy the Internal Database URL** (starts with `postgresql://`)

#### Step 2: Deploy aria-agent (Backend)

1. New → Web Service
2. Connect your GitHub repo
3. Configure:
   ```
   Name: aria-agent
   Region: Same as database
   Branch: main
   Root Directory: packages/aria-agent
   Runtime: Docker
   Plan: Free
   ```

4. Environment Variables:
   ```bash
   DATABASE_URL=<paste_internal_database_url>
   GOOGLE_API_KEY=<your_google_api_key>
   PORT=9991
   ARIA_DESKTOP_BASE_URL=https://aria-desktop.onrender.com
   ```

5. Build Command:
   ```bash
   npm install && npm run prisma:prod && npm run build
   ```

6. Start Command:
   ```bash
   npm run start:prod
   ```

7. Click "Create Web Service"
8. **Copy the service URL** (e.g., `https://aria-agent.onrender.com`)

#### Step 3: Deploy aria-desktop (Desktop Service)

1. New → Web Service
2. Connect your GitHub repo
3. Configure:
   ```
   Name: aria-desktop
   Region: Same as backend
   Branch: main
   Root Directory: packages/ariad
   Runtime: Docker
   Plan: Free
   ```

4. Environment Variables:
   ```bash
   DISPLAY=:0
   ```

5. Click "Create Web Service"
6. **Copy the service URL** (e.g., `https://aria-desktop.onrender.com`)

#### Step 4: Deploy aria-ui (Frontend)

1. New → Web Service
2. Connect your GitHub repo
3. Configure:
   ```
   Name: aria-ui
   Region: Same as backend
   Branch: main
   Root Directory: packages/aria-ui
   Runtime: Node
   Plan: Free
   ```

4. Environment Variables:
   ```bash
   NODE_ENV=production
   ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
   ARIA_DESKTOP_VNC_URL=wss://aria-desktop.onrender.com/websockify
   PORT=9992
   ```

5. Build Command:
   ```bash
   cd ../shared && npm install && npm run build && cd ../aria-ui && npm install && npm run build
   ```

6. Start Command:
   ```bash
   npm start
   ```

7. Click "Create Web Service"

#### Step 5: Update Backend Environment

Go back to `aria-agent` service and update:
```bash
ARIA_DESKTOP_BASE_URL=https://aria-desktop.onrender.com
```

---

### B. Deploy on Vercel + Render (Split)

#### Step 1-3: Same as above (Database, Backend, Desktop on Render)

#### Step 4: Deploy Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/new)
2. Import your GitHub repo
3. Configure:
   ```
   Framework Preset: Next.js
   Root Directory: packages/aria-ui
   Build Command: cd ../shared && npm install && npm run build && cd ../aria-ui && npm install && npm run build
   Output Directory: .next
   Install Command: npm install
   ```

4. Environment Variables:
   ```bash
   NODE_ENV=production
   ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
   ARIA_DESKTOP_VNC_URL=wss://aria-desktop.onrender.com/websockify
   ```

5. Click "Deploy"

#### Step 5: Configure CORS on Backend

Update `aria-agent` environment on Render:
```bash
CORS_ORIGIN=https://your-app.vercel.app
```

---

## 🔐 Security Checklist

- [ ] Never commit `.env` files to GitHub
- [ ] Use environment variables for all secrets
- [ ] Enable CORS only for your frontend domain
- [ ] Use HTTPS URLs (Render/Vercel provide this automatically)
- [ ] Rotate API keys regularly
- [ ] Set up database backups (Render provides this)

---

## 🐛 Common Issues & Solutions

### Issue: Services sleeping on free tier
**Solution:** 
- Use [UptimeRobot](https://uptimerobot.com) to ping your services every 5 minutes
- Or upgrade to paid tier ($7/month per service)

### Issue: Database connection errors
**Solution:**
- Use **Internal Database URL** for backend (not External)
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`

### Issue: Frontend can't connect to backend
**Solution:**
- Check ARIA_AGENT_BASE_URL is correct
- Verify CORS settings on backend
- Use `https://` not `http://`

### Issue: Desktop VNC not connecting
**Solution:**
- Use `wss://` (WebSocket Secure) not `ws://`
- Check ARIA_DESKTOP_VNC_URL includes `/websockify` path

### Issue: Build fails on Render
**Solution:**
- Check Root Directory is correct
- Verify Dockerfile exists in the specified path
- Check build logs for specific errors

---

## 💰 Cost Breakdown

### Free Tier Limits:

**Render:**
- 750 hours/month per service (enough for 1 service 24/7)
- 512 MB RAM per service
- PostgreSQL: 90 days free, then $7/month
- Services sleep after 15 min inactivity

**Vercel:**
- Unlimited deployments
- 100 GB bandwidth/month
- Serverless functions: 100 GB-hours/month
- No sleeping

### Recommended for Production:

**Render Starter Plan ($7/month per service):**
- No sleeping
- 512 MB RAM
- Always-on services

**Total for 3 services + DB:** ~$28/month

---

## 🚀 Quick Start Commands

### Local Development:
```bash
# Start all services
docker-compose -f docker/docker-compose.yml up

# Access app
http://localhost:9992
```

### Production URLs:
```
Frontend: https://aria-ui.onrender.com (or your-app.vercel.app)
Backend: https://aria-agent.onrender.com
Desktop: https://aria-desktop.onrender.com
Database: Internal URL only
```

---

## 📊 Monitoring

### Render Dashboard:
- View logs for each service
- Monitor resource usage
- Check deployment status

### Vercel Dashboard:
- View deployment logs
- Monitor function invocations
- Check analytics

---

## 🎓 Next Steps

1. Deploy database first
2. Deploy backend (aria-agent)
3. Deploy desktop service (aria-desktop)
4. Deploy frontend (aria-ui)
5. Test the full flow
6. Set up monitoring
7. Configure custom domain (optional)

---

## 📞 Need Help?

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment

---

**Good luck with your deployment! 🎉**

