# Multi-Agent Task Routing

## How It Works

Your ARIA system already supports multiple agents working on different parts of a task! The orchestrator automatically routes steps to the appropriate agent based on the step type.

## Architecture

```
User Input: "Open Firefox and go to Wikipedia to search for India"
     ↓
Clarifier Agent → Understands intent, identifies as "mixed" task
     ↓
Orchestrator Agent → Creates plan with multiple steps, assigns types
     ↓
┌────────────────────────────────────────────────────────┐
│  EXECUTION PLAN                                        │
│  ------------------------------------------------      │
│  Step 1: [desktop] Open Firefox browser               │
│  Step 2: [web] Navigate to wikipedia.org              │
│  Step 3: [web] Search for 'India' on Wikipedia        │
└────────────────────────────────────────────────────────┘
     ↓
Orchestration Service → Routes each step to correct agent
     ↓
┌─────────────────┐  ┌─────────────────┐
│ Desktop Agent   │  │ Web Agent       │
│ (Step 1)        │  │ (Steps 2-3)     │
│ - Computer Use  │  │ - PinchTab      │
│ - Opens Firefox │  │ - Navigates     │
└─────────────────┘  │ - Searches      │
                     └─────────────────┘
```

## Key Components

### 1. Orchestrator Agent (`orchestrator.agent.ts`)
- Receives clarified task from Clarifier
- Breaks down task into atomic steps
- **Assigns each step a type: `web` or `desktop`**
- Creates execution plan with clear routing

### 2. Orchestration Service (`orchestration.service.ts`)
- Executes plan sequentially
- **Routes each step based on type** (lines 109-113):
  ```typescript
  const result = step.type === 'web'
    ? await this.webAgent.execute(step, taskId)
    : await this.desktopAgent.execute(step, taskId);
  ```

### 3. Specialized Agents
- **Desktop Agent**: Handles OS-level actions (opening apps, file operations, terminal commands)
- **Web Agent**: Handles browser actions (navigation, web searches, form filling)

## Step Type Assignment Rules

The orchestrator follows these rules when assigning step types:

### Use `type: "web"` for:
- ✅ Navigating to URLs
- ✅ Searching the web
- ✅ Clicking buttons/links on web pages
- ✅ Filling web forms
- ✅ Reading web page content
- ✅ Interacting with web apps (Gmail, Google Docs, etc.)

### Use `type: "desktop"` for:
- ✅ Opening desktop applications
- ✅ Reading/writing local files
- ✅ Running terminal commands
- ✅ Taking screenshots
- ✅ Clicking UI elements in desktop apps
- ✅ Managing windows or system settings

## Example Task Breakdowns

### Example 1: "Open Firefox and go to Wikipedia to search for India"

**Orchestrator creates:**
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Open Firefox browser",
      "success_criteria": "Firefox window is open and visible"
    },
    {
      "id": "step_2", 
      "type": "web",
      "description": "Navigate to wikipedia.org",
      "success_criteria": "Wikipedia homepage is loaded"
    },
    {
      "id": "step_3",
      "type": "web", 
      "description": "Search for 'India' on Wikipedia",
      "success_criteria": "Search results for India are displayed"
    }
  ]
}
```

**Execution flow:**
1. Desktop Agent opens Firefox using Computer Use tools
2. Web Agent navigates to Wikipedia using PinchTab
3. Web Agent performs search using PinchTab

### Example 2: "Create a file and upload it to Google Drive"

**Orchestrator creates:**
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "desktop",
      "description": "Create file 'document.txt' with content",
      "success_criteria": "File exists in current directory"
    },
    {
      "id": "step_2",
      "type": "web",
      "description": "Navigate to Google Drive",
      "success_criteria": "Google Drive interface is loaded"
    },
    {
      "id": "step_3",
      "type": "web",
      "description": "Upload document.txt to Google Drive",
      "success_criteria": "File appears in Drive file list"
    }
  ]
}
```

**Execution flow:**
1. Desktop Agent creates the file using Computer Use
2. Web Agent navigates to Drive using PinchTab
3. Web Agent uploads file using PinchTab

## Enhanced Logging

The system now shows clear agent routing in logs:

```
📋 Plan created with 3 steps
   🌐 Web Agent: 2 steps | 💻 Desktop Agent: 1 step

   1. 💻 [DESKTOP] Open Firefox browser
   2. 🌐 [WEB] Navigate to wikipedia.org
   3. 🌐 [WEB] Search for 'India' on Wikipedia
```

During execution:
```
╔═══ STEP 1/3: step_1 ═══╗
║ Type: DESKTOP
║ Description: Open Firefox browser
╚══════════════════════════╝
🤖 Delegating to DESKTOP Agent (using COMPUTER USE)...

╔═══ STEP 2/3: step_2 ═══╗
║ Type: WEB
║ Description: Navigate to wikipedia.org
╚══════════════════════════╝
🤖 Delegating to WEB Agent (using PINCHTAB)...
```

## What Changed

### 1. Enhanced Orchestrator Prompt
Added explicit examples showing how to split mixed tasks:
- Clear guidance on when to use web vs desktop
- Multiple examples of task splitting
- Emphasis on creating separate steps for different agent types

### 2. Improved Logging
- Shows agent distribution in plan summary
- Uses emojis (🌐 for web, 💻 for desktop) for visual clarity
- Clearly indicates which agent handles each step during execution

## Testing

Try these example tasks to see multi-agent routing in action:

1. **"Open Firefox and search Google for weather"**
   - Step 1: Desktop Agent opens Firefox
   - Step 2: Web Agent navigates to Google
   - Step 3: Web Agent performs search

2. **"Create a file called test.txt and email it via Gmail"**
   - Step 1: Desktop Agent creates file
   - Step 2: Web Agent opens Gmail
   - Step 3: Web Agent composes and sends email

3. **"Take a screenshot and upload it to Imgur"**
   - Step 1: Desktop Agent takes screenshot
   - Step 2: Web Agent navigates to Imgur
   - Step 3: Web Agent uploads image

## No Code Changes Needed!

The multi-agent routing was already built into your system. The changes made were:

1. ✅ Enhanced orchestrator prompt with clearer examples
2. ✅ Improved logging for better visibility
3. ✅ **Added execution plan sharing to Web Agent** (Desktop Agent already had it)
4. ✅ **Enhanced plan context to show agent types and handoff warnings**
5. ✅ This documentation

The core routing logic in `orchestration.service.ts` was already correct and didn't need modification.

## Agent Coordination

Both Web and Desktop agents now receive the full execution plan in their prompts, so they know:
- What the overall goal is
- Which step they're currently on (e.g., "2/3")
- What steps come next
- Which agent handles each step (`[WEB]` or `[DESKTOP]`)
- When they'll hand off to another agent

See [AGENT-COORDINATION.md](./AGENT-COORDINATION.md) for detailed information about how agents share context and coordinate.
