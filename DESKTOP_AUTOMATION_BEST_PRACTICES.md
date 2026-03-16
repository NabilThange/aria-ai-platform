# Desktop Automation Best Practices

## 🎯 Core Philosophy

**ONE ACTION PER ITERATION** - The key to reliable desktop automation is breaking tasks into atomic actions with verification between each step.

## ⚡ Golden Rules

### 1. ALWAYS Use "paste" Over "type"

| Feature | paste ✅ | type ❌ |
|---------|----------|---------|
| Speed | INSTANT | SLOW (char by char) |
| Reliability | HIGH | PRONE TO ERRORS |
| Long text | PERFECT | MISSES CHARACTERS |
| URLs | PERFECT | CAN MANGLE SPECIAL CHARS |

**Rule:** Always prefer paste. Only use type if paste is not supported by the target field.

### 2. One Action Per Iteration

**✅ CORRECT Pattern:**
```
Iteration 1: Open application
Iteration 2: Wait for app to load (check screenshot)
Iteration 3: Paste URL
Iteration 4: Press Enter
Iteration 5: Verify page loaded (check screenshot)
```

**❌ WRONG Pattern:**
```
Iteration 1: Open app, paste URL, press Enter all at once
```

**Why?** Each action needs time to complete. Taking screenshots between actions lets you verify success.

### 3. Always Screenshot Before Clicking

Coordinates are blind without visual confirmation!

```
Iteration 1: Take screenshot (automatic)
Iteration 2: Analyze screenshot to find button coordinates
Iteration 3: Click at those coordinates
Iteration 4: Take screenshot to verify click worked
```

### 4. Wait Between Actions

Applications need time to load/respond:

- Opening app → Wait 2-3 seconds before next action
- Loading page → Wait 2-3 seconds before interacting
- After click → Wait 1 second to see result
- After paste → Wait 0.5 seconds before pressing Enter

**How to wait:** Just move to next iteration. The system automatically takes a screenshot, giving the UI time to update.

### 5. Use Tab to Navigate Forms

Instead of clicking each field:

```
Iteration 1: Click first field
Iteration 2: Paste text
Iteration 3: Press Tab (moves to next field)
Iteration 4: Paste text
Iteration 5: Press Tab
Iteration 6: Paste text
Iteration 7: Press Ctrl+Enter (submit)
```

**Example - Gmail Compose:**
- Tab 1: To field
- Tab 2: Subject field  
- Tab 3: Body field
- Ctrl+Enter: Send

### 6. Prefer Direct URLs Over Navigation

**✅ BETTER (2 steps):**
```
Step 1: Open chromium
Step 2: Paste full URL: "https://mail.google.com/mail/?view=cm&fs=1&to=user@example.com&su=Subject&body=Body"
Step 3: Press Enter
```

**❌ SLOWER (8+ steps):**
```
Step 1: Open chromium
Step 2: Navigate to gmail.com
Step 3: Click compose
Step 4: Click To field
Step 5: Type email
Step 6: Click Subject field
Step 7: Type subject
... (many more steps)
```

### 7. Available Applications

Valid application names:
- `chromium` - Web browser
- `gmail` - Opens Gmail in browser
- `terminal` - Command line
- `vscode` - Code editor
- `thunar` - File manager
- `mousepad` - Text editor
- `desktop` - Shows desktop

## 📋 Planning Patterns

### Pattern 1: Opening Application + URL

```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Open Chromium browser",
      "context": "Use application action"
    },
    {
      "id": "step_2",
      "type": "desktop",
      "description": "Wait for Chromium to load",
      "context": "Wait 3 seconds"
    },
    {
      "id": "step_3",
      "type": "desktop",
      "description": "Paste URL into address bar",
      "context": "Use paste action: https://www.wikipedia.org"
    },
    {
      "id": "step_4",
      "type": "desktop",
      "description": "Press Enter to navigate",
      "context": "Use key action: Return"
    }
  ]
}
```

### Pattern 2: Form Filling with Tab Navigation

