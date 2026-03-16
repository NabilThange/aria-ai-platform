# PinchTab Test - Quick Start Guide

## ⚠️ Before You Start

Make sure PinchTab is running in Docker:
```bash
cd docker
docker-compose up -d aria-desktop

# Wait 15 seconds for services to start, then verify
curl http://localhost:9867/health
# Should return: {"status":"ok","mode":"dashboard",...}
```

**If you get "Empty reply from server":**

You need to rebuild the Docker image (one-time fix):
```bash
cd docker
docker-compose build aria-desktop
docker-compose up -d aria-desktop

# Wait 15 seconds, then test again
curl http://localhost:9867/health
```

The issue was a typo in the supervisord config (`pinchtab serve` instead of `pinchtab server`). This has been fixed in the Dockerfile, so rebuilding will permanently fix it.

## 🚀 Run the Test (30 seconds)

```bash
cd packages/aria-agent
npm run test:pinchtab:simple
```

That's it! The test will:
1. Open Chrome (visible in VNC)
2. Go to Google.com
3. Type "hello world"
4. Click search
5. Show results

## 🎥 Watch It Live

1. Connect to VNC
2. Run the test
3. Watch Chrome open and search automatically

## 📋 What the Test Does

```
✓ Check PinchTab health
✓ Launch Chrome in headed mode
✓ Navigate to Google
✓ Get page snapshot
✓ Click search box
✓ Type "hello world"
✓ Get fresh snapshot
✓ Click search button
✓ Verify results
```

## 🔧 Tool Calls Made

```javascript
pinchtab_health {}
pinchtab_list_instances {}
pinchtab_launch_instance {name: "demo", mode: "headed"}
pinchtab_navigate {url: "https://www.google.com"}
pinchtab_wait {ms: 2000}
pinchtab_get_snapshot {}
pinchtab_click {ref: "e23"}
pinchtab_type {ref: "e23", text: "hello world"}
pinchtab_get_snapshot {}
pinchtab_click {ref: "e27"}
pinchtab_wait {ms: 2000}
pinchtab_get_snapshot {}
```

## 📝 Files Created

- `packages/aria-agent/test/pinchtab-simulation.test.ts` - Jest test
- `packages/aria-agent/test/pinchtab-simple-test.ts` - Standalone script
- `packages/aria-agent/test/PINCHTAB_TEST_README.md` - Full documentation
- `PINCHTAB_TEST_SUITE_SUMMARY.md` - Complete summary
- `PINCHTAB_QUICK_START.md` - This file

## 🎯 Key Points

- **REAL actions**: Not mocks, actual browser automation
- **HEADED mode**: Visible in VNC
- **Tool calls**: Same as real agent uses
- **Live execution**: Chrome actually opens and searches

## 🛠️ Customize

Edit `packages/aria-agent/test/pinchtab-simple-test.ts`:

```typescript
// Change search query (line ~120)
await pinchTabService.type(searchBox.ref, 'your query here');

// Change website (line ~90)
tabId = await pinchTabService.navigate('https://example.com');
```

## 🐛 Troubleshooting

**PinchTab not available?**
```bash
# Start Docker container
cd docker
docker-compose up -d aria-desktop

# Test from Windows host
curl http://localhost:9867/health
```

**Port 9867 not accessible?**
- Check Docker Desktop is running
- Check port forwarding: `docker ps | grep aria-desktop`
- Should show: `0.0.0.0:9867->9867/tcp`

**Need more time?**
```typescript
await pinchTabService.wait(3000); // Increase wait time
```

## 📚 More Info

See `PINCHTAB_TEST_SUITE_SUMMARY.md` for complete documentation.

## ✨ That's It!

You now have a working test that simulates a real web agent conversation with live browser actions. Enjoy!
