# VNC Control - Command Reference
> Base URL: `http://localhost:9990/computer-use`

---

## ⚡ Golden Rule: Always Use `paste_text` Over `type_text`

| | `paste_text` ✅ | `type_text` ❌ |
|---|---|---|
| Speed | Instant | Slow (char by char) |
| Reliability | High | Prone to errors |
| Long text | Perfect | Misses characters |
| URLs | Perfect | Can mangle special chars |

**Always prefer `paste_text`. Only use `type_text` if paste is not supported by the target field.**

---

## 🔑 CMD Escaping Rules (IMPORTANT)

| Problem | Solution |
|---|---|
| `&` in URLs breaks CMD | Escape with `^&` → `fs=1^&to=...` |
| Quotes in JSON | Escape with `\"` |
| Chaining commands | Use `&&` between commands |
| Waiting | Use `timeout 3 > nul` |

---

## 📸 Screenshot

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"screenshot\"}"
```

---

## 🚀 Open Applications

> Valid app names: `chromium`, `gmail`, `vscode`, `terminal`, `thunar`, `mousepad`, `desktop`

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"chromium\"}"
```

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"terminal\"}"
```

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"vscode\"}"
```

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"gmail\"}"
```

---

## 🌐 Open Chromium With a URL

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"chromium\"}" && timeout 3 > nul && curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"paste_text\", \"text\": \"https://www.google.com\"}" && timeout 1 > nul && curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"Return\"]}"
```

> Replace `https://www.google.com` with any URL.  
> `timeout 3` is needed to wait for Chromium to fully open before pasting.

---

## 📧 Open Gmail Compose With Pre-filled Fields

> ✅ Working URL format (confirmed): `https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...`  
> ⚠️ Must escape `&` as `^&` in CMD!

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"application\", \"application\": \"chromium\"}" && timeout 3 > nul && curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"paste_text\", \"text\": \"https://mail.google.com/mail/?view=cm^&fs=1^&to=thangenbail@gmail.com^&su=Hello^&body=hii\"}" && timeout 1 > nul && curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"Return\"]}"
```

> Replace `to=`, `su=`, `body=` values as needed.  
> You must be **logged into Gmail** for this to work.  
> After the compose window opens, just hit **Send** manually or add `Ctrl+Enter` at the end.

---

## ⌨️ Paste Text (Preferred)

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"paste_text\", \"text\": \"Your text here\"}"
```

---

## ⌨️ Type Text (Slow - avoid if possible)

```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_text\", \"text\": \"Hello\", \"delay\": 50}"
```

---

## ⌨️ Key Presses

**Enter:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"Return\"]}"
```

**Tab:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"Tab\"]}"
```

**Escape:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"Escape\"]}"
```

**Ctrl+Enter (Send email / Submit):**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"LeftControl\", \"Return\"]}"
```

**Ctrl+C:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"LeftControl\", \"c\"]}"
```

**Ctrl+V:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"type_keys\", \"keys\": [\"LeftControl\", \"v\"]}"
```

---

## 🖱️ Mouse Clicks

**Left Click:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"click_mouse\", \"coordinates\": {\"x\": 100, \"y\": 200}, \"button\": \"left\", \"clickCount\": 1}"
```

**Double Click:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"click_mouse\", \"coordinates\": {\"x\": 100, \"y\": 200}, \"button\": \"left\", \"clickCount\": 2}"
```

**Right Click:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"click_mouse\", \"coordinates\": {\"x\": 100, \"y\": 200}, \"button\": \"right\", \"clickCount\": 1}"
```

> ⚠️ Coordinates are **absolute** from top-left `(0,0)`. Always take a screenshot first to find correct coordinates.

---

## 📜 Scroll

**Scroll Down:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"scroll\", \"direction\": \"down\", \"scrollCount\": 3}"
```

**Scroll Up:**
```cmd
curl -X POST http://localhost:9990/computer-use -H "Content-Type: application/json" -d "{\"action\": \"scroll\", \"direction\": \"up\", \"scrollCount\": 3}"
```

---

## 💡 Tips

- **Always take a screenshot first** before clicking — coordinates are blind without it
- **Use `^&` not `%26`** to escape `&` in URLs inside CMD — `%26` sends literally to browser
- **Add `timeout` between steps** — give apps time to open/load before next action
- **Tab between form fields** — in Gmail compose, Tab moves To → Subject → Body
- **`paste_text` is always faster and more reliable than `type_text`**
- **Chained commands use `&&`** — if one fails, the chain stops
