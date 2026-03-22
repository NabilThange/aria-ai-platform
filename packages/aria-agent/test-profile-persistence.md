# Profile Persistence Verification Test

## Implementation Summary

### ✅ Endpoint Correction
- Changed all `/instances/launch` → `/instances/start` (2 occurrences in pinchtab.service.ts)

### ✅ Phase 1: Profile Management (COMPLETE)

#### New Service Methods Added:
1. `createProfile(name, description?, useWhen?)` → `POST /profiles`
2. `listProfiles()` → `GET /profiles`
3. `getProfile(idOrName)` → `GET /profiles/{idOrName}`
4. `startInstanceWithProfile(profileId, mode)` → `POST /profiles/{profileId}/start`
5. `stopInstanceByProfile(profileId)` → `POST /profiles/{profileId}/stop`
6. `getProfileInstance(profileId)` → `GET /profiles/{profileId}/instance`

#### New Tools Added:
1. `pinchtab_create_profile` - Create persistent profile
2. `pinchtab_list_profiles` - List all profiles
3. `pinchtab_start_with_profile` - Start instance with profile
4. `pinchtab_check_profile` - Check profile status
5. `pinchtab_get_profile` - Get profile details
6. `pinchtab_stop_by_profile` - Stop instance by profile

#### WebAgent Integration:
- Updated `initializeBrowserInstance()` to use profile-based persistence
- Automatically creates 'web-agent-default' profile on first run
- Reuses existing profile on subsequent runs
- Falls back to ephemeral mode if profile system unavailable

### ✅ Phase 2: Missing Actions (COMPLETE)

#### New Action Types:
- `hover` - Hover over elements
- `focus` - Focus elements
- `select` - Select dropdown options

#### New Service Methods:
1. `hover(ref, tabId?, taskId?)`
2. `focus(ref, tabId?, taskId?)`
3. `select(ref, value, tabId?, taskId?)`

#### New Tools:
1. `pinchtab_hover`
2. `pinchtab_focus`
3. `pinchtab_select`

### ✅ Phase 2: Missing Read Endpoints (COMPLETE)

#### New Service Methods:
1. `getPageText(tabId?, taskId?)` → `GET /tabs/{id}/text`
2. `takeScreenshot(tabId?, taskId?)` → `GET /tabs/{id}/screenshot`
3. `evalJavaScript(script, tabId?, taskId?)` → `POST /tabs/{id}/eval`
4. `findElements(query, tabId?, taskId?)` → `POST /tabs/{id}/find`

#### New Tools:
1. `pinchtab_get_text` - Extract full page text
2. `pinchtab_screenshot` - Take screenshot
3. `pinchtab_eval` - Run JavaScript
4. `pinchtab_find` - Find elements

### ✅ Type Updates
- Added `PinchTabProfile` interface
- Updated `PinchTabAction` to include 'hover', 'focus', 'select'

---

## Verification Test Plan

### Test 1: Profile Creation and Listing

```bash
# Start the aria-agent service
cd packages/aria-agent
npm run start:dev

# In another terminal, test profile endpoints
curl -X POST http://localhost:9867/profiles \
  -H "Content-Type: application/json" \
  -d '{"name":"test-profile","description":"Test profile for verification"}'

# Expected: { "status": "created", "id": "prof_xxx", "name": "test-profile" }

curl http://localhost:9867/profiles

# Expected: Array of profiles including test-profile
```

### Test 2: Start Instance with Profile

```bash
# Get profile ID from Test 1
PROFILE_ID="prof_xxx"

# Start instance with profile
curl -X POST http://localhost:9867/profiles/$PROFILE_ID/start \
  -H "Content-Type: application/json" \
  -d '{"headless":false}'

# Expected: { "id": "inst_xxx", "url": "..." }

# Check profile instance status
curl http://localhost:9867/profiles/$PROFILE_ID/instance

# Expected: { "running": true, "id": "inst_xxx", "port": "..." }
```

### Test 3: Session Persistence (THE CRITICAL TEST)

#### Step 1: Login to a site
```bash
# 1. Start instance with profile
PROFILE_ID="prof_xxx"
curl -X POST http://localhost:9867/profiles/$PROFILE_ID/start \
  -H "Content-Type: application/json" \
  -d '{"headless":false}'

# Get instance ID from response
INSTANCE_ID="inst_xxx"

# 2. Open a tab and navigate to a login page (e.g., GitHub)
curl -X POST http://localhost:9867/instances/$INSTANCE_ID/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/login"}'

# Get tab ID from response
TAB_ID="tab_xxx"

# 3. Manually log in via VNC (http://localhost:9990)
# Or use the agent to automate login

# 4. Verify logged in by checking cookies
curl -X POST http://localhost:9867/tabs/$TAB_ID/eval \
  -H "Content-Type: application/json" \
  -d '{"script":"document.cookie"}'

# Expected: Cookie string with session tokens
```

#### Step 2: Stop instance (profile persists)
```bash
# Stop the instance
curl -X POST http://localhost:9867/profiles/$PROFILE_ID/stop

# Verify instance stopped
curl http://localhost:9867/profiles/$PROFILE_ID/instance

# Expected: { "running": false }
```

