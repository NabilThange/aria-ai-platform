# ARIA Multi-Agent System - Complete Architecture

**Generated:** March 16, 2026  
**Purpose:** Complete frontend-backend flow with exact tools, inputs, outputs, and context sources

---

## Quick Navigation

- [Agent Registry](#agent-registry) - All 8 agents with models and tools
- [Complete Flow Example](#complete-flow-example) - Mixed workflow scenario
- [Tool Definitions](#tool-definitions) - Exact tool schemas
- [Orchestration Pipeline](#orchestration-pipeline) - Step-by-step execution
- [Scenarios](#scenarios) - Desktop, Web, Mixed, Workflow

---

## Agent Registry

| Agent | Model | Provider | Runs | User-Selectable | Purpose |
|-------|-------|----------|------|-----------------|---------|
| **CLARIFIER** | openai/gpt-oss-20b | Groq | 1x | ✅ | Q&A, user waiting |
| **ORCHESTRATOR** | anthropic/claude-opus-4-6 | Bytez | 2-3x | ✅ | Planning, brain |
| **WEB** | gemini-3-flash-preview | Google | 15-20x | ✅ | Browser automation |
| **DESKTOP** | anthropic/claude-sonnet-4-6 | Bytez | Variable | ✅ | OS-level control |
| **PERCEPTION** | meta-llama/llama-4-scout-17b | Groq | Every action | ✅ | Vision/screenshot |
| **VERIFIER** | openai/gpt-oss-20b | Groq | 20-30x | ✅ | Success validation |
| **RECOVERY** | anthropic/claude-sonnet-4-6 | Bytez | On escalation | ✅ | Failure recovery |
| **REPORTER** | openai/gpt-oss-20b | Groq | 1x | ✅ | Summary generation |

**Note:** All agents are user-configurable via the Agent Settings modal (accessible from header settings icon). Users can select models from GROQ, BYTEZ, or GOOGLE providers for each agent.

---


## Tool Definitions

### 1. ORCHESTRATOR Tools (Workflow Management)

**File:** `packages/aria-agent/src/groq/workflow.tools.ts`

#### Tool: `list_workflows`
**Syntax:**
```json
{
  "name": "list_workflows",
  "arguments": {}
}
```
**Output:**
```json
{
  "workflows": [
    {"name": "google-search", "description": "..."},
    {"name": "send-email", "description": "..."}
  ]
}
```

#### Tool: `read_workflow`
**Syntax:**
```json
{
  "name": "read_workflow",
  "arguments": {
    "name": "google-search"
  }
}
```
**Output:**
```json
{
  "name": "google-search",
  "description": "...",
  "variables": {"query": "string"},
  "timeout": 60000
}
```

#### Tool: `use_workflow`
**Syntax:**
```json
{
  "name": "use_workflow",
  "arguments": {
    "name": "google-search",
    "variables": {"query": "AI agents"}
  }
}
```
**Output:**
```json
{
  "success": true,
  "workflowId": "wf-123"
}
```

---

### 2. WEB AGENT Tools (PinchTab Browser Automation)

**File:** `packages/aria-agent/src/groq/pinchtab.tools.ts`

#### Tool: `pinchtab_health`
**Syntax:**
```json
{
  "name": "pinchtab_health",
  "arguments": {}
}
```
**Output:**
```json
{"status": "healthy"}
```

#### Tool: `pinchtab_launch_instance`
**Syntax:**
```json
{
  "name": "pinchtab_launch_instance",
  "arguments": {
    "name": "demo",
    "mode": "headed"
  }
}
```
**Output:**
```json
{
  "id": "instance-abc123",
  "url": "http://..."
}
```

#### Tool: `pinchtab_list_instances`
**Syntax:**
```json
{
  "name": "pinchtab_list_instances",
  "arguments": {}
}
```
**Output:**
```json
[
  {"id": "instance-abc123", "status": "ready", "name": "demo"}
]
```

#### Tool: `pinchtab_stop_instance`
**Syntax:**
```json
{
  "name": "pinchtab_stop_instance",
  "arguments": {
    "instanceId": "instance-abc123"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_list_tabs`
**Syntax:**
```json
{
  "name": "pinchtab_list_tabs",
  "arguments": {}
}
```
**Output:**
```json
[
  {"tabId": "tab-xyz789", "url": "https://google.com", "title": "Google"}
]
```

#### Tool: `pinchtab_switch_tab`
**Syntax:**
```json
{
  "name": "pinchtab_switch_tab",
  "arguments": {
    "tabId": "tab-xyz789"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_navigate`
**Syntax:**
```json
{
  "name": "pinchtab_navigate",
  "arguments": {
    "url": "https://www.google.com"
  }
}
```
**Output:**
```json
{
  "tabId": "tab-new123",
  "url": "https://www.google.com"
}
```

#### Tool: `pinchtab_click`
**Syntax:**
```json
{
  "name": "pinchtab_click",
  "arguments": {
    "ref": "e27"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_type`
**Syntax:**
```json
{
  "name": "pinchtab_type",
  "arguments": {
    "ref": "e23",
    "text": "search query"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_press`
**Syntax:**
```json
{
  "name": "pinchtab_press",
  "arguments": {
    "key": "Enter"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_submit`
**Syntax:**
```json
{
  "name": "pinchtab_submit",
  "arguments": {
    "ref": "e27"
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_scroll`
**Syntax:**
```json
{
  "name": "pinchtab_scroll",
  "arguments": {
    "direction": "down",
    "amount": 500
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_wait`
**Syntax:**
```json
{
  "name": "pinchtab_wait",
  "arguments": {
    "ms": 2000
  }
}
```
**Output:**
```json
{"success": true}
```

#### Tool: `pinchtab_get_snapshot`
**Syntax:**
```json
{
  "name": "pinchtab_get_snapshot",
  "arguments": {}
}
```
**Output:**
```json
{
  "count": 30,
  "nodes": [
    {"ref": "e23", "role": "combobox", "name": "Search", "focused": true},
    {"ref": "e27", "role": "button", "name": "Google Search"}
  ]
}
```

#### Tool: `pinchtab_mark_complete`
**Syntax:**
```json
{
  "name": "pinchtab_mark_complete",
  "arguments": {
    "message": "Search results loaded successfully"
  }
}
```
**Output:**
```json
{"success": true}
```

---

### 3. DESKTOP AGENT Tools (Unified Computer Control)

**File:** `packages/aria-agent/src/agents/desktop/desktop.tools.ts`

#### Tool: `computer`
**Syntax (Click):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "click",
    "x": 500,
    "y": 300
  }
}
```

**Syntax (Type):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "type",
    "text": "Hello World"
  }
}
```

**Syntax (Paste - Faster):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "paste",
    "text": "Long text content..."
  }
}
```

**Syntax (Key Press):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "key",
    "text": "ctrl+c"
  }
}
```

**Syntax (Scroll):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "scroll",
    "direction": "down",
    "amount": 3
  }
}
```

**Syntax (Open Application):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "application",
    "application": "chromium"
  }
}
```

