# Multi-Agent System Logging Guide

## Overview

This guide explains how to read and interpret logs from the multi-agent orchestration system to understand which agents and tools are being used.

---

## Log Structure

### Phase-Based Logging

The system logs execution in 4 phases:

```
╔════════════════════════════════════════════════════════════════╗
║  🎯 MULTI-AGENT ORCHESTRATION STARTED                          ║
╚════════════════════════════════════════════════════════════════╝

┌─ PHASE 1: CLARIFICATION ─────────────────────────────────────┐
└──────────────────────────────────────────────────────────────┘

┌─ PHASE 2: PLANNING ──────────────────────────────────────────┐
└──────────────────────────────────────────────────────────────┘

┌─ PHASE 3: EXECUTION ─────────────────────────────────────────┐
  ╔═══ STEP 1/3: step_1 ═══╗
  ║ Type: WEB
  ║ Description: Navigate to Gmail
  ╚══════════════════════════════════════════════════════════════╝
└──────────────────────────────────────────────────────────────┘

┌─ PHASE 4: REPORTING ─────────────────────────────────────────┐
└──────────────────────────────────────────────────────────────┘

╔════════════════════════════════════════════════════════════════╗
║  ✅ MULTI-AGENT ORCHESTRATION COMPLETED SUCCESSFULLY           ║
╚════════════════════════════════════════════════════════════════╝
```

---

## Agent Identification

### Agent Emojis

Each agent has a unique emoji for easy identification:

| Agent | Emoji | Purpose |
|-------|-------|---------|
| ClarifierAgent | 📝 | Clarifies user intent |
| OrchestratorAgent | 🎯 | Creates execution plans |
| WebAgent | 🌐 | Browser automation (PinchTab) |
| DesktopAgent | 🖥️ | Desktop automation (Computer Use) |
| PerceptionAgent | 👁️ | Screenshot analysis |
| VerifierAgent | ✅ | Action verification |
| RecoveryAgent | 🔄 | Failure recovery |
| ReporterAgent | 📊 | Task summaries |

### Tool Identification

**PinchTab (Browser)**:
```
🌐 [WebAgent] Executing PINCHTAB action: navigate
   → Navigating to: https://gmail.com
✅ [WebAgent] PinchTab action completed: navigate
```

**Computer Use (Desktop)**:
```
🖥️ [DesktopAgent] Executing COMPUTER USE action: click
   Action details: {"action":"click","params":{"coordinates":[100,200]}}
✅ [DesktopAgent] Computer action completed: click
```

---

## Reading Logs

### Example 1: Web Task (PinchTab)

**Task**: "Check my Gmail inbox"

```log
[OrchestrationService] 🤖 Delegating to WEB Agent (using PINCHTAB)...

[WebAgent] Executing web step for task abc123
[WebAgent] Initializing PinchTab in HEADED (visible) mode
[PinchTabService] Initializing PinchTab instance with profile: default, mode: headed
[PinchTabService] PinchTab instance created: inst_xyz789 (headed mode)

[WebAgent] Web step iteration 1/20
[WebAgent] 🌐 [WebAgent] Iteration 1 response:
{
  "action": "navigate",
  "url": "https://gmail.com",
  "reasoning": "Need to navigate to Gmail first"
}

[WebAgent] 🌐 [WebAgent] Executing PINCHTAB action: navigate
[WebAgent]    → Navigating to: https://gmail.com
[PinchTabService] Navigating to https://gmail.com
[PinchTabService] Tab opened with ID: tab_abc123
[WebAgent] ✅ [WebAgent] PinchTab action completed: navigate

[WebAgent] Web step iteration 2/20
[WebAgent] 🌐 [WebAgent] Iteration 2 response:
{
  "action": "click",
  "ref": "e5",
  "reasoning": "Click the inbox link"
}

[WebAgent] 🌐 [WebAgent] Executing PINCHTAB action: click
[WebAgent]    → Clicking element: e5
[PinchTabService] Executing action: click
[WebAgent] ✅ [WebAgent] PinchTab action completed: click

[WebAgent] Web step iteration 3/20
[WebAgent] 🌐 [WebAgent] Iteration 3 response:
{
  "action": "complete",
  "reasoning": "Inbox is now visible"
}

[WebAgent] 🌐 [WebAgent] Executing PINCHTAB action: complete
[WebAgent]    → Step completed
[WebAgent] ✅ [WebAgent] PinchTab action completed: complete

[OrchestrationService] ✅ Step step_1 succeeded!
```

**Key Indicators**:
- ✅ `WEB Agent (using PINCHTAB)` - Confirms PinchTab is being used
- ✅ `PinchTab instance created` - Browser launched
- ✅ `Executing PINCHTAB action` - Each browser action logged
- ✅ `headed mode` - Browser window is visible

---

### Example 2: Desktop Task (Computer Use)

**Task**: "Create a file named test.txt"