```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Click first form field",
      "context": "Coordinates from screenshot"
    },
    {
      "id": "step_2",
      "type": "desktop",
      "description": "Paste text into field",
      "context": "Use paste action (faster)"
    },
    {
      "id": "step_3",
      "type": "desktop",
      "description": "Press Tab to move to next field",
      "context": "Use key action: Tab"
    },
    {
      "id": "step_4",
      "type": "desktop",
      "description": "Paste text into second field",
      "context": "Use paste action"
    },
    {
      "id": "step_5",
      "type": "desktop",
      "description": "Submit form",
      "context": "Use key action: Ctrl+Enter"
    }
  ]
}
```

### Pattern 3: Gmail Compose (Optimal)

```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Open Chromium",
      "context": "Use application action"
    },
    {
      "id": "step_2",
      "type": "desktop",
      "description": "Wait for Chromium to load",
      "context": "Wait 3 seconds"
    },
    {
      "id": "step_3",
      "type": "desktop",
      "description": "Paste Gmail compose URL with pre-filled fields",
      "context": "https://mail.google.com/mail/?view=cm&fs=1&to=user@example.com&su=Subject&body=Body"
    },
    {
      "id": "step_4",
      "type": "desktop",
      "description": "Press Enter to load compose",
      "context": "Use key action: Return"
    },
    {
      "id": "step_5",
      "type": "desktop",
      "description": "Wait for Gmail to load",
      "context": "Wait 3 seconds"
    },
    {
      "id": "step_6",
      "type": "desktop",
      "description": "Send email",
      "context": "Use key action: Ctrl+Enter"
    },
    {
      "id": "step_7",
      "type": "desktop",
      "description": "Verify email sent",
      "context": "Check screenshot for success message"
    }
  ]
}
```

## 🚫 Common Mistakes

### Mistake 1: Compound Actions

**❌ WRONG:**
```
"Open Chrome and navigate to Wikipedia"
```

**✅ CORRECT:**
```
Step 1: "Open Chrome"
Step 2: "Wait for Chrome to load"
Step 3: "Paste Wikipedia URL"
Step 4: "Press Enter"
```

### Mistake 2: Using "type" for URLs

**❌ WRONG:**
```
{"action": "type", "text": "https://www.example.com/very/long/url"}
```

**✅ CORRECT:**
```
{"action": "paste", "text": "https://www.example.com/very/long/url"}
```

### Mistake 3: No Wait After Opening App

**❌ WRONG:**
```
Iteration 1: Open Chromium
Iteration 2: Paste URL (app not ready yet!)
```

**✅ CORRECT:**
```
Iteration 1: Open Chromium
Iteration 2: Wait for app to load (check screenshot)
Iteration 3: Paste URL
```

### Mistake 4: Clicking Without Screenshot

**❌ WRONG:**
```
Iteration 1: Click at (100, 200) (guessing coordinates)
```

**✅ CORRECT:**
```
Iteration 1: Take screenshot
Iteration 2: Analyze screenshot to find button
Iteration 3: Click at verified coordinates
Iteration 4: Take screenshot to verify
```

## 📊 Performance Comparison

### Opening URL - Method Comparison

**Method 1: Navigation (SLOW - 8+ iterations)**
```
1. Open browser
2. Wait
3. Click address bar
4. Type URL character by character
5. Press Enter
6. Wait for load
```
Time: ~15-20 seconds

**Method 2: Direct Paste (FAST - 4 iterations)**
```
1. Open browser
2. Wait
3. Paste URL
4. Press Enter
```
Time: ~5-7 seconds

**Method 3: Pre-filled URL (FASTEST - 3 iterations)**
```
1. Open browser with URL parameter
2. Wait for load
3. Verify
```
Time: ~3-5 seconds

## 🎓 Summary

1. **ONE action per iteration** - Never combine actions
2. **ALWAYS use paste** - Never type URLs or long text
3. **WAIT between actions** - Let UI update before next action
4. **SCREENSHOT before clicking** - Verify coordinates visually
5. **USE Tab for forms** - Faster than clicking each field
6. **PREFER direct URLs** - Skip navigation when possible
7. **VERIFY after critical actions** - Check success via screenshot

Following these patterns will make your desktop automation:
- ✅ More reliable (fewer failures)
- ✅ Faster (fewer iterations)
- ✅ Easier to debug (clear action sequence)
- ✅ More maintainable (predictable patterns)
