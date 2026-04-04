# Perplexity LinkedIn Workflow - NEW IMPROVED FLOW

## What Changed?

### OLD FLOW (16 steps):
1-8: Setup + Research
9: Export conversation (research only)
10-12: Ask for LinkedIn post + Extract
13-14: Close tabs + Stop browser
15-16: Terminal curl + Verify

**Problems**:
- Exported conversation before LinkedIn post was created
- Had to extract LinkedIn post separately with AI
- Manual terminal typing (slow, error-prone)
- Two separate data sources (export + extraction)

### NEW FLOW (15 steps):
1-8: Setup + Research
9-10: Ask for LinkedIn post + Wait
11: Export EVERYTHING (research + LinkedIn post)
12-13: Close tabs + Stop browser
14-15: OpenCode reads file + Curls webhook + Verify

**Improvements**:
✅ One export contains everything
✅ OpenCode handles file reading and extraction
✅ No manual terminal typing
✅ More reliable and cleaner

---

## NEW STEP-BY-STEP FLOW

### Steps 1-8: SAME (Setup + Research)
1. Get/Create persistent profile
2. Check if already running
3. Start browser with profile
4. Get/Create tab, navigate to Perplexity
4A. Fullscreen (F11)
5. Wait for page to load (vision AI)
6. Check login status (vision AI)
7. Type research prompt, press Enter
8. Wait for research response (vision AI monitors button)

---

### ✨ STEP 9: Type LinkedIn Post Prompt (NEW POSITION)
**What happens**:
1. Find search box with `snapshot('interactive')`
2. Paste LinkedIn post prompt:
   - "Based on your research above about [topic]..."
   - Specifies: 150-200 words, professional tone, hook/value/CTA structure
   - Requests 3-5 hashtags
3. Press Enter to submit

**Why this matters**:
- Creates LinkedIn post BEFORE exporting
- Both research and post will be in the conversation
- One export gets everything

---

### ✨ STEP 10: Wait for LinkedIn Post Response (NEW POSITION)
**What happens**:
1. Wait 15 seconds initial delay
2. Call `waitForPerplexityResponse(desktop, 20)`
3. Vision AI monitors send button icon
4. Waits until arrow icon appears (DONE)

**Why this matters**:
- Ensures LinkedIn post is fully generated
- Now we have complete conversation: research + LinkedIn post

---

### ✨ STEP 11: Export Complete Conversation (IMPROVED)
**What happens**:
1. Execute JavaScript eval in browser
2. Script extracts:
   - Query 1: Research prompt
   - Answer 1: Research response with citations
   - Query 2: LinkedIn post prompt
   - Answer 2: LinkedIn post (THIS IS WHAT WE NEED!)
3. Downloads as markdown: `Aria_Research_[topic].md`
4. File saved to Desktop or Downloads
5. Wait 5 seconds for download

**Why this matters**:
- ONE file contains EVERYTHING
- LinkedIn post is in the file (last answer section)
- Structured markdown with citations
- No need for separate extraction

**File structure**:
```markdown
# [Topic]

> Exported by Aria Research
> Date: [timestamp]
> Source: [URL]

---

## 🧑 Query 1

[Research prompt about topic]

## 🤖 Answer

[Research response with facts, trends, insights]

### 📚 Sources

[1] Source Title
<https://source-url.com>

---

## 🧑 Query 2

[LinkedIn post prompt]

## 🤖 Answer

[LINKEDIN POST - 150-200 words with hashtags]

---
```

---

### Steps 12-13: SAME (Cleanup)
12. Close all tabs (free RAM)
13. Stop browser (save profile)

---

### ✨ STEP 14: OpenCode Reads File and Publishes (NEW!)
**What happens**:
1. Launch OpenCode application
2. Wait 5 seconds for OpenCode to open
3. Click to ensure focus
4. Paste comprehensive prompt:

```
STEP 1: FIND THE MARKDOWN FILE
- Search /home/user/Desktop/ and /home/user/Downloads/
- Look for most recent .md file (last 5 minutes)
- Pattern: "Aria_Research_*.md" or contains "[topic]"
- Commands:
  ls -lt /home/user/Desktop/*.md | head -3
  ls -lt /home/user/Downloads/*.md | head -3
  find /home/user -name "*.md" -type f -mmin -5

STEP 2: READ THE FILE
- Read entire markdown file
- Contains research + LinkedIn post

STEP 3: EXTRACT LINKEDIN POST
- Find LAST "## 🤖 Answer" section
- Extract everything until next "---" or EOF
- Should be 150-200 words with hashtags
- Clean up markdown formatting

STEP 4: SEND TO N8N WEBHOOK
- curl -X POST "[webhook-url]"
  -H "Content-Type: application/json"
  -d '{"post":"EXTRACTED_POST","topic":"[topic]"}'
  && echo "LINKEDIN_SUCCESS"
```

5. Press Enter
6. Wait 60 seconds for OpenCode to:
   - Find the file
   - Read it
   - Extract LinkedIn post (last answer)
   - Curl to webhook
   - Print success message

**Why this is BETTER**:
- OpenCode is DESIGNED to read files and execute commands
- No manual typing (paste one prompt, done)
- OpenCode handles all the logic:
  - File search (checks multiple locations)
  - File reading
  - Text extraction (finds last answer section)
  - Curl execution
