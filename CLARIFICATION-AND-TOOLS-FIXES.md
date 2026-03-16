# Clarification Questions & Desktop Tools Fixes

## Issues Found and Fixed

### Issue 1: Questions Asked Hardcoded to 0

**Problem**: The Clarifier system prompt said `questions_asked: Always 0 in current version (Phase 6 will enable interactive questions)`, which discouraged the agent from asking clarifying questions.

**Why This Was Wrong**:
- The mechanism for asking questions already exists in the code
- The Clarifier can set `questions_asked: 1` and use `REQUIRES_USER_CLARIFICATION:` prefix
- But the prompt told it to always use 0, preventing this feature from working

**Fix Applied**:

1. **Updated Clarifier System Prompt** (`system-prompts.config.ts`):
```typescript
// BEFORE
- questions_asked: Always 0 in current version (Phase 6 will enable interactive questions).

// AFTER
- questions_asked: Number of clarifying questions asked. Set to 0 if no questions needed. 
  Set to 1 if you need to ask the user for clarification 
  (set clarified_goal to "REQUIRES_USER_CLARIFICATION: [your question]").
```

2. **Updated JSON Schema**:
```typescript
// BEFORE
"questions_asked": 0

// AFTER
"questions_asked": 0 | 1
```

3. **Added Handling in Orchestration Service** (`orchestration.service.ts`):
```typescript
// Check if clarifier needs user input
const clarifiedTask = clarified.data as any;
if (clarifiedTask.questions_asked > 0 && 
    clarifiedTask.clarified_goal?.startsWith('REQUIRES_USER_CLARIFICATION:')) {
  const question = clarifiedTask.clarified_goal.replace('REQUIRES_USER_CLARIFICATION:', '').trim();
  
  // Store the question and pause execution
  await this.sharedState.set(taskId, 'status', 'needs_clarification');
  await this.sharedState.set(taskId, 'clarification_question', question);
  this.emitStatus(taskId, 'needs_clarification', null);
  
  return; // Exit early - wait for user response
}
```

**Now the Clarifier can ask questions!**

Example:
- User input: "Do the thing"
- Clarifier output:
```json
{
  "original_input": "Do the thing",
  "clarified_goal": "REQUIRES_USER_CLARIFICATION: What specific task would you like me to perform?",
  "constraints": [],
  "assumptions": [],
  "task_type": "mixed",
  "questions_asked": 1
}
```
- System pauses and waits for user to provide more details

### Issue 2: Desktop Agent Tools Mismatch

**Problem**: The Desktop Agent system prompt listed tools that don't match the actual Groq tool definitions.

**System Prompt Said**:
```
Available tools:
- computer_left_click: Click at coordinates
- computer_right_click: Right-click at coordinates
- computer_double_click: Double-click at coordinates
- computer_type_text: Type text character by character
- computer_type_keys: Press keyboard shortcuts
- computer_scroll: Scroll the screen
- computer_application: Open or switch to an application
- computer_terminal_command: Run a terminal command
- computer_screenshot: Take a screenshot
```

**Actual Groq Tools** (`desktop.tools.ts`):
```typescript
{
  name: 'computer',
  description: 'Control mouse and keyboard...',
  parameters: {
    action: {
      enum: ['click', 'double_click', 'right_click', 'type', 'paste', 
             'key', 'screenshot', 'scroll', 'application', 'terminal_command']
    },
    // ... other parameters
  }
}
```

**The Reality**:
- There's only ONE tool called `computer`
- It has an `action` parameter that specifies what to do
- The system prompt was describing it as if there were separate tools

**Fix Applied**:

Updated the Desktop Agent system prompt to accurately describe the tools:

```
Available tools:
- **computer**: Main tool for all desktop interactions
  - Actions: click, double_click, right_click, type, paste, key, scroll, 
             application, terminal_command, screenshot
  - Parameters vary by action (coordinates for clicks, text for typing, etc.)
- **set_task_status**: Mark step as completed or failed
  - Parameters: status ("completed" or "failed"), message (explanation)
```

