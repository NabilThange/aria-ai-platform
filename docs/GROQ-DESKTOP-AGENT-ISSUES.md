# Groq Desktop Agent Integration Issues

## Issue 1: User-Selected Model Not Being Used

**Problem:** User selects "Llama 4 Scout 17B" in UI, but Desktop Agent still uses Bytez Claude Sonnet 4.6.

**Root Cause:** The Desktop Agent reads from `AGENT_MODELS.DESKTOP.model` which is hardcoded to `anthropic/claude-sonnet-4-6`. The user-selected model from the task object is not being passed through.

**Evidence from Logs:**
```
Task created with model: {"name":"meta-llama/llama-4-scout-17b-16e-instruct","title":"Llama 4 Scout 17B","provider":"groq"}
...
[DesktopAgent] 🔧 Using provider: Bytez (model: anthropic/claude-sonnet-4-6)
```

**Fix:** Desktop Agent needs to read the model from the task object, not from the config.

---

## Issue 2: Orchestrator Assigns Web Tasks to Desktop Agent

**Problem:** Task "open wikipedia and search about india" is clearly a web/browser task, but Orchestrator assigned both steps as `type: "desktop"`.

**Evidence from Logs:**
```
Step 1: [DESKTOP] Navigate to the Wikipedia website by typing 'https://www.wikipedia.org'...
Step 2: [DESKTOP] Click on the Wikipedia search input field, type 'India'...
```

**Expected:** Both steps should be `type: "web"` to use the Web Agent with PinchTab.

**Root Cause:** Orchestrator system prompt doesn't clearly distinguish when to use web vs desktop:
- **Web:** Browser automation (navigate URLs, click web elements, fill forms)
- **Desktop:** OS-level actions (open apps, file operations, terminal commands)

**Fix:** Update Orchestrator system prompt with clearer examples.

---

## Issue 3: Desktop Agent Outputs Invalid Actions

**Problem:** Desktop Agent is outputting actions that don't exist in the tool schema:

```json
{"action": "wait", "seconds": 3}      // ❌ Invalid
{"action": "success", "reason": "..."} // ❌ Invalid
{"action": "complete", "reason": "..."} // ❌ Invalid
```

**Valid Actions:**
- `click`, `double_click`, `right_click` (with x, y coordinates)
- `type` (with text)
- `key` (with key name like "Return", "ctrl+c")
- `screenshot`
- `scroll` (with x, y, direction, amount)

**Root Cause:** The system prompt doesn't explicitly forbid these actions, and the model is inventing them to signal completion.

**Fix:** 
1. Update system prompt to list ONLY valid actions
2. Add explicit instruction: "Do NOT invent actions like 'wait', 'success', 'complete'"
3. Use `set_task_status` tool to signal completion instead

---

## Issue 4: Model Doesn't Know How to Signal Completion

**Problem:** When the Desktop Agent sees the success criteria is met, it tries to output `{"action": "success"}` or `{"action": "complete"}` instead of using the proper `set_task_status` tool.

**Evidence:**
```
REASONING: The Wikipedia homepage is clearly visible... The success criteria is already met.
{"action": "success", "reason": "..."}
```

**Expected:**
```json
{"name": "set_task_status", "arguments": {"status": "completed", "message": "Wikipedia homepage loaded successfully"}}
```

**Fix:** Update system prompt to emphasize using `set_task_status` when criteria is met.

---

## Summary of Required Changes

1. **Desktop Agent** - Read model from task object
2. **Orchestrator Prompt** - Clarify web vs desktop task assignment
3. **Desktop System Prompt** - Remove invalid actions, emphasize `set_task_status`
4. **Desktop Tools** - Ensure Groq tools match the system prompt exactly
