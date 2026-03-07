# ARIA — Autonomous Real-time Intelligence Agent
## Project Context & User Journey Document — v3.0

---

## What is ARIA?

ARIA is a web-based AI browser agent powered by a multi-agent pipeline. You give it a goal — by typing or speaking — and ARIA first understands your intent, asks smart follow-up questions, builds a step-by-step plan, shows it to you for approval, then executes it live in a browser you can watch in real time via a live video stream.

A pixel-art avatar companion narrates every phase — from clarification to execution to completion.

No installs. No extensions. Just open the website, give a command, and watch.

---

## The One-Line Pitch

> "Tell ARIA what you want. Watch it happen."

---

## The Core Philosophy

Most AI agents are black boxes. You give them a goal, they disappear, and you hope for the best.

ARIA is different. It is **collaborative, transparent, and interruptible** at every stage. You are always in control. The agent does the work. You make the decisions.

---

## How ARIA Controls the Browser — The WebRTC Approach

This is the most important technical decision in the entire project. It determines accuracy, speed, and simplicity.

### The Old Way (Screenshot-based)
```
Take PNG screenshot
→ Send to Gemini
→ Gemini GUESSES coordinates
→ Playwright clicks estimated position
→ Hope it was accurate
→ Take another screenshot to verify
PROBLEM: Gemini estimates. Misses happen. Lag between actions.
```

### The ARIA Way (WebRTC + Textarea)
Inspired by how Manus handles browser control — two HTML elements do all the heavy lifting:

```
<video>   → Streams the live remote browser via WebRTC
<textarea> → Sits invisibly on top, captures all input natively
```

**The textarea is the genius part.** It already natively understands:
- Exactly where a click landed (cursor position)
- Everything typed
- Text selections
- Keyboard shortcuts (Enter, Tab, Escape, Ctrl+C)
- Clipboard paste
- Mobile touch behavior

All of this for free. Zero reinvention. The browser already knows how to do all of it.

```
┌─────────────────────────────────────────┐
│                                         │
│   <video> — live WebRTC browser stream  │
│                                         │
│   <textarea> — invisible overlay        │
│   captures every interaction natively   │
│                                         │
└─────────────────────────────────────────┘

Agent clicks somewhere
→ textarea captures exact coordinates
→ sent to backend via WebSocket
→ Playwright executes at those exact coordinates
→ browser responds
→ video updates live via WebRTC
→ Zero guessing. Zero lag. Pixel-perfect precision.
```

### How Gemini's Role Changes

With WebRTC + textarea handling precision, Gemini no longer needs to guess WHERE to click. Its job is now cleanly split:

| Responsibility | Who handles it |
|---|---|
| Understand the page | Gemini Vision |
| Decide WHAT to do next | Gemini |
| Know WHERE exactly to act | WebRTC textarea (native precision) |
| Execute the action | Playwright |
| Stream the result live | WebRTC video |

Gemini got smarter by doing less. It focuses entirely on reasoning — not coordinate math.

---

## The 5-Layer Agent Pipeline

ARIA is not a single agent. It is a pipeline of 5 specialized layers, each with a distinct job.

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   LAYER 1 — INTENT AGENT                                    │
│   Understands the goal. Scores ambiguity.                   │
│   Asks smart follow-up questions if needed.                 │
│   Output: Clarified, unambiguous goal                       │
│                                                             │
│                        ↓                                    │
│                                                             │
│   LAYER 2 — PLANNER AGENT                                   │
│   Breaks the goal into a safe, ordered step list.           │
│   No browser access. Pure reasoning.                        │
│   Output: TO-DO list shown to user for approval             │
│                                                             │
│                        ↓ (user approves / edits)            │
│                                                             │
│   LAYER 3 — EXECUTOR AGENT                                  │
│   Takes approved plan + live browser context.               │
│   Decides WHAT action to take next.                         │
│   WebRTC textarea handles WHERE with native precision.      │
│   Output: Browser actions (click, type, scroll, navigate)   │
│                                                             │
│                        ↓                                    │
│                                                             │
│   LAYER 4 — VERIFIER AGENT                                  │
│   After every action, checks: did that actually work?       │
│   Detects failures silently before they compound.           │
│   Output: Continue / Retry / Escalate to user               │
│                                                             │
│                        ↓                                    │
│                                                             │
│   LAYER 5 — MEMORY SERVICE                                  │
│   Maintains full context across all steps.                  │
│   Every agent call includes history, page state, errors.    │
│   Output: Context object passed through entire pipeline     │
│                                                             │
│   + RECOVERY LOGIC woven through Layers 3 and 4            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## What Each Layer Does — Plain English