```log
[OrchestrationService] 🤖 Delegating to DESKTOP Agent (using COMPUTER USE)...

[DesktopAgent] Executing desktop step for task abc123

[DesktopAgent] Desktop step iteration 1/20
[DesktopAgent] 📚 Conversation history: 1 messages

[PerceptionAgent] Processing screenshot for task abc123
[PerceptionAgent] 👁️ [PerceptionAgent] Screen analysis:
[PerceptionAgent]    Active window: File Explorer
[PerceptionAgent]    UI state: File Explorer is open showing Desktop folder
[PerceptionAgent]    Clickable elements: 15 found
[PerceptionAgent]    Errors visible: false
[PerceptionAgent]    Task info: Desktop folder is visible with several files...

[DesktopAgent] 🤖 [DesktopAgent] Iteration 1 response:
{
  "action": "open_application",
  "application": "notepad",
  "reasoning": "Need to open Notepad to create a text file"
}

[DesktopAgent] 🖥️ [DesktopAgent] Executing COMPUTER USE action: open_application
[DesktopAgent]    Action details: {"action":"open_application","params":{"application":"notepad"}}
[DesktopAgent] ✅ [DesktopAgent] Computer action completed: open_application

[DesktopAgent] Desktop step iteration 2/20
[DesktopAgent] 📚 Conversation history: 3 messages

[PerceptionAgent] Processing screenshot for task abc123
[PerceptionAgent] 👁️ [PerceptionAgent] Screen analysis:
[PerceptionAgent]    Active window: Notepad
[PerceptionAgent]    UI state: Notepad is open with empty document
[PerceptionAgent]    Clickable elements: 8 found
[PerceptionAgent]    Errors visible: false

[DesktopAgent] 🤖 [DesktopAgent] Iteration 2 response:
{
  "action": "type_text",
  "params": {"text": "Hello World"},
  "reasoning": "Type content into the file"
}

[DesktopAgent] 🖥️ [DesktopAgent] Executing COMPUTER USE action: type_text
[DesktopAgent]    Action details: {"action":"type_text","params":{"text":"Hello World"}}
[DesktopAgent] ✅ [DesktopAgent] Computer action completed: type_text

[DesktopAgent] Desktop step iteration 3/20
[DesktopAgent] 🤖 [DesktopAgent] Iteration 3 response:
{
  "action": "keyboard_shortcut",
  "params": {"keys": ["ctrl", "s"]},
  "reasoning": "Save the file"
}

[DesktopAgent] 🖥️ [DesktopAgent] Executing COMPUTER USE action: keyboard_shortcut
[DesktopAgent]    Action details: {"action":"keyboard_shortcut","params":{"keys":["ctrl","s"]}}
[DesktopAgent] ✅ [DesktopAgent] Computer action completed: keyboard_shortcut

[OrchestrationService] ✅ Step step_1 succeeded!
```

**Key Indicators**:
- ✅ `DESKTOP Agent (using COMPUTER USE)` - Confirms Computer Use tools
- ✅ `PerceptionAgent` - Screenshot analysis before each action
- ✅ `Executing COMPUTER USE action` - Each desktop action logged
- ✅ `Conversation history: X messages` - Shows memory accumulation

---

### Example 3: Mixed Task (Both Tools)

**Task**: "Download invoice from Gmail and save to Desktop"

```log
[OrchestrationService] ┌─ PHASE 3: EXECUTION ─────────────────────────────────────┐

[OrchestrationService] ╔═══ STEP 1/2: step_1 ═══╗
[OrchestrationService] ║ Type: WEB
[OrchestrationService] ║ Description: Navigate to Gmail and download invoice
[OrchestrationService] ╚══════════════════════════════════════════════════════════╝

[OrchestrationService] 🤖 Delegating to WEB Agent (using PINCHTAB)...

[WebAgent] 🌐 [WebAgent] Executing PINCHTAB action: navigate
[WebAgent]    → Navigating to: https://gmail.com
[WebAgent] ✅ [WebAgent] PinchTab action completed: navigate

[WebAgent] 🌐 [WebAgent] Executing PINCHTAB action: click
[WebAgent]    → Clicking element: e12
[WebAgent] ✅ [WebAgent] PinchTab action completed: click

[WebAgent] Detected 1 new downloads: invoice.pdf

[OrchestrationService] ✅ Step step_1 succeeded!

[OrchestrationService] ╔═══ STEP 2/2: step_2 ═══╗
[OrchestrationService] ║ Type: DESKTOP
[OrchestrationService] ║ Description: Move invoice.pdf to Desktop
[OrchestrationService] ╚══════════════════════════════════════════════════════════╝

[OrchestrationService] 🤖 Delegating to DESKTOP Agent (using COMPUTER USE)...

[DesktopAgent] 🖥️ [DesktopAgent] Executing COMPUTER USE action: click
[DesktopAgent]    Action details: {"action":"click","params":{"coordinates":[100,200]}}
[DesktopAgent] ✅ [DesktopAgent] Computer action completed: click

[DesktopAgent] 🖥️ [DesktopAgent] Executing COMPUTER USE action: drag_mouse
[DesktopAgent]    Action details: {"action":"drag_mouse","params":{"from":[100,200],"to":[500,100]}}
[DesktopAgent] ✅ [DesktopAgent] Computer action completed: drag_mouse

[OrchestrationService] ✅ Step step_2 succeeded!

[OrchestrationService] └──────────────────────────────────────────────────────────┘
```

