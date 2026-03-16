# PinchTab API Corrections

## Summary

After using Context7 MCP to fetch the latest PinchTab documentation, I discovered several API endpoint differences from the initial implementation. All corrections have been applied.

## API Endpoint Corrections

### 1. Instance Creation ✅ FIXED

**Before (Incorrect):**
```
POST /instances
Body: { "profile": "default" }
```

**After (Correct):**
```
POST /instances/launch
Body: { "name": "default", "mode": "headless" }
```

**Source:** [PinchTab TESTING.md](https://github.com/pinchtab/pinchtab/blob/main/TESTING.md)

---

### 2. Navigation (Tab Opening) ✅ FIXED

**Before (Incorrect):**
```
POST /instances/{id}/action
Body: { "kind": "navigate", "url": "https://example.com" }
```

**After (Correct):**
```
POST /instances/{id}/tabs/open
Body: { "url": "https://example.com" }
Returns: { "tabId": "tab_abc123", "url": "..." }
```

**Source:** [PinchTab endpoints.md](https://github.com/pinchtab/pinchtab/blob/main/docs/references/endpoints.md)

---

### 3. Snapshot Retrieval ✅ FIXED

**Before (Incorrect):**
```
GET /instances/{id}/snapshot?filter=interactive
```

**After (Correct):**
```
GET /tabs/{tabId}/snapshot?filter=interactive
```

**Source:** [PinchTab API Reference](https://github.com/pinchtab/pinchtab/blob/main/docs/references/api-structure.md)

---

### 4. Page Actions ✅ FIXED

**Before (Incorrect):**
```
POST /instances/{id}/action
Body: { "kind": "click", "ref": "e5" }
```

**After (Correct):**
```
POST /tabs/{tabId}/action
Body: { "kind": "click", "ref": "e5" }
```

**Source:** [PinchTab API Comment Format](https://github.com/pinchtab/pinchtab/blob/main/scripts/API_COMMENT_FORMAT.md)

---

## Docker Configuration Corrections

### 1. Docker Image ✅ FIXED

**Before (Incorrect):**
```yaml
image: ghcr.io/pinchtab/pinchtab:latest
```

**After (Correct):**
```yaml
image: pinchtab/pinchtab:latest
```

**Reason:** The image is hosted on Docker Hub, not GitHub Container Registry.

---

### 2. Required Volumes ✅ ADDED

**Before (Missing):**
```yaml
# No volumes
```

**After (Correct):**
```yaml
volumes:
  - pinchtab-data:/data
```

**Reason:** PinchTab stores config at `/data/.config/pinchtab/config.json`

---

### 3. Shared Memory ✅ ADDED

**Before (Missing):**
```yaml
# No shm_size
```

**After (Correct):**
```yaml
shm_size: "2g"
```

**Reason:** Chrome requires shared memory for proper operation.

---

### 4. Environment Variables ✅ SIMPLIFIED

**Before:**
```yaml
environment:
  - PINCHTAB_PORT=9867
  - PINCHTAB_STEALTH=true
```

**After:**
```yaml
environment:
  - PINCHTAB_PORT=9867
```

**Reason:** Stealth mode and other features are configured via config file, not env vars.

---

## Code Changes Made

### 1. PinchTabService (`packages/aria-agent/src/services/pinchtab.service.ts`)

**Changes:**
- Added `currentTabId` tracking
- Updated `initInstance()` to use `/instances/launch` endpoint
- Updated `navigate()` to use `/instances/{id}/tabs/open` and return tab ID
- Updated `snapshot()` to use `/tabs/{tabId}/snapshot`
- Updated `action()` to use `/tabs/{tabId}/action`
- All action methods now use tab ID instead of instance ID
- Fixed return type for `navigate()` to handle null check

**Key Insight:** PinchTab is tab-scoped, not instance-scoped. Operations happen on tabs, not instances.

---

### 2. PinchTab Tool Handlers (`packages/aria-agent/src/agent/agent.pinchtab-tools.ts`)

**Changes:**
- Updated `handleNavigate()` to capture and use returned tab ID
- All handlers now pass tab ID to service methods

---

### 3. Docker Compose (`docker/docker-compose.yml`)

**Changes:**
- Fixed image name: `pinchtab/pinchtab:latest`
- Added volume: `pinchtab-data:/data`
- Added `shm_size: "2g"`
- Simplified environment variables
- Added `pinchtab-data` to volumes section

---

## Architecture Understanding

### Correct PinchTab Hierarchy

```
PinchTab Server (port 9867)
  ↓
Instance (Chrome process)
  ↓
Tab (webpage)
  ↓
Actions (click, fill, etc.)
```

### Key Concepts

1. **Server** - The main PinchTab process (port 9867)
2. **Instance** - A running Chrome browser process
3. **Profile** - Browser state (cookies, history, local storage)
4. **Tab** - A single webpage within an instance
5. **Bridge** - Lightweight runtime behind managed instances

### Workflow

```
1. Start PinchTab server
2. Launch instance (creates Chrome process)
3. Open tab (navigates to URL)
4. Get snapshot (extract elements)
5. Perform actions (click, fill, etc.)
6. Close tab/instance when done
```

---

## Testing the Corrections

### 1. Start PinchTab

```bash
cd docker
docker-compose up -d pinchtab
```

### 2. Verify Health

```bash
curl http://localhost:9867/health
# Expected: {"status":"ok"} or similar
```

### 3. Test Instance Creation

```bash
curl -X POST http://localhost:9867/instances/launch \
  -H "Content-Type: application/json" \
  -d '{"name":"test","mode":"headless"}'
# Expected: {"id":"inst_xxx","profileId":"prof_yyy",...}
```

### 4. Test Tab Opening

```bash
# Use instance ID from step 3
curl -X POST http://localhost:9867/instances/inst_xxx/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Expected: {"tabId":"tab_abc","url":"https://example.com"}
```

### 5. Test Snapshot

```bash
# Use tab ID from step 4
curl "http://localhost:9867/tabs/tab_abc/snapshot?filter=interactive"
# Expected: {"elements":[{"ref":"e0",...},...]}
```

### 6. Test Action

```bash
# Use tab ID from step 4
curl -X POST "http://localhost:9867/tabs/tab_abc/action" \
  -H "Content-Type: application/json" \
  -d '{"kind":"click","ref":"e0"}'
# Expected: {"success":true}
```

---

## Documentation Sources

All corrections were based on official PinchTab documentation retrieved via Context7 MCP:

1. [PinchTab README](https://github.com/pinchtab/pinchtab/blob/main/README.md)
2. [Core Concepts](https://github.com/pinchtab/pinchtab/blob/main/docs/core-concepts.md)
3. [API Reference](https://github.com/pinchtab/pinchtab/blob/main/docs/references/endpoints.md)
4. [Instance API](https://github.com/pinchtab/pinchtab/blob/main/docs/references/instance-api.md)
5. [Testing Guide](https://github.com/pinchtab/pinchtab/blob/main/TESTING.md)

---

## Status

✅ All API endpoints corrected
✅ Docker configuration fixed
✅ Code updated to match official API
✅ No TypeScript errors
✅ Ready for testing

**Next Step:** Start PinchTab and test with a real web task!