Added clear examples:
```json
// Click at coordinates
{
  "name": "computer",
  "arguments": {
    "action": "click",
    "x": 100,
    "y": 200
  }
}

// Type text
{
  "name": "computer",
  "arguments": {
    "action": "type",
    "text": "hello world"
  }
}

// Press keyboard shortcut
{
  "name": "computer",
  "arguments": {
    "action": "key",
    "text": "ctrl+c"
  }
}

// Mark complete
{
  "name": "set_task_status",
  "arguments": {
    "status": "completed",
    "message": "Task finished"
  }
}
```

## Missing Tools?

After reviewing the implementation, the Desktop Agent has all necessary tools:

### Computer Tool Actions:
1. ✅ **click** - Left click at coordinates
2. ✅ **double_click** - Double click at coordinates
3. ✅ **right_click** - Right click at coordinates
4. ✅ **type** - Type text slowly (character by character)
5. ✅ **paste** - Paste text fast (via clipboard)
6. ✅ **key** - Press keyboard shortcuts (ctrl+c, Return, etc.)
7. ✅ **scroll** - Scroll up or down
8. ✅ **application** - Open or switch to application
9. ✅ **terminal_command** - Run command in terminal
10. ✅ **screenshot** - Take screenshot (rarely needed)

### Set Task Status Tool:
11. ✅ **set_task_status** - Mark step as completed or failed

### What About These?

**Move Mouse / Hover**: Not needed - clicking moves the mouse automatically

**Drag and Drop**: Not implemented - could be added if needed:
```typescript
{
  action: 'drag',
  from_x: 100,
  from_y: 200,
  to_x: 300,
  to_y: 400
}
```

**File Operations**: Handled via `terminal_command`:
- Create file: `echo 'content' > file.txt`
- Read file: `cat file.txt`
- Delete file: `rm file.txt`
- Copy file: `cp source.txt dest.txt`

**Wait/Sleep**: Not needed as a tool - the agent can just not call any tool for an iteration

## Benefits of These Fixes

### 1. Clarification Questions Now Work
- Clarifier can ask for more details when input is vague
- System pauses and waits for user response
- Better user experience - no more guessing what user meant

### 2. Desktop Agent Tool Clarity
- Agent now knows the correct tool format
- Examples show exactly how to call tools
- Reduced confusion and errors

### 3. Consistent Documentation
- System prompt matches actual implementation
- Developers can trust the documentation
- Easier to debug issues

## Testing Clarification Questions

Try these vague inputs to test clarification:

1. **"Do the thing"**
   - Expected: Clarifier asks "What specific task would you like me to perform?"

2. **"Open it"**
   - Expected: Clarifier asks "What would you like me to open?"

3. **"Send the file"**
   - Expected: Clarifier asks "Which file would you like to send, and to whom?"

4. **"Check that"**
   - Expected: Clarifier asks "What would you like me to check?"

## Testing Desktop Tools

Try these tasks to verify tools work correctly:

1. **"Open Firefox"**
   - Should use: `computer` with `action: "application"`, `application: "firefox"`

2. **"Type hello world in terminal"**
   - Should use: `computer` with `action: "type"`, `text: "hello world"`

3. **"Press Ctrl+C"**
   - Should use: `computer` with `action: "key"`, `text: "ctrl+c"`

4. **"Click at position 100, 200"**
   - Should use: `computer` with `action: "click"`, `x: 100`, `y: 200`

## Future Enhancements

### Multi-Turn Clarification
Currently supports 1 question. Could be extended to:
- Ask follow-up questions
- Build context over multiple exchanges
- Remember previous answers

### More Desktop Actions
Could add:
- Drag and drop
- Mouse hover
- Select text
- Copy/paste with mouse
- Window management (minimize, maximize, close)

### Smarter Clarification
Could improve:
- Detect ambiguous pronouns ("it", "that", "this")
- Suggest common interpretations
- Learn from user's past tasks
