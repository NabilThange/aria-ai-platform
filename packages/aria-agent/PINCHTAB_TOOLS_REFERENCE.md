# PinchTab Tools Reference Guide

## 🔒 Profile Management (Session Persistence)

### Why Profiles Matter
Without profiles, browser sessions are ephemeral - cookies and localStorage are lost when the instance stops. With profiles, session data persists across restarts, enabling:
- Staying logged into websites (Gmail, GitHub, etc.)
- Preserving user preferences
- Maintaining shopping carts
- Keeping authentication tokens

### Profile Workflow

```typescript
// 1. Create a persistent profile (once)
const profile = await pinchtab_create_profile({
  name: "my-persistent-profile",
  description: "Profile for Gmail automation"
});
// Returns: { id: "prof_abc123", name: "my-persistent-profile" }

// 2. Start instance with profile
const instance = await pinchtab_start_with_profile({
  profileId: "prof_abc123",
  mode: "headed"
});
// Returns: { id: "inst_xyz789", url: "..." }

// 3. Use the browser (login, navigate, etc.)
await pinchtab_navigate({ url: "https://gmail.com" });
// ... perform login ...

// 4. Stop instance (profile data saved)
await pinchtab_stop_by_profile({ profileId: "prof_abc123" });

// 5. Later: restart with SAME profile
const newInstance = await pinchtab_start_with_profile({
  profileId: "prof_abc123",
  mode: "headed"
});
// Navigate to Gmail - STILL LOGGED IN! ✅
```

### Profile Tools

#### `pinchtab_create_profile`
Create a named persistent profile.
```typescript
{
  name: string,           // Profile name (e.g., "gmail-profile")
  description?: string    // Optional description
}
// Returns: { id: string, name: string }
```

#### `pinchtab_list_profiles`
List all saved profiles.
```typescript
{}
// Returns: Array<{ id, name, running, diskUsage, ... }>
```

#### `pinchtab_start_with_profile`
Start instance with a specific profile (enables persistence).
```typescript
{
  profileId: string,      // Profile ID from create_profile
  mode: "headed" | "headless"
}
// Returns: { id: string, url: string }
```

#### `pinchtab_check_profile`
Check if a profile has a running instance.
```typescript
{
  profileId: string
}
// Returns: { running: boolean, id?: string, port?: string }
```

#### `pinchtab_get_profile`
Get profile details by ID or name.
```typescript
{
  idOrName: string        // Profile ID or name
}
// Returns: { id, name, running, diskUsage, ... }
```

#### `pinchtab_stop_by_profile`
Stop instance by profile (preserves profile data).
```typescript
{
  profileId: string
}
// Returns: void
```

---

## 🎯 New Actions

### `pinchtab_hover`
Hover over an element to reveal tooltips or dropdown menus.
```typescript
{
  ref: string             // Element reference from snapshot (e.g., "e42")
}
```

**Use cases:**
- Reveal hidden menus
- Show tooltips
- Trigger hover effects

### `pinchtab_focus`
Focus an element (useful before typing).
```typescript
{
  ref: string             // Element reference from snapshot
}
```

**Use cases:**
- Focus input before typing
- Activate form fields
- Trigger focus events

### `pinchtab_select`
Select a dropdown option by value.
```typescript
{
  ref: string,            // Select element reference
  value: string           // Option value to select
}
```

**Use cases:**
- Select country from dropdown
- Choose date from picker
- Pick option from menu

---

## 📖 New Read Endpoints

### `pinchtab_get_text`
Extract full page text (token-efficient alternative to screenshot).
```typescript
{}
// Returns: string (full page text, ~800 tokens)
```

**Use cases:**
- Read article content
- Extract data from page
- Search for specific text
- More efficient than screenshot for text-only tasks

### `pinchtab_screenshot`
Take a screenshot of the current page.
```typescript
{}
// Returns: Buffer | string (screenshot data)
```

**Use cases:**
- Visual debugging
- Capture page state
- Verify layout
- Save evidence of actions

### `pinchtab_eval`
Run JavaScript in the page context.
```typescript
{
  script: string          // JavaScript code to execute
}
// Returns: any (script result)
```

**Use cases:**
- Check cookies: `document.cookie`
- Read localStorage: `localStorage.getItem('key')`
- Get page data: `document.querySelector('.price').textContent`
- Trigger custom events
- Debug page state

**Examples:**
```javascript
// Check if logged in
await pinchtab_eval({ script: "document.cookie.includes('session')" });

// Get all links
await pinchtab_eval({ script: "Array.from(document.querySelectorAll('a')).map(a => a.href)" });

// Scroll to bottom
await pinchtab_eval({ script: "window.scrollTo(0, document.body.scrollHeight)" });
```

### `pinchtab_find`
Find elements by text or selector.
```typescript
{
  query: string           // Search query (text or CSS selector)
}
// Returns: Array<Element>
```

**Use cases:**
- Find buttons by text: "Submit"
- Find inputs by selector: "input[type=email]"
- Locate elements without snapshot
- Search for dynamic content

---

## 🔄 Comparison: Old vs New Workflow

### OLD (Ephemeral Sessions) ❌
```typescript
// Session 1
await pinchtab_launch_instance({ name: "default", mode: "headed" });
await pinchtab_navigate({ url: "https://gmail.com" });
// ... login manually ...
await pinchtab_stop_instance({ instanceId: "inst_123" });

// Session 2 (later)
await pinchtab_launch_instance({ name: "default", mode: "headed" });
await pinchtab_navigate({ url: "https://gmail.com" });
// ❌ NOT LOGGED IN - must login again!
```