**Syntax (Terminal Command):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "terminal_command",
    "command": "ls -la"
  }
}
```

**Syntax (Screenshot):**
```json
{
  "name": "computer",
  "arguments": {
    "action": "screenshot"
  }
}
```

**Output (All Actions):**
```json
{
  "success": true,
  "message": "Action completed",
  "screenshot": "base64_image_data"
}
```

#### Tool: `set_task_status`
**Syntax:**
```json
{
  "name": "set_task_status",
  "arguments": {
    "status": "completed",
    "message": "Chrome opened successfully"
  }
}
```
**Output:**
```json
{
  "success": true,
  "status": "completed"
}
```

---

### 4. BYTEZ Tools (Anthropic Native Format)

**File:** `packages/aria-agent/src/bytez/bytez.service.ts`

These tools use `input_schema` instead of `parameters` for Anthropic's native API:

#### Tool: `computer_move_mouse`
**Syntax:**
```json
{
  "name": "computer_move_mouse",
  "input": {
    "coordinates": {"x": 500, "y": 300}
  }
}
```

#### Tool: `computer_click_mouse`
**Syntax:**
```json
{
  "name": "computer_click_mouse",
  "input": {
    "coordinates": {"x": 500, "y": 300},
    "button": "left",
    "clickCount": 1
  }
}
```

#### Tool: `computer_type_text`
**Syntax:**
```json
{
  "name": "computer_type_text",
  "input": {
    "text": "Hello World",
    "isSensitive": false
  }
}
```

#### Tool: `computer_paste_text`
**Syntax:**
```json
{
  "name": "computer_paste_text",
  "input": {
    "text": "Long text content...",
    "isSensitive": false
  }
}
```

#### Tool: `computer_type_keys`
**Syntax:**
```json
{
  "name": "computer_type_keys",
  "input": {
    "keys": ["Control", "c"]
  }
}
```

#### Tool: `computer_scroll`
**Syntax:**
```json
{
  "name": "computer_scroll",
  "input": {
    "coordinates": {"x": 500, "y": 300},
    "direction": "down",
    "scrollCount": 3
  }
}
```

#### Tool: `computer_application`
**Syntax:**
```json
{
  "name": "computer_application",
  "input": {
    "application": "chromium"
  }
}
```

#### Tool: `computer_screenshot`
**Syntax:**
```json
{
  "name": "computer_screenshot",
  "input": {}
}
```

**Output (All Bytez Tools):**
```json
{
  "type": "tool_result",
  "content": [
    {
      "type": "image",
      "source": {
        "type": "base64",
        "media_type": "image/png",
        "data": "base64_screenshot_data"
      }
    }
  ]
}
```

---

### Tool Execution Summary

| Agent | Tool Count | Parameter Style | Completion Method |
|-------|-----------|----------------|-------------------|
| **ORCHESTRATOR** | 3 | `arguments` | N/A (planning only) |
| **WEB** | 15 | `arguments` | `pinchtab_mark_complete` tool |
| **DESKTOP** | 2 | `arguments` | `set_task_status` tool |
| **BYTEZ** | 17 | `input` | `set_task_status` tool |

### Orchestrator Tools (Workflow Discovery)

```typescript
// File: packages/aria-agent/src/groq/workflow.tools.ts

[
  {
    name: "list_workflows",
    description: "List all available pre-built workflows",
    parameters: {}
  },
  {
    name: "read_workflow",
    description: "Get detailed metadata for a workflow",
    parameters: {
      name: "string" // e.g., "google-search"
    }
  },
  {
    name: "use_workflow",
    description: "Include workflow in execution plan",
    parameters: {
      name: "string",
      variables: "object" // Key-value pairs
    }
  }
]
```

### Web Agent Tools (PinchTab)

```typescript
// File: packages/aria-agent/src/groq/pinchtab.tools.ts

[
  {
    name: "pinchtab_navigate",
    parameters: { url: "string" }
  },
  {
    name: "pinchtab_get_snapshot",
    parameters: {} // Returns interactive elements with refs
  },
  {
    name: "pinchtab_click",
    parameters: { ref: "string" } // Element ref from snapshot
  },
  {
    name: "pinchtab_type",
    parameters: { ref: "string", text: "string" }
  },
  {
    name: "pinchtab_press",
    parameters: { key: "string" } // Enter, Tab, Escape, etc.
  },
  {
    name: "pinchtab_wait",
    parameters: { ms: "number" } // Max 5000ms
  },
  {
    name: "pinchtab_scroll",
    parameters: { direction: "up|down|left|right", amount: "number" }
  },
  {
    name: "pinchtab_mark_complete",
    parameters: { message: "string" }
  }
]
```

### Desktop Agent Tools (Unified Computer Tool)

```typescript
// File: packages/aria-agent/src/agent/agent.tools.ts

[
  {
    name: "computer",
    description: "Unified desktop action tool",
    parameters: {
      action: "click|double_click|right_click|type|paste|key|scroll|screenshot|application|terminal_command",
      
      // For clicks:
      x: "number",
      y: "number",
      
      // For type/paste:
      text: "string",
      
      // For key presses:
      key: "string", // e.g., "Return", "ctrl+c", "Escape"
      
      // For application:
      application: "chromium|gmail|vscode|terminal|thunar|mousepad|desktop",
      
      // For terminal_command:
      command: "string"
    }
  },
  {
    name: "set_task_status",
    parameters: {
      status: "completed|failed",
      message: "string"
    }
  }
]
```

**Example Desktop Tool Calls:**

```json
// Click at coordinates
{"name": "computer", "arguments": {"action": "click", "x": 500, "y": 300}}

// Type text (character by character - slow)
{"name": "computer", "arguments": {"action": "type", "text": "Hello World"}}

// Paste text (preferred - fast)
{"name": "computer", "arguments": {"action": "paste", "text": "Hello World"}}

// Press key combination
{"name": "computer", "arguments": {"action": "key", "key": "ctrl+c"}}

// Open application
{"name": "computer", "arguments": {"action": "application", "application": "chromium"}}

// Run terminal command
{"name": "computer", "arguments": {"action": "terminal_command", "command": "ls -la"}}

// Mark step complete
{"name": "set_task_status", "arguments": {"status": "completed", "message": "Task done"}}
```

---

## Orchestration Pipeline

### Phase 1: CLARIFICATION

**Agent:** CLARIFIER  
**File:** `packages/aria-agent/src/agents/clarifier/clarifier.agent.ts`

**Input:**
```typescript
{
  userInput: string // Raw user task description
}
```

**Output:**
```typescript
{
  original_input: string,
  clarified_goal: string,
  constraints: string[],
  assumptions: string[],
  task_type: "web" | "desktop" | "mixed",
  questions_asked: 0 | 1
}
```

**Context Sources:**
- System prompt from `system-prompts.config.ts`
- User input only (no previous context)

**Decision Point:**
- If `questions_asked > 0` → Status: `NEEDS_HELP`, pause, show question to user
- Else → Proceed to ORCHESTRATOR

**Frontend Display:** "Clarifying task..."

---

### Phase 2: PLANNING

**Agent:** ORCHESTRATOR  
**File:** `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Input:**
```typescript
{
  original_input: string,
  clarified_goal: string,
  constraints: string[],
  assumptions: string[],
  task_type: "web" | "desktop" | "mixed",
  questions_asked: 0
}
```

**Tools Available:**
- `list_workflows` - See available workflows
- `read_workflow` - Get workflow details
- `use_workflow` - Include workflow in plan

**Output:**
```typescript
{
  steps: ExecutionStep[],
  estimated_duration_minutes: number,
  complexity: "simple" | "moderate" | "complex"
}

interface ExecutionStep {
  id: string,                    // "step_1", "step_2"
  type: "web" | "desktop" | "workflow",
  description: string,           // "Navigate to Gmail"
  success_criteria: string,      // "Compose window visible"
  context?: string,              // Extra info for agent
  depends_on?: string[],         // Prerequisite step IDs
  
  // Workflow-specific (only when type === "workflow")
  workflow_name?: string,        // "google-search"
  workflow_vars?: Record<string, any>  // {query: "Python"}
}
```

**Context Sources:**
- System prompt (1261 lines with planning rules)
- Clarified goal from shared state
- Available workflows (via tool calls)

**Frontend Display:** "Creating execution plan..."

---

### Phase 3: EXECUTION (Per Step)

#### Scenario A: DESKTOP AGENT

**Agent:** DESKTOP  
**File:** `packages/aria-agent/src/agents/desktop/desktop.agent.ts`  
**Triggered When:** `step.type === "desktop"`

