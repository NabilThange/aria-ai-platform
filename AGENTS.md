# ARIA PROJECT — CLAUDE INSTRUCTIONS

> These rules apply to **every task** without exception. Read this file before doing anything.

---

## 🔁 WORKFLOW: HOW TO HANDLE EVERY TASK

Follow this exact sequence for every task:

### Step 1 — Gather Context First
- **Always** invoke the **Context Gatherer Subagent** before starting any task.
- Read the **actual source code files** directly — do not rely solely on the architecture `.md` file, as it may be outdated.
- Cross-reference the `.md` docs with real implementation to spot discrepancies.

### Step 2 — Plan Before Coding
- Use the **`task-planning`** or **`create-implementation-plan`** skill to break the task into clear steps.
- If the task involves a complex problem or design decision, use **`brainstorming`** first.
- Write out your plan and confirm the approach before touching any code.

### Step 3 — Execute
- Follow the relevant skill(s) listed below.
- Write clean, idiomatic code consistent with the existing codebase patterns.
- Use **`next-best-practices`** and **`vercel-react-best-practices`** for all frontend/Next.js work.

### Step 4 — Verify
- After making changes, check your work against the actual implementation.
- Run any available tests or lints if applicable.
- If something is broken or unclear, use **`systematic-debugging`** before guessing.

### Step 5 — Update Documentation
- After completing every task, update the architecture doc:
```
  C:\Users\thang\Projects\Aria\Aria\CONTEXT\ARIA_COMPLETE_ARCHITECTURE.md
```
- Be specific: note what changed, what was added, and any new patterns introduced.

---

## 📁 KEY FILES & PATHS

| Resource | Path |
|---|---|
| Architecture Doc | `C:\Users\thang\Projects\Aria\Aria\CONTEXT\ARIA_COMPLETE_ARCHITECTURE.md` |
| Skills Directory | `C:\Users\thang\Projects\Aria\Aria\.kiro\skills\` |

---

## 🛠️ AVAILABLE SKILLS — WHEN TO USE THEM

Always prefer using a skill over working from scratch. Here's a quick reference:

| Skill | Use When |
|---|---|
| `brainstorming` | Exploring approaches before committing to a solution |
| `create-implementation-plan` | Breaking a large feature into ordered steps |
| `task-planning` | Scoping any non-trivial task before starting |
| `next-best-practices` | Writing any Next.js code |
| `vercel-react-best-practices` | Deploying or optimising for Vercel |
| `performance-optimization` | Improving speed, load time, or rendering |
| `image-optimization` | Handling images (formats, lazy load, sizing) |
| `prompt-engineering` | Writing or refining AI prompts within the app |
| `prompt-engineering-patterns` | Applying structured prompt design patterns |
| `systematic-debugging` | Diagnosing bugs methodically, not by guessing |
| `test-driven-development` | Writing tests before or alongside features |
| `uncodixfy` | Deciphering or documenting unclear/legacy code |

---

## ⚠️ CRITICAL RULES

1. **Never guess** — if uncertain about existing code, read it. Use the context gatherer.
2. **Never skip documentation updates** — the architecture `.md` must reflect every change.
3. **Always verify against real code** — the `.md` file is a reference, not a source of truth.
4. **Always use skills** — they encode proven patterns for this project; don't ignore them.
5. **Plan before you code** — no task should begin without a clear step-by-step plan.