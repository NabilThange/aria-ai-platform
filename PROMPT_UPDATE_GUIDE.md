# System Prompt Update Guide

Based on the actual code, here's what needs to be updated in the system prompts.

## 🎯 Summary of Findings

### Desktop Agent (`packages/aria-agent/src/config/system-prompts.config.ts`)

**Current Status**: ✅ MOSTLY CORRECT
- System prompt correctly describes the unified `computer` tool
- Correctly shows `set_task_status` for completion
- Examples match actual tool signatures

**Minor Issues**:
- Some examples show `"arguments"` correctly ✅
- Tool definitions are accurate ✅

### Web Agent (`packages/aria-agent/src/config/system-prompts.config.ts`)

**Current Status**: ⚠️ NEEDS UPDATES

**Issues Found**:

1. **Completion Method is WRONG**
   - Prompt says: "Respond with text 'COMPLETE: [explanation]'"
   - Reality: Agent checks for keywords "complete", "success", or "done" in ANY text response
   - No specific format required

2. **Missing Critical Info**
   - Doesn't explain that `pinchtab_fill` doesn't work
   - Should recommend using `type` action via PinchTab API instead
   - Doesn't mention the `pinchtab_get_snapshot` tool

3. **Tool List Incomplete**
   - Missing `pinchtab_get_snapshot` tool
   - Doesn't clarify parameter naming (`input` not `arguments`)

---

## 📝 Required Updates

### Update 1: Web Agent Completion Method

**Current (WRONG)**:
```
When success_criteria is met, respond with text "COMPLETE: [brief explanation]"
```

**Should Be**:
```
When success_criteria is met, respond with text containing one of these keywords:
- "complete" (e.g., "The task is complete")
- "success" (e.g., "Success! Page loaded")  
- "done" (e.g., "All done, search results visible")

The agent will detect these keywords and mark the step as complete.
```

### Update 2: Add PinchTab Tool List

**Add this section to Web Agent prompt**:

```markdown
## AVAILABLE PINCHTAB TOOLS

You have access to these tools (call them via function calling):

1. **pinchtab_navigate** - Navigate to URL
   Parameters: {url: string}
   
2. **pinchtab_click** - Click element by reference
   Parameters: {ref: string}
   
3. **pinchtab_fill** - Fill form field (⚠️ DOESN'T WORK - use type instead)
   Parameters: {ref: string, value: string}
   
4. **pinchtab_submit** - Submit form
   Parameters: {ref: string}
   
5. **pinchtab_scroll** - Scroll page
   Parameters: {direction: 'up'|'down', amount?: number}
   
6. **pinchtab_wait** - Wait for duration
   Parameters: {ms: number}
   
7. **pinchtab_get_snapshot** - Get page snapshot
   Parameters: {} (empty)

**CRITICAL**: All parameters use "input" not "arguments"!

Example:
```json
{
  "name": "pinchtab_click",
  "input": {
    "ref": "e27"
  }
}
```
```

### Update 3: Add PinchTab Fill Warning

**Add this warning**:

```markdown
## ⚠️ CRITICAL: pinchtab_fill DOESN'T WORK

The `pinchtab_fill` tool is defined but DOES NOT WORK in practice.

**Instead of fill, use this workflow**:
1. Get snapshot to find element ref
2. Use PinchTab HTTP API `type` action (not a tool, but an API call)
3. Or click the field first, then use keyboard input

**Why fill doesn't work**:
- Returns `{"filled":""}` (empty response)
- PinchTab API requires `type` action instead
- This is a known limitation from testing

**Workaround**:
```
1. Click the input field (pinchtab_click with ref)
2. Type text using keyboard (via type action in PinchTab API)
3. Click submit button (pinchtab_click with submit button ref)
```
```

### Update 4: Clarify Parameter Naming

**Add this note**:

```markdown
## 🔑 Parameter Naming Convention

**Desktop Agent**: Uses `arguments`
```json
{"name": "computer", "arguments": {"action": "click", "x": 100, "y": 200}}
```

**Web Agent**: Uses `input`
```json
{"name": "pinchtab_click", "input": {"ref": "e27"}}
```

This is because Desktop Agent uses Bytez/Groq format, while Web Agent uses PinchTab format.
```

---

## 🔧 Where to Make Changes

**File**: `packages/aria-agent/src/config/system-prompts.config.ts`

**Section**: `AGENT_SYSTEM_PROMPTS.WEB`

**Line**: Around line 650-850 (the Web Agent system prompt)

---

## ✅ What's Already Correct

### Desktop Agent Prompt

These sections are CORRECT and don't need changes:

1. ✅ Unified `computer` tool description
2. ✅ Action parameter enum list
3. ✅ `set_task_status` completion tool
4. ✅ Tool call examples with `arguments`
5. ✅ Action-specific parameter requirements

### Web Agent Prompt

These sections are CORRECT:

1. ✅ PinchTab instance management section (newly added)
2. ✅ Snapshot feature explanation
3. ✅ Best practices list
4. ✅ Google search workflow example

---

## 📊 Priority of Updates

**HIGH PRIORITY** (breaks functionality):
1. ✅ Fix completion method (text keywords vs specific format)
2. ⚠️ Add warning about `pinchtab_fill` not working

**MEDIUM PRIORITY** (improves clarity):
3. Add complete tool list with parameter schemas
4. Clarify `input` vs `arguments` naming

**LOW PRIORITY** (nice to have):
5. Add more examples
6. Add troubleshooting section

---

## 🎯 Next Steps

1. Read current Web Agent prompt in `system-prompts.config.ts`
2. Apply the 4 updates listed above
3. Test with a simple web task
4. Verify agent can complete steps correctly
5. Check logs to ensure tool calls match expected format

Would you like me to make these updates to the system prompt now?