**Input:**
```typescript
{
  id: "step_1",
  type: "desktop",
  description: "Open terminal and run ls command",
  success_criteria: "Terminal shows directory listing",
  context: "Use terminal application"
}
```

**Iteration Loop (Max 20):**
```
1. Take screenshot (VNC localhost:9990)
2. Call PERCEPTION agent to analyze screenshot
3. Build decision prompt with:
   - Step description & success criteria
   - Perception analysis (active window, UI state, clickable elements)
   - Last action taken
   - Recovery strategy (if escalated)
   - Execution plan context (remaining steps)
4. Call LLM (Bytez Claude Sonnet or Groq Llama-4-Scout)
5. Parse tool call from response
6. Execute tool call (computer action)
7. Wait 1s for action to settle
8. Check if success criteria met
9. If not complete, repeat
```

**Tools Used:**
- `computer` with various actions (click, type, paste, key, application, terminal_command)
- `set_task_status` to mark complete/failed

**Output:**
```typescript
{
  action: string,              // Last action taken
  details: {
    iterations: number,
    completed: boolean
  },
  screenshot?: string,         // Base64 screenshot
  timestamp: string,
  tokensUsed: number,
  cost: number
}
```

**Context Sources:**
- System prompt (desktop control instructions)
- Execution plan step
- Action history from shared state
- Screenshot + PERCEPTION analysis
- Previous step results from shared state
- Recovery strategy (if escalated)

**Frontend Display:**
- VNC stream showing desktop
- "Executing step 1 of 5..."
- Real-time action log

---

#### Scenario B: WEB AGENT

**Agent:** WEB  
**File:** `packages/aria-agent/src/agents/web/web.agent.ts`  
**Triggered When:** `step.type === "web"`

**EAGER INITIALIZATION:**
- Browser instance launched IMMEDIATELY when WebAgent starts
- Instance metadata injected into system prompt
- Prevents duplicate browser launches

**Input:**
```typescript
{
  id: "step_2",
  type: "web",
  description: "Navigate to Gmail and click Compose",
  success_criteria: "Compose window is visible",
  context: "Use pinchtab_navigate then pinchtab_click"
}
```

**Iteration Loop (Max 20):**
```
1. Get page snapshot (PinchTab localhost:9867)
   - Returns interactive elements with refs (e.g., "e23", "e47")
2. Call PERCEPTION agent (every 2 iterations to save tokens)
3. Check if success criteria met (auto-completion)
4. Build decision prompt with:
   - Step description & success criteria
   - Page snapshot (elements with refs)
   - Perception analysis (optional)
   - Last action taken
   - Recovery strategy (if escalated)
   - Execution plan context
   - Browser instance metadata
5. Call LLM (Google Gemini 3 Flash)
6. Parse tool call from response
7. Execute tool call (PinchTab action)
8. Wait 1s for page to settle
9. If not complete, repeat
```

**Tools Used:**
- `pinchtab_navigate` - Go to URL
- `pinchtab_get_snapshot` - Get interactive elements
- `pinchtab_click` - Click element by ref
- `pinchtab_type` - Type text into input
- `pinchtab_press` - Press keyboard key
- `pinchtab_wait` - Wait milliseconds
- `pinchtab_scroll` - Scroll page
- `pinchtab_mark_complete` - Mark step done

**Output:**
```typescript
{
  action: string,
  details: {
    iterations: number,
    completed: boolean,
    downloads: string[]        // New downloaded files
  },
  url?: string,                // Current page URL
  elements?: string[],         // Element refs on page
  timestamp: string,
  tokensUsed: number,
  cost: number
}
```

**Context Sources:**
- System prompt (PinchTab instructions + browser metadata)
- Execution plan step
- Action history from shared state
- Page snapshot (structured DOM with refs)
- PERCEPTION analysis (every 2 iterations)
- Previous step results
- Recovery strategy (if escalated)
- Browser instance metadata (instanceId, tabs, status)

**Frontend Display:**
- "Navigating to website..."
- "Filling form..."
- Action log with timestamps

---

#### Scenario C: WORKFLOW EXECUTION

**Service:** WorkflowService  
**File:** `packages/aria-agent/src/services/workflow.service.ts`  
**Triggered When:** `step.type === "workflow"`

**Input:**
```typescript
{
  id: "step_3",
  type: "workflow",
  description: "Search Google for Python courses",
  success_criteria: "Search results returned",
  workflow_name: "google-search",
  workflow_vars: {
    query: "Python courses"
  }
}
```

**Available Workflows:**
- `google-search.workflow.ts` - Search Google and return results
- `take-screenshot.workflow.ts` - Capture browser screenshot
- `search-and-email.workflow.ts` - Search Google and email results

**Execution:**
```
1. Load workflow definition from workflows/ directory
2. Validate variables match workflow schema
3. Execute workflow steps sequentially
   - Each step can call WEB or DESKTOP agent
   - Workflow has its own timeout (e.g., 30s)
4. Return aggregated result
```

**Example Workflow (google-search):**
```typescript
// File: packages/aria-agent/workflows/google-search.workflow.ts

export const metadata: WorkflowMetadata = {
  name: 'google-search',
  description: 'Search Google for a query and return results',
  version: '1.0.0',
  timeout_ms: 30000,
  variables: [
    {
      name: 'query',
      type: 'string',
      required: true,
      description: 'Search query to execute on Google',
    },
  ],
};

export async function execute(
  variables: { query: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab } = services;
  const { query } = variables;

  // 1. Navigate to Google
  await pinchTab.navigate('https://www.google.com');
  await pinchTab.wait(2000);

  // 2. Get snapshot to find search box
  const snapshot = await pinchTab.snapshot('interactive');
  const searchBox = snapshot.elements.find(el => el.tag === 'textarea' && el.attributes?.name === 'q');

  // 3. Click search box
  await pinchTab.click(searchBox.ref);

  // 4. Type query
  await pinchTab.type(query, searchBox.ref);

  // 5. Press Enter
  await pinchTab.press('Enter');
  await pinchTab.wait(3000);

  // 6. Extract results
  const resultsSnapshot = await pinchTab.snapshot('interactive');
  const results = resultsSnapshot.elements
    .filter(el => el.role === 'heading' && el.text)
    .slice(0, 10)
    .map(el => el.text);

  return {
    success: true,
    message: `Google search completed for "${query}"`,
    data: { query, results, resultCount: results.length }
  };
}
```

**Output:**
```typescript
{
  success: boolean,
  message: string,
  data?: any,
  error?: string
}
```

**Frontend Display:** "Executing workflow: Google Search..."

---

### Phase 3.5: VERIFICATION (After Each Step)

**Agent:** VERIFIER  
**File:** `packages/aria-agent/src/agents/verifier/verifier.agent.ts`  
**Runs:** After EVERY action (20-30x per task)

**Input:**
```typescript
{
  action: string,              // Action taken
  details: object,             // Action details
  screenshot?: string,         // Screenshot if available
  url?: string,                // Current URL if web
  timestamp: string
}
```

**Output:**
```typescript
{
  action_succeeded: boolean,
  screen_changed: boolean,
  error_detected: boolean,
  error_message?: string,
  retry_recommended: boolean,
  confidence: number           // 0.0 to 1.0
}
```

**Context Sources:**
- System prompt (verification rules)
- Step success criteria
- Action result
- Screenshot (if available)

**Decision Point:**
- If `action_succeeded: true` → Next step
- If `action_succeeded: false` → Escalation strategy

**Frontend Display:** "Verifying step..."

---

### Escalation Strategy (On Failure)

**Level 1 (Attempt 1):** Retry same step with different approach  
**Level 2 (Attempt 2):** Call RECOVERY agent  
**Level 3 (Attempt 3):** ORCHESTRATOR replans entire task  
**Level 4 (Attempt 4):** Task fails, user notified  

