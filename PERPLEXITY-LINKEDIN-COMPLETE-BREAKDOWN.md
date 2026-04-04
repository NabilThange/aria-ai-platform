# Perplexity LinkedIn Post Workflow - COMPLETE BREAKDOWN

## Overview
This workflow researches a topic on Perplexity AI, generates a professional LinkedIn post, and publishes it via N8N webhook.

**Input**: Topic (e.g., "AI in healthcare")
**Output**: LinkedIn post published via N8N webhook
**Timeout**: 5 minutes (300,000ms)

---

## EVERY SINGLE STEP EXPLAINED

### 🔧 HELPER FUNCTIONS (Before Main Workflow)

#### 1. `callGroqAI()` - Text AI Helper
**What it does**: Calls Groq API for text generation
**How it works**:
- Tries up to 10 API keys (GROQ_API_KEY_1 through GROQ_API_KEY_10)
- Falls back to GROQ_API_KEY if numbered keys don't exist
- Uses model: `llama-3.3-70b-versatile`
- Temperature: 0.7 (creative but controlled)
- Max tokens: 2048
- Handles rate limiting (429/402 errors) by trying next key
- Returns AI-generated text

#### 2. `callGroqVision()` - Vision AI Helper
**What it does**: Analyzes screenshots using Groq Vision API
**How it works**:
- Same key rotation as callGroqAI
- Uses model: `meta-llama/llama-4-scout-17b-16e-instruct`
- Temperature: 0.1 (very precise, not creative)
- Max tokens: 512 (short responses)
- Takes base64 image + text prompt
- Returns one-word answers (LOADED/LOADING, DONE/LOADING, etc.)

#### 3. `waitForPerplexityToLoad()` - Page Load Checker
**What it does**: Waits until Perplexity page is fully loaded
**How it works**:
- Takes screenshot every 3 seconds
- Sends to Groq Vision with prompt: "Is page loaded?"
- Looks for: search box, Perplexity branding, interactive UI
- Max 10 attempts (30 seconds total)
- Returns true if "LOADED" detected, false if timeout

#### 4. `waitForPerplexityResponse()` - Response Checker
**What it does**: Waits until Perplexity finishes generating answer
**How it works**:
- Takes screenshot every 5 seconds
- Analyzes send button icon:
  - Square/stop icon (■) = still generating (LOADING)
  - Arrow/plane icon (➤) = finished (DONE)
- Max 20 attempts (100 seconds total)
- Waits extra 5 seconds after detecting DONE
- Returns true if finished, false if timeout

#### 5. `checkPerplexityLogin()` - Login Status Checker
**What it does**: Checks if user is logged into Perplexity
**How it works**:
- Takes screenshot
- Sends to Groq Vision with prompt: "Logged in or login wall?"
- Looks for: search box (logged in) vs login buttons (not logged in)
- Returns true if logged in, false if login required

---

## MAIN WORKFLOW STEPS

### ✅ STEP 1: Get or Create Persistent Profile
**Code location**: Lines 445-462
**What happens**:
1. Calls `pinchTab.listProfiles()` to get all browser profiles
2. Searches for profile named `perplexity-profile`
3. If NOT found:
   - Creates new profile with `pinchTab.createProfile()`
   - Name: `perplexity-profile`
   - Description: `Persistent Perplexity session`
4. If found:
   - Uses existing profile
5. Stores `profile.id` in `profileId` variable

**Why this matters**:
- Profiles preserve login sessions, cookies, localStorage
- You only need to log into Perplexity ONCE
- Next time workflow runs, you're already logged in
- Saves time and avoids repeated authentication

**Logged**: `listProfiles`, `createProfile` (if new)

---

### ✅ STEP 2: Check if Profile Already Running
**Code location**: Lines 464-477
**What happens**:
1. Calls `pinchTab.getProfileInstance(profileId)` to check status
2. Checks if `status.running === true`
3. If running:
   - Calls `pinchTab.stopInstanceByProfile(profileId)`
   - Waits 2000ms (2 seconds) for clean shutdown
4. If not running:
   - Continues to next step

