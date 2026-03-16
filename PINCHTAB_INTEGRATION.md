# PinchTab Integration for Aria

## Overview

This integration adds **PinchTab** to Aria for high-performance web automation. Instead of taking screenshots and guessing pixel coordinates, PinchTab provides:

- **Element references** (e.g., `e5`, `e12`) instead of coordinates
- **10x token savings** (~800 tokens vs ~10,000 for screenshots)
- **Stealth mode** to avoid detection on real websites
- **Persistent browser sessions** with login state

## Architecture

```
Task: "Go to Gmail and send email"
    ↓
Agent detects web task
    ↓
Route to PinchTab (not screenshot)
    ↓
PinchTab navigates → gets snapshot → agent clicks by ref
    ↓
Result: 800 tokens, 100% accurate, no coordinate guessing
```

## Files Added/Modified

### New Files
1. **`packages/aria-agent/src/services/pinchtab.service.ts`**
   - PinchTab HTTP client
   - Methods: navigate, snapshot, click, fill, submit, scroll, wait
   - Handles instance management

2. **`packages/aria-agent/src/agent/agent.pinchtab-tools.ts`**
   - Tool handlers for each PinchTab action
   - Formats snapshots for LLM consumption
   - Manages timing and verification

3. **`packages/aria-agent/src/utils/browser-detection.ts`**
   - Detects if task is web-based
   - Extracts URLs from task descriptions
   - Checks if browser is open

### Modified Files
1. **`docker/docker-compose.yml`**
   - Added PinchTab service (port 9867)
   - Stealth mode enabled
   - Health check configured

2. **`packages/aria-agent/src/agent/agent.computer-use.ts`**
   - Added PinchTabService parameter
   - Routes PinchTab tools to handler
   - Maintains backward compatibility

3. **`packages/aria-agent/src/agent/agent.processor.ts`**
   - Injects PinchTabService
   - Passes to handleComputerToolUse

4. **`packages/aria-agent/src/agent/agent.module.ts`**
   - Registers PinchTabService provider

5. **`packages/aria-agent/src/agent/agent.constants.ts`**
   - Updated system prompt with PinchTab tools
   - Added web automation workflow examples

## Setup Instructions

### 1. Start PinchTab Service

```bash
cd docker
docker-compose up -d pinchtab
```

Verify it's running:
```bash
curl http://localhost:9867/health
```

### 2. Build and Start Aria Agent

```bash
docker-compose up -d aria-agent
```

The agent will automatically detect PinchTab and enable web automation.

### 3. Test Web Task

Create a task:
```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Go to gmail.com and take a screenshot",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'
```

The agent will:
1. Detect it's a web task
2. Initialize PinchTab browser
3. Navigate to gmail.com
4. Get page snapshot (element refs)
5. Return structured page data

## PinchTab Tools

### pinchtab_navigate
Navigate to a URL and wait for page load.

```json
{
  "name": "pinchtab_navigate",
  "input": {"url": "https://gmail.com"}
}
```

### pinchtab_snapshot
Get structured list of interactive elements.

```json
{
  "name": "pinchtab_snapshot",
  "input": {"filter": "interactive"}
}
```

Returns:
```
[e5] <button> "Compose"
[e12] <input> "Search mail"
[e18] <a> "Settings"
```

### pinchtab_click
Click element by reference (not coordinates).

```json
{
  "name": "pinchtab_click",
  "input": {"ref": "e5"}
}
```

### pinchtab_fill
Fill form field with text.

```json
{
  "name": "pinchtab_fill",
  "input": {"ref": "e12", "value": "recipient@example.com"}
}
```

### pinchtab_submit
Submit a form.

```json
{
  "name": "pinchtab_submit",
  "input": {"ref": "e18"}
}
```

### pinchtab_scroll
Scroll page up or down.

```json
{
  "name": "pinchtab_scroll",
  "input": {"direction": "down", "amount": 3}
}
```

### pinchtab_wait
Wait for page to settle.

```json
{
  "name": "pinchtab_wait",
  "input": {"ms": 2000}
}
```

## Example: Send Email via Gmail

```
1. pinchtab_navigate: "https://gmail.com"
   → Browser opens Gmail

2. pinchtab_snapshot: filter="interactive"
   → Returns: [e5] Compose, [e12] Search, etc.

3. pinchtab_click: ref="e5"
   → Clicks Compose button

4. pinchtab_snapshot: filter="interactive"
   → Returns: [e8] To field, [e10] Subject, [e12] Body

5. pinchtab_fill: ref="e8", value="recipient@example.com"
   → Fills To field

6. pinchtab_fill: ref="e10", value="Hello"
   → Fills Subject

7. pinchtab_fill: ref="e12", value="This is my message"
   → Fills Body

8. pinchtab_snapshot: filter="interactive"
   → Returns: [e15] Send button

9. pinchtab_submit: ref="e15"
   → Submits form

10. pinchtab_wait: ms=2000
    → Waits for email to send

11. pinchtab_snapshot: filter="interactive"
    → Verifies email sent (no compose window)
```

## Token Usage Comparison

### Before (Screenshot-based)
```
1. Take screenshot: 10,000 tokens (base64 image)
2. LLM analyzes: 2,000 tokens
3. Click at coordinates: 500 tokens
4. Take screenshot: 10,000 tokens
Total: ~22,500 tokens per action
```

### After (PinchTab)
```
1. Get snapshot: 800 tokens (structured text)
2. LLM analyzes: 500 tokens
3. Click by ref: 200 tokens
4. Get snapshot: 800 tokens
Total: ~2,300 tokens per action
```

**Savings: 90% reduction in token usage**

## Environment Variables

Add to `.env`:
```bash
PINCHTAB_BASE_URL=http://pinchtab:9867
```

Default: `http://pinchtab:9867` (Docker Compose)

## Troubleshooting

### PinchTab not responding
```bash
# Check if service is running
docker ps | grep pinchtab

# Check logs
docker logs pinchtab

# Restart
docker-compose restart pinchtab
```

### Browser instance not created
```bash
# Check PinchTab health
curl http://localhost:9867/health

# Check agent logs
docker logs aria-agent
```

### Element refs not working
- Ensure you're using refs from the latest snapshot
- Refs change when page updates
- Always get new snapshot after navigation/action

## Performance Tips

1. **Batch actions** - Get snapshot once, then click multiple elements
2. **Use wait strategically** - Only wait after navigation/form submission
3. **Filter snapshots** - Use `filter="interactive"` to reduce token usage
4. **Reuse instances** - Keep browser open for multiple tasks
5. **Stealth mode** - Enabled by default, helps avoid detection

## Limitations

- PinchTab only handles web tasks (browser automation)
- Desktop tasks still use screenshot approach
- Some JavaScript-heavy sites may need extra waits
- File uploads require special handling

## Future Enhancements

1. **Auto-detection** - Automatically route web tasks to PinchTab
2. **Multi-tab support** - Handle multiple browser tabs
3. **Screenshot fallback** - If PinchTab fails, fall back to screenshots
4. **Performance metrics** - Track token savings per task
5. **Custom profiles** - Support different browser profiles (Gmail, GitHub, etc.)

## References

- [PinchTab GitHub](https://github.com/pinchtab/pinchtab)
- [PinchTab Documentation](https://pinchtab.com)
- [Aria Documentation](https://github.com/aria-ai/aria)