#### RECOVERY AGENT (L2)

**Agent:** RECOVERY  
**File:** `packages/aria-agent/src/agents/recovery/recovery.agent.ts`

**Input:**
```typescript
{
  id: "step_2",
  type: "web",
  description: "Click Send button",
  success_criteria: "Email sent confirmation visible",
  // ... failed step details
}
```

**Output:**
```typescript
{
  strategy: string,            // "Try alternative approach"
  avoid: string[],             // ["Clicking same button again"]
  approach: string,            // "Use keyboard shortcut instead"
  alternatives: [
    {
      strategy: string,
      score: number,           // 0.0 to 1.0
      reasoning: string
    }
  ]
}
```

**Context Sources:**
- System prompt (recovery strategies)
- Failure log from shared state
- Action history
- Previous recovery strategies

**Frontend Display:** "Attempting recovery..."

---

### Phase 4: REPORTING

**Agent:** REPORTER  
**File:** `packages/aria-agent/src/agents/reporter/reporter.agent.ts`  
**Runs:** 1x per task (at end)

**Input:**
```typescript
{
  // Full task state from Redis
  task_goal: ClarifiedTask,
  execution_plan: ExecutionPlan,
  action_history: ActionHistoryEntry[],
  failure_log: FailureLogEntry[],
  cost_tracking: CostEntry[]
}
```

**Output:**
```typescript
{
  summary: string,             // "Task completed successfully"
  steps_completed: number,
  results: object,             // Task-specific results
  recommendations: string[]    // ["suggestion1", "suggestion2"]
}
```

**Context Sources:**
- System prompt (reporting format)
- Complete task state from shared state
- All messages from database

**Frontend Display:**
- "Task completed!"
- Summary report
- Status: `COMPLETED`

---

## Shared State & Context

### Redis Namespace

**Format:** `task:{taskId}:{key}`  
**TTL:** 24 hours

### Key State Values

```typescript
{
  // Core task data
  "task_goal": ClarifiedTask,
  "execution_plan": ExecutionStep[],
  "current_step": string,                    // step ID
  "task_model": {name: string, provider: string},
  
  // Execution tracking
  "action_history": ActionHistoryEntry[],
  "failure_log": FailureLogEntry[],
  "downloaded_files": string[],
  
  // Status & errors
  "status": "running" | "completed" | "failed" | "needs_clarification",
  "error": {step: string, message: string, timestamp: string},
  
  // Recovery & replanning
  "recovery_strategy": RecoveryStrategy,
  "recovery_strategies_history": RecoveryStrategy[],
  "orchestrator_recommendation": "cancel" | "continue",
  "cancellation_reason": string,
  
  // Cost tracking
  "cost_tracking": {agent: string, tokens: number, cost: number}[],
  
  // Timestamps
  "start_time": ISO8601,
  "end_time": ISO8601
}
```

### ActionHistoryEntry

```typescript
{
  agent: "CLARIFIER" | "ORCHESTRATOR" | "WEB" | "DESKTOP" | "VERIFIER" | "RECOVERY" | "REPORTER",
  action: string,
  result: "success" | "failure",
  timestamp: ISO8601,
  details: object
}
```

---

## WebSocket Events

### TasksGateway

**File:** `packages/aria-agent/src/tasks/tasks.gateway.ts`

#### Client → Server

```typescript
join_task(taskId: string)
leave_task(taskId: string)
```

#### Server → Client (Room: `task_{taskId}`)

```typescript
// Task updates
task_updated(task: Task)

// New message
new_message(message: Message)

// Agent status
agent_status({
  status: string,
  activeAgent: string | null,
  timestamp: ISO8601
})

// Task status changed
task_status_changed({
  status: string,
  activeAgent: string | null
})

// Agent activity (screenshots, actions, reasoning)
agent_activity({
  type: "screenshot" | "action" | "reasoning" | "perception",
  data: any,
  timestamp: ISO8601
})

// Browser logs (detailed agent execution)
browser_log({
  taskId: string,
  type: "agent.start" | "agent.response" | "tool.call" | "tool.result" | "agent.complete" | "agent.error",
  timestamp: ISO8601,
  data: any
})
```

#### Global Events (All Clients)

```typescript
task_created(task: Task)
task_deleted(taskId: string)
```

---

## Frontend Components

### useAgentStatus Hook

**File:** `packages/aria-ui/src/hooks/useAgentStatus.ts`

```typescript
const { agentStatus, socket } = useAgentStatus(taskId);

// Returns:
{
  agentStatus: {
    status: string,
    activeAgent: string | null,
    timestamp: ISO8601
  },
  socket: Socket
}
```

### AgentStatusBadge

**File:** `packages/aria-ui/src/components/tasks/AgentStatusBadge.tsx`

Displays active agent with animated loader:
- CLARIFIER → "Clarifying"
- ORCHESTRATOR → "Planning"
- WEB → "Web Action"
- DESKTOP → "Desktop Action"
- PERCEPTION → "Analyzing Screen"
- VERIFIER → "Verifying"
- RECOVERY → "Recovering"
- REPORTER → "Reporting"

### AgentHandoffNotification

**File:** `packages/aria-ui/src/components/tasks/AgentHandoffNotification.tsx`

Animated toast notification on agent handoff:
- Shows: "Handing off to [Agent Name]"
- Auto-hides after 3 seconds

---

## COMPLETE FLOW EXAMPLE: Mixed Workflow Scenario

### User Input

```
"Search Google for Python courses, save the top 3 results to a file on desktop, then email me the file"
```

### Step-by-Step Execution

---

#### PHASE 1: CLARIFICATION

**Agent:** CLARIFIER  
**Model:** openai/gpt-oss-20b (Groq)

**Input:**
```json
{
  "userInput": "Search Google for Python courses, save the top 3 results to a file on desktop, then email me the file"
}
```

**LLM Call:**
- System Prompt: Clarification rules, JSON schema
- User Prompt: Raw user input
- Tools: None
- Response: JSON output

**Output:**
```json
{
  "original_input": "Search Google for Python courses, save the top 3 results to a file on desktop, then email me the file",
  "clarified_goal": "Search Google for 'Python courses', extract top 3 result titles, save to desktop file 'python_courses.txt', then email the file to user",
  "constraints": ["Must use Google search", "File must be on desktop", "Email must include file attachment"],
  "assumptions": ["User email is known", "Desktop has write permissions"],
  "task_type": "mixed",
  "questions_asked": 0
}
```

**Shared State Update:**
```typescript
await sharedState.set(taskId, 'task_goal', clarifiedTask);
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "clarifying",
    "activeAgent": "CLARIFIER",
    "timestamp": "2026-03-16T10:00:00Z"
  }
}
```

**Frontend Display:** "Clarifying task..."

**Tokens Used:** ~500 | **Cost:** $0.00005

---

#### PHASE 2: PLANNING

**Agent:** ORCHESTRATOR  
**Model:** anthropic/claude-opus-4-6 (Bytez)

**Input:**
```json
{
  "original_input": "Search Google for Python courses...",
  "clarified_goal": "Search Google for 'Python courses', extract top 3 result titles, save to desktop file 'python_courses.txt', then email the file to user",
  "task_type": "mixed",
  "constraints": [...],
  "assumptions": [...]
}
```

**LLM Call 1 (Workflow Discovery):**
- System Prompt: Planning rules + workflow integration
- User Prompt: Clarified goal
- Tools: `list_workflows`, `read_workflow`, `use_workflow`

**Tool Call 1:**
```json
{
  "name": "list_workflows",
  "arguments": {}
}
```