- More reliable than manual terminal commands
- Cleaner code (one step instead of multiple)

---

### ✨ STEP 15: Verify Success (IMPROVED)
**What happens**:
1. Take screenshot of OpenCode output
2. Send to Groq Vision AI
3. Prompt: "Did OpenCode succeed?"
4. Looks for:
   - "LINKEDIN_SUCCESS" text
   - Successful curl response
   - Confirmation messages
   - vs. error messages
5. Returns SUCCESS or ERROR

**Why this matters**:
- Confirms entire workflow succeeded
- Vision AI reads OpenCode output
- Provides confidence in completion

---

## COMPARISON: OLD vs NEW

### OLD APPROACH (Steps 9-16):
```
9. Export conversation (research only)
   - JavaScript eval
   - Downloads markdown
   
10. Find search box
11. Type LinkedIn prompt
12. Wait for response

13. Extract LinkedIn post
    - getPageText()
    - Call Groq AI to extract
    - Parse response
    
14. Close tabs
15. Stop browser

16. Open terminal
    - Click terminal
    - Type curl command (character by character)
    - Wait for response
    
17. Verify terminal output
```

**Issues**:
- Export happens BEFORE LinkedIn post created
- Separate extraction step needed
- Manual terminal typing (slow, error-prone)
- Multiple data sources

### NEW APPROACH (Steps 9-15):
```
9. Find search box
10. Type LinkedIn prompt
11. Wait for response

12. Export EVERYTHING
    - JavaScript eval
    - Downloads markdown with research + LinkedIn post
    
13. Close tabs
14. Stop browser

15. Open OpenCode
    - Paste ONE prompt
    - OpenCode finds file
    - OpenCode reads file
    - OpenCode extracts post
    - OpenCode curls webhook
    
16. Verify OpenCode output
```

**Benefits**:
✅ Export includes LinkedIn post
✅ One file, one source of truth
✅ OpenCode handles complexity
✅ No manual typing
✅ Fewer steps (15 vs 17)
✅ More reliable

---

## WHY OPENCODE IS BETTER

### Terminal Approach:
- Need to build curl command in Node.js
- Escape JSON properly
- Type character by character (slow)
- No error handling
- Hard to debug

### OpenCode Approach:
- Give it a task in natural language
- It figures out the commands
- Handles file search automatically
- Reads and parses files natively
- Executes curl with proper escaping
- Shows output for debugging
- Can retry if needed

**Example OpenCode capabilities**:
```bash
# OpenCode can do this automatically:
find /home/user -name "*.md" -mmin -5
cat /home/user/Desktop/Aria_Research_AI_in_healthcare.md
# Extract last answer section
# Build curl command
# Execute and verify
```

---

## TIMING COMPARISON

### OLD FLOW:
- Steps 1-8: ~2 minutes
- Export (research only): ~5 seconds
- LinkedIn prompt + wait: ~1 minute
- Extract post (AI): ~5 seconds
- Terminal typing: ~10 seconds
- Curl + verify: ~8 seconds
**Total**: ~3.5 minutes

### NEW FLOW:
- Steps 1-8: ~2 minutes
- LinkedIn prompt + wait: ~1 minute
- Export (everything): ~5 seconds
- OpenCode (find + read + extract + curl): ~60 seconds
**Total**: ~4 minutes

**Slightly longer but MUCH more reliable!**

---

## ERROR HANDLING

### OLD FLOW Issues:
- Export might fail (no LinkedIn post yet)
- AI extraction might miss the post
- Terminal typing might drop characters
- Curl command might have escaping issues

### NEW FLOW Advantages:
- Export has everything (both queries/answers)
- OpenCode is designed for file operations
- OpenCode handles escaping automatically
- Vision AI verifies success
- If OpenCode fails, we can see the output

---

## SUCCESS CRITERIA

✅ Profile created/found
✅ Browser started and navigated
✅ Page loaded and logged in
✅ Research prompt submitted and completed
✅ LinkedIn prompt submitted and completed
✅ Complete conversation exported (research + post)
✅ Markdown file downloaded
✅ Tabs closed, browser stopped
✅ OpenCode found the file
✅ OpenCode extracted LinkedIn post
✅ OpenCode sent to webhook
✅ Webhook returned success

---

## CONFIGURATION

- **Timeout**: 300,000ms (5 minutes)
- **Webhook URL**: `https://n8n-render-tpfk.onrender.com/webhook/aria-linkedin`
- **Profile Name**: `perplexity-profile`
- **OpenCode Wait**: 60 seconds
- **File Search Locations**: Desktop, Downloads
- **File Age**: Last 5 minutes

---

## NEXT STEPS

1. ✅ Workflow updated with new flow
2. Test with a sample topic
3. Verify OpenCode can find and read the file
4. Verify webhook receives correct format
5. Check N8N workflow handles the post

---

## SUMMARY

The new flow is **cleaner, more reliable, and easier to maintain**:

- **One export** contains everything (research + LinkedIn post)
- **OpenCode** handles file operations (it's designed for this)
- **No manual typing** (just paste one prompt)
- **Better error handling** (can see OpenCode output)
- **Fewer steps** (15 vs 17)
- **More maintainable** (less complex code)

This is a significant improvement! 🎉
