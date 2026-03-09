# ARIA VNC - Quick Start Guide

## 📋 Summary

**Your current VNC setup is PRODUCTION-READY!** ✅

- OS: Ubuntu 22.04
- Desktop: XFCE4 (minimal)
- VNC: x11vnc + websockify
- Apps: Firefox, Terminal, File Manager, Text Editor
- Background: Already configured at `/usr/share/backgrounds/aria-background.jpg`

---

## 🎯 Immediate Actions

### 1. Update Background Image (Optional)

```bash
# Navigate to your project
cd C:\Users\thang\Projects\Aria\Aria

# Copy new background
cp packages\aria-ui\public\ARIA-BG.png ^
   packages\ariad\root\usr\share\backgrounds\aria-background.jpg

# Rebuild container
cd docker
docker-compose -f docker-compose.core.yml build aria-desktop
docker-compose -f docker-compose.core.yml up -d aria-desktop
```

### 2. Clean Up Orphaned Desktop Files

```bash
cd packages\ariad\root\usr\share\applications

# Remove apps that aren't installed
del 1password.desktop
del code.desktop
del thunderbird.desktop

# Keep only:
# - firefox.desktop
# - terminal.desktop
```

### 3. Fix the node_modules Build Error

```bash
cd packages\aria-agent

# Delete corrupted node_modules
rmdir /s /q node_modules

# Reinstall
npm install

# Add to .dockerignore
echo **/node_modules >> ..\.dockerignore
```

---

## 🚀 Future Improvements

### Priority 1: Planning System (Token Savings)

Implement the planning system to save 40-70% tokens:

**Files to create:**
- `packages/aria-agent/src/planner/planner.service.ts`
- `packages/aria-agent/src/planner/planner.types.ts`
- `packages/aria-ui/src/components/planner/PlanViewer.tsx`

**See**: `planning-system-implementation.md` for full guide

### Priority 2: Enhanced System Prompt

Add to ARIA's system prompt:

```
ENVIRONMENT:
- OS: Ubuntu 22.04 LTS
- Desktop: XFCE4
- Display: 1280x960
- User: user (sudo access)

AVAILABLE TOOLS:
Terminal: bash, apt, npm, pip, curl, wget, git, grep, sed, awk
GUI: Firefox, Terminal, File Manager, Text Editor
Files: thunar, mousepad, ristretto

STRATEGY:
- Prefer terminal commands for efficiency
- Use GUI only when necessary
- Plan before executing complex tasks
- Create checkpoints for long operations
```

### Priority 3: Add More Apps (If Needed)

Only add if ARIA specifically needs them:

```dockerfile
# Add to Dockerfile if needed:
RUN apt-get install -y \
    gedit \              # Better text editor
    gnome-screenshot \   # Screenshot tool
    gimp                 # Image editing
```

**Recommendation**: Don't add yet. ARIA can install on-demand via terminal.

---

## 🔧 Current Capabilities

### What ARIA Can Do NOW:

1. **Web Automation**
   - Browse with Firefox
   - Fill forms
   - Download files
   - Extract data

2. **Terminal Operations**
   ```bash
   # File operations
   ls, cp, mv, rm, mkdir, cat, grep, find
   
   # Package management
   sudo apt install <package>
   npm install -g <package>
   pip3 install <package>
   
   # System info
   ps aux, top, df, free, uname
   
   # Network
   curl, wget, ping
   ```

3. **GUI Automation**
   - Screenshot-based navigation
   - Mouse clicks
   - Keyboard input
   - Window management

4. **File Management**
   - Create/edit files (mousepad)
   - Browse files (thunar)
   - View images (ristretto)
   - Extract archives (file-roller)

---

## 📊 Token Optimization Opportunities

### Current Problem:
Every action requires screenshot analysis (1500 tokens each)

### Solution Examples:

**Task**: "Create a file named test.txt with content 'Hello'"

**Bad (GUI) - 4500 tokens:**
1. Screenshot → Click file manager → 1500 tokens
2. Screenshot → Right click → New file → 1500 tokens
3. Screenshot → Type name and content → 1500 tokens

**Good (Terminal) - 200 tokens:**
1. `echo "Hello" > test.txt` → 200 tokens

**Savings: 95.6%**

---

## 🎨 VNC Architecture

```
┌─────────────────────────────────────────┐
│         User's Browser                  │
│    http://localhost:6080/vnc.html       │
└────────────────┬────────────────────────┘
                 │ WebSocket
                 ▼
┌─────────────────────────────────────────┐
│      websockify (port 6080)             │
│   WebSocket ↔ TCP Proxy                 │
└────────────────┬────────────────────────┘
                 │ TCP
                 ▼
┌─────────────────────────────────────────┐
│      x11vnc (port 5900)                 │
│   VNC Server sharing X display          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│      Xvfb (display :0)                  │
│   Virtual framebuffer 1280x960          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│         XFCE4 Desktop                   │
│  - Firefox                              │
│  - Terminal                             │
│  - File Manager                         │
│  - Custom Background                    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     ARIA Agent (Node.js)                │
│  Takes screenshots & performs actions   │
└─────────────────────────────────────────┘
```

---

## ❓ FAQ

### Q: Why Ubuntu 22.04 instead of Windows?
**A**: Linux is better for automation:
- Lighter weight
- Better terminal tools
- Easier to script
- No licensing issues
- More stable for headless operation

### Q: Can ARIA install additional software?
**A**: Yes! Via terminal:
```bash
sudo apt install <package>  # System packages
npm install -g <tool>       # Node.js tools
pip3 install <library>      # Python libraries
```

### Q: How do I change the screen resolution?
**A**: Edit in `supervisord.conf`:
```
command=Xvfb :0 -screen 0 1920x1080x24 -ac -nolisten tcp
```

### Q: How to access VNC?
**A**: 
- Via browser: `http://localhost:6080/vnc.html`
- Via VNC client: `vnc://localhost:5900`

### Q: How to add a desktop shortcut?
**A**: Create .desktop file in `/home/user/Desktop/`:
```desktop
[Desktop Entry]
Type=Application
Name=My App
Exec=/path/to/app
Icon=/path/to/icon
Terminal=false
```

---

## 📞 Next Steps

1. ✅ Fix node_modules build error (add to .dockerignore)
2. ✅ Clean up orphaned .desktop files
3. ⏳ Implement planning system (see planning-system-implementation.md)
4. ⏳ Enhance system prompt with terminal capabilities
5. ⏳ Add multi-path selection UI
6. ⏳ Add editable todo list widget

---

## 📚 Resources

- **Full Analysis**: `ARIA_VNC_ANALYSIS.md`
- **Planning System**: `planning-system-implementation.md`
- **Desktop Cleanup**: `desktop-cleanup-guide.md`
- **Background Update**: `update-background.sh`

**Questions?** All documentation is in `/home/claude/` on this system.