**Why this matters**:
- Can't start a profile that's already running
- Prevents conflicts and resource issues
- Ensures clean state before starting new session

**Logged**: `getProfileInstance`, `stopInstanceByProfile` (if running), `wait`

---

### ✅ STEP 3: Start Instance with Profile
**Code location**: Lines 479-492
**What happens**:
1. Calls `pinchTab.startInstanceWithProfile(profileId, 'headed')`
   - `headed` = visible browser window (not headless)
2. Gets back `instance` object with `instance.id`
3. Calls `pinchTab.setCurrentInstance(instance.id)` to set as active
4. Waits 10000ms (10 seconds) for full initialization

**Why this matters**:
- Browser needs time to:
  - Load profile data (cookies, localStorage)
  - Initialize extensions
  - Auto-create first tab
  - Render UI
- 10 seconds ensures everything is ready

**Logged**: `startInstanceWithProfile`, `wait`

---

### ✅ STEP 4: Get or Create Tab
**Code location**: Lines 494-543
**What happens**:
1. Calls `pinchTab.listTabs(instance.id)` to check for existing tabs
2. If tabs exist (length > 0):
   - Uses first tab: `tabId = tabs[0].id || tabs[0].tabId`
   - Calls `pinchTab.switchTab(tabId)` to activate it
   - Navigates to `https://www.perplexity.ai`
3. If no tabs exist:
   - Calls `pinchTab.navigate('https://www.perplexity.ai', instance.id)`
   - This creates a new tab AND navigates to URL
   - Gets back `tabId`
4. Waits 8000ms (8 seconds) for page to load
5. Throws error if `tabId` is still null

**Why this matters**:
- Browser might auto-create a tab on startup (sometimes)
- Need to handle both cases: tab exists vs no tab
- Navigation can fail, so we catch errors and continue
- 8 seconds allows page to fully load

**Logged**: `listTabs`, `navigate`, `wait`

---

### ✅ STEP 4A: Make Browser Fullscreen
**Code location**: Lines 545-552
**What happens**:
1. Calls `desktop.pressKeys(['F11'])` to press F11 key
2. Waits 1000ms (1 second) for fullscreen transition

**Why this matters**:
- Fullscreen maximizes visible area
- Better for screenshot analysis (more content visible)
- Removes browser chrome (address bar, tabs, etc.)
- Vision AI can see more of the page

**Logged**: `pressKeys`, `wait`

---

### ✅ STEP 5: Wait for Perplexity to Load
**Code location**: Lines 554-556
**What happens**:
1. Calls `waitForPerplexityToLoad(pinchTab, tabId, 10)`
2. Inside this function (lines 163-221):
   - Loop 10 times (max attempts)
   - Each iteration:
     - Wait 3 seconds
     - Take screenshot with `pinchTab.takeScreenshot(tabId)`
     - Extract base64 image (handles different formats)
     - Call `callGroqVision()` with prompt: "Is page loaded?"
     - Check if response includes "LOADED"
     - If yes: return true
     - If no: continue loop
   - After 10 attempts: return false (timeout)

**Why this matters**:
- Perplexity uses heavy JavaScript (React/Next.js)
- Page might look loaded but still initializing
- Vision AI confirms search box is actually visible and interactive
- Prevents clicking on elements that aren't ready yet

**Logged**: None (internal function)

---

### ✅ STEP 6: Check Login Status
**Code location**: Lines 558-574
**What happens**:
1. Calls `checkPerplexityLogin(pinchTab, tabId)`
2. Inside this function (lines 316-363):
   - Takes screenshot
   - Extracts base64 image
   - Calls `callGroqVision()` with prompt: "Logged in or login wall?"
   - Checks if response includes "LOGGED_IN"
   - Returns true/false
3. If `isLoggedIn === false`:
   - Stops browser instance
   - Returns error result:
     - `success: false`
     - `error: 'Perplexity login required'`
     - `message: 'Please open Perplexity in your browser and log in first...'`
   - Workflow ENDS here
4. If logged in:
   - Continues to next step

**Why this matters**:
- Perplexity requires login for full functionality
- Free tier has limited searches
- Pro features need authentication
- Better to fail early than halfway through

