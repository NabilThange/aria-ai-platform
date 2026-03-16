# Terminal Window Issue - Fix Summary

## Problem Identified

The Desktop Agent was opening multiple terminal windows because:

1. **Every `terminal_command` opened a new terminal** - The code always called `application: 'terminal'` before each command
2. **Screenshots taken too quickly** - UI updates weren't complete before the next screenshot
3. **No state awareness** - Agent didn't know a terminal was already open

## Changes Made

### 1. Modified `terminal_command` Tool (desktop.agent.ts)

**Before:**
```typescript
// Step 1: Open terminal
const terminalResponse = await fetch(..., {
  body: JSON.stringify({ action: 'application', application: 'terminal' })
});
await this.wait(2000);

// Step 2: Type command
// Step 3: Press Enter
```

**After:**
```typescript
// Step 1: Type command (assumes terminal is already open)
const typeResponse = await fetch(..., {
  body: JSON.stringify({ action: 'type_text', text: input.command })
});
await this.wait(1000);

// Step 2: Press Enter
```

**Key Change**: Removed the automatic terminal opening. Now `terminal_command` assumes a terminal is already open and just types the command.

### 2. Added UI Update Delays (desktop.agent.ts)

Added delays after tool execution to allow UI to update:

```typescript
// Wait for UI to update after action
if (name === 'computer_terminal_command' || name === 'computer_application') {
  this.logger.log(`   ⏳ Waiting 2s for UI to update...`);
  await this.wait(2000);
} else if (name === 'computer_left_click' || name === 'computer_right_click' || 
           name === 'computer_double_click' || name === 'computer_type_text' || 
           name === 'computer_paste_text' || name === 'computer_type_keys' || 
           name === 'computer_scroll') {
  this.logger.log(`   ⏳ Waiting 1s for UI to update...`);
  await this.wait(1000);
}
// No wait for computer_screenshot - it's instant
```

**Timing Strategy**:
- Terminal commands & app launches: 2 seconds (need more time to open/execute)
- Mouse clicks, typing, scrolling: 1 second (UI updates faster)
- Screenshots: No wait (instant operation)

### 3. Updated System Prompt (system-prompts.config.ts)

**Added clarification:**
```
terminal_command — run a shell command in the currently open terminal
{"action": "terminal_command", "command": "ls -la /home/user"}

IMPORTANT: terminal_command assumes a terminal is already open. If no terminal is open, first use:
{"action": "application", "application": "terminal"}
Then wait for it to open before using terminal_command.
```

**Added example pattern:**
```
Running multiple terminal commands (terminal stays open):
1. computer: {"action": "application", "application": "terminal"}
2. computer: {"action": "screenshot"} — wait for terminal
3. computer: {"action": "terminal_command", "command": "cd /home/user"}
4. computer: {"action": "screenshot"} — verify command ran
5. computer: {"action": "terminal_command", "command": "echo 'print(\"Hello\")' > script.py"}
6. computer: {"action": "screenshot"} — verify file created
7. computer: {"action": "terminal_command", "command": "python3 script.py"}
8. computer: {"action": "screenshot"} — verify script ran
9. set_task_status: {"status": "completed", "message": "Script created and executed"}
```

## Expected Behavior Now

1. Agent opens terminal ONCE using `{"action": "application", "application": "terminal"}`
2. Subsequent commands use `{"action": "terminal_command", "command": "..."}` which types into the existing terminal
3. UI updates complete before next screenshot:
   - 2 seconds after terminal commands or app launches
   - 1 second after clicks, typing, scrolling
   - No wait after screenshots
4. Agent can run multiple commands in the same terminal session

## Testing Recommendation

Test with the same task:
```
Make a file named world.py and write a python script to say hello world and run the python file. Do all of this via terminal.
```

Expected result:
- 1 terminal window opens
- All commands execute in that same window
- No "loop detected" warnings
- Clean execution with proper timing between actions

## Technical Details

**Tool Names**: The Desktop Agent uses internal tool names like `computer_terminal_command`, `computer_application`, etc. These are mapped from the unified `computer` tool with `action` parameter that the LLM sees.

**Compilation**: Fixed TypeScript error by explicitly listing all valid tool names instead of using `!==` comparison.
