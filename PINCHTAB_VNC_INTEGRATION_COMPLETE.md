# PinchTab VNC Integration - Complete Implementation

## What Was Done

Integrated PinchTab directly into the `aria-desktop` container so headed browser instances display in VNC.

## Changes Made

### 1. Dockerfile (`packages/ariad/Dockerfile`)

**Added PinchTab installation:**
```dockerfile
# -----------------------------------------------------------------------------
# PinchTab Installation
# -----------------------------------------------------------------------------
RUN curl -fsSL https://get.pinchtab.com/install.sh | bash \
    && mkdir -p /data/pinchtab \
    && chown -R user:user /data/pinchtab
```

**Exposed PinchTab port:**
```dockerfile
EXPOSE 9990
EXPOSE 9867
```

### 2. Supervisord Config (`packages/ariad/root/etc/supervisor/conf.d/supervisord.conf`)

**Added PinchTab service:**
```ini
[program:pinchtab]
user=user
command=pinchtab serve --port 9867
directory=/home/user
autostart=true
autorestart=true
startsecs=5
priority=50
environment=DISPLAY=":0",HOME="/home/user",PINCHTAB_PORT="9867"
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
redirect_stderr=true
depends_on=xfce4
```

### 3. Docker Compose Files

**Updated `docker/docker-compose.yml`:**
- Added port mapping `9867:9867` to aria-desktop
- Changed `PINCHTAB_BASE_URL` from `http://pinchtab:9867` to `http://aria-desktop:9867`
- Changed aria-agent dependency from `pinchtab` to `aria-desktop`
- Removed standalone `pinchtab` service
- Removed `pinchtab-data` volume

**Updated `docker/docker-compose.core.yml`:**
- Added port mapping `9867:9867` to aria-desktop

## Why This Works

1. **Same Display**: PinchTab runs in the same container as the X11 server (DISPLAY=:0)
2. **No Network Overhead**: No X11 forwarding needed
3. **Automatic Access**: Browser windows automatically appear in VNC
4. **Simpler Architecture**: One less container to manage

## How to Deploy

### Step 1: Rebuild aria-desktop Container

```powershell
# Stop existing containers
docker-compose -f docker/docker-compose.yml down

# Remove old pinchtab container and volume
docker rm -f pinchtab
docker volume rm aria_pinchtab-data

# Rebuild aria-desktop with PinchTab
docker-compose -f docker/docker-compose.yml build aria-desktop

# Start all services
docker-compose -f docker/docker-compose.yml up -d
```

### Step 2: Verify Services

```powershell
# Check if PinchTab is running inside aria-desktop
docker exec aria-desktop ps aux | grep pinchtab

# Check PinchTab health
curl http://localhost:9867/health

# Check supervisord status
docker exec aria-desktop supervisorctl status
```

### Step 3: Test Headed Mode

```powershell
# Launch headed instance
$instance = Invoke-RestMethod -Uri "http://localhost:9867/instances/launch" -Method Post -ContentType "application/json" -Body '{"name":"test","mode":"headed"}'

# Open a tab
$tab = Invoke-RestMethod -Uri "http://localhost:9867/instances/$($instance.id)/tabs/open" -Method Post -ContentType "application/json" -Body '{"url":"https://example.com"}'

# Connect to VNC at localhost:9990 - you should see the browser!

# Cleanup
Invoke-RestMethod -Uri "http://localhost:9867/instances/$($instance.id)" -Method Delete
```

## Troubleshooting

### PinchTab Not Starting

Check logs:
```powershell
docker logs aria-desktop | grep pinchtab
docker exec aria-desktop supervisorctl tail -f pinchtab
```

### Browser Not Showing in VNC

Verify DISPLAY:
```powershell
docker exec -u user aria-desktop env | grep DISPLAY
docker exec -u user aria-desktop xdpyinfo -display :0
```

### Port Already in Use

If port 9867 is already taken:
```powershell
# Find what's using it
netstat -ano | findstr 9867

# Kill the process or change the port mapping
```

## Environment Variables

Update your `.env` file if needed:

```env
# PinchTab now runs inside aria-desktop
PINCHTAB_BASE_URL=http://aria-desktop:9867

# Enable headed mode by default (optional)
PINCHTAB_HEADED_MODE=true
```

## Testing the Full Flow

```powershell
# 1. Connect to VNC
# Open VNC viewer to localhost:9990

# 2. Launch headed browser
curl -X POST http://localhost:9867/instances/launch `
  -H "Content-Type: application/json" `
  -d '{"name":"demo","mode":"headed"}'

# 3. Watch the browser appear in VNC!

# 4. Open Gmail
curl -X POST "http://localhost:9867/instances/{instance-id}/tabs/open" `
  -H "Content-Type: application/json" `
  -d '{"url":"https://mail.google.com"}'

# 5. See Gmail loading in VNC
```

## Benefits

✅ Browser windows visible in VNC  
✅ No DISPLAY configuration needed  
✅ Better performance (no X11 forwarding)  
✅ Simpler architecture (one less container)  
✅ Automatic startup with supervisord  
✅ Proper process management and logging  

## Next Steps

1. Rebuild and test the container
2. Verify headed mode works in VNC
3. Test your email automation task
4. Monitor logs for any issues

The browser should now appear in your VNC session when using headed mode!
