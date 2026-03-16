# VNC Control - Curl Commands

Base URL: `http://localhost:3001/computer-use`

## 📸 Take Screenshot

```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "screenshot"}'
```

## 🖱️ Mouse Actions

### Left Click
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click_mouse",
    "coordinates": {"x": 100, "y": 200},
    "button": "left",
    "clickCount": 1
  }'
```

### Double Click
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click_mouse",
    "coordinates": {"x": 150, "y": 300},
    "button": "left",
    "clickCount": 2
  }'
```

### Right Click
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "click_mouse",
    "coordinates": {"x": 200, "y": 400},
    "button": "right",
    "clickCount": 1
  }'
```

## ⌨️ Keyboard Actions

### Type Text (Slow - character by character)
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type_text",
    "text": "Hello World",
    "delay": 50
  }'
```

### Paste Text (Fast - via clipboard)
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "paste_text",
    "text": "This is a long text that will be pasted instantly via clipboard instead of typing character by character"
  }'
```

### Press Keys (Keyboard shortcuts)
```bash
# Press Ctrl+C
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type_keys",
    "keys": ["LeftControl", "c"]
  }'

# Press Enter
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type_keys",
    "keys": ["Return"]
  }'

# Press Escape
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type_keys",
    "keys": ["Escape"]
  }'

# Press Alt+F4
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "type_keys",
    "keys": ["LeftAlt", "F4"]
  }'
```

## 📜 Scroll

### Scroll Down
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scroll",
    "direction": "down",
    "scrollCount": 3
  }'
```

### Scroll Up
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "scroll",
    "direction": "up",
    "scrollCount": 5
  }'
```

## 🚀 Application Launcher

### Open Chrome
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "application",
    "application": "google-chrome"
  }'
```

### Open Terminal
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "application",
    "application": "terminal"
  }'
```

### Open Firefox
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "application",
    "application": "firefox"
  }'
```

### Open VS Code
```bash
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{
    "action": "application",
    "application": "code"
  }'
```

## 🔧 Common Key Names

For `type_keys` action, use these key names:

**Modifier Keys:**
- `LeftControl`, `RightControl`
- `LeftShift`, `RightShift`
- `LeftAlt`, `RightAlt`
- `LeftWin`, `RightWin` (Windows key)
- `LeftCmd`, `RightCmd` (Mac)

**Special Keys:**
- `Return` (Enter)
- `Escape`
- `Backspace`
- `Delete`
- `Tab`
- `Space`
- `Up`, `Down`, `Left`, `Right`
- `Home`, `End`
- `PageUp`, `PageDown`

**Function Keys:**
- `F1`, `F2`, `F3`, ... `F12`

**Letter/Number Keys:**
- Just use the character: `a`, `b`, `1`, `2`, etc.

## 📝 Complete Workflow Examples

### Example 1: Open Chrome and Navigate
```bash
# Step 1: Open Chrome
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "application", "application": "google-chrome"}'

# Wait 3 seconds for Chrome to open
sleep 3

# Step 2: Type URL in address bar (assuming it's focused)
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "type_text", "text": "wikipedia.org", "delay": 50}'

# Step 3: Press Enter
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "type_keys", "keys": ["Return"]}'
```

### Example 2: Create File via Terminal
```bash
# Step 1: Open Terminal
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "application", "application": "terminal"}'

# Wait 2 seconds
sleep 2

# Step 2: Type command
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "type_text", "text": "echo Hello > test.txt", "delay": 50}'

# Step 3: Press Enter to execute
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "type_keys", "keys": ["Return"]}'
```

### Example 3: Click Button and Take Screenshot
```bash
# Step 1: Click at coordinates
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "click_mouse", "coordinates": {"x": 500, "y": 300}, "button": "left", "clickCount": 1}'

# Wait 1 second
sleep 1

# Step 2: Take screenshot to verify
curl -X POST http://localhost:3001/computer-use \
  -H "Content-Type: application/json" \
  -d '{"action": "screenshot"}' > screenshot.json

# Extract base64 image from response
cat screenshot.json | jq -r '.image' > screenshot.b64
```

## 🔍 Response Format

All endpoints return JSON:

**Success Response:**
```json
{
  "success": true,
  "message": "Action completed successfully"
}
```

**Screenshot Response:**
```json
{
  "success": true,
  "image": "base64_encoded_png_data_here..."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

## 💡 Tips

1. **Use paste instead of type for long text** - It's 10x faster!
2. **Add delays between actions** - Use `sleep` to wait for UI to update
3. **Take screenshots to verify** - Always check if your action succeeded
4. **Use application launcher** - More reliable than clicking icons
5. **Coordinates are absolute** - (0,0) is top-left corner of screen

## 🐛 Troubleshooting

**Action not working?**
- Check if the application is focused
- Verify coordinates are correct (take screenshot first)
- Add longer delays between actions
- Try double-click instead of single-click
- Use application launcher instead of clicking icons

**Terminal commands not executing?**
- Make sure terminal is open and focused
- Wait 2-3 seconds after opening terminal
- Use type_text + Return key press (not terminal_command action directly)

**Text not appearing?**
- Click the input field first to focus it
- Use paste_text for long text instead of type_text
- Check if caps lock or other modifiers are active