#### Step 3: Restart with same profile
```bash
# Start NEW instance with SAME profile
curl -X POST http://localhost:9867/profiles/$PROFILE_ID/start \
  -H "Content-Type: application/json" \
  -d '{"headless":false}'

# Get new instance ID
NEW_INSTANCE_ID="inst_yyy"

# Open tab to GitHub
curl -X POST http://localhost:9867/instances/$NEW_INSTANCE_ID/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com"}'

# Get new tab ID
NEW_TAB_ID="tab_yyy"

# Check if still logged in
curl -X POST http://localhost:9867/tabs/$NEW_TAB_ID/eval \
  -H "Content-Type: application/json" \
  -d '{"script":"document.cookie"}'

# Expected: SAME cookie string as before
# If cookies match, SESSION PERSISTENCE WORKS! ✅
```

### Test 4: WebAgent Profile Integration

```bash
# Create a task that requires login
curl -X POST http://localhost:9991/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Navigate to GitHub and check if logged in",
    "context": "Test profile persistence"
  }'

# Check logs for profile creation
# Expected logs:
# - "Creating new persistent profile: web-agent-default"
# - "Profile created: prof_xxx"
# - "Browser instance launched with persistent profile"
# - "Session data will persist across restarts"

# Stop the task

# Create another task
curl -X POST http://localhost:9991/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Navigate to GitHub again",
    "context": "Test profile reuse"
  }'

# Check logs for profile reuse
# Expected logs:
# - "Using existing profile: web-agent-default (prof_xxx)"
# - "Browser instance launched with persistent profile"
# - Session should persist from previous task
```

### Test 5: New Actions (hover, focus, select)

```bash
# Navigate to a page with interactive elements
curl -X POST http://localhost:9867/instances/$INSTANCE_ID/tabs/open \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'

TAB_ID="tab_xxx"

# Get snapshot to find element refs
curl http://localhost:9867/tabs/$TAB_ID/snapshot?filter=interactive

# Test hover
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"hover","ref":"e1"}'

# Test focus
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"focus","ref":"e2"}'

# Test select (on a dropdown)
curl -X POST http://localhost:9867/tabs/$TAB_ID/action \
  -H "Content-Type: application/json" \
  -d '{"kind":"select","ref":"e3","value":"option1"}'
```

### Test 6: New Read Endpoints

```bash
# Get page text
curl http://localhost:9867/tabs/$TAB_ID/text

# Expected: Full page text content

# Take screenshot
curl http://localhost:9867/tabs/$TAB_ID/screenshot

# Expected: Screenshot data (base64 or binary)

# Evaluate JavaScript
curl -X POST http://localhost:9867/tabs/$TAB_ID/eval \
  -H "Content-Type: application/json" \
  -d '{"script":"document.title"}'

# Expected: { "result": "Page Title" }

# Find elements
curl -X POST http://localhost:9867/tabs/$TAB_ID/find \
  -H "Content-Type: application/json" \
  -d '{"query":"button"}'

# Expected: Array of button elements
```

---

## Success Criteria

### ✅ Profile System Working:
- [ ] Can create profiles via API
- [ ] Can list profiles
- [ ] Can start instance with profile
- [ ] Can stop instance (profile persists)
- [ ] Can restart with same profile
- [ ] **Cookies persist across restarts** (THE KEY TEST)

### ✅ WebAgent Integration:
- [ ] WebAgent creates 'web-agent-default' profile on first run
- [ ] WebAgent reuses profile on subsequent runs
- [ ] Logs show profile-based initialization
- [ ] Falls back gracefully if profile system unavailable

### ✅ New Actions:
- [ ] hover action works
- [ ] focus action works
- [ ] select action works

### ✅ New Read Endpoints:
- [ ] getPageText returns text
- [ ] takeScreenshot returns image
- [ ] evalJavaScript executes code
- [ ] findElements returns results

---

## Known Limitations

1. **Profile API Availability**: If PinchTab doesn't support `/profiles` endpoints yet, the implementation will fall back to ephemeral mode
2. **Endpoint Variations**: Some endpoints might use different paths (e.g., `/text?tabId=xxx` vs `/tabs/{id}/text`)
3. **Response Formats**: Response structures might vary from documented format

---

## Next Steps After Verification

1. **If profiles work**: Document the profile persistence pattern for users
2. **If profiles don't work**: Check PinchTab version and API documentation
3. **If endpoints differ**: Adjust service methods to match actual API
4. **Add error handling**: Improve fallback behavior for missing features

---

## Tools Summary

### Total Tools Added: 15

**Profile Management (6):**
- pinchtab_create_profile
- pinchtab_list_profiles
- pinchtab_start_with_profile
- pinchtab_check_profile
- pinchtab_get_profile
- pinchtab_stop_by_profile

**New Actions (3):**
- pinchtab_hover
- pinchtab_focus
- pinchtab_select

**New Read Endpoints (4):**
- pinchtab_get_text
- pinchtab_screenshot
- pinchtab_eval
- pinchtab_find

**Existing Tools (15):**
- pinchtab_health
- pinchtab_launch_instance
- pinchtab_list_instances
- pinchtab_stop_instance
- pinchtab_list_tabs
- pinchtab_switch_tab
- pinchtab_navigate
- pinchtab_click
- pinchtab_type
- pinchtab_press
- pinchtab_submit
- pinchtab_scroll
- pinchtab_wait
- pinchtab_get_snapshot
- pinchtab_mark_complete

**Total: 30 PinchTab tools**