**Logged**: `stopInstanceByProfile` (if not logged in)

---

### ✅ STEP 7: Type Research Prompt
**Code location**: Lines 576-634
**What happens**:
1. Calls `pinchTab.snapshot('interactive')` to get DOM snapshot
   - `interactive` filter = only interactive elements (buttons, inputs, etc.)
2. Extracts elements array: `(snapshot as any).nodes || (snapshot as any).elements`
3. Finds search box:
   ```javascript
   elements.find(el => 
     (el.role === 'textbox' || el.tag === 'textarea' || el.tag === 'input') &&
     !el.attributes?.disabled
   )
   ```
4. If not found: throws error
5. If found: logs `ref` (element reference)
6. Builds research prompt (lines 608-628):
   - Includes topic variable
   - Specifies requirements: facts, trends, expert insights, examples
   - Requests structured response with 6 sections
   - Asks for sources with URLs
7. Calls `desktop.pasteText(researchPrompt)` to paste entire prompt
   - Uses paste (not typing) for speed
8. Waits 1000ms (1 second)
9. Calls `desktop.pressKeys(['Return'])` to press Enter

**Why this matters**:
- Snapshot gives us structured DOM data (not just pixels)
- Finding search box by role/tag is more reliable than coordinates
- Paste is 100x faster than typing character-by-character
- Detailed prompt gets better research results
- Enter submits the query

**Logged**: `snapshot`, `pasteText`, `wait`, `pressEnter`

---

### ✅ STEP 8: Wait for Research Response
**Code location**: Lines 636-642
**What happens**:
1. Waits 15000ms (15 seconds) initial delay
   - Gives Perplexity time to start generating
2. Calls `waitForPerplexityResponse(desktop, 20)`
3. Inside this function (lines 223-314):
   - Loop 20 times (max attempts)
   - Each iteration:
     - Wait 5 seconds
     - Take screenshot with `desktop.screenshot()`
     - Extract base64 image
     - Call `callGroqVision()` with prompt: "Is send button square or arrow?"
     - Check if response includes "DONE"
     - If yes: wait extra 5 seconds, return true
     - If no: continue loop
   - After 20 attempts: return false (timeout)

**Why this matters**:
- Perplexity generates responses in real-time (streaming)
- Can take 30-60 seconds for complex research
- Send button icon changes when done:
  - Square (■) = still generating
  - Arrow (➤) = finished
- Vision AI detects this change reliably
- Extra 5 seconds ensures response is fully rendered

**Logged**: `wait`

---

