# PinchTab Connection Fix

## Problem

The Web Agent fails with `fetch failed` error when trying to connect to PinchTab.

**Root Cause:** The aria-agent is running LOCALLY (not in Docker), but it's trying to connect to `http://pinchtab:9867` which is a Docker hostname that only works inside the Docker network.

## Evidence

1. **PinchTab is running and healthy:**
   ```bash
   docker ps | grep pinchtab
   # Shows: pinchtab running on 0.0.0.0:9867->9867/tcp
   
   curl http://localhost:9867/health
   # Returns: {"mode":"dashboard","status":"ok"}
   ```

2. **aria-agent is running LOCALLY (not in Docker):**
   ```bash
   docker ps | grep aria-agent
   # Returns: nothing (not running in Docker)
   ```

3. **Default configuration uses Docker hostname:**
   ```typescript
   // packages/aria-agent/src/services/pinchtab.service.ts
   this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://pinchtab:9867';
   ```

## Solution

When running aria-agent locally (outside Docker), you need to set the environment variable to use `localhost`:

### Option 1: Set Environment Variable (Recommended)

Create or update `.env` file in `packages/aria-agent/`:

```env
PINCHTAB_BASE_URL=http://localhost:9867
```

### Option 2: Update Default in Code

Edit `packages/aria-agent/src/services/pinchtab.service.ts`:

```typescript
constructor() {
  // Check if running in Docker or locally
  const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
  const defaultUrl = isDocker ? 'http://pinchtab:9867' : 'http://localhost:9867';
  this.baseUrl = process.env.PINCHTAB_BASE_URL || defaultUrl;
}
```

### Option 3: Set Environment Variable When Starting

```bash
# Windows PowerShell
$env:PINCHTAB_BASE_URL="http://localhost:9867"
npm run dev

# Windows CMD
set PINCHTAB_BASE_URL=http://localhost:9867
npm run dev

# Linux/Mac
PINCHTAB_BASE_URL=http://localhost:9867 npm run dev
```

## Verification

After applying the fix, test the connection:

```bash
# From aria-agent directory
node -e "fetch('http://localhost:9867/health').then(r => r.json()).then(console.log)"
```

Expected output:
```json
{"mode":"dashboard","status":"ok"}
```

## Docker vs Local Development

### When Running in Docker (docker-compose up):
- Use: `PINCHTAB_BASE_URL=http://pinchtab:9867`
- Docker networking resolves `pinchtab` hostname

### When Running Locally (npm run dev):
- Use: `PINCHTAB_BASE_URL=http://localhost:9867`
- Local networking uses `localhost`

## Recommended Setup

Add to `packages/aria-agent/.env`:

```env
# Local development
PINCHTAB_BASE_URL=http://localhost:9867
ARIA_DESKTOP_BASE_URL=http://localhost:9990
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ariadb

# Docker (these are defaults in docker-compose.yml)
# PINCHTAB_BASE_URL=http://pinchtab:9867
# ARIA_DESKTOP_BASE_URL=http://aria-desktop:9990
# REDIS_URL=redis://redis:6379
# DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ariadb
```

## Testing

After fixing, try the email task again:

```
Task: "Send an email to test@example.com with subject 'Test' and body 'Hello'"
```

Expected behavior:
1. Orchestrator creates plan with correct type assignments
2. Desktop Agent opens Chrome (if needed)
3. Web Agent connects to PinchTab successfully
4. Web Agent navigates to Gmail and sends email

## Related Files

- `packages/aria-agent/src/services/pinchtab.service.ts` - PinchTab client
- `packages/aria-agent/src/agents/web/web.agent.ts` - Web Agent using PinchTab
- `docker/docker-compose.yml` - Docker configuration
- `packages/aria-agent/.env` - Environment variables (create if missing)
