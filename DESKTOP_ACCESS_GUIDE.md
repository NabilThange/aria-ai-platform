# How to Access the Desktop - Guide 🖥️

## ❌ Common Mistake

**DON'T go to:** http://localhost:9990

This shows `{"message":"Cannot GET /","error":"Not Found","statusCode":404}` because port 9990 is the **backend API** for the desktop service, not a web interface.

---

## ✅ Correct Way to Access Desktop

### Method 1: Through Bytebot UI (Recommended)

1. **Open the Bytebot UI:**
   ```
   http://localhost:9992
   ```

2. **Click on "Desktop" in the sidebar**
   - You'll see a navigation menu on the left
   - Click the "Desktop" tab/button

3. **View the Virtual Desktop**
   - The desktop will load in the UI
   - You'll see the Ubuntu XFCE desktop
   - You can watch the agent work in real-time

### Method 2: Direct VNC Connection (Advanced)

If you want to use a standalone VNC client:

1. **Install a VNC viewer** (like TigerVNC, RealVNC, or TightVNC)

2. **Connect to:**
   ```
   localhost:5900
   ```
   (VNC typically uses port 5900, but check the container config)

---

## 🔍 Understanding the Ports

### Port 9990 - Desktop API (Backend)
- **Type:** NestJS API + WebSocket proxy
- **Purpose:** Handles computer use commands
- **Endpoints:**
  - `/computer-use` - Execute computer actions
  - `/websockify` - WebSocket proxy to VNC
  - `/input-tracking` - Track user input
- **Access:** Used by the backend, not directly by users

### Port 9992 - Bytebot UI (Frontend)
- **Type:** Next.js web application
- **Purpose:** User interface for Bytebot
- **Features:**
  - Task management
  - Desktop viewer (embedded VNC)
  - Message history
  - Settings
- **Access:** Open in your browser

### Port 6080 - noVNC Server (Internal)
- **Type:** VNC web server
- **Purpose:** Serves the VNC viewer
- **Access:** Proxied through port 9990, accessed via UI

---

## 🎯 What You Should See

### In the Bytebot UI (http://localhost:9992)

When you click "Desktop", you should see:

```
┌─────────────────────────────────────────────────────────┐
│  Bytebot UI - Desktop Tab                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │                                               │    │
│  │     Ubuntu Desktop (XFCE)                     │    │
│  │                                               │    │
│  │     [Desktop wallpaper]                       │    │
│  │     [Application icons]                       │    │
│  │     [Panel at bottom]                         │    │
│  │                                               │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  Status: Connected                                      │
│  Resolution: 1024x768                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Desktop Access

### Step 1: Open the UI
```
http://localhost:9992
```

### Step 2: Navigate to Desktop
- Look for "Desktop" in the sidebar
- Click it

### Step 3: Verify Connection
You should see:
- ✅ Ubuntu desktop with XFCE interface
- ✅ Desktop wallpaper
- ✅ Application panel at the bottom
- ✅ Mouse cursor that you can control

### Step 4: Test Interaction
- Move your mouse over the desktop
- Click on the desktop
- Try opening the application menu

---

## 🔧 Troubleshooting

### Issue: Desktop tab shows "Connection Failed"

**Check 1: Is the container running?**
```bash
docker ps | grep bytebot-desktop
```
Should show: `Up X minutes   0.0.0.0:9990->9990/tcp   bytebot-desktop`

**Check 2: Check container logs**
```bash
docker logs bytebot-desktop --tail 50
```
Look for errors

**Check 3: Restart the container**
```bash
docker restart bytebot-desktop
```
Wait 10 seconds, then refresh the UI

### Issue: Desktop tab is not visible in UI

**Check 1: Is the UI running?**
```bash
# Check if frontend is running in its terminal
```

**Check 2: Refresh the browser**
- Press F5 or Ctrl+R
- Clear cache if needed

**Check 3: Check browser console**
- Press F12
- Look for errors in Console tab

### Issue: Desktop shows but is frozen

**Check 1: Check WebSocket connection**
- Open browser DevTools (F12)
- Go to Network tab
- Filter by "WS" (WebSocket)
- Look for `/websockify` connection

**Check 2: Restart desktop container**
```bash
docker restart bytebot-desktop
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Your Browser                         │
│                 http://localhost:9992                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Bytebot UI (Frontend)                      │
│                   Port 9992                             │
│  - Task Management                                      │
│  - Desktop Viewer (embedded)                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ WebSocket (/websockify)
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Bytebot Desktop API (bytebotd)                │
│                   Port 9990                             │
│  - Computer Use API                                     │
│  - WebSocket Proxy                                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Proxy to VNC
                     ▼
┌─────────────────────────────────────────────────────────┐
│              noVNC Server (Internal)                    │
│                   Port 6080                             │
│  - VNC Web Server                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ VNC Protocol
                     ▼
┌─────────────────────────────────────────────────────────┐
│           X11 VNC Server (TigerVNC)                     │
│                   Port 5900                             │
│  - Virtual Display :0                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Display
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Ubuntu Desktop (XFCE)                      │
│  - Firefox                                              │
│  - Terminal                                             │
│  - File Manager                                         │
│  - Other Applications                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Key Points

1. **Port 9990 is NOT a web interface** - it's an API
2. **Access desktop through the UI** at http://localhost:9992
3. **Click "Desktop" tab** in the sidebar
4. **The desktop is embedded** in the Bytebot UI
5. **You can watch the agent work** in real-time

---

## 🎯 Quick Access

**To view the desktop:**
1. Open: http://localhost:9992
2. Click: "Desktop" in sidebar
3. Watch: The agent work on tasks

**To create a computer use task:**
1. Open: http://localhost:9992
2. Click: "New Task" or "Tasks"
3. Enter: "Open Firefox and go to python.org"
4. Watch: The agent execute in the Desktop tab

---

## ✅ Summary

- ❌ **Don't use:** http://localhost:9990 (API only)
- ✅ **Use:** http://localhost:9992 → Desktop tab
- 🖥️ **Desktop is embedded** in the Bytebot UI
- 👀 **Watch tasks execute** in real-time
- 🎮 **Take control** if agent needs help

---

**Access Method:** Through Bytebot UI  
**URL:** http://localhost:9992  
**Tab:** Desktop (in sidebar)
