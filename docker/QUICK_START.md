# ⚡ ARIA - 3 Steps to Start

## Step 1: Add API Keys

Open `docker/.env` and add your keys:

```env
GOOGLE_API_KEY=AIzaSy...your_key
GROQ_API_KEY=gsk_...your_key
BYTEZ_API_KEY=sk-...your_key
```

**Where to get keys:**
- Google: https://aistudio.google.com/apikey
- Groq: https://console.groq.com/keys
- Bytez: https://bytez.com/

---

## Step 2: Start Everything

**Windows:** Double-click `start-all.bat`

**Mac/Linux:**
```bash
cd docker
docker-compose -f docker-compose.yml up -d
```

**Wait 30 seconds** for services to start.

---

## Step 3: Run Migrations (First Time Only!)

```bash
docker exec aria-agent npx prisma migrate deploy
```

---

## ✅ Done!

Open: **http://localhost:9992**

You should see the ARIA dashboard!

---

## What's Running?

Check Docker Desktop - you'll see **"aria"** dropdown with:

```
📦 aria
  ├── 🌐 aria-ui (port 9992) ← Open this!
  ├── ⚙️ aria-agent (port 9991)
  ├── 🖥️ aria-desktop (ports 9990, 9867)
  ├── 🗄️ postgres (port 5432)
  └── 💾 redis (port 6379)
```

---

## Quick Commands

**Stop everything:**
```bash
cd docker
docker-compose -f docker-compose.yml down
```

**View logs:**
```bash
docker-compose -f docker-compose.yml logs -f
```

**Restart:**
```bash
docker-compose -f docker-compose.yml restart
```

---

## Troubleshooting

### Can't connect to backend?

Wait 30 seconds, then check:
```bash
curl http://localhost:9991/health
```

### Database errors?

Run migrations:
```bash
docker exec aria-agent npx prisma migrate deploy
```

### Need help?

See full guide: `CONTEXT/STARTUP_GUIDE.md`
