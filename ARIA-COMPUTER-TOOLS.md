# ARIA Computer Use Tools Reference

## Overview
ARIA has a comprehensive set of computer control tools that allow programmatic interaction with the desktop environment. These tools are defined in the codebase and can be used to automate desktop tasks.

## 📁 Key Files

### Type Definitions
- `packages/shared/src/types/computerAction.types.ts` - Source definitions
- `packages/aria-agent/dist/shared/src/types/computerAction.types.d.ts` - Compiled types
- `packages/ariad/src/computer-use/dto/computer-action.dto.ts` - DTO validation layer

### Utilities & Converters
- `packages/shared/src/utils/computerAction.utils.ts` - Action converters and type guards
- `packages/ariad/src/input-tracking/input-tracking.service.ts` - Action logging/tracking
- `packages/ariad/src/input-tracking/input-tracking.gateway.ts` - WebSocket emission

---

## 🖱️ Mouse Actions

### 1. Move Mouse
Move cursor to specific coordinates.
```typescript
{
  action: "move_mouse",
  coordinates: { x: number, y: number }
}
```

### 2. Trace Mouse
Move cursor along a path (smooth movement through multiple points).
```typescript
{
  action: "trace_mouse",
  path: [{ x: number, y: number }, ...],
  holdKeys?: string[]  // Optional: hold keys during trace (e.g., ["shift"])
}
```

### 3. Click Mouse
Click at current position or specific coordinates.
```typescript
{
  action: "click_mouse",
  coordinates?: { x: number, y: number },  // Optional: click at specific location
  button: "left" | "right" | "middle",
  holdKeys?: string[],  // Optional: modifier keys (e.g., ["ctrl", "shift"])
  clickCount: number    // 1 = single, 2 = double, 3 = triple
}
```

### 4. Press Mouse
Press or release mouse button (for custom drag operations).
```typescript
{
  action: "press_mouse",
  coordinates?: { x: number, y: number },
  button: "left" | "right" | "middle",
  press: "up" | "down"
}
```

### 5. Drag Mouse
Drag from current position along a path.
```typescript
{
  action: "drag_mouse",
  path: [{ x: number, y: number }, ...],
  button: "left" | "right" | "middle",
  holdKeys?: string[]
}
```

### 6. Scroll
Scroll at current position or specific coordinates.
```typescript
{
  action: "scroll",
  coordinates?: { x: number, y: number },
  direction: "up" | "down" | "left" | "right",
  scrollCount: number,  // Number of scroll ticks
  holdKeys?: string[]
}
```

### 7. Cursor Position
Get current cursor position.
```typescript
{
  action: "cursor_position"
}
```

---

## ⌨️ Keyboard Actions

### 8. Type Keys
Type specific keys (for special keys and combinations).
```typescript
{
  action: "type_keys",
  keys: string[],  // e.g., ["ctrl", "c"], ["alt", "tab"]
  delay?: number   // Optional: delay between keys in ms
}
```

### 9. Type Text
Type regular text (optimized for strings).
```typescript
{
  action: "type_text",
  text: string,
  delay?: number,      // Optional: delay between characters in ms
  sensitive?: boolean  // Optional: mark as sensitive (passwords, etc.)
}
```

### 10. Paste Text
Paste text using clipboard (faster than typing).
```typescript
{
  action: "paste_text",
  text: string
}
```
**⚡ Use this for large text blocks - it's much faster than type_text!**

### 11. Press Keys
Press or release specific keys (for custom key combinations).
```typescript
{
  action: "press_keys",
  keys: string[],
  press: "up" | "down"
}
```

---

## 🖥️ System Actions

### 12. Screenshot
Capture current screen.
```typescript
{
  action: "screenshot"
}
```

### 13. Application
Launch or focus an application.
```typescript
{
  action: "application",
  application: "chromium" | "gmail" | "vscode" | "terminal" | "thunar" | "mousepad" | "desktop"
}
```

### 14. Wait
Pause execution for specified duration.
```typescript
{
  action: "wait",
  duration: number  // Duration in milliseconds
}
```

---

## 📁 File Actions

### 15. Write File
Write data to file (base64 encoded).
```typescript
{
  action: "write_file",
  path: string,
  data: string  // Base64 encoded data
}
```

### 16. Read File
Read file contents.
```typescript
{
  action: "read_file",
  path: string
}
```

---

## 💡 Usage Tips

### Why Use paste_text Instead of type_text?
- `paste_text` uses clipboard and is **instant** for any text length
- `type_text` simulates keystrokes character-by-character (slow for long text)
- Use `paste_text` for: code snippets, URLs, long paragraphs, JSON data
- Use `type_text` for: short inputs, when you need typing simulation, sensitive fields

### Modifier Keys
Common modifier keys for `holdKeys`:
- `"ctrl"` / `"control"`
- `"shift"`
- `"alt"`
- `"meta"` / `"super"` (Windows/Command key)

### Click Count Examples
- `clickCount: 1` - Single click
- `clickCount: 2` - Double click (select word)
- `clickCount: 3` - Triple click (select line/paragraph)

### Application Shortcuts
Instead of clicking desktop icons, use the `application` action:
```typescript
{ action: "application", application: "chromium" }  // Launch browser
{ action: "application", application: "vscode" }    // Launch editor
{ action: "application", application: "terminal" }  // Launch terminal
```

---

## 🔧 Implementation Notes

### Desktop Environment
- OS: Ubuntu 22.04
- Desktop: XFCE (minimal)
- Display: `:0` via Xvfb + VNC
- Resolution: Configurable (default 1920x1080)

### Available Applications
1. **Chromium** - Web browser
2. **Gmail** - Chromium app mode (https://mail.google.com)
3. **VSCode** - Code editor
4. **Terminal** - Xfce Terminal
5. **Thunar** - File manager
6. **Mousepad** - Text editor (like Notepad)

### Python Libraries Available
For document processing via scripts:
- `python-pptx` - PowerPoint files
- `python-docx` - Word documents
- `openpyxl` - Excel spreadsheets
- `pandas` - Data analysis
- `pillow` - Image processing
- `playwright` - Browser automation
- `beautifulsoup4` - HTML parsing
- `requests` - HTTP requests

---

## 🎯 Common Patterns

### Open Browser and Navigate
```typescript
{ action: "application", application: "chromium" }
{ action: "wait", duration: 2000 }
{ action: "type_text", text: "https://example.com" }
{ action: "type_keys", keys: ["enter"] }
```

### Copy-Paste Workflow
```typescript
{ action: "click_mouse", coordinates: { x: 100, y: 200 }, button: "left", clickCount: 3 }
{ action: "type_keys", keys: ["ctrl", "c"] }
{ action: "click_mouse", coordinates: { x: 300, y: 400 }, button: "left", clickCount: 1 }
{ action: "type_keys", keys: ["ctrl", "v"] }
```

### Fast Text Entry
```typescript
// ❌ Slow way
{ action: "type_text", text: "very long text here..." }

// ✅ Fast way
{ action: "paste_text", text: "very long text here..." }
```

### File Operations
```typescript
// Write a file
{ action: "write_file", path: "/home/user/test.txt", data: "SGVsbG8gV29ybGQ=" }

// Read it back
{ action: "read_file", path: "/home/user/test.txt" }
```

---

## 📚 Related Documentation

- See `packages/ariad/src/computer-use/` for implementation details
- See `packages/ariad/Dockerfile` for desktop environment setup
- See `packages/shared/src/utils/computerAction.utils.ts` for conversion utilities