### Layer 1 — Intent Agent
Before doing anything, ARIA reads the goal and scores how ambiguous it is.

- **Clear goal** → skip questions, go straight to planning
- **Somewhat ambiguous** → ask 1-2 targeted questions
- **Very ambiguous** → ask up to 3 questions, never more

Questions are smart and specific — never generic. ARIA never asks things it can reasonably infer.

### Layer 2 — Planner Agent
Pure text reasoning. No browser. No screenshots. Just Gemini thinking through the best sequence of browser steps to achieve the clarified goal. Outputs a numbered TO-DO list. User sees this before anything happens in the browser.

### Layer 3 — Executor Agent
Gemini with vision. Takes the approved plan, looks at the current browser state via WebRTC stream, and decides exactly WHAT action to take next. The WebRTC textarea layer handles WHERE with native precision. One action per loop. Never skips steps. Always references the plan.

### Layer 4 — Verifier Agent
After every single action, a lightweight Gemini call checks the updated browser view and answers one question: *"Did the previous step succeed?"* If yes, continue. If no, retry. If retry fails, escalate to user with a clear explanation.

### Layer 5 — Memory Service
A context object that travels through every agent call:
```
{
  original_goal,
  clarified_goal,
  approved_plan,
  steps_completed,
  steps_remaining,
  current_url,
  data_collected,
  errors_encountered,
  retry_count
}
```
No agent ever operates blind. Every call has full history.

---

## Full System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        USER BROWSER                          │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐  │
│   │  Next.js Frontend                                    │  │
│   │                                                      │  │
│   │  ┌─────────────────────────┐  ┌──────────────────┐  │  │
│   │  │ <video> WebRTC stream   │  │  Agent UI        │  │  │
│   │  │ +                       │  │  Phase 1: Chat   │  │  │
│   │  │ <textarea> overlay      │  │  Phase 2: Plan   │  │  │
│   │  │ (invisible, captures    │  │  Phase 3: Live   │  │  │
│   │  │  all input natively)    │  │  Action Log      │  │  │
│   │  └─────────────────────────┘  └──────────────────┘  │  │
│   │                                                      │  │
│   │  🧝 Avatar (CSS + Canvas)   🎤 Web Speech API        │  │
│   │  🛑 STOP button             ✅ Plan approval UI      │  │
│   └──────────────────┬───────────────────────────────────┘  │
└──────────────────────│──────────────────────────────────────┘
                       │ WebRTC (video stream)
                       │ WebSocket (actions, events, state)
┌──────────────────────▼──────────────────────────────────────┐
│                  BACKEND — Google Cloud Run                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              FastAPI Application                    │    │
│  │                                                     │    │
│  │  ┌───────────┐  ┌──────────┐  ┌─────────────────┐  │    │
│  │  │  Intent   │  │ Planner  │  │    Executor     │  │    │
│  │  │  Agent    │→ │  Agent   │→ │    Agent        │  │    │
│  │  │ (Gemini)  │  │ (Gemini) │  │ (Gemini Vision) │  │    │
│  │  └───────────┘  └──────────┘  └────────┬────────┘  │    │
│  │                                         │           │    │
│  │                               ┌─────────▼────────┐  │    │
│  │                               │    Verifier      │  │    │
│  │                               │    Agent         │  │    │
│  │                               │ (Gemini Vision)  │  │    │
│  │                               └─────────┬────────┘  │    │
│  │                                         │           │    │
│  │                               ┌─────────▼────────┐  │    │
│  │                               │  Memory Service  │  │    │
│  │                               │  (context obj)   │  │    │
│  │                               └──────────────────┘  │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐    │
│  │         Playwright Headless Browser                 │    │
│  │         Streams live via WebRTC                     │    │
│  │         Executes actions with pixel precision       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────┐   ┌──────────────────────────────┐    │
│  │  Google Cloud    │   │   Gemini 2.0 Flash           │    │
│  │  Storage         │   │   via Google GenAI SDK       │    │
│  │  (session logs)  │   │                              │    │
│  └──────────────────┘   └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## What the Screen Looks Like — 3 UI Phases

