# Local Desktop Setup Guide for Users

Welcome! This guide will help you run ARIA's desktop automation locally while using our hosted services.

## What You're Setting Up

- ✅ **Frontend**: Already hosted at https://ai-aria.vercel.app (no setup needed)
- ✅ **AI Agent**: Already hosted at https://aria-agent.onrender.com (no setup needed)
- ✅ **Database**: Already hosted on Render (no setup needed)
- 🔧 **Desktop Daemon**: You'll run this locally on your machine

## Why Run Desktop Locally?

The desktop automation component (ariad) provides a virtual Linux desktop for AI agents to interact with. Running it locally means:
- No hosting costs for you
- Full control over the desktop environment
- Works immediately without waiting for hosted desktop
- Your data stays on your machine

## Prerequisites

Choose ONE of these options:

### Option A: Docker (Recommended - Easiest)
- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- That's it!

### Option B: Manual Setup
- Node.js 18+ installed
- Git installed
- Basic terminal knowledge

## Setup Instructions

### Option A: Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/aria.git
   cd aria
   ```

2. **Start the desktop daemon**
   ```bash
   docker-compose up ariad
   ```

   Or run in background:
   ```bash
   docker-compose up -d ariad
   ```

3. **Verify it's running**
   ```bash
   docker-compose ps
   ```
   You should see `ariad` with status "Up"

4. **Done!** The desktop daemon is now running at `ws://localhost:9990/websockify`

### Option B: Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/aria.git
   cd aria
   ```

2. **Install dependencies**
   ```bash
   cd packages/ariad
   npm install
   ```

3. **Start the desktop daemon**
   ```bash
   npm run start
   ```

4. **Done!** The desktop daemon is now running at `ws://localhost:9990/websockify`

## Using the Desktop

1. **Open the web interface**
   - Go to: https://ai-aria.vercel.app/desktop

2. **Switch to Local Desktop mode**
   - You'll see a toggle at the top: **Online Desktop** | **Local Desktop**
   - Click **Local Desktop**
   - The interface will connect to your local desktop daemon

3. **Start using it!**
   - You should now see a Linux desktop in your browser
   - The AI agent can interact with this desktop
   - All automation happens on your local machine

## Troubleshooting

### "Cannot connect to desktop"

**Check if ariad is running:**
```bash
# For Docker:
docker-compose ps

# For manual setup:
# Check if the process is running in your terminal
```

**Check if port 9990 is available:**
```bash
# Windows (PowerShell):
netstat -ano | findstr :9990

# Mac/Linux:
lsof -i :9990
```

**Restart the desktop daemon:**
```bash
# For Docker:
docker-compose restart ariad

# For manual setup:
# Stop the process (Ctrl+C) and run npm run start again
```

### "Connection refused" or "WebSocket error"

**Check your firewall:**
- Ensure port 9990 is not blocked by your firewall
- On Windows: Windows Defender Firewall → Allow an app
- On Mac: System Preferences → Security & Privacy → Firewall

**Try a different browser:**
- Chrome/Edge (recommended)
- Firefox
- Safari

### Desktop is slow or laggy

**Allocate more resources (Docker only):**
1. Open Docker Desktop
2. Go to Settings → Resources
3. Increase CPU and Memory allocation
4. Restart Docker

**Close other applications:**
- The desktop daemon needs CPU and memory
- Close unnecessary applications

## Stopping the Desktop

### Docker:
```bash
# Stop the desktop daemon
docker-compose stop ariad

# Or stop and remove containers
docker-compose down
```

### Manual Setup:
- Press `Ctrl+C` in the terminal where ariad is running

## Advanced Configuration

### Change the VNC Port

**Docker**: Edit `docker-compose.yml`
```yaml
services:
  ariad:
    ports:
      - "9990:9990"  # Change first number to your desired port
```

**Manual**: Edit `packages/ariad/.env`
```env
VNC_PORT=9990  # Change to your desired port
```

### Connect to Hosted Agent API

The desktop daemon can communicate with the hosted agent API. This is already configured, but you can customize it:

**Create** `packages/ariad/.env.local`:
```env
ARIA_AGENT_BASE_URL=https://aria-agent.onrender.com
```

## FAQ

**Q: Do I need to keep the terminal open?**
A: Yes, unless you run Docker in detached mode (`-d` flag)

**Q: Can I use the desktop for other things?**
A: Yes! It's a full Linux desktop. You can install software, browse the web, etc.

**Q: Is my data safe?**
A: Yes! Everything runs locally on your machine. The hosted services only store task metadata and chat history.

**Q: Can multiple people use the same desktop?**
A: No, each user should run their own local desktop daemon.

**Q: What if I want to use the hosted desktop instead?**
A: Switch to "Online Desktop" mode. This will be available once we host the desktop daemon.

**Q: How much disk space does this use?**
A: Docker image: ~2GB. Running container: ~500MB additional.

**Q: Can I run this on a server?**
A: Yes! Just ensure port 9990 is accessible and use the server's IP instead of localhost.

## Getting Help

- **GitHub Issues**: https://github.com/your-org/aria/issues
- **Discord**: [Your Discord Link]
- **Email**: support@aria.ai

## Next Steps

Once your local desktop is running:
1. Visit https://ai-aria.vercel.app/aria-agent to chat with the AI
2. Create tasks that require desktop automation
3. Watch the AI interact with your local desktop in real-time!

Enjoy using ARIA! 🚀