### ✅ STEP 9: Export Conversation via JavaScript Eval
**Code location**: Lines 644-752
**What happens**:
1. Defines `exportScript` - a massive JavaScript function (lines 647-745)
2. Calls `pinchTab.evalJavaScript(exportScript)` to execute in browser
3. Inside the JavaScript (runs in browser, not Node.js):
   
   **Step 9a: Helper Functions**
   - `delay(ms)`: Async sleep
   - `safeFilename(text)`: Sanitizes text for valid filename
   - `autoDownload(content, filename)`: Creates blob and triggers download
   
   **Step 9b: Extract Thread Title**
   - Looks for `h1.group/query` element (Perplexity's query header)
   - Falls back to `document.title`
   - Truncates to 100 chars
   
   **Step 9c: Parse All Conversation Turns**
   - Finds all `h1.group/query` elements (each query in conversation)
   - For each query:
     - Extracts query text
     - Finds answer in `.prose` container
     - Extracts citations:
       - Finds `.citation` elements
       - Gets href URLs
       - Maps citation numbers to URLs
       - Replaces citation elements with `[1]`, `[2]`, etc.
     - Extracts code blocks:
       - Finds `pre code` elements
       - Detects language from class name
       - Preserves code content
       - Replaces with placeholder
     - Cleans up answer text:
       - Removes extra newlines
       - Restores code blocks with markdown formatting
   
   **Step 9d: Build Markdown Document**
   - Header: Title, export date, source URL
   - For each turn:
     - `## 🧑 Query N` section
     - `## 🤖 Answer` section
     - `### 📚 Sources` section with clickable URLs
   - Footer: Export attribution
   
   **Step 9e: Download File**
   - Creates filename: `Aria_Research_[topic].md`
   - Calls `autoDownload()` to trigger browser download
   - Returns success object: `{ success: true, filename, turns, citations }`

4. Waits 5000ms (5 seconds) for download to complete
5. If eval fails:
   - Logs error
   - Continues workflow (doesn't fail)

6. **Fallback**: Also calls `pinchTab.getPageText()` (lines 754-759)
   - Gets plain text of entire page
   - Truncates to 6000 chars
   - Stores in `researchContent` variable
   - Used if JavaScript eval fails

**Why this matters**:
- JavaScript eval runs INSIDE the browser (has access to DOM)
- Can extract structured data (queries, answers, citations)
- Preserves formatting and links
- Downloads as markdown file to Desktop/Downloads
- Fallback ensures we always get SOME data
- This is the SAME code used in freelancer workflow (tested and working)

**Logged**: `evalJavaScript`, `wait`, `getPageText`

---

### ✅ STEP 10: Type LinkedIn Post Prompt
**Code location**: Lines 761-809
**What happens**:
1. Calls `pinchTab.snapshot('interactive')` again (page has changed)
2. Extracts elements array
3. Finds search box again (same logic as Step 7)
4. If not found: throws error
5. Builds LinkedIn post prompt (lines 777-805):
   - References research from previous query
   - Specifies length: 150-200 words
   - Defines structure: Hook → Value → Context → CTA
   - Requests 3-5 hashtags
   - Specifies tone: professional yet conversational
   - Gives formatting guidelines
6. Calls `desktop.pasteText(linkedinPrompt)`
7. Waits 1000ms (1 second)
8. Calls `desktop.pressKeys(['Return'])` to press Enter

**Why this matters**:
- Need to find search box again (DOM has changed after first response)
- Detailed prompt ensures LinkedIn post follows best practices
- Paste is faster than typing
- Enter submits the query

**Logged**: `snapshot`, `pasteText`, `wait`, `pressEnter`

---

### ✅ STEP 11: Wait for LinkedIn Post Response
**Code location**: Lines 811-817
**What happens**:
1. Waits 15000ms (15 seconds) initial delay
2. Calls `waitForPerplexityResponse(desktop, 20)` (same as Step 8)
3. Monitors send button icon until arrow appears

**Why this matters**:
- LinkedIn post generation is faster than research (shorter response)
- Still need to wait for completion
- Same reliable vision-based detection

**Logged**: `wait`

---

### ✅ STEP 12: Extract LinkedIn Post
**Code location**: Lines 819-829
**What happens**:
1. Calls `pinchTab.getPageText()` to get entire page text
2. Truncates to 8000 chars (keeps recent content)
3. Builds system prompt: "Extract only the LinkedIn post..."
4. Calls `callGroqAI(systemPrompt, truncatedPageText)`
   - Groq AI reads the page text
   - Identifies the LinkedIn post section
   - Extracts ONLY the post content (no explanations)
   - Returns clean post with hashtags
5. Stores in `linkedinPost` variable
6. Logs post length

**Why this matters**:
- Page contains both research AND LinkedIn post
- Need to isolate just the post
- AI extraction is more reliable than regex/parsing
- Removes Perplexity's explanations and metadata

**Logged**: `getPageText`

---

### ✅ STEP 13: Close All Tabs
**Code location**: Lines 831-873
**What happens**:
1. Calls `pinchTab.listTabs(instance.id)` to get all open tabs
2. Logs count: `Found X tabs to close`
3. For each tab:
   - Gets `tabId = tab.id || tab.tabId`
   - Calls custom close function:
     - Gets auth token: `pinchTab['ensureAuthToken']()`
     - Makes POST request to `/tabs/${tabId}/close`
     - Checks response status
   - Waits 500ms between closures
   - If error: logs warning but continues
4. After all tabs closed: logs success

**Why this matters**:
- Open tabs consume RAM (memory leak over time)
- Each tab holds page data, JavaScript state, etc.
- Closing tabs before stopping instance frees memory
- Next restart will be faster and use less RAM
- Important for long-running systems

**Logged**: `listTabs`, `closeTab` (for each), `wait` (between closures)

---

### ✅ STEP 14: Stop Browser Instance
**Code location**: Lines 875-885
**What happens**:
1. Calls `pinchTab.stopInstanceByProfile(profileId)`
   - Stops the browser process
   - Saves profile data (cookies, localStorage, session)
   - Frees system resources (CPU, RAM)
2. Waits 2000ms (2 seconds) for clean shutdown

**Why this matters**:
- Browser is no longer needed
- Profile is preserved (login session saved)
- Tabs are cleared (RAM freed)
- Next run will start fresh but still logged in
- Saves resources on the system

**Logged**: `stopInstanceByProfile`, `wait`

---

### ✅ STEP 15: Publish via N8N Webhook
**Code location**: Lines 887-925
**What happens**:
1. Calls `desktop.launchApplication('terminal')` to open terminal
2. Waits 3000ms (3 seconds) for terminal to open
3. Clicks terminal at coordinates (640, 400) to ensure focus
   - Uses `desktop.clickMouse({ x: 640, y: 400 }, 'left')`
4. Waits 500ms
5. Builds curl command:
   ```bash
   curl -X POST "https://n8n-render-tpfk.onrender.com/webhook/aria-linkedin" \
     -H "Content-Type: application/json" \
     -d '{"post":"...","topic":"..."}' \
     && echo "LINKEDIN_SUCCESS"
   ```
   - POST request to N8N webhook
   - JSON payload with post and topic
   - Success marker: `LINKEDIN_SUCCESS`
6. Calls `desktop.typeText(curlCommand, 5)` to type command
   - Delay: 5ms between characters
7. Waits 1000ms
8. Calls `desktop.pressKeys(['Return'])` to execute command
9. Waits 8000ms (8 seconds) for response

**Why this matters**:
- N8N webhook publishes to LinkedIn
- Terminal is most reliable way to run curl
- Click ensures terminal has focus (typing goes to right place)
- Typing with delay prevents dropped characters
- `&& echo "LINKEDIN_SUCCESS"` adds success marker
- 8 seconds allows webhook to process and respond

**Logged**: `launchApplication`, `wait`, `clickMouse`, `typeText`, `pressKeys`

---

### ✅ STEP 16: Verify Webhook Success
**Code location**: Lines 927-952
**What happens**:
1. Calls `desktop.screenshot()` to capture terminal output
2. Extracts base64 image from screenshot
3. Builds verification prompt: "Did curl succeed?"
4. Calls `callGroqVision(verifySystemPrompt, verifyPrompt, base64Terminal)`
   - Vision AI reads terminal text
   - Looks for: "LINKEDIN_SUCCESS" or HTTP 200
   - Checks for error messages
   - Returns: SUCCESS or ERROR
5. Checks if response includes "SUCCESS"
6. Sets `webhookSuccess = true/false`
7. Logs webhook status

**Why this matters**:
- Confirms post was actually published
- Vision AI can read terminal text reliably
- Detects both success markers and error messages
- Provides confidence in workflow completion

**Logged**: `screenshot`

---

### ✅ RETURN RESULT
**Code location**: Lines 954-968
**What happens**:
1. Returns object with:
   - `success`: true/false (based on webhook status)
   - `message`: Success or failure message
   - `data`:
     - `topic`: Original topic
     - `linkedinPost`: Full post content
     - `postLength`: Character count
     - `researchLength`: Research character count
     - `webhookSuccess`: true/false
     - `terminalScreenshot`: Base64 image (for debugging)

**Why this matters**:
- Provides complete workflow result
- Includes all generated content
- Terminal screenshot helps debug webhook issues
- Success status determines if workflow succeeded

---

### ❌ ERROR HANDLING
**Code location**: Lines 970-985
**What happens**:
1. Catches any error thrown during workflow
2. Logs error message
3. Attempts to clean up:
   - Calls `pinchTab.stopInstanceByProfile(profileId)`
   - Ignores errors (already failed)
4. Returns error result:
   - `success: false`
   - `error`: Error message
   - `message`: User-friendly error message

**Why this matters**:
- Prevents browser from staying open on failure
- Frees resources even if workflow fails
- Provides clear error information
- Allows retry without manual cleanup

---

## COMPLETE FLOW SUMMARY

1. **Setup** (Steps 1-4A): Get profile → Check running → Start browser → Get tab → Fullscreen
2. **Verify** (Steps 5-6): Wait for load → Check login
3. **Research** (Steps 7-9): Type prompt → Wait for response → Export conversation
4. **Generate** (Steps 10-12): Type prompt → Wait for response → Extract post
5. **Cleanup** (Steps 13-14): Close tabs → Stop browser
6. **Publish** (Steps 15-16): Open terminal → Run curl → Verify success
7. **Return**: Success/failure with data

---

## KEY TECHNOLOGIES

- **PinchTab**: Browser automation (profiles, tabs, navigation, snapshots, eval)
- **Desktop Control**: Keyboard/mouse (paste, press keys, click, type)
- **Groq Vision AI**: Screenshot analysis (page state, button state, login status, terminal output)
- **Groq Text AI**: Content extraction (LinkedIn post from page text)
- **N8N Webhook**: LinkedIn publishing integration
- **JavaScript Eval**: Direct DOM manipulation (conversation export)

---

## TIMING BREAKDOWN

- Profile setup: ~2 seconds
- Browser start: ~10 seconds
- Page load: ~8 seconds
- Fullscreen: ~1 second
- Load verification: ~30 seconds (max)
- Login check: ~1 second
- Research prompt: ~2 seconds
- Research response: ~60 seconds (max)
- Export conversation: ~5 seconds
- LinkedIn prompt: ~2 seconds
- LinkedIn response: ~60 seconds (max)
- Extract post: ~2 seconds
- Close tabs: ~5 seconds
- Stop browser: ~2 seconds
- Terminal + curl: ~12 seconds
- Verify webhook: ~1 second

**Total**: ~3-4 minutes (typical), 5 minutes (max timeout)

---

## ERROR SCENARIOS

1. **No Groq API key**: Fails immediately
2. **Profile already running**: Stops it, continues
3. **Can't create tab**: Throws error, workflow fails
4. **Page won't load**: Continues after 30 seconds
5. **Not logged in**: Returns error, stops workflow
6. **Can't find search box**: Throws error, workflow fails
7. **Response timeout**: Continues after 100 seconds
8. **JavaScript eval fails**: Uses fallback (getPageText)
9. **Webhook fails**: Returns success=false with data
10. **Any other error**: Cleans up browser, returns error

---

## IMPROVEMENTS OVER ORIGINAL

1. **JavaScript Eval**: Now downloads complete conversation with citations (not just plain text)
2. **Structured Export**: Markdown format preserves query/answer structure
3. **Source URLs**: All citations include clickable links
4. **Fallback**: Still uses getPageText() if eval fails
5. **Better Extraction**: No truncation or missing data
6. **Tab Cleanup**: Prevents RAM buildup over time
7. **Vision-Based Waiting**: More reliable than fixed delays
8. **Error Recovery**: Cleans up resources on failure

---

## CONFIGURATION

- **Timeout**: 300,000ms (5 minutes)
- **Webhook URL**: `https://n8n-render-tpfk.onrender.com/webhook/aria-linkedin`
- **Profile Name**: `perplexity-profile`
- **Max Load Attempts**: 10 (30 seconds)
- **Max Response Attempts**: 20 (100 seconds)
- **Groq Model (Text)**: `llama-3.3-70b-versatile`
- **Groq Model (Vision)**: `meta-llama/llama-4-scout-17b-16e-instruct`

---

## SUCCESS CRITERIA

✅ Profile created/found
✅ Browser started
✅ Tab created and navigated
✅ Page fully loaded
✅ User logged in
✅ Research prompt submitted
✅ Research response completed
✅ Conversation exported (or fallback succeeded)
✅ LinkedIn prompt submitted
✅ LinkedIn response completed
✅ Post extracted
✅ Tabs closed
✅ Browser stopped
✅ Webhook called
✅ Webhook success verified