**Tool Result 1:**
```json
[
  {
    "name": "google-search",
    "description": "Search Google for a query and return results",
    "variables": ["query (string, required)"]
  },
  {
    "name": "take-screenshot",
    "description": "Capture browser screenshot",
    "variables": []
  },
  {
    "name": "search-and-email",
    "description": "Search Google and email results",
    "variables": ["query (string, required)", "email (string, required)"]
  }
]
```

**Tool Call 2:**
```json
{
  "name": "read_workflow",
  "arguments": {
    "name": "google-search"
  }
}
```

**Tool Result 2:**
```json
{
  "name": "google-search",
  "description": "Search Google for a query and return results",
  "version": "1.0.0",
  "timeout_ms": 30000,
  "variables": [
    {
      "name": "query",
      "type": "string",
      "required": true,
      "description": "Search query to execute on Google"
    }
  ]
}
```

**Tool Call 3:**
```json
{
  "name": "use_workflow",
  "arguments": {
    "name": "google-search",
    "variables": {
      "query": "Python courses"
    }
  }
}
```

**Tool Result 3:**
```json
{
  "success": true,
  "message": "Workflow 'google-search' will be executed with variables: {\"query\":\"Python courses\"}",
  "workflow_name": "google-search",
  "workflow_vars": {"query": "Python courses"}
}
```

**LLM Call 2 (Final Plan):**
- System Prompt: Same
- User Prompt: Same + tool results
- Tools: Same
- Response: JSON execution plan

**Output:**
```json
{
  "steps": [
    {
      "id": "step_1",
      "type": "workflow",
      "description": "Search Google for Python courses using pre-built workflow",
      "success_criteria": "Search results returned with at least 3 results",
      "workflow_name": "google-search",
      "workflow_vars": {"query": "Python courses"}
    },
    {
      "id": "step_2",
      "type": "desktop",
      "description": "Create file python_courses.txt on desktop with top 3 results",
      "success_criteria": "File exists on desktop with 3 course titles",
      "context": "Use terminal command: echo 'result1\\nresult2\\nresult3' > ~/Desktop/python_courses.txt",
      "depends_on": ["step_1"]
    },
    {
      "id": "step_3",
      "type": "web",
      "description": "Navigate to Gmail and compose new email",
      "success_criteria": "Compose window is visible",
      "context": "Use pinchtab_navigate to https://mail.google.com/mail/?view=cm"
    },
    {
      "id": "step_4",
      "type": "desktop",
      "description": "Attach python_courses.txt file to email",
      "success_criteria": "File attached to email",
      "context": "Click attach button, select file from desktop",
      "depends_on": ["step_2", "step_3"]
    },
    {
      "id": "step_5",
      "type": "web",
      "description": "Fill email recipient and send",
      "success_criteria": "Email sent confirmation visible",
      "context": "Type recipient email, click Send button",
      "depends_on": ["step_4"]
    }
  ],
  "estimated_duration_minutes": 3,
  "complexity": "moderate"
}
```

**Shared State Update:**
```typescript
await sharedState.set(taskId, 'execution_plan', executionPlan);
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "planning",
    "activeAgent": "ORCHESTRATOR",
    "timestamp": "2026-03-16T10:00:15Z"
  }
}
```

**Frontend Display:** "Creating execution plan..."

**Tokens Used:** ~3000 | **Cost:** $0.135

---

#### PHASE 3: EXECUTION

---

##### STEP 1: WORKFLOW EXECUTION (google-search)

**Service:** WorkflowService  
**Workflow:** google-search.workflow.ts

**Input:**
```json
{
  "id": "step_1",
  "type": "workflow",
  "workflow_name": "google-search",
  "workflow_vars": {"query": "Python courses"}
}
```

**Workflow Execution:**

```typescript
// 1. Navigate to Google
await pinchTab.navigate('https://www.google.com');
await pinchTab.wait(2000);

// 2. Get snapshot to find search box
const snapshot1 = await pinchTab.snapshot('interactive');
// Returns: {elements: [{ref: "e1", tag: "textarea", attributes: {name: "q"}}]}

// 3. Click search box
await pinchTab.click("e1");
await pinchTab.wait(500);

// 4. Type query
await pinchTab.type("Python courses", "e1");
await pinchTab.wait(1000);

// 5. Press Enter
await pinchTab.press("Enter");
await pinchTab.wait(3000);

// 6. Get results snapshot
const snapshot2 = await pinchTab.snapshot('interactive');
// Returns: {elements: [{role: "heading", text: "Learn Python - Codecademy"}, ...]}

// 7. Extract top 10 results
const results = snapshot2.elements
  .filter(el => el.role === 'heading' && el.text)
  .slice(0, 10)
  .map(el => el.text);
```

**Output:**
```json
{
  "success": true,
  "message": "Google search completed for 'Python courses'",
  "data": {
    "query": "Python courses",
    "results": [
      "Learn Python - Codecademy",
      "Python Tutorial - W3Schools",
      "Python for Beginners - Coursera",
      "Introduction to Python - edX",
      "Python Programming - Udemy",
      "Python Basics - Real Python",
      "Python Course - DataCamp",
      "Learn Python the Hard Way",
      "Python Crash Course - Book",
      "Python Fundamentals - Pluralsight"
    ],
    "resultCount": 10
  }
}
```

**Shared State Update:**
```typescript
await sharedState.appendToHistory(taskId, {
  agent: 'WORKFLOW',
  action: 'google-search',
  result: 'success',
  timestamp: '2026-03-16T10:00:45Z',
  details: {results: [...]}
});
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "executing",
    "activeAgent": "WORKFLOW",
    "timestamp": "2026-03-16T10:00:30Z"
  }
}
```

**Frontend Display:** "Executing workflow: Google Search..."

**Duration:** ~15 seconds

---

##### STEP 2: DESKTOP AGENT (Create File)

**Agent:** DESKTOP  
**Model:** anthropic/claude-sonnet-4-6 (Bytez)

**Input:**
```json
{
  "id": "step_2",
  "type": "desktop",
  "description": "Create file python_courses.txt on desktop with top 3 results",
  "success_criteria": "File exists on desktop with 3 course titles",
  "context": "Use terminal command",
  "depends_on": ["step_1"]
}
```

**Iteration 1:**

1. **Take Screenshot** (VNC localhost:9990)
   - Returns: Base64 screenshot of desktop

2. **Call PERCEPTION Agent**
   - Input: Screenshot
   - Output: `{active_window: "Desktop", ui_state: "Desktop with icons visible", clickable_elements: ["Terminal", "Files", "Chrome"]}`

3. **Build Decision Prompt:**
```
🎯 ULTIMATE GOAL: Complete all 5 steps to finish the task

**CURRENT STEP: step_2 (2/5)**
Description: Create file python_courses.txt on desktop with top 3 results
Success Criteria: File exists on desktop with 3 course titles

📋 Steps After This (DO NOT DO THESE YET):
  1. [WEB] Navigate to Gmail and compose new email
  2. [DESKTOP] Attach python_courses.txt file to email
  3. [WEB] Fill email recipient and send

⚠️  FOCUS ONLY ON CURRENT STEP - Do not perform future steps!
⚠️  Some future steps require Web Agent - you will hand off after completing this step!

**Current Step Details**:
- Description: Create file python_courses.txt on desktop with top 3 results
- Success Criteria: File exists on desktop with 3 course titles
- Iteration: 1/20
- Last Action: None

**What You See (Perception Analysis)**:
- Active Window: Desktop
- UI State: Desktop with icons visible
- Clickable Elements: Terminal, Files, Chrome
- Errors Visible: No
- Task Info: None

🔍 IMPORTANT: You also have the SCREENSHOT attached to this message. Look at it!

**Previous Step Results**:
Step 1 (workflow: google-search) returned:
{
  "results": [
    "Learn Python - Codecademy",
    "Python Tutorial - W3Schools",
    "Python for Beginners - Coursera",
    ...
  ]
}

Decide next action.
```

