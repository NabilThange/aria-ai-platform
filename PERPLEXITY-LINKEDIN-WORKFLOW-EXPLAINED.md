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

### Step 1: Get or Create Persistent Profile
- Checks if a `perplexity-profile` exists in PinchTab
- If not found, creates a new persistent profile
- This profile preserves login sessions, cookies, and localStorage across runs
- **Why**: Avoids having to log in to Perplexity every time

### Step 2: Check if Profile Already Running
- Checks if the profile has an active browser instance
- If running, stops it to prevent conflicts
- Waits 2 seconds for clean shutdown
- **Why**: Ensures clean state before starting new session

### Step 3: Start Instance with Profile
- Starts a new browser instance using the persistent profile
- Mode: `headed` (visible browser window)
- Waits 10 seconds for full initialization
- **Why**: Browser needs time to load profile data and create first tab

### Step 4: Get or Create Tab
- Checks if a tab was auto-created when browser started
- If no tab exists, creates one by navigating to Perplexity
- Navigates to `https://www.perplexity.ai`
- Waits 8 seconds for page load
- **Why**: Need a tab to interact with Perplexity

### Step 4A: Make Browser Fullscreen
- Presses F11 to enter fullscreen mode
- Waits 1 second for transition
- **Why**: Maximizes visible area for better screenshot analysis

### Step 5: Wait for Perplexity to Load
- Uses vision AI to check if page is fully loaded
- Takes screenshots and analyzes with Groq Vision
- Looks for: search box, Perplexity branding, interactive UI
- Max 10 attempts with 3-second intervals
- **Why**: Ensures page is ready before interaction

### Step 6: Check Login Status
- Takes screenshot and analyzes with Groq Vision
- Determines if user is logged in or sees login wall
- If not logged in, stops workflow and returns error
- **Why**: Perplexity requires login for full functionality

### Step 7: Type Research Prompt
- Finds the search box using PinchTab snapshot
- Pastes a comprehensive research prompt about the topic
- Prompt includes:
  - Key facts and statistics
  - Latest trends (2024-2026)
  - Expert insights
  - Real-world examples
  - Actionable takeaways
  - Source citations
- Presses Enter to submit
- **Why**: Gets high-quality research data from Perplexity

### Step 8: Wait for Research Response
- Waits 15 seconds initial delay
- Uses vision AI to monitor send button state
- Checks if button shows:
  - Square/stop icon = still generating (LOADING)
  - Arrow/plane icon = finished (DONE)
- Max 20 attempts with 5-second intervals
- Waits extra 5 seconds after completion
- **Why**: Ensures Perplexity finishes generating before extraction

### Step 9: Export Conversation via JavaScript Eval (NEW!)
- Executes JavaScript code directly in the browser
- **What the script does**:
  1. Finds all query/answer pairs on the page
  2. Extracts citations with URLs
  3. Preserves code blocks with syntax highlighting
  4. Formats everything as markdown
  5. Creates a downloadable .md file
  6. Auto-downloads to Desktop/Downloads
- **Advantages over getPageText**:
  - Preserves structure (queries, answers, citations)
  - Includes source URLs
  - Better formatting
  - Complete conversation history
- Also runs `getPageText()` as fallback
- **Why**: Gets structured, complete research data with sources

### Step 10: Type LinkedIn Post Prompt
- Finds search box again
- Pastes LinkedIn post generation prompt
- Prompt specifies:
  - Length: 150-200 words
  - Tone: Professional yet conversational
  - Structure: Hook → Value → Context → CTA
  - 3-5 hashtags
  - Line breaks for readability
- Presses Enter to submit
- **Why**: Transforms research into engaging LinkedIn content

### Step 11: Wait for LinkedIn Post Response
- Same vision-based waiting as Step 8
- Monitors send button state
- Waits for arrow icon (DONE)
- **Why**: Ensures post is fully generated

### Step 12: Extract LinkedIn Post
- Gets full page text via `getPageText()`
- Truncates to 8000 characters
- Uses Groq AI to extract only the LinkedIn post
- Removes explanations and metadata
- **Why**: Isolates the final post content

### Step 13: Close All Tabs
- Lists all open tabs in the browser
- Closes each tab individually
- Waits 500ms between closures
- **Why**: Prevents RAM buildup on next restart (important for long-running systems)

### Step 14: Stop Browser Instance
- Stops the browser instance
- Profile is preserved (login session saved)
- Tabs are cleared (RAM freed)
- Waits 2 seconds for clean shutdown
- **Why**: Saves resources while preserving login state

### Step 15: Publish via N8N Webhook
- Opens terminal application
- Clicks terminal to ensure focus
- Builds curl command with:
  - POST request to N8N webhook
  - JSON payload: `{ post: "...", topic: "..." }`
  - Success marker: "LINKEDIN_SUCCESS"
- Types and executes curl command
- Waits 8 seconds for response
- **Why**: Sends post to N8N for LinkedIn publishing

### Step 16: Verify Webhook Success
- Takes screenshot of terminal output
- Uses Groq Vision to analyze response
- Looks for: "LINKEDIN_SUCCESS" or HTTP 200 vs errors
- Returns success/failure status
- **Why**: Confirms post was successfully published

---

## Key Technologies Used

1. **PinchTab**: Browser automation with persistent profiles
2. **Groq Vision AI**: Screenshot analysis for UI state detection
3. **Groq Text AI**: Content extraction and formatting
4. **Desktop Control**: Keyboard/mouse automation
5. **N8N Webhook**: LinkedIn publishing integration
6. **JavaScript Eval**: Direct browser DOM manipulation for data extraction

---

## JavaScript Download Code Explanation

The `exportPerplexityComplete()` function:

```javascript
// 1. Helper Functions
- safeFilename(): Sanitizes text for valid filenames
- autoDownload(): Creates blob and triggers browser download
- delay(): Async sleep function

// 2. Extract Thread Title
- Looks for h1.group/query element
- Falls back to document.title
- Used for filename

// 3. Parse Conversation Turns
- Finds all query elements (h1.group/query)
- For each query:
  - Extracts query text
  - Finds answer in .prose container
  - Extracts citations with URLs
  - Preserves code blocks
  - Cleans up formatting

// 4. Build Markdown Document
- Header with title, date, source URL
- For each turn:
  - Query section
  - Answer section
  - Sources/citations section
- Footer with export info

// 5. Download File
- Creates markdown blob
- Generates filename: Aria_Research_[topic].md
- Triggers browser download
- Returns success status
```

---

## Improvements Over Original

1. **JavaScript Eval**: Now downloads complete conversation with citations
2. **Structured Data**: Markdown format preserves query/answer structure
3. **Source URLs**: All citations include clickable links
4. **Fallback**: Still uses getPageText() if eval fails
5. **Better Extraction**: No more truncation or missing data

---

## Error Handling

- Login check: Returns error if not logged in
- Vision checks: Continues after max attempts
- JavaScript eval: Logs error but continues workflow
- Tab closure: Warns but doesn't fail on individual tab errors
- Webhook verification: Returns success/failure status

---

## Configuration

- **Timeout**: 300,000ms (5 minutes)
- **Webhook URL**: Hardcoded to N8N endpoint
- **Profile Name**: `perplexity-profile`
- **Max Vision Attempts**: 10 for load, 20 for response
- **Wait Intervals**: 3-8 seconds depending on operation

---

## Success Criteria

✅ Perplexity logged in
✅ Research completed with sources
✅ Conversation exported as markdown
✅ LinkedIn post generated
✅ Tabs closed (RAM freed)
✅ Webhook returns success
✅ Profile preserved for next run
