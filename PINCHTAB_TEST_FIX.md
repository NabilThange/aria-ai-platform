# PinchTab Test Fix - Connection Issue Resolved

## Problem

The tests were failing with:
```
fetch failed
PinchTab request failed after 3 attempts to http://aria-desktop:9867/instances
```

## Root Cause

The tests were trying to connect to `http://aria-desktop:9867`, which is a Docker hostname that only works **inside** the Docker network. Since the tests run on the Windows host machine (not in Docker), they need to use `http://localhost:9867` instead.

## Solution Applied

### 1. Fixed Test Files

Both test files now automatically set the correct URL:

**`packages/aria-agent/test/pinchtab-simple-test.ts`:**
```typescript
async function simulateWebAgent() {
  // Set environment variable for local testing (Windows host accessing Docker)
  process.env.PINCHTAB_BASE_URL = 'http://localhost:9867';
  
  const pinchTabService = new PinchTabService();
  // ... rest of test
}
```

**`packages/aria-agent/test/pinchtab-simulation.test.ts`:**
```typescript
beforeAll(async () => {
  // Set environment variable for local testing (Windows host accessing Docker)
  process.env.PINCHTAB_BASE_URL = 'http://localhost:9867';
  
  // ... rest of setup
});
```

### 2. Updated Documentation

All documentation files now correctly reference `http://localhost:9867`:
- `packages/aria-agent/test/PINCHTAB_TEST_README.md`
- `PINCHTAB_QUICK_START.md`
- `RUN_PINCHTAB_TEST.sh`

## How to Run Tests Now

### Step 1: Start PinchTab Container

```bash
cd docker
docker-compose up -d aria-desktop
```

### Step 2: Verify Connection

```bash
# From Windows PowerShell or CMD
curl http://localhost:9867/health
```

Expected response:
```json
{"mode":"dashboard","status":"ok"}
```

### Step 3: Run the Test

```bash
cd packages/aria-agent
npm run test:pinchtab:simple
```

## Expected Output

```
🚀 Starting PinchTab Web Agent Simulation
📝 Task: Open Chrome, go to Google, search "hello world"

[Nest] LOG [PinchTabService] PinchTab base URL: http://localhost:9867

🏥 Step 1: Checking PinchTab health...
🔧 Tool Call: pinchtab_health
   Input: {}
✅ PinchTab is healthy

📋 Step 2: Checking for existing browser instances...
🔧 Tool Call: pinchtab_list_instances
   Input: {}
📊 Found 0 existing instances

🌐 Step 3: Launching Chrome in HEADED mode (visible!)...
🔧 Tool Call: pinchtab_launch_instance
   Input: {"name":"test-demo","mode":"headed"}
✅ Chrome launched! Instance ID: inst_abc123

... (continues with navigation, typing, clicking) ...

🎉 SUCCESS! Web agent simulation completed!
```

## Architecture Explanation

```
┌─────────────────────────────────────────┐
│  Windows Host Machine                   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Test Script                    │   │
│  │  (pinchtab-simple-test.ts)      │   │
│  │                                 │   │
│  │  Uses: http://localhost:9867   │   │
│  └──────────────┬──────────────────┘   │
│                 │                       │
│                 │ HTTP Request          │
│                 ▼                       │
│  ┌─────────────────────────────────┐   │
│  │  Docker Desktop                 │   │
│  │                                 │   │
│  │  ┌───────────────────────────┐ │   │
│  │  │ aria-desktop container    │ │   │
│  │  │                           │ │   │
│  │  │ PinchTab Service          │ │   │
│  │  │ Port: 9867                │ │   │
│  │  │ Mapped: 0.0.0.0:9867      │ │   │
│  │  └───────────────────────────┘ │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Key Points

1. **PinchTab runs in Docker** (aria-desktop container)
2. **Tests run on Windows host** (outside Docker)
3. **Port 9867 is mapped** from container to host
4. **Use `localhost:9867`** when accessing from host
5. **Use `aria-desktop:9867`** only when accessing from inside Docker network

## Verification Checklist

- [x] Tests set `PINCHTAB_BASE_URL=http://localhost:9867`
- [x] Documentation updated with correct URL
- [x] Shell script checks `localhost:9867`
- [x] Connection instructions use `localhost:9867`
- [x] Architecture diagram shows host-to-Docker communication

## Files Modified

1. `packages/aria-agent/test/pinchtab-simple-test.ts` - Added env var setting
2. `packages/aria-agent/test/pinchtab-simulation.test.ts` - Added env var setting
3. `packages/aria-agent/test/PINCHTAB_TEST_README.md` - Updated URLs
4. `PINCHTAB_QUICK_START.md` - Updated URLs and added prerequisites
5. `RUN_PINCHTAB_TEST.sh` - Updated health check URL

## Next Steps

The tests should now work correctly! Run:

```bash
npm run test:pinchtab:simple
```

And watch Chrome open in VNC at `localhost:9990`!