4. **LLM Call:**
   - System Prompt: Desktop control instructions
   - User Prompt: Above + screenshot
   - Tools: `computer`, `set_task_status`

5. **LLM Response:**
```json
{
  "type": "tool_use",
  "name": "computer",
  "input": {
    "action": "terminal_command",
    "command": "echo 'Learn Python - Codecademy\\nPython Tutorial - W3Schools\\nPython for Beginners - Coursera' > ~/Desktop/python_courses.txt"
  }
}
```

6. **Execute Tool Call:**
   - Run terminal command via VNC
   - Wait 1s for command to complete

7. **Iteration 2:**
   - Take screenshot again
   - PERCEPTION: `{ui_state: "Terminal command executed, file created"}`
   - LLM sees file created successfully
   - LLM Response:
```json
{
  "type": "tool_use",
  "name": "set_task_status",
  "input": {
    "status": "completed",
    "message": "File python_courses.txt created on desktop with top 3 Python course results"
  }
}
```

**Output:**
```json
{
  "action": "set_task_status",
  "details": {
    "status": "completed",
    "message": "File python_courses.txt created on desktop with top 3 Python course results"
  },
  "timestamp": "2026-03-16T10:01:00Z",
  "tokensUsed": 2500,
  "cost": 0.0225
}
```

**VERIFIER Check:**
```json
{
  "action_succeeded": true,
  "screen_changed": true,
  "error_detected": false,
  "retry_recommended": false,
  "confidence": 0.95
}
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "executing",
    "activeAgent": "DESKTOP",
    "timestamp": "2026-03-16T10:00:50Z"
  }
}
```

**Frontend Display:** "Executing step 2 of 5..." + VNC stream

**Tokens Used:** ~2500 | **Cost:** $0.0225

---

##### STEP 3: WEB AGENT (Navigate to Gmail)

**Agent:** WEB  
**Model:** gemini-3-flash-preview (Google)

**Input:**
```json
{
  "id": "step_3",
  "type": "web",
  "description": "Navigate to Gmail and compose new email",
  "success_criteria": "Compose window is visible",
  "context": "Use pinchtab_navigate to https://mail.google.com/mail/?view=cm"
}
```

**Browser Instance:** Already running (eager initialization)
- Instance ID: `aria-instance-12345`
- Status: active
- Mode: headed (visible)

**Iteration 1:**

1. **Get Page Snapshot:**
```json
{
  "url": "about:blank",
  "title": "New Tab",
  "elements": []
}
```

2. **Build Decision Prompt:**
```
🎯 ULTIMATE GOAL: Complete all 5 steps to finish the task

**CURRENT STEP: step_3 (3/5)**
Description: Navigate to Gmail and compose new email
Success Criteria: Compose window is visible

📋 Steps After This (DO NOT DO THESE YET):
  1. [DESKTOP] Attach python_courses.txt file to email
  2. [WEB] Fill email recipient and send

⚠️  FOCUS ONLY ON CURRENT STEP - Do not perform future steps!
⚠️  Some future steps require Desktop Agent - you will hand off after completing this step!

🌐 BROWSER INSTANCE (PRE-INITIALIZED):
✅ Instance: aria-instance-12345 (ACTIVE)
✅ Mode: HEADED
✅ Current Tab: tab-001
✅ Current URL: about:blank
✅ Page Title: New Tab

⚠️  CRITICAL: Browser is ALREADY RUNNING - DO NOT launch another instance!
✅ Use existing instance for all actions (navigate, click, type, etc.)

**Step**: Navigate to Gmail and compose new email
**Success Criteria**: Compose window is visible
**Iteration**: 1/20
**Last Action**: None

**Current Page Snapshot** (0 elements):
(empty page)

Decide the next action.
```

3. **LLM Call:**
   - System Prompt: PinchTab instructions + browser metadata
   - User Prompt: Above
   - Tools: PinchTab tools

4. **LLM Response:**
```json
{
  "type": "tool_use",
  "name": "pinchtab_navigate",
  "input": {
    "url": "https://mail.google.com/mail/?view=cm"
  }
}
```

5. **Execute Tool Call:**
   - Navigate to Gmail compose URL
   - Wait 1s for page to settle

6. **Iteration 2:**
   - Get snapshot: `{url: "https://mail.google.com/mail/?view=cm", elements: [{ref: "e10", role: "textbox", attributes: {placeholder: "To"}}, ...]}`
   - LLM sees compose window loaded
   - LLM Response:
```json
{
  "type": "tool_use",
  "name": "pinchtab_mark_complete",
  "input": {
    "message": "Gmail compose window is now visible and ready"
  }
}
```

**Output:**
```json
{
  "action": "pinchtab_mark_complete",
  "details": {
    "iterations": 2,
    "completed": true,
    "downloads": []
  },
  "url": "https://mail.google.com/mail/?view=cm",
  "elements": ["e10", "e11", "e12", ...],
  "timestamp": "2026-03-16T10:01:15Z",
  "tokensUsed": 1800,
  "cost": 0.0018
}
```

**VERIFIER Check:**
```json
{
  "action_succeeded": true,
  "screen_changed": true,
  "error_detected": false,
  "retry_recommended": false,
  "confidence": 0.98
}
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "executing",
    "activeAgent": "WEB",
    "timestamp": "2026-03-16T10:01:05Z"
  }
}
```

**Frontend Display:** "Navigating to Gmail..."

**Tokens Used:** ~1800 | **Cost:** $0.0018

---

##### STEP 4: DESKTOP AGENT (Attach File)

**Agent:** DESKTOP  
**Model:** anthropic/claude-sonnet-4-6 (Bytez)

**Input:**
```json
{
  "id": "step_4",
  "type": "desktop",
  "description": "Attach python_courses.txt file to email",
  "success_criteria": "File attached to email",
  "context": "Click attach button, select file from desktop",
  "depends_on": ["step_2", "step_3"]
}
```

**Iteration 1:**

1. **Take Screenshot** - Shows Gmail compose window in browser

2. **PERCEPTION:** `{active_window: "Chromium", ui_state: "Gmail compose window open", clickable_elements: ["Attach files button", "To field", "Subject field"]}`

3. **LLM Response:**
```json
{
  "type": "tool_use",
  "name": "computer",
  "input": {
    "action": "click",
    "x": 150,
    "y": 450
  }
}
```
(Clicks attach button)

4. **Iteration 2:**
   - Screenshot shows file picker dialog
   - LLM types file path:
```json
{
  "type": "tool_use",
  "name": "computer",
  "input": {
    "action": "paste",
    "text": "~/Desktop/python_courses.txt"
  }
}
```

5. **Iteration 3:**
   - LLM presses Enter to select file:
```json
{
  "type": "tool_use",
  "name": "computer",
  "input": {
    "action": "key",
    "key": "Return"
  }
}
```

6. **Iteration 4:**
   - Screenshot shows file attached
   - LLM marks complete:
```json
{
  "type": "tool_use",
  "name": "set_task_status",
  "input": {
    "status": "completed",
    "message": "File python_courses.txt successfully attached to email"
  }
}
```

**Output:**
```json
{
  "action": "set_task_status",
  "details": {
    "iterations": 4,
    "completed": true
  },
  "timestamp": "2026-03-16T10:01:35Z",
  "tokensUsed": 3200,
  "cost": 0.0288
}
```

**VERIFIER Check:**
```json
{
  "action_succeeded": true,
  "screen_changed": true,
  "error_detected": false,
  "retry_recommended": false,
  "confidence": 0.92
}
```

**Frontend Display:** "Attaching file..." + VNC stream

**Tokens Used:** ~3200 | **Cost:** $0.0288

---

##### STEP 5: WEB AGENT (Send Email)

**Agent:** WEB  
**Model:** gemini-3-flash-preview (Google)

