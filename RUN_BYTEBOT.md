# 🚀 How to Run Bytebot - Cheat Sheet

## 📋 BEFORE YOU START - OPEN 3 TERMINALS

You need **3 separate terminal windows** open:

- **TERMINAL 1** → Docker (Postgres + Desktop)
- **TERMINAL 2** → Backend (API Server)
- **TERMINAL 3** → Frontend (UI)

Keep all 3 terminals open while using Bytebot!

---

## ⚡ Quick Commands (Copy & Paste)

### TERMINAL 1 - Docker Services

```bash
cd docker
docker-compose -f docker-compose.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
```

**Wait 20 seconds** for containers to fully start, then continue.

---

### TERMINAL 2 - Backend API

```bash
cd packages/bytebot-agent
npm run start:dev
```

**Keep this terminal open!** Wait for "Nest application successfully started"

---

### TERMINAL 3 - Frontend UI

```bash
cd packages/bytebot-ui
npm run dev
```

**Keep this terminal open!** Wait for "Ready on http://localhost:9992"

---

### 4️⃣ Open Browser

```
http://localhost:9992
```

---

## 🛑 Stop Everything

**TERMINAL 2 (Backend):** Press `Ctrl+C`

**TERMINAL 3 (Frontend):** Press `Ctrl+C`

**TERMINAL 1 (Docker):**
```bash
cd docker
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.core.yml down
```

---

## ✅ Check if Running

```bash
# Check Docker
docker ps

# Should show:
# - bytebot-postgres (port 5432)
# - bytebot-desktop (port 9990)

# Check Backend Terminal
# Should show: "Nest application successfully started"

# Check Frontend Terminal  
# Should show: "Ready on http://localhost:9992"
```

---

## 🔄 Restart After Stopping

Open 3 terminals and run these commands:

**TERMINAL 1 - Docker:**
```bash
cd docker
docker-compose -f docker-compose.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
```

Wait 20 seconds, then:

**TERMINAL 2 - Backend:**
```bash
cd packages/bytebot-agent
npm run start:dev
```

**TERMINAL 3 - Frontend:**
```bash
cd packages/bytebot-ui
npm run dev
```

**Browser:**
```
http://localhost:9992
```

---

## 🎯 Your Current Status

Based on our session, everything is **already running**:

- ✅ Docker containers: Running
- ✅ Backend: Running (process 20208)
- ✅ Frontend: Running
- ✅ Browser: Open at http://localhost:9992

**You don't need to restart anything!** Just use the UI.

---

## 💡 Quick Tips

- **Open 3 terminals:** Docker, Backend, Frontend
- **Keep all terminals open:** Don't close them while using Bytebot
- **Check each terminal:** Make sure no errors appear
- **Desktop tab:** Click "Desktop" in UI to watch agent work
- **Simple tasks:** "Tell me a joke" (no desktop needed)
- **Computer tasks:** "Open Firefox and go to python.org" (uses desktop)

---

## 🆘 If Something Breaks

### Restart Everything

**TERMINAL 1 - Stop Docker:**
```bash
cd docker
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.core.yml down
```

**TERMINAL 1 - Start Docker:**
```bash
docker-compose -f docker-compose.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
```

Wait 20 seconds, then:

**TERMINAL 2 - Backend:**
```bash
cd packages/bytebot-agent
npm run start:dev
```

**TERMINAL 3 - Frontend:**
```bash
cd packages/bytebot-ui
npm run dev
```

**Browser:**
```
http://localhost:9992
```

---

## 📊 Port Reference

- **9992** - Frontend UI (open this in browser)
- **9991** - Backend API
- **9990** - Desktop API
- **5432** - Database

---

**That's it! You're ready to use Bytebot! 🎉**