### Phase 1 — Intent (Conversational)
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│              ARIA                                    │
│                                                      │
│   🧝 "Hey! Before I start — quick question:         │
│        Do you want free courses only, or             │
│        paid is fine too?"                            │
│                                                      │
│   [ Free only ]   [ Paid is fine ]   [ Type answer ] │
│                                                      │
└──────────────────────────────────── avatar ──────────┘
```

### Phase 2 — Plan Review (Approval Screen)
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  📋 ARIA's Plan — 6 Steps                           │
│  ─────────────────────────────────────────           │
│  ☐ Step 1  Navigate to udemy.com                    │
│  ☐ Step 2  Search for "Python course"               │
│  ☐ Step 3  Apply filter: Price → Under $15          │
│  ☐ Step 4  Apply filter: Level → Beginner           │
│  ☐ Step 5  Sort by: Highest Rated                   │
│  ☐ Step 6  Extract top 3 results with details       │
│  ─────────────────────────────────────────           │
│  ✅ Approve & Run    ✏️ Edit Steps    ❌ Cancel      │
│                                                      │
└──────────────────────────────────── avatar ──────────┘
```
User can drag to reorder steps, click to edit, or delete steps. Full control before a single browser action happens.

### Phase 3 — Execution (Live View)
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│     LIVE BROWSER — WebRTC video stream               │
│     (true live feed, zero screenshot lag)            │
│     <video> + <textarea> overlay                     │
│                                                      │
├─────────────────────┬────────────────────────────────┤
│  📋 Steps           │  📜 Action Log                 │
│  ✅ Step 1 — done   │  → Navigated to udemy.com      │
│  ✅ Step 2 — done   │  → Typed "Python course"       │
│  ⚡ Step 3 — running│  → Clicked search button       │
│  ☐  Step 4          │  → Applying price filter...    │
│  ☐  Step 5          │                                │
│  ☐  Step 6          │                                │
├─────────────────────┴────────────────────────────────┤
│  🛑 STOP AGENT                                       │
└──────────────────────────────── 🧝 avatar ───────────┘
```

---

## The Avatar

Built entirely in CSS + Canvas. No third-party API. No cost. Runs in the browser.

| State | Trigger | What it does |
|---|---|---|
| **Idle** | Waiting | Gentle breathing, blinking |
| **Listening** | Mic active | Ear animation, sound waves |
| **Thinking** | Intent / Planning | Taps chin, question mark floats |
| **Asking** | Follow-up questions | Points at question, speech bubble |
| **Planning** | Planner running | Writes on notepad animation |
| **Working** | Executor running | Typing animation, focused look |
| **Verifying** | Verifier running | Squints, magnifying glass |
| **Speaking** | Any narration | Mouth moves, speech bubble |
| **Success** | Task complete | Jumps, raises arms, sparkles |
| **Stopped** | User hits STOP | Hands up, "okay okay!" bubble |
| **Retrying** | Verifier fails | Cracks knuckles, "let me try again" |
| **Error** | Unrecoverable | Shrugs, "hmm..." bubble |

**Avatar narration — short and punchy:**

- Intent: *"Quick question first..."* / *"Just to make sure..."*
- Planning: *"Let me map this out..."* / *"Building your plan..."*
- Execution: *"Navigating..."* / *"Found it, clicking..."* / *"Typing now..."*
- Verify: *"Checking that worked..."* / *"Looks good, moving on..."*
- Recovery: *"That didn't work, retrying..."* / *"Hit a wall — your call."*
- Done: *"All done! Here's what I found."* / *"Mission complete ✓"*

---

## The Full Agent Loop — Logic

```
USER SUBMITS GOAL
        │
        ▼
LAYER 1: INTENT AGENT
  → Score ambiguity (low / medium / high)
  → If medium/high: generate targeted follow-up questions
  → Wait for user answers
  → Output: clarified_goal
        │
        ▼
LAYER 2: PLANNER AGENT
  → Input: clarified_goal
  → Generate ordered step list (pure text reasoning)
  → Send to frontend as approval UI
  → Wait for user: Approve / Edit / Cancel
  → Output: approved_plan
        │
        ▼ (execution loop begins)
