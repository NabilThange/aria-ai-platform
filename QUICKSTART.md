# 🚀 Bytebot - Quick Start Guide

Get Bytebot running in 5 minutes!

---

## 📋 Prerequisites

Before you start, make sure you have:

- ✅ **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop)
- ✅ **Node.js 18+** - [Download here](https://nodejs.org/)
- ✅ **Google API Key** - [Get one here](https://aistudio.google.com/apikey)

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Start Docker Desktop

Make sure Docker Desktop is running on your computer.

### Step 2: Clone & Navigate

```bash
# If you haven't already cloned the repo
git clone https://github.com/bytebot-ai/bytebot.git
cd bytebot
```

### Step 3: Start Database & Desktop

```bash
cd docker
docker-compose -f docker-compose.core.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
cd ..
```

**Wait 20 seconds** for containers to start.

### Step 4: Setup Backend

```bash
cd packages/bytebot-agent

# Install dependencies (if not already done)
npm install

# Create .env file
# On Windows PowerShell:
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bytebotdb
GOOGLE_API_KEY=YOUR_API_KEY_HERE
GEMINI_API_KEY=YOUR_API_KEY_HERE
BYTEBOT_DESKTOP_BASE_URL=http://localhost:9990
BYTEBOT_ANALYTICS_ENDPOINT=
"@ | Out-File -FilePath .env -Encoding utf8

# On Mac/Linux:
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bytebotdb
GOOGLE_API_KEY=YOUR_API_KEY_HERE
GEMINI_API_KEY=YOUR_API_KEY_HERE
BYTEBOT_DESKTOP_BASE_URL=http://localhost:9990
BYTEBOT_ANALYTICS_ENDPOINT=
EOF

# Replace YOUR_API_KEY_HERE with your actual Google API key
# Edit .env file manually with your API key

# Run database migrations
npx prisma generate
npx prisma migrate deploy

# Start backend (keep this terminal open)
npm run start:dev
```

### Step 5: Setup Frontend (New Terminal)

Open a **new terminal window**:

```bash
cd packages/bytebot-ui

# Install dependencies (if not already done)
npm install

# Create .env file
# On Windows PowerShell:
@"
BYTEBOT_AGENT_BASE_URL=http://localhost:9991
BYTEBOT_DESKTOP_VNC_URL=ws://localhost:9990/websockify
NEXT_PUBLIC_API_URL=http://localhost:9991
"@ | Out-File -FilePath .env -Encoding utf8

# On Mac/Linux:
cat > .env << 'EOF'
BYTEBOT_AGENT_BASE_URL=http://localhost:9991
BYTEBOT_DESKTOP_VNC_URL=ws://localhost:9990/websockify
NEXT_PUBLIC_API_URL=http://localhost:9991
EOF

# Start frontend (keep this terminal open)
npm run dev
```

### Step 6: Open Bytebot

Open your browser and go to:

```
http://localhost:9992
```

🎉 **You're ready!** Create your first task!

---

## 🎯 Your First Task

### Simple Text Task (No Desktop Needed)

1. Click **"New Task"** or **"+"** button
2. Enter: `"Tell me a joke"`
3. Click **"Create"** or **"Run"**
4. Watch the AI respond!

### Computer Use Task (With Desktop)

1. Click **"New Task"**
2. Enter: `"Open Firefox and go to python.org"`
3. Click **"Create"**
4. Click **"Desktop"** tab to watch it work!

---

## 🛑 How to Stop Everything

### Stop Backend & Frontend
- Press **Ctrl+C** in each terminal window

### Stop Docker Containers
```bash
cd docker
docker-compose -f docker-compose.core.yml down
```

---

## 🔄 How to Restart Everything

### Start Docker Containers
```bash
cd docker
docker-compose -f docker-compose.core.yml up postgres bytebot-desktop -d
```

### Start Backend
```bash
cd packages/bytebot-agent
npm run start:dev
```

### Start Frontend (New Terminal)
```bash
cd packages/bytebot-ui
npm run dev
```

### Open Browser
```
http://localhost:9992
```

---

## 📊 Service Status Check

### Check Docker Containers
```bash
docker ps
```

Should show:
- `bytebot-postgres` on port 5432
- `bytebot-desktop` on port 9990

### Check Backend
Look for this in the backend terminal:
```
[Nest] LOG [NestApplication] Nest application successfully started
```

### Check Frontend
Look for this in the frontend terminal:
```
Ready on http://localhost:9992
```

---

## 🔧 Troubleshooting

### Issue: "Docker is not running"

**Solution:**
1. Open Docker Desktop application
2. Wait for it to start (green icon)
3. Try again

### Issue: "Port already in use"

**Solution:**
```bash
# Find what's using the port
lsof -i :9991  # or :9992, :5432, :9990

# Kill the process
kill -9 [PID]

# Or use different ports in .env files
```

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Restart postgres
docker restart bytebot-postgres

# Wait 10 seconds
sleep 10

# Try migrations again
cd packages/bytebot-agent
npx prisma migrate deploy
```

### Issue: "API quota exceeded"

**Solution:**
- You're using Gemini 2.5 Flash-Lite (free tier)
- Limits: 15 req/min, 1,500 req/day
- Wait a minute or check quota at: https://ai.dev/rate-limit

### Issue: "Desktop not loading"

**Solution:**
```bash
# Check if desktop container is running
docker ps | grep bytebot-desktop

# If not running, start it
cd docker
docker-compose -f docker-compose.development.yml up bytebot-desktop -d

# Wait 15 seconds
sleep 15

# Refresh browser
```

---

## 📁 Project Structure

```
bytebot/
├── docker/                          # Docker configuration
│   └── docker-compose.development.yml
├── packages/
│   ├── bytebot-agent/              # Backend (NestJS)
│   │   ├── src/
│   │   ├── prisma/                 # Database schema
│   │   ├── .env                    # Backend config
│   │   └── package.json
│   ├── bytebot-ui/                 # Frontend (Next.js)
│   │   ├── src/
│   │   ├── .env                    # Frontend config
│   │   └── package.json
│   ├── bytebotd/                   # Desktop service
│   └── shared/                     # Shared types
└── README.md
```

---

## 🌐 Access URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend UI** | http://localhost:9992 | Main interface |
| Backend API | http://localhost:9991 | API endpoints |
| Desktop API | http://localhost:9990 | Desktop control |
| Database | localhost:5432 | PostgreSQL |

**Note:** Only access the Frontend UI directly. Other services are used internally.

---

## 💡 Tips

### 1. Keep Terminals Open
- Backend and frontend need to stay running
- Don't close their terminal windows

### 2. Watch the Logs
- Backend terminal shows AI requests
- Frontend terminal shows page loads
- Useful for debugging

### 3. Use Free Tier Wisely
- Gemini 2.5 Flash-Lite: 1,500 requests/day
- Perfect for development
- Monitor at: https://ai.dev/rate-limit

### 4. Desktop Tab
- Click "Desktop" in UI to watch agent work
- See Firefox open, clicks happen, etc.
- Take control if agent gets stuck

### 5. Task Types
- **Simple tasks:** No desktop needed (jokes, explanations)
- **Computer use:** Needs desktop (web browsing, screenshots)

---

## 🎓 Next Steps

### Learn More
- Read `DESKTOP_ACCESS_GUIDE.md` for desktop features
- Read `MODEL_UPDATE_2026.md` for AI model info
- Check `DESKTOP_ISSUE_RESOLVED.md` for troubleshooting

### Try Advanced Tasks
```
"Search YouTube for Python tutorials and list the top 3"
"Take a screenshot of the desktop"
"Open Firefox, go to GitHub, and search for 'AI agents'"
```

### Customize
- Change AI model in UI dropdown
- Adjust system prompts in code
- Add custom tools

---

## 📞 Getting Help

### Check Logs
- Backend terminal for API errors
- Frontend terminal for UI errors
- Docker logs: `docker logs bytebot-desktop`

### Common Issues
- See Troubleshooting section above
- Check `DESKTOP_ISSUE_RESOLVED.md`
- Check `API_QUOTA_FIX.md`

### Resources
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [Rate Limits](https://ai.google.dev/gemini-api/docs/rate-limits)

---

## ✅ Quick Reference

### Start Everything
```bash
# Terminal 1: Docker
cd docker
docker-compose -f docker-compose.core.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d

# Terminal 2: Backend
cd packages/bytebot-agent
npm run start:dev

# Terminal 3: Frontend
cd packages/bytebot-ui
npm run dev

# Browser
open http://localhost:9992
```

### Stop Everything
```bash
# Ctrl+C in backend terminal
# Ctrl+C in frontend terminal
cd docker
docker-compose -f docker-compose.core.yml down
```

### Check Status
```bash
docker ps                    # Docker containers
# Check backend terminal      # Should show "successfully started"
# Check frontend terminal     # Should show "Ready on http://localhost:9992"
```

---

## 🎉 You're All Set!

Bytebot is now running and ready to use. Create your first task and watch the AI agent work!

**Happy automating! 🤖**
