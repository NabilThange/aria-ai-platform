# Environment Variables Configuration Guide

## Architecture Overview

Your Aria system has 3 main components:

1. **aria-ui** (Frontend) - Vercel: https://ai-aria.vercel.app/landing
2. **aria-agent** (Backend API) - Render: https://aria-agent.onrender.com
3. **ariad** (Desktop Daemon) - Railway: ariad-production.up.railway.app
4. **PostgreSQL Database** - Render: dpg-d6mq8d7tskes73e2qp30-a

---

## 1. aria-ui (Vercel) - Frontend Environment Variables

```env
# Backend API Connection
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
NEXT_PUBLIC_API_URL=https://aria-agent.onrender.com

# Desktop Daemon Connection (if needed from frontend)
ARIA_DESKTOP_VNC_URL=wss://ariad-production.up.railway.app/websockify
```

**Notes:**
- Use `https://` for Render backend
- Use `wss://` (secure WebSocket) for Railway daemon
- `NEXT_PUBLIC_` prefix makes variables available in browser

---

## 2. aria-agent (Render) - Backend API Environment Variables

```env
# Database Connection (Use EXTERNAL URL from Render)
DATABASE_URL=postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a.singapore-postgres.render.com/ariadb_d5mw

# Google Gemini API
GOOGLE_API_KEY=AIzaSyAtqcvJqEsfZD89Apzdo9mCNTzmZBnVots
GEMINI_API_KEY=AIzaSyAtqcvJqEsfZD89Apzdo9mCNTzmZBnVots

# Groq Cloud API
GROQ_API_KEY=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

# OpenRouter API
OPENROUTER_API_KEY=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

# Desktop Daemon Connection
ARIA_DESKTOP_BASE_URL=https://ariad-production.up.railway.app

# Bytez API Keys (Multiple keys for fallback)
BYTEZ_API_KEY_1=976436aed804d1dd3578c22df7e090b2
BYTEZ_API_KEY_2=57a2405dd1f29cd34745ce1c418755e8
BYTEZ_API_KEY_3=f37860147855a578b1c6306a43b37114
BYTEZ_API_KEY_4=480baee23a348d1cbb00bb7fe5c4a8b5
BYTEZ_API_KEY_5=549f916b81ae27ec04fdb02056222d5c
BYTEZ_API_KEY_6=1dbced4c3001195b7fd2d82214121c47
BYTEZ_API_KEY_7=ef0c9b96ba0768e6288e99c99bbe64ff
BYTEZ_API_KEY_8=a2624274e97d4b251838cb469e669a96
BYTEZ_API_KEY_9=b6aa62bc18b2cd98f46947c7a64eb9e1
BYTEZ_API_KEY_10=6b2a0eb9ccd146eae19f7b639a3edf53
BYTEZ_API_KEY_11=ff7b72401b95b45f4352d8e1f02d032e
BYTEZ_API_KEY_12=af76c9c5c9b17160d48678f8de4d4ef4

# Firebase (if using Firebase Admin SDK)
GOOGLE_CLOUD_PROJECT=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Optional Analytics
ARIA_ANALYTICS_ENDPOINT=
```

**Important Notes:**
- Use **EXTERNAL** database URL (includes `.singapore-postgres.render.com`)
- This service needs database access, so use the external URL
- All API keys should be added here since this is the backend that makes AI calls

---

## 3. ariad (Railway) - Desktop Daemon Environment Variables

```env
# This service typically doesn't need many environment variables
# It's a desktop automation daemon that receives commands from aria-agent

# Optional: If it needs to connect back to the backend
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com

# Port (Railway will set this automatically)
PORT=9990
```

**Notes:**
- ariad is a desktop automation service (uses nut-js for mouse/keyboard control)
- It doesn't need database or AI API keys
- Railway automatically sets PORT variable

---

## 4. PostgreSQL Database (Render)

**No environment variables needed** - This is just the database service.

**Connection URLs:**
- **Internal** (for services on same Render account): `postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a/ariadb_d5mw`
- **External** (for Railway, Vercel, or external services): `postgresql://ariadb_d5mw_user:8doRrZBvrGDqMgIq5nzzdQdD4HeJWFCz@dpg-d6mq8d7tskes73e2qp30-a.singapore-postgres.render.com/ariadb_d5mw`

---

## Quick Setup Checklist

### Vercel (aria-ui)
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the 3 variables listed above
3. Redeploy

### Render (aria-agent)
1. Go to Render Dashboard → aria-agent service → Environment
2. Add all variables from section 2 above
3. Save (auto-redeploys)

### Railway (ariad)
1. Go to Railway Dashboard → ariad service → Variables
2. Add variables from section 3 above
3. Redeploy

---

## Security Recommendations

⚠️ **IMPORTANT**: Your API keys are now exposed in this document. Consider:

1. **Rotate all API keys** after deployment:
   - Google Gemini: https://makersuite.google.com/app/apikey
   - Groq: https://console.groq.com/keys
   - OpenRouter: https://openrouter.ai/keys
   - Bytez: https://bytez.com

2. **Use platform secret management**:
   - Vercel: Automatically encrypts environment variables
   - Render: Automatically encrypts environment variables
   - Railway: Automatically encrypts environment variables

3. **Never commit `.env` files** to git (already in `.gitignore`)

---

## Testing Connections

After setting up, test each connection:

```bash
# Test Frontend → Backend
curl https://ai-aria.vercel.app/api/health

# Test Backend → Database
curl https://aria-agent.onrender.com/health

# Test Backend → Desktop Daemon
curl https://aria-agent.onrender.com/desktop/status
```

---

## Common Issues

### Issue: Frontend can't connect to backend
- Check `ARIA_AGENT_BASE_URL` uses `https://` not `http://`
- Verify CORS is enabled in aria-agent for Vercel domain

### Issue: Backend can't connect to database
- Use **EXTERNAL** database URL (with `.singapore-postgres.render.com`)
- Check database is running in Render dashboard

### Issue: WebSocket connections fail
- Use `wss://` (secure) not `ws://` for production
- Check Railway allows WebSocket connections

---

## Local Development vs Production

| Variable | Local | Production |
|----------|-------|------------|
| DATABASE_URL | `localhost:5432` | External Render URL |
| ARIA_AGENT_BASE_URL | `http://localhost:9991` | `https://aria-agent.onrender.com` |
| ARIA_DESKTOP_BASE_URL | `http://localhost:9990` | `https://ariad-production.up.railway.app` |
| Protocol | `http://` & `ws://` | `https://` & `wss://` |
