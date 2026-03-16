# PinchTab VNC Display Configuration Fix

## Problem

PinchTab headed instances launch but immediately error because PinchTab can't find a display to show the browser. The browser needs to connect to the VNC X11 display server.

## Root Cause

PinchTab container is missing:
1. `DISPLAY` environment variable (should be `:0` or `:1`)
2. Network access to the aria-desktop container's X11 server
3. Proper X11 authentication

## Solution Options

### Option 1: Run PinchTab in Same Container as VNC (Recommended)

Move PinchTab into the `aria-desktop` container where the X11 display server is running.

**Modify `packages/ariad/Dockerfile`:**

```dockerfile
# Add PinchTab installation
RUN curl -fsSL https://pinchtab.com/install.sh | bash

# Expose PinchTab port
EXPOSE 9867

# Start PinchTab alongside other services
CMD ["sh", "-c", "pinchtab serve & your-existing-startup-command"]
```

### Option 2: Share Display Between Containers

Configure PinchTab to connect to aria-desktop's display.

**Update `docker/docker-compose.yml`:**

```yaml
pinchtab:
  image: pinchtab/pinchtab:latest
  container_name: pinchtab
  restart: unless-stopped
  ports:
    - "9867:9867"
  environment:
    - PINCHTAB_PORT=9867
    - DISPLAY=aria-desktop:0  # Connect to aria-desktop's display
  volumes:
    - pinchtab-data:/data
    - /tmp/.X11-unix:/tmp/.X11-unix  # Share X11 socket
  shm_size: "2g"
  networks:
    - aria-network
  depends_on:
    - aria-desktop
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9867/health"]
    interval: 10s
```

**Also update `aria-desktop` to allow X11 connections:**

```yaml
aria-desktop:
  build:
    context: ../packages
    dockerfile: ariad/Dockerfile
  shm_size: "2g"
  container_name: aria-desktop
  restart: unless-stopped
  hostname: computer
  privileged: true
  ports:
    - "9990:9990"
  environment:
    - DISPLAY=:0
    - XAUTHORITY=/tmp/.Xauthority
  volumes:
    - /tmp/.X11-unix:/tmp/.X11-unix  # Share X11 socket
  command: >
    sh -c "
    xhost +local: &&
    your-existing-startup-command
    "
```

### Option 3: Use X11 Forwarding Over Network

**Update `docker/docker-compose.yml`:**

```yaml
pinchtab:
  image: pinchtab/pinchtab:latest
  container_name: pinchtab
  restart: unless-stopped
  ports:
    - "9867:9867"
  environment:
    - PINCHTAB_PORT=9867
    - DISPLAY=aria-desktop:0
  extra_hosts:
    - "aria-desktop:host-gateway"
  shm_size: "2g"
  networks:
    - aria-network
  depends_on:
    - aria-desktop
```

**In aria-desktop container, enable X11 TCP connections:**

```bash
# In aria-desktop startup script
xhost +
X :0 -listen tcp &
```

## Quick Test Commands

After applying the fix:

```powershell
# Restart containers
docker-compose -f docker/docker-compose.yml down
docker-compose -f docker/docker-compose.yml up -d

# Test headed instance
curl -X POST http://localhost:9867/instances/launch -H "Content-Type: application/json" -d "{\"name\":\"test\",\"mode\":\"headed\"}"

# Check instance status
curl http://localhost:9867/instances

# Connect to VNC to see the browser
# Open VNC viewer to localhost:9990
```

## Verify Display is Available

Inside the PinchTab container:

```bash
# Check if DISPLAY is set
docker exec pinchtab env | grep DISPLAY

# Test X11 connection
docker exec pinchtab xdpyinfo -display :0

# List X11 displays
docker exec pinchtab ls -la /tmp/.X11-unix/
```

## Recommended Approach

**Option 1 is best** because:
- PinchTab and VNC share the same display naturally
- No network/authentication complexity
- Better performance (no X11 forwarding overhead)
- Simpler configuration

## Implementation Steps for Option 1

1. Modify `packages/ariad/Dockerfile` to install PinchTab
2. Update startup script to launch PinchTab service
3. Remove PinchTab from docker-compose.yml
4. Update `PINCHTAB_BASE_URL` to `http://localhost:9867`
5. Rebuild and restart aria-desktop container

Would you like me to implement Option 1?
