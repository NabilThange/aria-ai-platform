# PinchTab - Browser Automation Guide
> PinchTab is a 12MB binary that replaces Playwright for AI Agents.  
> API runs at `http://localhost:9867`

---

## 🏆 Why PinchTab is Better Than VNC

| | VNC (port 9990) | PinchTab (port 9867) |
|---|---|---|
| Finding elements | Blind coordinates 🎯 | Named refs (e.g. `e23`) ✅ |
| Clicking buttons | Need screenshot first | Click by ref directly |
| Filling forms | type/paste to coordinates | `fill` or `type` by ref |
| Reading page | Can't read text | Full element tree snapshot |
| Reliability | Breaks if UI shifts | Always works by element name |

---

## ⚡ Key Discoveries

- `"mode": "headed"` → shows browser in VNC (visible UI) 🎉
- `"mode": "headless"` → background browser (no UI)
- `fill` action returns `{"filled":""}` — **does NOT work** ❌
- `type` action returns `{"typed":"..."}` — **USE THIS** ✅
- `press` with `"key":"Enter"` types the word "Enter" — **does NOT work** ❌
- To submit forms → **click the submit button ref instead** ✅
- Links that say "Opens in new tab" don't always open new tabs via click
- To navigate to a URL → type it in the search/address bar + click Search button

---

## 🚀 Instance Management

**Check health:**
```cmd
curl http://localhost:9867/health
```

**List all instances:**
```cmd
curl http://localhost:9867/instances
```

**Launch headed instance (visible in VNC):**
```cmd
curl -X POST http://localhost:9867/instances/launch -H "Content-Type: application/json" -d "{\"name\":\"myinstance\",\"mode\":\"headed\"}"
```

**Launch headless instance (background):**
```cmd
curl -X POST http://localhost:9867/instances/launch -H "Content-Type: application/json" -d "{\"name\":\"myinstance\",\"mode\":\"headless\"}"
```

**Stop an instance:**
```cmd
curl -X POST http://localhost:9867/instances/INSTANCE_ID/stop
```

**List tabs in an instance:**
```cmd
curl http://localhost:9867/instances/INSTANCE_ID/tabs
```

---

## 🌐 Tab Management

**Open a URL in a tab:**
```cmd
curl -X POST http://localhost:9867/instances/INSTANCE_ID/tabs/open -H "Content-Type: application/json" -d "{\"url\":\"https://www.google.com\"}"
```
> Returns `tabId` — save this for all future actions!

---

## 🔍 Snapshot (The Magic Feature)

Get all interactive elements on the page with their refs:

```cmd
curl http://localhost:9867/tabs/TAB_ID/snapshot?filter=interactive
```

**Example response:**
```json
{"count":30,"nodes":[
  {"ref":"e23","role":"combobox","name":"Search","focused":true},
  {"ref":"e27","role":"button","name":"Google Search"},
  {"ref":"e28","role":"button","name":"I'm Feeling Lucky"}
]}
```

> Always take a fresh snapshot after each action — refs change when page updates!

---

## 🎯 Actions

### ✅ Type text into a field (WORKS)
```cmd
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"type\",\"ref\":\"e23\",\"text\":\"your text here\"}"
```

### ❌ Fill field (does NOT work — returns empty)
```cmd
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"fill\",\"ref\":\"e23\",\"value\":\"your text\"}"
```

### ✅ Click an element
```cmd
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"click\",\"ref\":\"e27\"}"
```

### ❌ Press Enter key (types the word "Enter" instead)
```cmd
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"press\",\"key\":\"Enter\"}"
```
> ⚠️ Use click on submit button instead!

---

## 🔁 Full Google Search Workflow

```cmd
REM Step 1: Launch headed instance
curl -X POST http://localhost:9867/instances/launch -H "Content-Type: application/json" -d "{\"name\":\"demo\",\"mode\":\"headed\"}"

REM Step 2: Open Google (use instance ID from step 1)
curl -X POST http://localhost:9867/instances/INSTANCE_ID/tabs/open -H "Content-Type: application/json" -d "{\"url\":\"https://www.google.com\"}"

REM Step 3: Get snapshot (use tabId from step 2)
curl http://localhost:9867/tabs/TAB_ID/snapshot?filter=interactive

REM Step 4: Type into search box (ref e23 on Google)
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"type\",\"ref\":\"e23\",\"text\":\"your search query\"}"

REM Step 5: Take fresh snapshot to get updated refs
curl http://localhost:9867/tabs/TAB_ID/snapshot?filter=interactive

REM Step 6: Click Google Search button (ref e27 on Google)
curl -X POST http://localhost:9867/tabs/TAB_ID/action -H "Content-Type: application/json" -d "{\"kind\":\"click\",\"ref\":\"e27\"}"
```

---

## 💡 Tips

- **Always take a fresh snapshot** after every action — refs change!
- **Use `type` not `fill`** — fill doesn't work
- **Click buttons to submit** — don't rely on Enter key
- **`headed` mode** shows browser in VNC for that satisfying visual feedback 😎
- **tabId** is returned when you open a tab — always save it
- **Snapshot reveals everything** — element names, roles, values, focus state
- If a link says "Opens in new tab" — check `instances/INSTANCE_ID/tabs` for the new tabId
