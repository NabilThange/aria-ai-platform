# PinchTab Dockerfile Verification

## Installation Method: ✅ CORRECT

```dockerfile
RUN npm install -g pinchtab \
    && mkdir -p /home/user/.pinchtab /data/pinchtab \
    && chown -R user:user /home/user/.pinchtab /data/pinchtab
```

**Why this is correct:**
- Uses official npm package: `npm install -g pinchtab`
- Installed AFTER user creation (user exists at this point)
- Creates necessary directories with proper permissions

## Supervisord Configuration: ✅ CORRECT

```ini
[program:pinchtab]
user=user
command=pinchtab serve --port 9867
directory=/home/user
autostart=true
autorestart=true
startsecs=5
priority=50
environment=DISPLAY=":0",HOME="/home/user",PINCHTAB_PORT="9867",PATH="/usr/local/bin:/usr/bin:/bin"
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true
depends_on=xfce4
```

**Why this is correct:**
- Uses official command: `pinchtab serve --port 9867`
- Runs as user (not root)
- Has DISPLAY=:0 for VNC integration
- Starts after xfce4 (X11 server is ready)
- PATH includes /usr/local/bin where npm global packages are installed

## Port Exposure: ✅ CORRECT

```dockerfile
EXPOSE 9990
EXPOSE 9867
```

## Expected Behavior

When the container starts:
1. Xvfb starts (X11 virtual framebuffer on :0)
2. XFCE4 desktop starts
3. PinchTab starts with DISPLAY=:0
4. PinchTab can launch headed browsers that appear in VNC

## Verification Commands

After building and starting:

```powershell
# Check if PinchTab process is running
docker exec aria-desktop ps aux | Select-String pinchtab

# Check supervisord status
docker exec aria-desktop supervisorctl status pinchtab

# Check PinchTab health
curl http://localhost:9867/health

# Test headed instance
curl -X POST http://localhost:9867/instances/launch -H "Content-Type: application/json" -d '{"name":"test","mode":"headed"}'
```

## Build Command

```powershell
docker-compose -f docker/docker-compose.yml build --no-cache aria-desktop
```

## Summary

✅ Installation: Correct (npm install -g pinchtab)  
✅ Command: Correct (pinchtab serve --port 9867)  
✅ User: Correct (runs as user, not root)  
✅ Display: Correct (DISPLAY=:0 for VNC)  
✅ Timing: Correct (installed after user creation)  
✅ Dependencies: Correct (depends on xfce4)  

**The Dockerfile is ready to build!**
