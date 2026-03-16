# PinchTab Connection Fix

## Problem
PinchTab was failing with "fetch failed" error despite being accessible via curl. The issue was:

1. **Wrong default hostname**: Code defaulted to `http://pinchtab:9867` instead of `http://aria-desktop:9867`
2. **No health checks**: Service tried to connect immediately without verifying PinchTab was ready
3. **No retry logic**: Single attempt with generic error messages
4. **No timeout handling**: Requests could hang indefinitely

## Root Cause
- aria-agent runs in Docker container and needs to use Docker service name `aria-desktop`
- PinchTab service might not be ready when aria-agent starts
- Network errors weren't being caught or retried

## Solution Applied

### 1. Fixed Default Hostname
```typescript
// Before
this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://pinchtab:9867';

// After
this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://aria-desktop:9867';
```

### 2. Added Retry Logic with Exponential Backoff
- 3 retry attempts for all requests
- Exponential backoff: 1s, 2s, 4s (max 5s)
- 10-second timeout per request
- Detailed error messages with URL and attempt count

### 3. Added Health Check Before Initialization
- Checks PinchTab availability 5 times before giving up
- 2-second delay between health checks
- Clear error message if service is unavailable

### 4. Improved Error Messages
```typescript
// Before
throw new Error(`PinchTab request failed: ${response.statusText}`);

// After
throw new Error(`PinchTab request failed after ${retries} attempts to ${url}: ${lastError?.message || 'Unknown error'}`);
```

## Testing

### Verify the fix:
1. Rebuild aria-agent container:
   ```bash
   cd docker
   docker-compose build aria-agent
   docker-compose up -d aria-agent
   ```

2. Check logs for successful connection:
   ```bash
   docker logs aria-agent -f
   ```

   You should see:
   ```
   [PinchTabService] PinchTab base URL: http://aria-desktop:9867
   [PinchTabService] Checking PinchTab availability...
   [PinchTabService] PinchTab is ready
   [PinchTabService] Initializing PinchTab instance with profile: default, mode: headless
   [PinchTabService] PinchTab instance created: <instance-id> (headless mode)
   ```

3. Test with a web task through the UI

## Files Modified
- `packages/aria-agent/src/services/pinchtab.service.ts`
  - Fixed default hostname
  - Added retry logic with exponential backoff
  - Added 10-second timeout
  - Added health check before initialization
  - Improved error messages

## Configuration
The docker-compose.yml already has the correct configuration:
```yaml
environment:
  - PINCHTAB_BASE_URL=${PINCHTAB_BASE_URL:-http://aria-desktop:9867}
```

No changes needed to docker-compose.yml.