LAYER 3: EXECUTOR AGENT
  → Input: approved_plan + memory_context + current page state
  → Gemini decides WHAT action to take next
  → WebRTC textarea captures WHERE with native precision
  → Output: action sent to Playwright
  → Playwright executes in headless browser
  → Browser update streams live via WebRTC video
        │
        ▼
LAYER 4: VERIFIER AGENT
  → Input: updated browser state + expected outcome
  → Output: pass / fail
  → If fail:
      retryable? → retry (max 2x)
      blocker?   → escalate to user with clear message
  → If pass: update memory, continue loop
        │
        ▼
LAYER 5: MEMORY SERVICE
  → Update context object after every verified step
  → Pass full context to next executor call
        │
        ▼
  Loop back to EXECUTOR until:
    - Gemini returns "done"
    - User hits STOP
    - Max steps reached (25 steps hard limit)
    - Stuck twice in a row with no recovery path
        │
        ▼
RESULT displayed in frontend
Avatar celebrates / reports
```

---

## Recovery Decision Tree

```
Step fails
    │
    ├─ Retryable? (element not ready, timing issue)
    │      → Retry up to 2 times
    │      → Still failing → escalate
    │
    ├─ Alternative path? (CAPTCHA → try different site)
    │      → Suggest alternative to user
    │      → User picks → replan from current step
    │
    ├─ Partial success? (got 4 of 5 results)
    │      → Report partial result
    │      → Ask user if acceptable
    │
    └─ Unrecoverable
           → Report clearly
           → Stop cleanly
           → Never silently die
