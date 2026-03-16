# PinchTab Web Agent Test Suite

This directory contains test files that simulate a REAL web agent conversation with PinchTab.

## What These Tests Do

These tests simulate an actual web agent performing a simple task:
1. Check PinchTab health
2. Launch Chrome in **headed mode** (visible in VNC!)
3. Navigate to Google.com
4. Type "hello world" in the search box
5. Click the search button
6. Verify results appear

**Important**: These are NOT mock tests. They make REAL API calls to PinchTab and perform LIVE browser actions. You can watch the browser in VNC while the test runs!

## Test Files

### 1. `pinchtab-simulation.test.ts` (Jest/NestJS Test)

Full integration test using NestJS testing framework.

**Run with:**
```bash
cd packages/aria-agent
npm test -- pinchtab-simulation.test.ts
```

**Features:**
- Uses real WebAgent and PinchTabService instances
- Includes cleanup (stops test instances after)
- Shows exact tool call sequence
- 60 second timeout for full workflow

### 2. `pinchtab-simple-test.ts` (Standalone Script)

Simple standalone script that can be run directly without Jest.

**Run with:**
```bash
cd packages/aria-agent
npx ts-node test/pinchtab-simple-test.ts
```

**Features:**
- No test framework needed
- Colorful console output
- Shows each tool call as it happens
- Easy to modify and experiment with

## Prerequisites

1. **PinchTab service must be running in Docker**
   ```bash
   # Start the Docker containers
   cd docker
   docker-compose up -d aria-desktop
   
   # Check if PinchTab is available (from Windows host)
   curl http://localhost:9867/health
   # Should return: {"mode":"dashboard","status":"ok"}
   ```

2. **VNC access (optional but recommended)**
   - Connect to VNC at `localhost:9990` to watch the browser in action
   - The tests use "headed" mode so you can see what's happening

3. **Node.js and TypeScript**
   ```bash
   cd packages/aria-agent
   npm install
   ```

**Important**: The tests automatically set `PINCHTAB_BASE_URL=http://localhost:9867` to connect from your Windows host to PinchTab running in Docker.

## How the Web Agent Works

The tests demonstrate the EXACT workflow a real web agent uses:

### Tool Call Sequence

```
1. pinchtab_health {}
   → Check if PinchTab service is available

2. pinchtab_list_instances {}
   → Check for existing browser instances

3. pinchtab_launch_instance {name: "demo", mode: "headed"}
   → Launch Chrome in headed mode (visible in VNC)

4. pinchtab_navigate {url: "https://www.google.com"}
   → Navigate to Google.com

5. pinchtab_wait {ms: 2000}
   → Wait for page to load

6. pinchtab_get_snapshot {}
   → Get page elements to find search box

7. pinchtab_click {ref: "e23"}
   → Click search box to focus it (ref from snapshot)

8. pinchtab_type {ref: "e23", text: "hello world"}
   → Type "hello world" into search box

9. pinchtab_get_snapshot {}
   → Get fresh snapshot to find search button

10. pinchtab_click {ref: "e27"}
    → Click search button (ref from snapshot)

11. pinchtab_wait {ms: 2000}
    → Wait for results to load

12. pinchtab_get_snapshot {}
    → Get final snapshot to verify results
```

### Key Patterns

1. **Always get snapshot before interacting**
   - Snapshots provide element refs (e23, e27, etc.)
   - Refs change when page updates
   - Must re-snapshot after actions

2. **Use `pinchtab_type` not `pinchtab_fill`**
   - `fill` is broken and doesn't work
   - `type` works reliably for all text input

3. **Headed mode for debugging**
   - `mode: "headed"` shows browser in VNC
   - Perfect for watching what the agent does
   - Use `mode: "headless"` for production

4. **Wait after navigation and clicks**
   - Pages need time to load
   - 2000ms is typical for most pages
   - Adjust based on page complexity

## Customizing the Tests

### Change the Search Query

In `pinchtab-simple-test.ts`, line ~120:
```typescript
await pinchTabService.type(searchBox.ref, 'hello world');
```

Change to:
```typescript
await pinchTabService.type(searchBox.ref, 'your custom query');
```

### Navigate to a Different Site

In `pinchtab-simple-test.ts`, line ~90:
```typescript
tabId = await pinchTabService.navigate('https://www.google.com');
```

Change to:
```typescript
tabId = await pinchTabService.navigate('https://example.com');
```

### Add More Actions

After the search, you can add more steps:
```typescript
// Click the first result
const firstResult = snapshot3.elements.find((el: any) => 
  el.tag === 'a' && el.text && el.text.length > 10
);
await pinchTabService.click(firstResult.ref);
await pinchTabService.wait(2000);

// Take another snapshot
const snapshot4 = await pinchTabService.snapshot('interactive');
```

## Troubleshooting

### "PinchTab service is not available"

**Solution**: Make sure PinchTab container is running and accessible
```bash
# Check if container is running
docker ps | grep aria-desktop

# Start the container if not running
cd docker
docker-compose up -d aria-desktop

# Test connection from Windows host
curl http://localhost:9867/health
# Should return: {"mode":"dashboard","status":"ok"}
```

**Note**: The tests use `http://localhost:9867` to connect from Windows host to Docker container.

### "Could not find search box in snapshot"

**Solution**: Increase wait time before snapshot
```typescript
await pinchTabService.wait(3000); // Increase from 2000 to 3000
```

### "Instance already exists (409 Conflict)"

**Solution**: The test will automatically reuse existing instances. If you want to force a new instance, stop existing ones first:
```bash
curl -X POST http://aria-desktop:9867/instances/{instance_id}/stop
```

### Test times out

**Solution**: Increase the timeout in the test file
```typescript
}, 120000); // Increase from 60000 to 120000 (2 minutes)
```

## Understanding the Output

### Successful Test Output

```
🚀 Starting PinchTab Web Agent Simulation
📝 Task: Open Chrome, go to Google, search "hello world"

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

... (more steps) ...

🎉 SUCCESS! Web agent simulation completed!

📊 Summary:
   ✓ Launched Chrome in headed mode (visible)
   ✓ Navigated to Google.com
   ✓ Typed "hello world" in search box
   ✓ Clicked search button
   ✓ Verified search results appeared

✨ This was a REAL simulation - actual browser actions were performed!
```

## Next Steps

1. **Watch in VNC**: Connect to VNC and run the test to see the browser in action
2. **Modify the test**: Change the search query or navigate to different sites
3. **Add more actions**: Extend the test to click results, fill forms, etc.
4. **Create your own tests**: Use these as templates for testing other workflows

## Related Documentation

- `PINCHTAB_TOOLS_ANALYSIS.md` - Complete analysis of PinchTab tools
- `PINCHTAB_TOOLS_IMPLEMENTATION_COMPLETE.md` - Implementation details
- `packages/aria-agent/src/services/pinchtab.service.ts` - PinchTab service code
- `packages/aria-agent/src/agents/web/web.agent.ts` - Web agent implementation
- `packages/aria-agent/src/groq/pinchtab.tools.ts` - Tool definitions

## Questions?

If you have questions about these tests or PinchTab integration, check the documentation files listed above or ask in the team chat.