**Key Indicators**:
- ✅ Step 1 uses `WEB Agent (using PINCHTAB)` - Browser automation
- ✅ Step 2 uses `DESKTOP Agent (using COMPUTER USE)` - Desktop automation
- ✅ Clear separation between tools
- ✅ Download detection logged

---

## Quick Reference

### How to Tell Which Tool is Being Used

**Look for these log patterns**:

#### PinchTab (Browser)
```
🤖 Delegating to WEB Agent (using PINCHTAB)...
🌐 [WebAgent] Executing PINCHTAB action: <action>
```

#### Computer Use (Desktop)
```
🤖 Delegating to DESKTOP Agent (using COMPUTER USE)...
🖥️ [DesktopAgent] Executing COMPUTER USE action: <action>
```

### Common Actions

**PinchTab Actions**:
- `navigate` - Go to URL
- `click` - Click element by reference (e.g., "e5")
- `fill` - Fill form field
- `submit` - Submit form
- `scroll` - Scroll page
- `wait` - Wait for page to load
- `complete` - Step finished

**Computer Use Actions**:
- `open_application` - Launch app
- `click` - Click at coordinates
- `type_text` - Type text
- `type_keys` - Press keys
- `keyboard_shortcut` - Key combination
- `scroll` - Scroll window
- `drag_mouse` - Drag and drop
- `wait` - Wait duration
- `complete` - Step finished

---

## Debugging Tips

### Problem: Can't tell which tool was used

**Solution**: Search logs for:
```bash
# Find all tool usage
grep "using PINCHTAB\|using COMPUTER USE" logs.txt

# Find all PinchTab actions
grep "Executing PINCHTAB action" logs.txt

# Find all Computer Use actions
grep "Executing COMPUTER USE action" logs.txt
```

### Problem: Want to see only successful actions

**Solution**: Search for completion logs:
```bash
# PinchTab completions
grep "PinchTab action completed" logs.txt

# Computer Use completions
grep "Computer action completed" logs.txt
```

### Problem: Want to see agent decision-making

**Solution**: Search for iteration responses:
```bash
# WebAgent decisions
grep "\[WebAgent\] Iteration.*response" logs.txt -A 10

# DesktopAgent decisions
grep "\[DesktopAgent\] Iteration.*response" logs.txt -A 10
```

### Problem: Want to see perception analysis

**Solution**: Search for perception logs:
```bash
# Screen analysis
grep "Screen analysis" logs.txt -A 5
```

---

## Log Levels

### INFO (default)
- Phase transitions
- Agent delegations
- Action executions
- Step completions

### DEBUG (verbose)
- Message history counts
- Action details (JSON)
- Snapshot contents
- Token usage

### WARN
- Perception failures
- Max iterations reached
- Unknown actions
- Retry attempts

### ERROR
- Action failures
- Parsing errors
- API errors
- Task failures

---

## Example Log Analysis

### Scenario: Task failed, need to know why

**Step 1**: Find the failure
```bash
grep "FAILED\|failed\|error" logs.txt
```

**Step 2**: Identify which agent failed
```bash
# Look for the last agent that was executing
grep "Delegating to.*Agent" logs.txt | tail -1
```

**Step 3**: Check what action failed
```bash
# If WebAgent
grep "Executing PINCHTAB action" logs.txt | tail -5

# If DesktopAgent
grep "Executing COMPUTER USE action" logs.txt | tail -5
```

**Step 4**: Check perception (if DesktopAgent)
```bash
grep "Screen analysis" logs.txt | tail -1 -A 5
```

**Step 5**: Check verification
```bash
grep "Verification result" logs.txt | tail -1 -A 5
```

---

## Summary

### Quick Checklist

To understand what happened in a task execution:

1. ✅ Check phase logs - which phase did it reach?
2. ✅ Check agent delegation - which agents were used?
3. ✅ Check tool usage - PinchTab or Computer Use?
4. ✅ Check action logs - what actions were executed?
5. ✅ Check completion status - did steps succeed?
6. ✅ Check verification - did Verifier approve?

### Key Log Patterns

| Pattern | Meaning |
|---------|---------|
| `using PINCHTAB` | Browser automation active |
| `using COMPUTER USE` | Desktop automation active |
| `Executing PINCHTAB action` | Browser action happening |
| `Executing COMPUTER USE action` | Desktop action happening |
| `PinchTab action completed` | Browser action succeeded |
| `Computer action completed` | Desktop action succeeded |
| `Step X succeeded` | Step completed successfully |
| `Step X failed` | Step failed, check logs above |

---

## Related Documentation

- [Multi-Agent Architecture](./MULTI-AGENT-MIGRATION-GUIDE.md)
- [PinchTab Visibility Guide](./PINCHTAB-VISIBILITY-GUIDE.md)
- [Desktop VNC Troubleshooting](../DESKTOP-VNC-TROUBLESHOOTING.md)
