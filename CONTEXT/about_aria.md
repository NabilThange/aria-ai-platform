# ARIA — Project Overview & Vision
## Document 01 — Master Context
---

## What is ARIA?

ARIA is a web-based AI browser agent. The user opens a website, speaks or types a goal,
and ARIA takes over a real sandboxed Computer to complete the task — live, 
visible on the left half of the screen.

A Zoom/Google Meet-style avatar box sits in the right sidebar as if ARIA "joined the meeting."
All conversation, planning, and status updates happen in that sidebar.

No desktop install. No extension. Just open the URL.

---

## The One-Line Pitch

> "Tell ARIA what you want. Watch it happen."

---

## CONFIRMED WORKING — March 2026

From live terminal test:

**Model used:** `gemini-3-flash-preview` via AI Studio API key (FREE ✅)

**What it did:**
1. Opened Chrome via Playwright
2. Navigated to Google
3. Located the search bar visually from screenshot
4. Typed "Hello World" and pressed Enter
5. Hit a CAPTCHA — reported it gracefully and stopped

**The model's actual reasoning output (this goes in the avatar speech bubble):**

> *"Okay, here's the plan. I've got Google open, staring me in the face. That search bar
> is roughly at y=447, x=485. I'll use type_text_at and set press_enter=True
> so it hits search immediately after typing. Clean and efficient execution."*

This reasoning text is real, free, and beautiful. We pipe it directly to the avatar.

**The model also handled CAPTCHA perfectly:**

> *"I've navigated to Google and typed 'Hello World' into the search bar. However,
> it seems Google is showing a CAPTCHA. Please let me know if you'd like me to try
> anything else."*

No special handling needed. The model detects blockers and reports them naturally.

---

## The Core Philosophy

Most browser agents are black boxes — you give them a goal, they do stuff, 
you hope it works. ARIA is different:

- **Transparent** — you see every step before it runs AND while it runs
- **Collaborative** — you approve the plan before execution begins
- **Interruptible** — STOP at any moment, resume from any step
- **Personified** — a real avatar that feels like it joined your video call
- **Safe** — sandboxed Computer, not your personal browser

---

## The UI — Split Screen Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ● ARIA  Browser Agent                              Connected ●  │
├───────────────────────────────────┬──────────────────────────────┤
│                                   │                              │
│                                   │  ┌──────────────────────┐   │
│   LEFT HALF (50%)                 │  │   ARIA AVATAR BOX    │   │
│                                   │  │                      │   │
│   Live Chrome browser stream      │  │   Like Zoom/Meet     │   │
│   Screenshot every 300ms          │  │   Emoji face center  │   │
│   via WebSocket → <img> tag       │  │   Glowing border     │   │
│                                   │  │   Speech bubble      │   │
│   User watches the agent          │  │   Name bar bottom    │   │
│   work in real time               │  └──────────────────────┘   │
│                                   │                              │
│   "LIVE" badge pulses             │  ┌──────────────────────┐   │
│   when agent is running           │  │   PLAN + ACTIVITY    │   │
│                                   │  │   Step checklist     │   │
│                                   │  │   Action log         │   │
│                                   │  │   Color-coded        │   │
│                                   │  └──────────────────────┘   │
│                                   │                              │
│                                   │  ┌──────────────────────┐   │
│                                   │  │   CHAT INPUT         │   │
│                                   │  │   🎤 mic button      │   │
│                                   │  │   text input         │   │
│                                   │  │   [▶ GO]  [🛑 STOP]  │   │
│                                   │  └──────────────────────┘   │
└───────────────────────────────────┴──────────────────────────────┘
```

---

## The 5-Layer Multi-Agent Pipeline

```
USER SPEAKS OR TYPES GOAL
        │
        ▼
┌───────────────────────────────────────────────────────┐
│ LAYER 1 — INTENT AGENT                                │
│ Model: gemini-2.0-flash (free, text)                  │
│ Job: Is this goal clear? If vague, ask ONE question.  │
│ Output: clarified goal                                │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│ LAYER 2 — PLANNER AGENT                               │
│ Model: gemini-2.0-flash (free, text)                  │
│ Job: Break goal into 3-8 ordered browser steps.       │
│ Output: step list → shown to user for approval        │
└───────────────────────┬───────────────────────────────┘
                        │
                  USER APPROVES ← (can edit/delete steps)
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│ LAYER 3 — EXECUTOR AGENT                              │
│ Model: gemini-3-flash-preview (FREE ✅ confirmed)     │
│ Foundation: forked google/computer-use-preview        │
│ Job: See screenshot → decide action → execute in Chrome│
│ Output: click_at / type_text_at / navigate / scroll   │
└───────────────────────┬───────────────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────────────┐
│ LAYER 4 — VERIFIER AGENT                              │
│ Model: gemini-2.0-flash (free, vision)                │
│ Job: After each action — did it actually work?        │
│ Output: pass / retry / escalate                       │
└───────────────────────┬───────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────┐
│ LAYER 5 — MEMORY SERVICE                              │
│ Python dict, in-memory                                │
│ Job: Full context available to every agent call       │
│ Contents: goal, plan, steps done, URL, errors, data   │
└───────────────────────────────────────────────────────┘
```




---

## Why ARIA Wins the Hackathon

| Judging Criteria | How ARIA delivers |
|---|---|
| Breaks the text box paradigm | Split screen live browser + avatar + voice |
| Multimodal I/O | Agent sees screenshots, user speaks, avatar talks back |
| Live and context-aware | Real Chrome stream, reasoning piped to avatar in real time |
| Technical depth | 5-layer pipeline, forked official Google repo, plan approval |
| Safety | Sandboxed Computer, human approval before execution, STOP button |
| Demo quality | Avatar narrates its own reasoning — the product explains itself |

---

*Document 01 — v5.0 — based on confirmed live working test*