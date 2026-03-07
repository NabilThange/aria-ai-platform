# 📚 Documentation Updated

## ✅ Files Updated

Updated the quick start guides to reflect the correct Docker commands:

### 1. QUICKSTART.md
- ✅ Changed from `docker-compose.development.yml` to `docker-compose.core.yml`
- ✅ Added build step for custom desktop image
- ✅ Updated wait time from 15 to 20 seconds
- ✅ Added Windows PowerShell commands for .env creation
- ✅ Updated all stop/restart commands

### 2. RUN_BYTEBOT.md
- ✅ Changed from `docker-compose.development.yml` to `docker-compose.core.yml`
- ✅ Added build step for custom desktop image
- ✅ Updated wait time from 15 to 20 seconds
- ✅ Updated all stop/restart commands

---

## 🔄 What Changed

### Old Commands (Incorrect)
```bash
# Used development compose file
docker-compose -f docker-compose.development.yml up postgres bytebot-desktop -d
```

**Problem:** This didn't build your custom Dockerfile with ARIA wallpaper and mousepad.

### New Commands (Correct)
```bash
# Use core compose file with custom build
docker-compose -f docker-compose.core.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
```

**Benefits:**
- ✅ Builds your custom Dockerfile
- ✅ Includes ARIA-BG.png wallpaper
- ✅ Includes mousepad text editor
- ✅ Uses correct privilege settings

---

## 📋 Key Differences

### docker-compose.development.yml
- Uses pre-built image: `ghcr.io/bytebot-ai/bytebot-desktop:edge`
- No customization
- Faster startup (no build)
- Good for: Quick testing without customization

### docker-compose.core.yml
- Builds from custom Dockerfile: `docker/bytebot-desktop.Dockerfile`
- Includes your customizations
- Requires build step
- Good for: Development with custom wallpaper/apps

---

## 🎯 Current Setup

Your current setup uses:
- ✅ `docker-compose.core.yml`
- ✅ Custom Dockerfile with ARIA wallpaper
- ✅ Mousepad text editor
- ✅ Proper privilege handling

---

## 📝 Complete Startup Commands

### For Fresh Start

```bash
# Terminal 1: Docker
cd docker
docker-compose -f docker-compose.core.yml up postgres -d
docker-compose -f docker-compose.core.yml build bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d

# Wait 20 seconds

# Terminal 2: Backend
cd packages/bytebot-agent
npm run start:dev

# Terminal 3: Frontend
cd packages/bytebot-ui
npm run dev

# Browser
http://localhost:9992
```

### For Restart (After Stopping)

```bash
# Terminal 1: Docker
cd docker
docker-compose -f docker-compose.core.yml up postgres bytebot-desktop -d

# No need to rebuild unless Dockerfile changed

# Terminal 2: Backend
cd packages/bytebot-agent
npm run start:dev

# Terminal 3: Frontend
cd packages/bytebot-ui
npm run dev
```

### To Stop Everything

```bash
# Ctrl+C in backend terminal
# Ctrl+C in frontend terminal

cd docker
docker-compose -f docker-compose.core.yml down
```

---

## 🔧 When to Rebuild Desktop

Rebuild the desktop image when you change:
- ✅ Wallpaper (ARIA-BG.png)
- ✅ Installed applications (mousepad, etc.)
- ✅ Desktop configuration
- ✅ Dockerfile itself

```bash
cd docker
docker-compose -f docker-compose.core.yml build --no-cache bytebot-desktop
docker-compose -f docker-compose.core.yml up bytebot-desktop -d
```

---

## 💡 Tips

1. **First time setup:** Use the build command
2. **Daily restarts:** Skip build unless you changed Dockerfile
3. **Wallpaper not showing:** Rebuild with `--no-cache`
4. **Container crashing:** Check logs with `docker logs bytebot-desktop`

---

**Documentation Updated:** March 6, 2026  
**Files:** QUICKSTART.md, RUN_BYTEBOT.md  
**Status:** ✅ Ready to use