**Input:**
```json
{
  "id": "step_5",
  "type": "web",
  "description": "Fill email recipient and send",
  "success_criteria": "Email sent confirmation visible",
  "context": "Type recipient email, click Send button",
  "depends_on": ["step_4"]
}
```

**Iteration 1:**

1. **Get Snapshot:**
```json
{
  "url": "https://mail.google.com/mail/?view=cm",
  "elements": [
    {"ref": "e10", "tag": "input", "attributes": {"placeholder": "To"}},
    {"ref": "e11", "tag": "input", "attributes": {"placeholder": "Subject"}},
    {"ref": "e12", "role": "button", "text": "Send"},
    {"ref": "e13", "text": "python_courses.txt (attached)"}
  ]
}
```

2. **LLM Response:**
```json
{
  "type": "tool_use",
  "name": "pinchtab_type",
  "input": {
    "ref": "e10",
    "text": "user@example.com"
  }
}
```

3. **Iteration 2:**
   - Type subject:
```json
{
  "type": "tool_use",
  "name": "pinchtab_type",
  "input": {
    "ref": "e11",
    "text": "Python Courses - Top 3 Results"
  }
}
```

4. **Iteration 3:**
   - Click Send button:
```json
{
  "type": "tool_use",
  "name": "pinchtab_click",
  "input": {
    "ref": "e12"
  }
}
```

5. **Iteration 4:**
   - Wait for confirmation:
```json
{
  "type": "tool_use",
  "name": "pinchtab_wait",
  "input": {
    "ms": 2000
  }
}
```

6. **Iteration 5:**
   - Get snapshot: `{elements: [{text: "Message sent"}]}`
   - LLM marks complete:
```json
{
  "type": "tool_use",
  "name": "pinchtab_mark_complete",
  "input": {
    "message": "Email sent successfully with python_courses.txt attachment"
  }
}
```

**Output:**
```json
{
  "action": "pinchtab_mark_complete",
  "details": {
    "iterations": 5,
    "completed": true,
    "downloads": []
  },
  "url": "https://mail.google.com/mail/",
  "timestamp": "2026-03-16T10:02:00Z",
  "tokensUsed": 2200,
  "cost": 0.0022
}
```

**VERIFIER Check:**
```json
{
  "action_succeeded": true,
  "screen_changed": true,
  "error_detected": false,
  "retry_recommended": false,
  "confidence": 0.96
}
```

**Frontend Display:** "Sending email..."

**Tokens Used:** ~2200 | **Cost:** $0.0022

---

#### PHASE 4: REPORTING

**Agent:** REPORTER  
**Model:** openai/gpt-oss-20b (Groq)

**Input:**
```json
{
  "task_goal": {
    "clarified_goal": "Search Google for 'Python courses', extract top 3 result titles, save to desktop file 'python_courses.txt', then email the file to user",
    "task_type": "mixed"
  },
  "execution_plan": {
    "steps": [...],
    "complexity": "moderate"
  },
  "action_history": [
    {"agent": "WORKFLOW", "action": "google-search", "result": "success"},
    {"agent": "DESKTOP", "action": "create_file", "result": "success"},
    {"agent": "WEB", "action": "navigate_gmail", "result": "success"},
    {"agent": "DESKTOP", "action": "attach_file", "result": "success"},
    {"agent": "WEB", "action": "send_email", "result": "success"}
  ],
  "failure_log": [],
  "cost_tracking": [
    {"agent": "CLARIFIER", "tokens": 500, "cost": 0.00005},
    {"agent": "ORCHESTRATOR", "tokens": 3000, "cost": 0.135},
    {"agent": "DESKTOP", "tokens": 5700, "cost": 0.0513},
    {"agent": "WEB", "tokens": 4000, "cost": 0.004},
    {"agent": "VERIFIER", "tokens": 2000, "cost": 0.0002}
  ]
}
```

**LLM Call:**
- System Prompt: Reporting format
- User Prompt: Full task state
- Tools: None

**Output:**
```json
{
  "summary": "Task completed successfully! I searched Google for Python courses, saved the top 3 results to a file on your desktop (python_courses.txt), and emailed the file to you at user@example.com.",
  "steps_completed": 5,
  "results": {
    "search_query": "Python courses",
    "results_found": 10,
    "top_3_saved": [
      "Learn Python - Codecademy",
      "Python Tutorial - W3Schools",
      "Python for Beginners - Coursera"
    ],
    "file_created": "~/Desktop/python_courses.txt",
    "email_sent_to": "user@example.com",
    "email_subject": "Python Courses - Top 3 Results"
  },
  "recommendations": [
    "The file python_courses.txt is saved on your desktop for future reference",
    "Check your email inbox for the attachment"
  ],
  "total_cost": "$0.1906",
  "total_tokens": 15200,
  "duration_seconds": 120
}
```

**Shared State Update:**
```typescript
await sharedState.set(taskId, 'status', 'completed');
await sharedState.set(taskId, 'end_time', new Date().toISOString());
```

**Database Update:**
```typescript
await tasksService.update(taskId, {
  status: TaskStatus.COMPLETED
});
```

**WebSocket Event:**
```json
{
  "event": "agent_status",
  "data": {
    "status": "completed",
    "activeAgent": null,
    "timestamp": "2026-03-16T10:02:15Z"
  }
}
```

**Frontend Display:**
- "Task completed!"
- Summary report
- Cost breakdown: $0.1906
- Duration: 2 minutes

**Tokens Used:** ~800 | **Cost:** $0.00008

---

## TOTAL TASK SUMMARY

**Duration:** 2 minutes 15 seconds  
**Total Tokens:** 15,200  
**Total Cost:** $0.1906  

**Agent Breakdown:**
- CLARIFIER: 500 tokens, $0.00005
- ORCHESTRATOR: 3000 tokens, $0.135
- WORKFLOW: 0 tokens (uses PinchTab directly)
- DESKTOP: 5700 tokens, $0.0513
- WEB: 4000 tokens, $0.004
- VERIFIER: 2000 tokens, $0.0002
- REPORTER: 800 tokens, $0.00008

**Steps Executed:**
1. ✅ Workflow (google-search) - 15s
2. ✅ Desktop (create file) - 15s
3. ✅ Web (navigate Gmail) - 10s
4. ✅ Desktop (attach file) - 20s
5. ✅ Web (send email) - 25s

**Failures:** 0  
**Escalations:** 0  
**Replans:** 0

---

## Scenario Matrix

| Scenario | Implemented? | Flow | Notes |
|----------|--------------|------|-------|
| **Desktop Only** | ✅ YES | CLARIFIER → ORCHESTRATOR → DESKTOP (loop) → VERIFIER → REPORTER | VNC-based, full tool suite |
| **Web Only** | ✅ YES | CLARIFIER → ORCHESTRATOR → WEB (loop) → VERIFIER → REPORTER | PinchTab-based, 15-20 loops |
| **Mixed (Web + Desktop)** | ✅ YES | CLARIFIER → ORCHESTRATOR → WEB/DESKTOP (interleaved) → VERIFIER → REPORTER | Sequential handoffs |
| **Workflow Found** | ✅ YES | ORCHESTRATOR uses `list_workflows` → `use_workflow` → WorkflowService executes | Pre-built automation |
| **Workflow Not Found** | ✅ YES | ORCHESTRATOR creates manual web/desktop steps | Falls back to agents |
| **Clarification Needed** | ✅ YES | CLARIFIER pauses → User answers → Auto-resumes | Single question only |
| **Failure + Recovery** | ✅ YES | VERIFIER fails → RECOVERY strategizes → Retry with new approach | L1-L4 escalation |
| **Failure + Replan** | ✅ YES | RECOVERY fails → ORCHESTRATOR replans entire task | L3 escalation |
| **Multi-turn Clarification** | ❌ NO | Only single question supported | Not implemented |
| **Multi-monitor Desktop** | ❌ NO | Single display only | Not implemented |
| **Multi-tab Web** | ❌ NO | Single tab per task | Not implemented |
| **Workflow Composition** | ❌ NO | No nested workflows | Not implemented |