### NEW (Persistent Sessions) ✅
```typescript
// Session 1
const profile = await pinchtab_create_profile({ name: "gmail-profile" });
await pinchtab_start_with_profile({ profileId: profile.id, mode: "headed" });
await pinchtab_navigate({ url: "https://gmail.com" });
// ... login manually ...
await pinchtab_stop_by_profile({ profileId: profile.id });

// Session 2 (later)
await pinchtab_start_with_profile({ profileId: profile.id, mode: "headed" });
await pinchtab_navigate({ url: "https://gmail.com" });
// ✅ STILL LOGGED IN - cookies persisted!
```

---

## 🚀 WebAgent Auto-Profile

The WebAgent now automatically uses profile-based persistence:

1. **First run**: Creates 'web-agent-default' profile
2. **Subsequent runs**: Reuses existing profile
3. **Fallback**: If profile system unavailable, uses ephemeral mode

**No manual intervention needed** - profiles are managed automatically!

---

## 📊 Tool Categories

### Instance Management (4)
- pinchtab_health
- pinchtab_launch_instance (legacy, use profiles instead)
- pinchtab_list_instances
- pinchtab_stop_instance

### Profile Management (6) 🆕
- pinchtab_create_profile
- pinchtab_list_profiles
- pinchtab_start_with_profile
- pinchtab_check_profile
- pinchtab_get_profile
- pinchtab_stop_by_profile

### Navigation (2)
- pinchtab_navigate
- pinchtab_switch_tab

### Tab Management (1)
- pinchtab_list_tabs

### Actions (9)
- pinchtab_click
- pinchtab_type
- pinchtab_press
- pinchtab_submit
- pinchtab_scroll
- pinchtab_hover 🆕
- pinchtab_focus 🆕
- pinchtab_select 🆕
- pinchtab_wait

### Read Operations (5)
- pinchtab_get_snapshot
- pinchtab_get_text 🆕
- pinchtab_screenshot 🆕
- pinchtab_eval 🆕
- pinchtab_find 🆕

### Workflow (1)
- pinchtab_mark_complete

**Total: 30 tools** (15 new, 15 existing)

---

## 🎓 Best Practices

### 1. Always Use Profiles for Persistent Sessions
```typescript
// ❌ BAD: Ephemeral instance
await pinchtab_launch_instance({ name: "temp", mode: "headed" });

// ✅ GOOD: Persistent profile
const profile = await pinchtab_create_profile({ name: "my-profile" });
await pinchtab_start_with_profile({ profileId: profile.id, mode: "headed" });
```

### 2. Check Profile Status Before Starting
```typescript
const status = await pinchtab_check_profile({ profileId: "prof_123" });
if (status.running) {
  console.log("Instance already running:", status.id);
} else {
  await pinchtab_start_with_profile({ profileId: "prof_123", mode: "headed" });
}
```

### 3. Use eval for Debugging
```typescript
// Check if logged in
const cookies = await pinchtab_eval({ script: "document.cookie" });
console.log("Cookies:", cookies);

// Verify localStorage
const token = await pinchtab_eval({ script: "localStorage.getItem('authToken')" });
console.log("Auth token:", token);
```

### 4. Prefer get_text Over screenshot for Text Content
```typescript
// ❌ EXPENSIVE: Screenshot for text (~10k tokens)
const screenshot = await pinchtab_screenshot({});

// ✅ EFFICIENT: Text extraction (~800 tokens)
const text = await pinchtab_get_text({});
```

### 5. Use hover Before Clicking Hidden Elements
```typescript
// Reveal dropdown menu
await pinchtab_hover({ ref: "e10" });
await pinchtab_wait({ ms: 500 });

// Click revealed item
await pinchtab_click({ ref: "e11" });
```

---

## 🐛 Troubleshooting

### Profile Not Persisting Sessions
```typescript
// 1. Verify profile exists
const profiles = await pinchtab_list_profiles({});
console.log("Profiles:", profiles);

// 2. Check profile instance status
const status = await pinchtab_check_profile({ profileId: "prof_123" });
console.log("Running:", status.running);

// 3. Verify cookies after restart
await pinchtab_start_with_profile({ profileId: "prof_123", mode: "headed" });
const cookies = await pinchtab_eval({ script: "document.cookie" });
console.log("Cookies:", cookies);
```

### Element Not Found
```typescript
// 1. Get fresh snapshot
const snapshot = await pinchtab_get_snapshot({});
console.log("Elements:", snapshot.elements);

// 2. Use find to search
const results = await pinchtab_find({ query: "Submit" });
console.log("Found:", results);

// 3. Use eval to check DOM
const exists = await pinchtab_eval({ 
  script: "document.querySelector('button[type=submit]') !== null" 
});
```

### Action Not Working
```typescript
// 1. Focus element first
await pinchtab_focus({ ref: "e5" });

// 2. Wait for element to be ready
await pinchtab_wait({ ms: 1000 });

// 3. Try action
await pinchtab_type({ ref: "e5", text: "test" });

// 4. Verify with eval
const value = await pinchtab_eval({ 
  script: "document.querySelector('input').value" 
});
```

---

## 📝 Migration Guide

### From Old to New

**Before (Ephemeral):**
```typescript
await pinchtab_launch_instance({ name: "default", mode: "headed" });
await pinchtab_navigate({ url: "https://example.com" });
// ... do work ...
await pinchtab_stop_instance({ instanceId: "inst_123" });
```

**After (Persistent):**
```typescript
// One-time setup
const profile = await pinchtab_create_profile({ name: "my-profile" });

// Every session
await pinchtab_start_with_profile({ profileId: profile.id, mode: "headed" });
await pinchtab_navigate({ url: "https://example.com" });
// ... do work ...
await pinchtab_stop_by_profile({ profileId: profile.id });
```

**Or let WebAgent handle it automatically!** 🎉