```

---

## User Journey — Scenario 1: Research Task (Happy Path)

**Goal:** *"Find the top 5 AI tools of 2025 on Product Hunt"*

**Intent:** Clear goal. No questions. Avatar: *"Clear goal — building your plan!"*

**Plan:**
```
Step 1 → Navigate to producthunt.com
Step 2 → Search "AI tools 2025"
Step 3 → Sort by Most Upvoted
Step 4 → Collect top 5: name, description, upvotes, link
Step 5 → Display as summary card
```
User approves instantly.

**Execution:** WebRTC streams the live browser. Each step ticks off. Avatar narrates.

**Verification:** All 5 steps pass cleanly. Memory builds the results object.

**Result:** Clean summary card displayed in frontend. Avatar: *"Mission complete ✓"*

---

## User Journey — Scenario 2: Ambiguous Goal

**Goal:** *"Find me a Python course"*

**Intent:** Ambiguity HIGH. ARIA asks:
> *"Two quick things: Free or paid? Beginner or intermediate?"*

User: *"Free, beginner."*

**Plan:** Now targeted — freeCodeCamp + YouTube beginner tracks.

User approves. Execution runs cleanly to completion.

---

## User Journey — Scenario 3: User Edits the Plan

**Goal:** *"Compare pricing for top project management tools"*

**Plan generated:**
```
Step 1 → Search Google for top tools
Step 2 → Open Notion pricing
Step 3 → Open Asana pricing
Step 4 → Open Monday.com pricing
Step 5 → Summarize comparison
```

**User edits:**
- Deletes Step 1 (already knows the tools)
- Adds Step: "Also check Linear.app pricing"
- Reorders: Linear before Monday

**Approved.** Executor runs the user's version exactly. No deviation.

Avatar: *"Nice, updated! Running your version now."*

---

## User Journey — Scenario 4: STOP + Resume

**Goal:** *"Fill in the contact form on acme.com"*

During Step 3, user sees ARIA heading for the wrong field. Hits 🛑 STOP.

**What happens:**
- Loop aborts instantly via WebSocket signal
- WebRTC video freezes
- Red banner: *"Agent stopped at Step 3"*
- Plan review reappears — user edits Step 3 only
- Resumes from Step 3 with the corrected instruction

Avatar: *"Stopped! Want to fix Step 3 and continue from there?"*

User does not restart from scratch. Resumes mid-plan.

---

## User Journey — Scenario 5: Silent Failure Recovery

**Goal:** *"Search for climate tech startups on LinkedIn"*

Step 2: Executor clicks the search bar. Verifier checks — search bar is still empty. Click missed a dynamic element.

**Recovery (invisible to user):**
- Verifier: FAIL
- Recovery: retryable → scroll to element → retry click
- Verifier: PASS
- Continues to Step 3

User saw avatar briefly show *"Checking that worked..."* then *"Retrying..."* then normal execution resumed. Silent, graceful, professional.

---

## User Journey — Scenario 6: CAPTCHA Blocker

**Goal:** *"Book a table on OpenTable for 2 people Saturday"*

Steps 1-3 complete. Step 4: CAPTCHA wall appears.

**Verifier:** FAIL — CAPTCHA detected. Not retryable.

**What happens:**
- Live view shows CAPTCHA
- Action log: *"⚠️ Blocked: CAPTCHA at Step 4"*
- Avatar shrugs: *"Hit a CAPTCHA — can't get past that. Try Resy instead?"*
- Two buttons appear: **Try Resy** / **Try Google Maps**

User picks one. Planner generates a new plan from current step. Execution continues.

---

## What Makes ARIA Different

| Regular Agent | ARIA |
|---|---|
| Single agent, black box | 5-layer pipeline, fully transparent |
| Screenshot-based clicking | WebRTC live stream + textarea precision |
| Gemini guesses coordinates | Gemini decides WHAT, textarea handles WHERE |
| Just executes blindly | Clarifies intent, builds plan, gets approval |
| No approval step | User approves and edits before execution |
| Silent failures | Verifier catches every failed step |
| No memory | Full context object across all steps |
| Can't recover | Recovery logic at every failure point |
| No personality | Avatar with 12 states and punchy narration |
| Janky screenshot refresh | True live WebRTC video feed |

---

## Tech Stack

| Layer | Tool | Cost |
|---|---|---|
| Frontend | Next.js | Free |
| Live browser stream | WebRTC | Free |
| Input capture | HTML textarea overlay | Free |
| Avatar | CSS + Canvas sprites | Free |
| Voice input | Web Speech API | Free |
| Intent Agent | Gemini 2.0 Flash (text) | Free tier |
| Planner Agent | Gemini 2.0 Flash (text) | Free tier |
| Executor Agent | Gemini 2.0 Flash (vision) | Free tier |
| Verifier Agent | Gemini 2.0 Flash (vision) | Free tier |
| Memory Service | In-memory context (FastAPI) | Free |
| Browser control | Playwright headless | Free |
| Backend | FastAPI | Free |
| Cloud hosting | Google Cloud Run | Free tier |
| Storage | Google Cloud Storage | Free tier |
| IaC deployment | Terraform (bonus points) | Free |

**Total cost to build and demo: $0**

---

## Hackathon Judging Alignment

| Criteria | Weight | How ARIA addresses it |
|---|---|---|
| Innovation & Multimodal UX | 40% | Voice input, WebRTC live stream, avatar 12 states, plan approval, WebRTC textarea — nothing like this in the submission pool |
| Technical Implementation | 30% | 5-layer multi-agent pipeline, WebRTC precision input, Gemini vision for execution + verification, GenAI SDK, Cloud Run, memory context, graceful recovery |
| Demo & Presentation | 30% | Avatar narrates the entire demo. Plan approval is visual proof of architecture. STOP + resume demo shows safety. WebRTC stream looks stunning on video. |

---

## The Demo Script (4 minutes)

```
0:00 — ARIA avatar intro. "I'm ARIA. Give me a goal."
0:20 — User speaks goal. Mic pulses. Transcript appears.
0:35 — Intent: ARIA asks 1 smart follow-up question.
0:45 — Plan appears: 5 steps. User edits one. Approves.
1:00 — Live execution. WebRTC stream. Avatar narrates each step.
1:50 — Verifier silently retries a failed click. Show this moment.
2:10 — Task complete. Results card displayed.
2:25 — DEMO 2: User hits STOP mid-task. Edits step. Resumes.
2:55 — DEMO 3: CAPTCHA blocker. ARIA suggests alternative.
3:15 — Show Cloud Run dashboard. Proof of deployment.
3:35 — Architecture diagram: 5 layers in 20 seconds.
3:55 — Avatar: "That's ARIA. Your browser. Your rules." 🎤 drop
```

---

*Document version 3.0 — WebRTC + textarea architecture update*
*Living document — updated as build progresses*