---

## Unimplemented Features

### High Priority

- [ ] **Multi-turn clarification** - Multiple questions with context
- [ ] **Workflow composition** - Workflows calling other workflows
- [ ] **Dynamic model selection** - Choose model per task type
- [ ] **Cost optimization** - Cheaper model fallbacks
- [ ] **Advanced error recovery** - Human-in-the-loop

### Medium Priority

- [ ] **Multi-monitor desktop support** - Multiple displays
- [ ] **Multi-tab web management** - Browser tab orchestration
- [ ] **Full clipboard integration** - Copy/paste between agents
- [ ] **JavaScript execution** - Run JS in web agent
- [ ] **File download/upload handling** - Automated file management

### Low Priority

- [ ] **Workflow marketplace** - Share workflows
- [ ] **A/B testing models** - Compare model performance
- [ ] **Clarification timeout** - Auto-proceed after X minutes
- [ ] **Workflow versioning** - Version control for workflows
- [ ] **Advanced gesture recognition** - Complex mouse patterns

---

## Key Files Reference

### Frontend

| File | Purpose |
|------|---------|
| `packages/aria-ui/src/app/tasks/page.tsx` | Task creation UI |
| `packages/aria-ui/src/app/api/[[...path]]/route.ts` | API proxy to backend |
| `packages/aria-ui/src/hooks/useWebSocket.ts` | WebSocket connection |
| `packages/aria-ui/src/hooks/useAgentStatus.ts` | Agent status tracking |
| `packages/aria-ui/src/components/tasks/AgentStatusBadge.tsx` | Agent status display |
| `packages/aria-ui/src/components/tasks/AgentHandoffNotification.tsx` | Agent handoff toast |

### Backend - Core

| File | Purpose |
|------|---------|
| `packages/aria-agent/src/tasks/tasks.controller.ts` | HTTP endpoints |
| `packages/aria-agent/src/tasks/tasks.service.ts` | Task CRUD + lifecycle |
| `packages/aria-agent/src/tasks/tasks.gateway.ts` | WebSocket events |
| `packages/aria-agent/src/orchestration/orchestration.service.ts` | Multi-agent pipeline |
| `packages/aria-agent/src/shared-state/shared-state.service.ts` | Redis state management |

### Backend - Agents

| File | Purpose |
|------|---------|
| `packages/aria-agent/src/agents/clarifier/clarifier.agent.ts` | Q&A phase |
| `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts` | Planning phase |
| `packages/aria-agent/src/agents/web/web.agent.ts` | Browser automation |
| `packages/aria-agent/src/agents/desktop/desktop.agent.ts` | OS-level control |
| `packages/aria-agent/src/agents/perception/perception.agent.ts` | Screenshot analysis |
| `packages/aria-agent/src/agents/verifier/verifier.agent.ts` | Success validation |
| `packages/aria-agent/src/agents/recovery/recovery.agent.ts` | Failure recovery |
| `packages/aria-agent/src/agents/reporter/reporter.agent.ts` | Summary generation |

### Backend - Configuration

| File | Purpose |
|------|---------|
| `packages/aria-agent/src/config/agents.config.ts` | Agent model assignments |
| `packages/aria-agent/src/config/system-prompts.config.ts` | Agent system prompts |
| `packages/aria-agent/src/groq/groq.constants.ts` | Groq model list |
| `packages/aria-agent/src/bytez/bytez.constants.ts` | Bytez model list |
| `packages/aria-agent/src/google/google.constants.ts` | Google model list |

### Backend - Tools

| File | Purpose |
|------|---------|
| `packages/aria-agent/src/groq/workflow.tools.ts` | Workflow discovery tools |
| `packages/aria-agent/src/groq/pinchtab.tools.ts` | PinchTab browser tools |
| `packages/aria-agent/src/agent/agent.tools.ts` | Desktop computer tool |

### Backend - Services

| File | Purpose |
|------|---------|
| `packages/aria-agent/src/services/pinchtab.service.ts` | PinchTab API client |
| `packages/aria-agent/src/services/workflow.service.ts` | Workflow execution |
| `packages/aria-agent/src/groq/groq.service.ts` | Groq API client |
| `packages/aria-agent/src/bytez/bytez.service.ts` | Bytez API client |
| `packages/aria-agent/src/google/google.service.ts` | Google API client |

### Workflows

| File | Purpose |
|------|---------|
| `packages/aria-agent/workflows/google-search.workflow.ts` | Google search automation |
| `packages/aria-agent/workflows/take-screenshot.workflow.ts` | Screenshot capture |
| `packages/aria-agent/workflows/search-and-email.workflow.ts` | Search + email combo |

---

## Architecture Principles Summary

1. **Sequential Pipeline** - All agents run sequentially, no parallel execution
2. **EventEmitter2 for UI Only** - Used ONLY for WebSocket notifications
3. **Shared State via Redis** - All inter-agent communication through Redis
4. **Eager Browser Initialization** - WebAgent launches browser immediately
5. **Iteration Budgets** - Web/Desktop agents have 20 iterations max
6. **Tool Calling** - Web uses PinchTab tools, Desktop uses unified computer tool
7. **Escalation Levels** - L1 (retry), L2 (recovery), L3 (replan), L4 (fail)
8. **Model Selection** - User can select model per task
9. **Cost Tracking** - Every agent call logs tokens and cost
10. **Workflow Integration** - Orchestrator can discover and use pre-built workflows

---

## Workflow Display Steps

Workflow plan rendering now supports metadata-driven display breakdowns for workflow steps.

### Overview

- Workflows can define `summary` and `user_steps` in `packages/aria-agent/src/workflows/workflow.interface.ts`.
- `user_steps` is display-only metadata owned by each workflow and never controls runtime execution.
- The orchestrator enriches workflow plan steps with `display_steps` immediately after parsing the plan and before saving the execution plan or creating the plan message.

### Data Flow

1. Orchestrator creates an `ExecutionPlan`.
2. For each step with `type === "workflow"`, the orchestrator calls `WorkflowService.readWorkflow(workflow_name)`.
3. If workflow metadata includes `user_steps`, those are copied to `step.display_steps`.
4. If `user_steps` is missing, the orchestrator builds fallback `display_steps` from workflow metadata and provided variables.
5. The enriched plan is written to shared state and saved as the `AgentPlan` message shown in the UI.

### Key Rules

- `user_steps` is the workflow metadata field.
- `display_steps` is the execution-plan/UI field.
- Web and desktop steps are unchanged in v1.
- Execution agents ignore `display_steps`; only the UI uses it.
- If workflow metadata cannot be read, planning continues and the workflow step renders without nested display steps.

### UI Rendering

- `packages/aria-ui/src/components/messages/content/AgentActionContent.tsx` renders nested workflow breakdowns when `display_steps` is present.
- `packages/aria-ui/src/components/messages/content/EditablePlanContent.tsx` preserves and displays the same nested workflow breakdown read-only beneath the editable top-level step.
- The plan card now also shows `success_criteria` for each step.

### Workflow Metadata Rollout

The following workflows now define workflow-owned summaries and `user_steps`:

- `deep-research`
- `email-doc-deep-research`
- `opencode-request`
- `google-search`
- `send-email-n8n`

Legacy workflows without `user_steps` still receive a fallback display breakdown generated by the orchestrator.

---

**END OF DOCUMENTATION**

Generated: March 16, 2026  
Total Lines: ~1000+  
Coverage: Complete frontend-backend flow with exact tools, inputs, outputs, and context sources
