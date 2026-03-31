# ARIA Multi-Agent System - Complete Architecture

**Generated:** March 18, 2026  
**Last Updated:** March 31, 2026 - **Webhook-Based Workflow Completion System**
- **Feature:** Event-driven completion detection for OpenCode workflow
- **Problem Solved:** Eliminated slow, token-heavy AI vision polling for task completion
- **New Architecture:**
  - Webhook endpoint: `POST /workflows/completion/:taskId/:workflowName`
  - Progress endpoint: `POST /workflows/progress/:taskId/:workflowName`
  - EventEmitter2-based event system for workflow notifications
  - OpenCode receives curl command in prompt to notify when done
- **Files Added:**
  - `packages/aria-agent/src/workflows/workflow-completion.controller.ts` - Webhook receiver
  - `packages/aria-agent/workflows/helpers/webhook-completion.helper.ts` - Event-driven waiting
- **Files Modified:**
  - `packages/aria-agent/workflows/opencode-request.workflow.ts` - v3.0.0 with webhook support
  - `packages/aria-agent/src/workflows/workflows.module.ts` - Added completion controller
  - `packages/aria-agent/src/workflows/workflow.interface.ts` - Added eventEmitter to WorkflowServices
  - `packages/aria-agent/src/services/workflow.service.ts` - Inject EventEmitter2
- **Benefits:** Instant completion (no polling), zero token waste, exact timestamps, metadata support
- **Fallback:** Vision detection after 6 minutes if webhook not received

Previous updates: March 31, 2026 - WebSocket Real-Time Messaging Fix; Agent Prompt Improvements (CLARIFIER + ORCHESTRATOR); March 26, 2026 - OpenCode Migration + Document Generation Capabilities; Phase 0 Multi-Agent Improvements  
**Purpose:** Complete frontend-backend flow with exact tools, inputs, outputs, and context sources

---

## Document Generation Capabilities (March 26, 2026)

### Installed Tools & Libraries

The desktop environment now includes comprehensive document generation capabilities:

| Format | Language | Library | Installation | Use Case |
|--------|----------|---------|--------------|----------|
| .pptx | Node.js | pptxgenjs | `npm install -g pptxgenjs` | Create presentations programmatically |
| .docx | Node.js | docx | `npm install -g docx` | Generate Word documents with formatting |
| .docx | Python | python-docx | `pip3 install python-docx` | Alternative DOCX creation (more features) |
| .pdf | Python | reportlab | `pip3 install reportlab` | Generate PDFs with custom layouts |
| .xlsx | Python | openpyxl | `pip3 install openpyxl` | Create/edit Excel spreadsheets |

### Document Viewing Applications

| File Type | Viewer | Notes |
|-----------|--------|-------|
| .pdf | Chrome (native) | Opens PDFs directly in browser |
| .pptx | LibreOffice Impress | Full PowerPoint compatibility |
| .docx | LibreOffice Writer | Full Word compatibility |
| .xlsx | LibreOffice Calc | Full Excel compatibility |

### Additional Utilities

- **poppler-utils:** PDF manipulation tools (pdftoppm, pdftotext, pdfinfo)
- **pandoc:** Universal document converter (markdown ↔ docx ↔ pdf ↔ html)

### Desktop Integration

LibreOffice applications are available via:
- Desktop shortcuts (Writer, Calc, Impress)
- Application menu
- Command line (`libreoffice --writer`, `libreoffice --calc`, `libreoffice --impress`)

---

## OpenCode Integration (March 26, 2026)

### Migration from Kilocode to OpenCode

**File:** `packages/ariad/Dockerfile`

**Changes:**
- Removed: `npm install -g @kilocode/cli`
- Added: `npm install -g opencode-ai` + `curl -fsSL https://opencode.ai/install | bash`
- Dual installation method ensures OpenCode is available via both npm and native installer

**Workflow Updates:**
- **File:** `packages/aria-agent/workflows/opencode-request.workflow.ts` (renamed from kilocode-request)
- **Version:** 2.0.0 - Universal document and code generation workflow
- **Capabilities:** Single unified workflow that handles:
  - Websites & web apps (HTML/CSS/JS, React, Vue, etc.)
  - PowerPoint presentations (.pptx) via pptxgenjs
  - PDF documents via reportlab (Python)
  - Word documents (.docx) via python-docx or docx (Node.js)
  - Excel spreadsheets (.xlsx) via openpyxl (Python)
  - Python scripts, Node.js apps, and any coding task
- **AI Prompt Engineering:** Enhanced to detect output type (website vs document vs script) and add library-specific instructions
- **Webhook-Based Completion Detection (NEW - March 31, 2026):**
  - **MAJOR UPGRADE:** Replaced AI vision polling with event-driven webhook system
  - OpenCode now sends HTTP POST to backend when task completes
  - Workflow waits for webhook event via EventEmitter2 (no polling!)
  - **Primary Method:** Webhook notification (instant, 100% reliable)
  - **Fallback Method:** AI vision detection after 6 minutes (safety net)
  - **Timeout:** 8 minutes maximum (increased from 3 min)
  - **Benefits:**
    - Instant completion detection (no delay)
    - Zero token waste on screenshot analysis
    - Exact completion timestamp
    - Can pass metadata (files created, success/failure status)
    - Progress updates supported (optional)
  - **Architecture:**
    - New controller: `workflow-completion.controller.ts` handles webhooks
    - Helper: `webhook-completion.helper.ts` provides event-driven waiting
    - OpenCode receives curl command in prompt to notify completion
    - EventEmitter2 bridges webhook → workflow execution context
  - **Webhook Endpoints:**
    - `POST /workflows/completion/:taskId/:workflowName` - Mark complete
    - `POST /workflows/progress/:taskId/:workflowName` - Progress updates
  - **Prompt Instructions:** OpenCode receives exact curl command to run when done
  - **Vision Fallback:** If webhook not received after 6 min, falls back to old AI vision detection
- **Previous Intelligent Completion Detection (March 26, 2026 - DEPRECATED):**
  - Replaced fixed 30-second wait with AI-controlled adaptive loop
  - Maximum 3 minutes total wait time
  - AI analyzes screenshots to determine task progress (0-100%)
  - AI decides wait intervals (10-300 seconds, increased from 10-60) based on progress stage:
    - JUST_STARTED: 120-180 seconds (early stage, give it time)
    - IN_PROGRESS (0-30%): 90-120 seconds
    - IN_PROGRESS (30-70%): 60-90 seconds
    - IN_PROGRESS (70-95%): 30-60 seconds
    - COMPLETED: stops immediately
    - ERROR: stops immediately
  - Continuously monitors for completion indicators (success messages, idle state, errors)
  - Returns final screenshot when task completes or times out
- **Process Cleanup (NEW - March 26, 2026):**
  - Added Step 3: Kills any existing OpenCode processes before starting new one
  - Prevents multiple OpenCode instances from retry logic
  - Uses `pkill -f opencode || true` command in terminal
  - Critical fix for orchestration retry/replan scenarios
- **Desktop Directory Navigation (NEW - March 26, 2026):**
  - Added Step 4: Changes to Desktop directory before launching OpenCode
  - Uses `cd /home/user/Desktop/` command
  - Ensures all generated files save directly to Desktop (current working directory)
  - Eliminates need to specify full paths in prompts
  - More reliable file location for users
- **Launch Detection Improvements:**
  - Increased wait time between checks: 3s → 5s (more reliable detection)
  - AI vision analyzes terminal screenshots to detect OpenCode UI readiness
- **Prompt Engineering Improvements (NEW - March 26, 2026):**
  - Enhanced to always specify exact filename and Desktop save path
  - Includes explicit library names: pptxgenjs, reportlab, python-docx, openpyxl
  - Tells OpenCode to assume libraries are already installed (no checking/installing)
  - Provides example prompts for each document type (PPT, PDF, Word, Excel)
  - Improved formatting rules to prevent markdown in terminal output
- **Automatic Email Sending (NEW - March 26, 2026):**
  - Appends email instructions to every OpenCode prompt
  - Uses pre-installed `aria-mail` command for email sending
  - Automatically emails task summary with file attachments
  - No user interaction required - fully automated
  - Supports all file types: .pptx, .pdf, .docx, .xlsx, .html, .css, .js, etc.
  - Email parameters: --to, --subject, --body, --attachment, --cc, --bcc, --sender-name
  - Example: `aria-mail --to "user@example.com" --subject "Report Complete" --body "Summary" --attachment "/home/user/Desktop/report.pdf"`
- **Working Directory Change (NEW - March 26, 2026):**
  - Added Step 4: Changes to Desktop directory before running OpenCode
  - Command: `cd /home/user/Desktop/`
  - Ensures all files are created directly on Desktop
  - Simplifies file paths in OpenCode prompts
- **Extended Timeout:** Increased to 180 seconds (3 minutes) to accommodate document generation
- Updated metadata: `name: 'opencode-request'`, description lists all capabilities
- Updated function names: `waitForKilocodeLaunch` → `waitForOpenCodeLaunch`
- Added new function: `waitForTaskCompletion` - intelligent AI-driven completion detection
- Updated AI vision prompts to detect OpenCode UI instead of Kilocode
- Updated command typing: `kilocode` → `opencode`
- Updated all console logs and error messages

**Workflow Behavior:**
1. Opens terminal and maximizes to fullscreen
2. Kills any existing OpenCode processes (prevents duplicates from retries)
3. Changes to Desktop directory (`cd /home/user/Desktop/`) - ensures files save directly to Desktop
4. Types `opencode` command (character-by-character for human-like input)
5. Uses AI vision (Groq Llama Scout) to detect when OpenCode UI is ready
6. Enhances user prompt with technical requirements and library specifications
7. Submits prompt to OpenCode via clipboard paste (Ctrl+Shift+V)
8. Intelligent completion detection with AI-controlled wait times (10-300 seconds)
9. Returns screenshot of final state

---

## Phase 0 Implementation Details (March 26, 2026)

### Critical Improvements for Investor Demo Readiness

**Problem:** Multi-agent system was underperforming vs single-agent due to:
1. Orchestrator making single-shot LLM calls without reasoning between tool calls
2. Web Agent losing context each iteration (fresh conversation every time)
3. Recovery strategies generated but never used
4. Step results not passed between agents

**Solution Implemented:**

#### 1. Orchestrator ReAct Loop (HIGHEST PRIORITY)
**File:** `packages/aria-agent/src/agents/orchestrator/orchestrator.agent.ts`

**Changes:**
- Added `conversationMessages` array outside tool call loop to accumulate history
- Implemented ReAct pattern: THOUGHT → ACTION → OBSERVATION → THOUGHT
- Added MAX_ITERATIONS = 10 to prevent infinite loops
- Modified `callModelService` to accumulate messages instead of creating new arrays
- Added logging for each iteration showing thinking and tool results

**Impact:**
- Orchestrator now reasons about which workflows to read before reading them
- Can analyze tool results before generating final plan
- Iteratively refines understanding of task requirements
- Expected: +30% plan quality, +40% workflow utilization, +15% success rate

**Example Flow:**
```
Iteration 1:
  THOUGHT: "I need to see available workflows"
  ACTION: list_workflows()
  OBSERVATION: [google-search, send-email-n8n, ...]
  
Iteration 2:
  THOUGHT: "Task involves search and email. I should read both"
  ACTION: read_workflow('google-search')
  OBSERVATION: {requires: query, returns: results}
  
Iteration 3:
  THOUGHT: "Now check email workflow"
  ACTION: read_workflow('send-email-n8n')
  OBSERVATION: {requires: recipient, subject, body}
  
Iteration 4:
  THOUGHT: "Perfect! I can chain these workflows"
  ACTION: Generate execution plan
```

#### 2. Web Agent Conversation History
**File:** `packages/aria-agent/src/agents/web/web.agent.ts`

**Changes:**
- Moved `conversationMessages` array outside iteration loop (line ~243)
- Each iteration now appends to existing conversation instead of creating fresh array
- Added assistant response to conversation after each LLM call
- Added tool results to conversation as user messages with tool_result type
- Implemented conversation trimming (keep last 20 messages, preserve first 5)

**Impact:**
- Web Agent can learn from previous actions within same step
- Reduces token waste by not repeating context
- Agent remembers what it tried and what failed
- Expected: -15% token usage, +10% success rate, -20% execution time

**Before:**
```typescript
// BROKEN: Fresh array each iteration
response = await this.googleService.generateMessage(
  systemPrompt,
  [{ role: 'user', content: [{ type: 'text', text: prompt }] }],  // ← NEW!
  ...
);
```

**After:**
```typescript
// FIXED: Accumulated conversation
conversationMessages.push({ role: 'user', content: [...] });
response = await this.googleService.generateMessage(
  systemPrompt,
  conversationMessages,  // ← Accumulated history
  ...
);
conversationMessages.push({ role: 'assistant', content: response.contentBlocks });
```

#### 3. Recovery Strategy Integration
**File:** `packages/aria-agent/src/orchestration/orchestration.service.ts`

**Changes:**
- Recovery strategy now read from shared state on attempts 2+ (line ~553)
- Strategy passed to Web/Desktop agents via `execute(step, taskId, recoveryStrategy)` parameter
- Strategy limited to 200 characters to prevent context bloat
- Added logging when recovery strategy is used

**Impact:**
- Retry attempts now use different approach instead of repeating same failure
- Expected: +8% success rate, +30% retry efficiency

**Before:**
```typescript
// BROKEN: Strategy generated but never used
const recoveryResult = await this.recovery.strategize(step, taskId);
// ❌ Stored but not passed to agents
```

**After:**
```typescript
// FIXED: Strategy read and passed to agents
let recoveryStrategy = null;
if (attempts >= 2) {
  recoveryStrategy = await this.sharedState.get(taskId, 'recovery_strategy');
}
result = await this.webAgent.execute(step, taskId, recoveryStrategy);
```

#### 4. Step Results Passing
**File:** `packages/aria-agent/src/orchestration/orchestration.service.ts`

**Changes:**
- Added `step_results` array to shared state
- Each successful step saves result with stepId, agent, action, details
- Previous results (last 3) read before executing next step
- Results available for agents to coordinate multi-step workflows

**Impact:**
- Agents can see what previous agents accomplished
- Enables data passing between Web and Desktop agents
- Expected: +40% context preservation, -10% token usage

**Implementation:**
```typescript
// Save step result after success
await this.sharedState.appendToArray(taskId, 'step_results', {
  stepId: step.id,
  stepIndex: stepIndex + 1,
  agent: agentName,
  action: result.action,
  details: result.details,
  timestamp: new Date().toISOString(),
});

// Read previous results before next step
const previousResults = await this.sharedState.get(taskId, 'step_results') || [];
const recentResults = previousResults.slice(-3); // Last 3 only
```

#### 5. System Prompt Updates
**File:** `packages/aria-agent/src/config/system-prompts.config.ts`

**Changes:**
- Added ReAct pattern instructions to Orchestrator prompt
- Emphasized THOUGHT → ACTION → OBSERVATION cycle
- Added explicit requirement to reason between tool calls
- Included example ReAct flow for clarity

**Key Addition:**
```
## CRITICAL: YOU MUST THINK BETWEEN EVERY ACTION (ReAct Pattern)

You operate in a ReAct loop: THOUGHT → ACTION → OBSERVATION → THOUGHT → ACTION...

After EVERY tool call, you MUST:
1. Analyze the tool result
2. Reason about what you learned
3. Decide what to do next
4. Explain your reasoning in a THOUGHT step
```

#### 6. PinchTab Instance Initialization Wait Time (March 26, 2026)
**File:** `packages/aria-agent/src/services/pinchtab.service.ts`

**Problem:**
- PinchTab browser instances return HTTP 503 with "status: starting" during initialization
- Previous wait time of 10 seconds with 1-second polling was insufficient
- Tasks were failing because agents tried to use browser before it was ready
- Recovery agent had to retry multiple times, wasting tokens and time

**Changes:**
- Increased max wait time from 10s to 30s in `initInstance()` method
- Increased polling interval from 1s to 2s for more efficient checking
- Applied same fix to `startInstanceWithProfile()` method for profile-based instances
- Added detailed logging showing elapsed time and "status: starting" context
- Better error messages indicating when instance isn't ready

**Implementation:**
```typescript
// Before (10s max, 1s polling)
const maxWait = 10;
for (let i = 0; i < maxWait; i++) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Check if ready...
}

// After (30s max, 2s polling)
const maxWait = 30;
const pollInterval = 2000;
for (let i = 0; i < maxWait; i++) {
  await new Promise(resolve => setTimeout(resolve, pollInterval));
  const elapsed = (i + 1) * pollInterval / 1000;
  this.logger.debug(`Instance not ready yet (${elapsed}s elapsed, status may be "starting")...`);
  // Check if ready...
}
```

**Impact:**
- Eliminates HTTP 503 errors during browser initialization
- Reduces need for recovery agent retries on web tasks
- Expected: +5% success rate, -10% execution time, -8% token usage on web tasks
- More reliable browser automation, especially on slower systems or cold starts

**Testing:**
- Verified with "search iPhone price on Google" task
- Browser now consistently ready before first navigation attempt
- No more 503 errors in logs during instance startup

### Expected Metrics Improvement

| Metric | Before Phase 0 | After Phase 0 | Target (Phase 1-3) |
|--------|----------------|---------------|-------------------|
| **Success Rate** | 65% | 81% (+16%) | 87% |
| **Tokens/Task** | 43,000 | 34,400 (-20%) | 16,450 |
| **Execution Time** | 120s | 84s (-30%) | 41s |
| **Cost/Task** | $0.86 | $0.69 (-20%) | $0.33 |
| **Plan Quality** | 70% | 100% (+30%) | 100% |
| **Workflow Utilization** | 40% | 80% (+40%) | 95% |

### Testing Recommendations

**Unit Tests:**
- Orchestrator: Verify ReAct loop iterations, conversation history accumulation
- Web Agent: Verify conversation history persists across iterations
- Orchestration: Verify recovery strategy injection, step results passing

**Integration Tests:**
- Multi-step workflow: Verify step results passed between agents
- Recovery flow: Verify recovery strategy used on retry
- Workflow chaining: Verify Orchestrator reasons about workflow combinations

**E2E Demo Tasks:**
1. "Search for AI news and save to file" - Tests multi-agent coordination
2. "Create a report from website data" - Tests recovery and step results passing
3. "Email me the latest tech news" - Tests workflow chaining (search + email)

---

## Quick Navigation

- [Agent Registry](#agent-registry) - All 9 agents with models and tools
- [Complete Flow Example](#complete-flow-example) - Mixed workflow scenario
- [Tool Definitions](#tool-definitions) - Exact tool schemas
- [Orchestration Pipeline](#orchestration-pipeline) - Step-by-step execution
- [Scenarios](#scenarios) - Desktop, Web, Mixed, Workflow

---

## Agent Registry

| Agent | Model | Provider | Runs | User-Selectable | Purpose |
|-------|-------|----------|------|-----------------|---------|
| **CLARIFIER** | openai/gpt-oss-20b | Groq | 1x | ❌ | Q&A (0-6 questions), user waiting |
| **ORCHESTRATOR** | anthropic/claude-opus-4-6 | Bytez | 2-3x | ✅ | Planning, brain |
| **WEB** | gemini-3-flash-preview | Google | 15-20x | ❌ | Browser automation |
| **DESKTOP** | anthropic/claude-sonnet-4-6 | Bytez | Variable | ✅ | OS-level control |
| **WORKFLOW** | openai/gpt-oss-20b | Groq | Per workflow step | ❌ | Pre-built workflow execution |
| **PERCEPTION** | meta-llama/llama-4-scout-17b | Groq | Every action | ❌ | Vision/screenshot |
| **VERIFIER** | openai/gpt-oss-20b | Groq | 20-30x | ❌ | Success validation |
| **RECOVERY** | anthropic/claude-sonnet-4-6 | Bytez | On escalation | ❌ | Failure recovery |
| **REPORTER** | openai/gpt-oss-20b | Groq | 1x | ❌ | Summary generation |

---


## Tool Definitions

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

### Web Agent Tools (PinchTab) - 30 Tools Total

```typescript
// File: packages/aria-agent/src/groq/pinchtab.tools.ts

// ============================================================================
// INSTANCE MANAGEMENT (4 tools)
// ============================================================================
[
  {
    name: "pinchtab_health",
    description: "Check if PinchTab service is available and healthy",
    parameters: {}
  },
  {
    name: "pinchtab_launch_instance",
    description: "Launch a new browser instance (LEGACY - use profiles instead)",
    parameters: { 
      name: "string",           // Instance name
      mode: "headed|headless"   // headed = visible in VNC
    }
  },
  {
    name: "pinchtab_list_instances",
    description: "List all browser instances with their IDs and status",
    parameters: {}
  },
  {
    name: "pinchtab_stop_instance",
    description: "Stop and close a browser instance",
    parameters: { 
      instanceId: "string" 
    }
  },

  // ============================================================================
  // PROFILE MANAGEMENT (6 tools) - SESSION PERSISTENCE
  // ============================================================================
  {
    name: "pinchtab_create_profile",
    description: "Create a named persistent profile for session persistence (cookies, localStorage, etc.)",
    parameters: {
      name: "string",           // Profile name (e.g., "gmail-profile")
      description: "string"     // Optional description
    }
  },
  {
    name: "pinchtab_list_profiles",
    description: "List all saved persistent profiles with their names and running status",
    parameters: {}
  },
  {
    name: "pinchtab_start_with_profile",
    description: "Start a browser instance bound to a specific profileId (enables session persistence)",
    parameters: {
      profileId: "string",      // Profile ID from create_profile
      mode: "headed|headless"
    }
  },
  {
    name: "pinchtab_check_profile",
    description: "Check if a profile has a running instance",
    parameters: {
      profileId: "string"
    }
  },
  {
    name: "pinchtab_get_profile",
    description: "Get details about a specific profile by ID or name",
    parameters: {
      idOrName: "string"        // Profile ID or name
    }
  },
  {
    name: "pinchtab_stop_by_profile",
    description: "Stop instance by profile ID (preserves profile data)",
    parameters: {
      profileId: "string"
    }
  },

  // ============================================================================
  // NAVIGATION (2 tools)
  // ============================================================================
  {
    name: "pinchtab_navigate",
    description: "Navigate to a URL in the browser (opens a new tab)",
    parameters: { 
      url: "string"             // Must include protocol (https://)
    }
  },
  {
    name: "pinchtab_switch_tab",
    description: "Switch to a different tab by its ID",
    parameters: { 
      tabId: "string" 
    }
  },

  // ============================================================================
  // TAB MANAGEMENT (1 tool)
  // ============================================================================
  {
    name: "pinchtab_list_tabs",
    description: "List all open tabs in the current or specified instance",
    parameters: {
      instanceId: "string"      // Optional, uses current instance if not provided
    }
  },

  // ============================================================================
  // ACTIONS (9 tools)
  // ============================================================================
  {
    name: "pinchtab_click",
    description: "Click on an element in the browser by its reference ID",
    parameters: { 
      ref: "string"             // Element ref from snapshot (e.g., "e1", "e42")
    }
  },
  {
    name: "pinchtab_type",
    description: "Type text into an element (WORKS - use this instead of fill)",
    parameters: { 
      ref: "string",            // Element reference ID
      text: "string"            // Text to type
    }
  },
  {
    name: "pinchtab_press",
    description: "Press a keyboard key or key combination",
    parameters: { 
      key: "string"             // e.g., "Enter", "Escape", "Tab", "Ctrl+C"
    }
  },
  {
    name: "pinchtab_submit",
    description: "Submit a form by clicking its submit button",
    parameters: { 
      ref: "string"             // Submit button reference
    }
  },
  {
    name: "pinchtab_scroll",
    description: "Scroll the page up or down",
    parameters: { 
      direction: "up|down",
      amount: "number"          // Default: 500 pixels
    }
  },
  {
    name: "pinchtab_hover",
    description: "Hover over an element to reveal tooltips or menus",
    parameters: { 
      ref: "string"             // Element reference from snapshot
    }
  },
  {
    name: "pinchtab_focus",
    description: "Focus an element (useful for inputs before typing)",
    parameters: { 
      ref: "string"             // Element reference from snapshot
    }
  },
  {
    name: "pinchtab_select",
    description: "Select a dropdown option by value",
    parameters: { 
      ref: "string",            // Select element reference
      value: "string"           // Option value to select
    }
  },
  {
    name: "pinchtab_wait",
    description: "Wait for a specified duration (use sparingly)",
    parameters: { 
      ms: "number"              // Milliseconds to wait (max: 5000)
    }
  },

  // ============================================================================
  // READ OPERATIONS (5 tools)
  // ============================================================================
  {
    name: "pinchtab_get_snapshot",
    description: "Get the current page snapshot with element references and text content",
    parameters: {}              // Returns interactive elements with refs
  },
  {
    name: "pinchtab_get_text",
    description: "Extract full page text (token-efficient, ~800 tokens vs 10k for screenshot)",
    parameters: {}
  },
  {
    name: "pinchtab_screenshot",
    description: "Take a screenshot of the current page",
    parameters: {}
  },
  {
    name: "pinchtab_eval",
    description: "Run JavaScript in the page context (e.g., document.cookie, localStorage.getItem())",
    parameters: {
      script: "string"          // JavaScript code to execute
    }
  },
  {
    name: "pinchtab_find",
    description: "Find elements by text or selector",
    parameters: {
      query: "string"           // Search query (text or CSS selector)
    }
  },

  // ============================================================================
  // WORKFLOW (1 tool)
  // ============================================================================
  {
    name: "pinchtab_mark_complete",
    description: "Mark the current step as completed",
    parameters: { 
      message: "string"         // Brief description of what was accomplished
    }
  }
]
```

**PinchTab Tool Categories:**
- **Instance Management:** 4 tools (health, launch, list, stop)
- **Profile Management:** 6 tools (create, list, start, check, get, stop) - **NEW!**
- **Navigation:** 2 tools (navigate, switch_tab)
- **Tab Management:** 1 tool (list_tabs)
- **Actions:** 9 tools (click, type, press, submit, scroll, hover, focus, select, wait)
- **Read Operations:** 5 tools (snapshot, get_text, screenshot, eval, find)
- **Workflow:** 1 tool (mark_complete)

**Total:** 30 PinchTab tools (15 new, 15 existing)

**Key Updates (March 2026):**
- ✅ **Profile-based session persistence** - Cookies and localStorage persist across restarts
- ✅ **Endpoint correction** - `/instances/launch` → `/instances/start`
- ✅ **New actions** - hover, focus, select for advanced interactions
- ✅ **New read operations** - get_text, screenshot, eval, find for better page analysis
- ⚠️ **Note:** `/eval` endpoint not available in PinchTab 0.8.3 (returns 404)

**Profile Persistence Example:**
```typescript
// 1. Create persistent profile (once)
const profile = await pinchtab_create_profile({
  name: "gmail-profile",
  description: "Profile for Gmail automation"
});

// 2. Start instance with profile
await pinchtab_start_with_profile({
  profileId: profile.id,
  mode: "headed"
});

// 3. Login to Gmail (cookies saved to profile)
await pinchtab_navigate({ url: "https://gmail.com" });
// ... perform login ...

// 4. Stop instance (profile persists)
await pinchtab_stop_by_profile({ profileId: profile.id });

// 5. Later: restart with SAME profile
await pinchtab_start_with_profile({
  profileId: profile.id,
  mode: "headed"
});

// 6. Navigate to Gmail - STILL LOGGED IN! ✅
await pinchtab_navigate({ url: "https://gmail.com" });
```

**⭐ MASTER PROFILE (RECOMMENDED):**

The system has a pre-configured master profile with all necessary logins already set up:

```bash
# Profile Details
Profile ID: prof_fc613b4d
Profile Name: master-profile
Status: Pre-configured with all logins (Gmail, GitHub, etc.)

# Usage (RECOMMENDED for all tasks)
curl -X POST http://localhost:9867/instances/start \
  -H "Content-Type: application/json" \
  -d '{"profileId": "prof_fc613b4d", "mode": "headed"}'
```

**Why Use Master Profile:**
- ✅ All authentication already completed (Gmail, GitHub, social media, etc.)
- ✅ No need to handle 2FA or login flows
- ✅ Cookies and localStorage pre-populated
- ✅ Faster task execution (skip login steps)
- ✅ Consistent session state across tasks

**When to Use Master Profile:**
- Any task requiring authenticated access to web services
- Email automation (Gmail, Outlook)
- Social media posting (Twitter, LinkedIn)
- GitHub operations (pull requests, issues)
- Any workflow that would normally require login

**When to Create New Profile:**
- Testing different user accounts
- Isolated testing environments
- Multi-account scenarios
- Privacy-sensitive operations

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
```

---

### Workflow Agent (No Tools - Direct Execution)

```typescript
// File: packages/aria-agent/src/agents/workflow/workflow.agent.ts

// The Workflow Agent does NOT use LLM tools
// It receives ExecutionStep with workflow_name and workflow_vars
// Then directly calls WorkflowService.runWorkflow()

interface WorkflowAgentInput {
  type: "workflow";
  workflow_name: string;           // e.g., "google-search"
  workflow_vars: Record<string, any>;  // e.g., {query: "AI news"}
  description: string;
  success_criteria: string;
}

// Workflow Agent responsibilities:
// 1. Receive workflow assignment from Orchestrator
// 2. Load workflow metadata via WorkflowService.readWorkflow()
// 3. Validate and fill required variables from context/shared state
// 4. Execute workflow via WorkflowService.runWorkflow()
// 5. Return result to Orchestrator

// Variable filling strategy:
// - Use provided workflow_vars first
// - Try to fill missing vars from shared state (task:{taskId}:{varName})
// - Try to extract from task_goal in shared state
// - Use default values from workflow metadata
// - Throw error if required var is missing and cannot be filled
```

**Example Workflow Execution:**

```typescript
// Orchestrator creates workflow step:
{
  id: "step_1",
  type: "workflow",
  workflow_name: "google-search",
  workflow_vars: {
    query: "Python courses",
    maxResults: 5
  },
  description: "Search Google for Python courses",
  success_criteria: "Workflow returns search results successfully"
}

// Workflow Agent:
// 1. Loads "google-search" workflow metadata
// 2. Validates variables: query ✓, maxResults ✓
// 3. Calls WorkflowService.runWorkflow("google-search", {query: "Python courses", maxResults: 5}, taskId)
// 4. Returns result: {success: true, data: {results: [...]}}
```

**Workflow Agent vs Direct Workflow Execution:**

Before (Orchestrator executed workflows directly):
```typescript
// ❌ OLD: Orchestrator called WorkflowService directly
const result = await this.workflowService.runWorkflow(name, vars, taskId);
```

After (Workflow Agent handles execution):
```typescript
// ✅ NEW: Orchestrator assigns to Workflow Agent
const result = await this.workflowAgent.run(step, taskId);
// Workflow Agent internally calls WorkflowService
```

**Benefits:**
- Consistent agent interface (all agents implement BaseAgent)
- Centralized workflow execution logic
- Better logging and error handling
- Easier to add workflow-specific features (caching, retries, etc.)
- Cleaner separation of concerns (Orchestrator plans, Workflow Agent executes)

---

## Workflows System - Complete Guide

### What are Workflows?

Workflows are pre-built, reusable automation scripts that provide:
- **TypeScript-based** - Full type safety and IDE support
- **Dynamically discovered** - Just add a file to `workflows/`, no code changes needed
- **Compiled execution** - Server runs compiled `.js` from `dist/workflows/`
- **Composable** - Workflows can call other workflows
- **Tool-rich** - Access to 30 PinchTab tools + 18 Desktop tools

### Workflow File Structure

Every workflow file (`*.workflow.ts`) must export two things:

#### 1. Metadata (Required)

```typescript
import { WorkflowMetadata } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'workflow-name',              // Unique identifier (kebab-case)
  description: 'What this workflow does',
  version: '1.0.0',                   // Semantic versioning
  timeout_ms: 30000,                  // Max execution time (milliseconds)
  variables: [
    {
      name: 'variableName',
      type: 'string',                 // 'string' | 'number' | 'boolean' | 'object'
      required: true,
      description: 'What this variable is for',
      default: 'optional default'     // Only for non-required variables
    }
  ]
};
```

#### 2. Execute Function (Required)

```typescript
import { WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export async function execute(
  variables: { variableName: string },
  services: WorkflowServices
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  
  try {
    // Your automation logic here
    
    return {
      success: true,
      message: 'What happened',
      data: { /* optional result data */ }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Failed: ${error.message}`
    };
  }
}
```

### Available Services & Tools

#### PinchTabService - 30 Tools Total

**Profile Management (6 tools) - Session Persistence:**
```typescript
// Create persistent profile (cookies/localStorage persist)
const profile = await pinchTab.createProfile('workflow-profile', 'Description');

// List all profiles
const profiles = await pinchTab.listProfiles();

// Get profile details
const profile = await pinchTab.getProfile('prof_fc613b4d');

// Start instance with profile (preserves sessions)
const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');

// Stop instance (preserves profile data)
await pinchTab.stopInstanceByProfile(profileId);

// Check if profile has running instance
const instance = await pinchTab.getProfileInstance(profileId);
```

**Instance Management (4 tools) - Ephemeral:**
```typescript
// Launch fresh browser (no persistence)
const instance = await pinchTab.launchInstance('my-instance', 'headed');

// List running instances
const instances = await pinchTab.listInstances();

// Stop instance
await pinchTab.stopInstance(instanceId);

// Check PinchTab health
await pinchTab.health();
```

**Navigation (3 tools):**
```typescript
// Navigate to URL
await pinchTab.navigate('https://example.com');

// Switch tabs
await pinchTab.switchTab(tabId);

// List open tabs
const tabs = await pinchTab.listTabs(instanceId);
```

**Actions (9 tools):**
```typescript
// Click element by ref
await pinchTab.click('e23');

// Type text into element (WORKS - use this)
await pinchTab.type('e23', 'Hello World');

// Press key
await pinchTab.press('Enter');

// Submit form
await pinchTab.submit('e45');

// Scroll page
await pinchTab.scroll('down', 500);

// Hover over element
await pinchTab.hover('e23');

// Focus element
await pinchTab.focus('e23');

// Select dropdown option
await pinchTab.select('e23', 'option-value');

// Wait milliseconds
await pinchTab.wait(2000);
```

**Read Operations (5 tools):**
```typescript
// Get page snapshot with element refs
const snapshot = await pinchTab.snapshot('interactive');
// Returns: {elements: [{ref: 'e1', tag: 'button', text: 'Click me'}]}

// Extract full page text
const text = await pinchTab.getPageText();

// Take screenshot
const screenshot = await pinchTab.takeScreenshot();

// Run JavaScript
const result = await pinchTab.evalJavaScript('document.title');

// Find elements
const elements = await pinchTab.findElements('button');
```

**Workflow Control (1 tool):**
```typescript
// Mark step complete
await pinchTab.markComplete('Step finished successfully');
```

#### DesktopService - 18 Tools Total

**Mouse Actions (7 tools):**
```typescript
// Move cursor
await desktop.moveMouse(x, y);

// Move along path
await desktop.traceMouse([{x: 100, y: 100}, {x: 200, y: 200}], ['LeftControl']);

// Click at coordinates
await desktop.clickMouse({x, y}, 'left', 1, ['LeftControl']);

// Press/release mouse button
await desktop.pressMouse('down', 'left', {x, y});

// Drag mouse
await desktop.dragMouse({x: 100, y: 100}, {x: 200, y: 200}, 'left');

// Scroll wheel
await desktop.scroll('down', 5);

// Get cursor position
const pos = await desktop.getCursorPosition();
```

**Keyboard Actions (5 tools):**
```typescript
// Paste text (PREFERRED - instant, reliable)
await desktop.pasteText('Hello World');

// Type text (slow, char by char)
await desktop.typeText('Hello World');

// Press keys
await desktop.pressKeys(['Return']);

// Type keys (same as pressKeys)
await desktop.typeKeys(['LeftControl', 's']);

// Keyboard shortcut
await desktop.shortcut('LeftControl', 's');
```

**System Actions (4 tools):**
```typescript
// Launch application
await desktop.launchApplication('chromium'); // chromium, gmail, vscode, terminal, thunar, mousepad, desktop

// Take screenshot
const screenshot = await desktop.screenshot();
// Returns: {base64: '...', width: 1920, height: 1080}

// Scroll (same as mouse scroll)
await desktop.scroll('up', 3);

// Wait (local timer, no API call)
await desktop.wait(2000);
```

**File Operations (2 tools):**
```typescript
// Write file (content must be base64)
const base64 = Buffer.from('Hello World', 'utf-8').toString('base64');
await desktop.writeFile('/home/user/Desktop/file.txt', base64);

// Read file (returns base64)
const result = await desktop.readFile('/home/user/Desktop/file.txt');
const text = Buffer.from(result.content, 'base64').toString('utf-8');
```

### Workflow Patterns

#### Pattern 1: Profile-Based Persistence (Login Workflows)

```typescript
export async function execute(variables, services) {
  const { pinchTab } = services;
  
  // 1. Get or create persistent profile
  const profileName = 'workflow-gmail-profile';
  const profiles = await pinchTab.listProfiles();
  let profileId = profiles.find(p => p.name === profileName)?.id;
  
  if (!profileId) {
    console.log(`Creating new profile: ${profileName}`);
    const profile = await pinchTab.createProfile(
      profileName,
      'Persistent profile for Gmail workflows'
    );
    profileId = profile.id;
  }
  
  // 2. Start instance with profile
  const instance = await pinchTab.startInstanceWithProfile(profileId, 'headed');
  pinchTab.setCurrentInstance(instance.id);
  
  // 3. Navigate (cookies persist!)
  await pinchTab.navigate('https://gmail.com');
  await pinchTab.wait(3000);
  
  // 4. Do work...
  
  // 5. Stop instance (profile persists)
  await pinchTab.stopInstanceByProfile(profileId);
  
  return { success: true, message: 'Done' };
}
```

#### Pattern 2: AI Integration (Groq)

```typescript
async function callGroq(systemPrompt: string, userContent: string): Promise<string> {
  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const bare = process.env.GROQ_API_KEY;
  if (bare && !keys.includes(bare)) keys.push(bare);
  if (keys.length === 0) throw new Error('No GROQ_API_KEY found.');

  let lastError = new Error('Unknown');
  for (const apiKey of keys) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
          temperature: 0.3,
          max_tokens: 4096,
        }),
      });
      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};
      if (res.status === 429 || res.status === 402) {
        lastError = new Error(`Rate limited`);
        continue;
      }
      if (!res.ok) throw new Error(`Groq ${res.status}: ${data?.error?.message || raw}`);
      return data.choices[0].message.content as string;
    } catch (err: any) {
      lastError = err;
    }
  }
  throw new Error(`All Groq keys failed. Last: ${lastError.message}`);
}
```

#### Pattern 3: Workflow Composition

```typescript
import * as sendGmailWorkflow from './send-gmail.workflow';
import * as openWhatsappWorkflow from './open-whatsapp.workflow';

export async function execute(variables, services) {
  // 1. Do some work...
  
  // 2. Call another workflow
  const emailResult = await sendGmailWorkflow.execute(
    {
      to: 'user@example.com',
      subject: 'Report',
      body: 'Here is your report',
    },
    services
  );
  
  if (!emailResult.success) {
    return { success: false, error: 'Email failed' };
  }
  
  // 3. Call another workflow
  const whatsappResult = await openWhatsappWorkflow.execute(
    {
      to: '919876543210',
      message: 'Report sent via email',
    },
    services
  );
  
  return { success: true, message: 'Both workflows completed' };
}
```

### Existing Workflows

| Workflow | Description | Variables | Tools Used |
|----------|-------------|-----------|------------|
| **google-search** | Search DuckDuckGo and return results | query (string) | PinchTab: navigate, snapshot, click, type, press |
| **send-gmail** | Send Gmail with AI overseer for login | to, subject, body, cc, bcc, password, attachment | PinchTab: profiles, navigate, snapshot, click, type + Groq AI |
| **send-email-cli** | Send email via CLI tool in desktop | from_email, to_email, subject, body, password, provider, attachments, cc, bcc, html | Desktop: terminal command |
| **deep-research** | Multi-step: search → scrape → AI report → email/WhatsApp | topic, max_links, email_to, email_cc, email_bcc, whatsapp_to | PinchTab + Groq AI + Workflow composition |
| **summarise-url** | Fetch URL, scrape content, summarize with AI | url | PinchTab: navigate, getPageText + Groq AI |
| **open-whatsapp** | Open WhatsApp Web and send messages | to, message | PinchTab: profiles, navigate, snapshot, click, type |
| **take-screenshot** | Capture browser screenshot | (none) | PinchTab: screenshot |

### Critical Rules & Gotchas

**Browser Automation:**
- ❌ Never use Google Search - Use DuckDuckGo instead (Google detects automation)
- ✅ Always use profiles for login workflows (session persistence)
- ✅ Wait 2-3s after navigation, 1s after clicks
- ✅ Use `pasteText` over `typeText` (instant, reliable)

**File Operations:**
- ✅ Relative paths resolve to `/home/user/Desktop/`
- ✅ Use absolute paths for other locations
- ✅ Content MUST be base64 encoded before writing

**Response Handling:**
- ✅ Always use `.text()` then parse, not `.json()` directly
- ✅ Empty responses crash if you use `.json()` directly

**Compilation:**
- ⚠️ After editing `.workflow.ts`, wait for TypeScript watcher to say `Found 0 errors`
- ⚠️ Server loads from `dist/workflows/` (compiled output)

### Workflow Discovery & Execution

**REST API Endpoints:**
```bash
# List all workflows
GET /workflows

# Get workflow metadata
GET /workflows/:name

# Execute workflow
POST /workflows/:name/execute
{
  "variables": {"query": "Python courses"},
  "taskId": "task_123"
}
```

**Orchestrator Integration:**

The Orchestrator can discover and use workflows via tools:

```typescript
// 1. List available workflows
const workflows = await list_workflows();

// 2. Read workflow details
const metadata = await read_workflow('google-search');

// 3. Include in execution plan
await use_workflow('google-search', {query: 'Python courses'});
```

**Workflow Agent Execution:**

When Orchestrator creates a workflow step, the Workflow Agent:

1. Loads workflow metadata via `WorkflowService.readWorkflow()`
2. Validates variables against schema
3. Fills missing variables from shared state
4. Executes via `WorkflowService.runWorkflow()`
5. Returns result to Orchestrator

### Creating a New Workflow

**Step 1: Create File**

```bash
cd packages/aria-agent/workflows
touch my-workflow.workflow.ts
```

**Step 2: Define Metadata & Execute Function**

```typescript
import { WorkflowMetadata, WorkflowServices, WorkflowResult } from '../src/workflows/workflow.interface';

export const metadata: WorkflowMetadata = {
  name: 'my-workflow',
  description: 'What this workflow does',
  version: '1.0.0',
  timeout_ms: 30000,
  variables: [
    {
      name: 'myVar',
      type: 'string',
      required: true,
      description: 'Description of variable',
    },
  ],
};

export async function execute(
  variables: { myVar: string },
  services: WorkflowServices,
): Promise<WorkflowResult> {
  const { pinchTab, desktop } = services;
  const { myVar } = variables;

  try {
    console.log(`Starting workflow with: ${myVar}`);
    
    // Your automation logic here
    
    return {
      success: true,
      message: 'Workflow completed successfully',
      data: { result: 'some data' }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Workflow failed: ${error.message}`
    };
  }
}
```

**Step 3: Wait for Compilation**

```bash
# Watch for TypeScript compilation
cd packages/aria-agent
npm run start:dev

# Wait for: "Found 0 errors. Watching for file changes."
```

**Step 4: Test Workflow**

```bash
# Via REST API
curl -X POST http://localhost:9991/workflows/my-workflow/execute \
  -H "Content-Type: application/json" \
  -d '{"variables": {"myVar": "test value"}}'

# Via Orchestrator (create task that uses workflow)
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{"userInput": "Run my-workflow with myVar=test"}'
```

### Workflow Best Practices

1. **Use Profiles for Login Workflows** - Cookies persist across restarts
2. **Add Generous Waits** - 2-3s after navigation, 1s after clicks
3. **Handle Errors Gracefully** - Always return `{success: false, error: ...}`
4. **Log Progress** - Use `console.log()` for debugging
5. **Validate Variables** - Check required variables at start
6. **Use AI for Complex Logic** - Integrate Groq for decision-making
7. **Compose Workflows** - Call other workflows for reusability
8. **Test Incrementally** - Test each step before adding more
9. **Document Variables** - Clear descriptions help Orchestrator
10. **Version Workflows** - Bump version when making changes

### Troubleshooting

**Issue:** Workflow not found
**Solution:** Wait for TypeScript compilation, check `dist/workflows/` for `.js` file

**Issue:** Variables not filled
**Solution:** Check variable names match metadata, ensure required variables provided

**Issue:** Browser not logged in
**Solution:** Use profiles instead of ephemeral instances

**Issue:** Element not found
**Solution:** Add wait after navigation, check snapshot for correct refs

**Issue:** File write failed
**Solution:** Ensure content is base64 encoded, check file path

**Issue:** Groq API rate limit
**Solution:** Add multiple API keys (GROQ_API_KEY_1, _2, _3, etc.)

---

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
  questions_asked: 0 | 1 | 2 | 3 | 4 | 5 | 6,  // Updated: 0-6 questions
  questions?: ClarificationQuestion[]  // Present when questions_asked > 0
}

interface ClarificationQuestion {
  id: string,
  question: string,
  type: "text" | "choice" | "confirm",
  choices?: string[],
  required: boolean,
  assumption?: string  // What will be assumed if user doesn't answer
}
```

**Context Sources:**
- System prompt from `system-prompts.config.ts`
- User input only (no previous context)

**Decision Point:**
- If `questions_asked > 0` → Status: `NEEDS_HELP`, pause, show questions to user
- Else → Proceed to ORCHESTRATOR

**Multi-Question Clarification Flow:**
1. Clarifier can ask 0-6 questions when critical information is missing
2. Questions are smart and natural, with built-in assumptions where reasonable
3. Each question can have an optional `assumption` field showing what will be used if user doesn't answer
4. All questions are stored in a clarification session in Redis
5. Frontend displays all questions at once for user to answer
6. User submits answers for all questions
7. Task resumes with clarified information

**Clarifier Philosophy:**
- Acts as a skeptic - questions everything not explicitly stated
- Asks smart, natural questions with built-in assumptions
- Only asks what is truly needed (0-6 questions max)
- Distinguishes between when to ask vs when to assume
- Uses natural language, not robotic questions

**Frontend Display:** "Clarifying task..." (shows all questions if any)

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

**Plan Approval Flow:**

After the ORCHESTRATOR generates the plan, execution behavior depends on the `AUTO_APPROVE_PLAN` configuration:

**AUTO_APPROVE_PLAN=true (Autonomous Mode):**
- Plan is automatically approved and execution proceeds immediately to Phase 3
- No user interaction required
- Ideal for fully autonomous task execution
- Logs show: `[AUTO-APPROVED] Plan auto-approved - proceeding to execution...`

**AUTO_APPROVE_PLAN=false (Manual Approval Mode - Default):**
- Execution pauses for user approval after plan generation
- User can review and edit the plan before execution begins

1. **Backend Pause:**
   - Status set to `awaiting_plan_approval` in Redis shared state
   - Task status updated to `NEEDS_HELP` in database
   - WebSocket event emitted: `agent_status` with status `awaiting_plan_approval`

2. **Frontend Display:**
   - Editable plan UI component renders with all steps
   - Each step shows: type badge, description, success criteria
   - User can click any step to edit its description inline
   - "Build" button triggers plan approval

3. **User Actions:**
   - **Edit Steps:** Click pencil icon → modify description → click checkmark to save
   - **Approve Plan:** Click "Build" button → sends finalized plan to backend

4. **Backend Resume:**
   - REST endpoint: `POST /tasks/:id/approve-plan` with `{ approvedPlan: ExecutionStep[] }`
   - EventEmitter2 emits `plan.approved` event
   - OrchestrationService.approvePlan() method called
   - Execution resumes from Phase 3 with user-edited plan

**Configuration:**
```env
# packages/aria-agent/.env
AUTO_APPROVE_PLAN=true   # Skip approval, execute automatically
AUTO_APPROVE_PLAN=false  # Require manual approval (default)
```

1. **Backend Pause:**
   - Status set to `awaiting_plan_approval` in Redis shared state
   - Task status updated to `NEEDS_HELP` in database
   - WebSocket event emitted: `agent_status` with status `awaiting_plan_approval`

2. **Frontend Display:**
   - Editable plan UI component renders with all steps
   - Each step shows: type badge, description, success criteria
   - User can click any step to edit its description inline
   - "Build" button triggers plan approval

3. **User Actions:**
   - **Edit Steps:** Click pencil icon → modify description → click checkmark to save
   - **Approve Plan:** Click "Build" button → sends finalized plan to backend

4. **Backend Resume:**
   - REST endpoint: `POST /tasks/:id/approve-plan` with `{ approvedPlan: ExecutionStep[] }`
   - EventEmitter2 emits `plan.approved` event
   - OrchestrationService.approvePlan() method called
   - Execution resumes from Phase 3 with user-edited plan

**Key Files:**
- Backend: `packages/aria-agent/src/orchestration/orchestration.service.ts` (pause + resume logic)
- Backend: `packages/aria-agent/src/tasks/tasks.controller.ts` (approve-plan endpoint)
- Backend: `packages/aria-agent/src/tasks/tasks.service.ts` (approvePlan method)
- Frontend: `packages/aria-ui/src/components/messages/content/EditablePlanContent.tsx` (editable UI)
- Frontend: `packages/aria-ui/src/components/messages/content/MessageContent.tsx` (conditional rendering)

**Data Flow:**
```
Orchestrator generates plan
         ↓
Redis: status = "awaiting_plan_approval"
         ↓
WebSocket: emit agent_status event
         ↓
Frontend: render EditablePlanContent
         ↓
User edits steps + clicks "Build"
         ↓
POST /tasks/:id/approve-plan
         ↓
EventEmitter2: plan.approved event
         ↓
OrchestrationService.approvePlan()
         ↓
Phase 3: Execution with finalized plan
```

**Bug Fix (March 19, 2026): Race Condition Causing Premature Task Completion**

**Problem:** Tasks were transitioning from `NEEDS_HELP` → `COMPLETED` in ~80ms without user approval or actual execution. The file creation never happened because the Desktop Agent never ran.

**Root Cause:** Three-layer race condition:

1. **OrchestrationService Early Return:** The `run()` method correctly returned after setting `NEEDS_HELP` status, expecting `approvePlan()` to be called later via WebSocket event.

2. **AgentProcessor Missing Status Check:** After `orchestrationService.run()` returned, the processor only checked for `'needs_clarification'` status but ignored `'awaiting_plan_approval'`. It immediately marked the task as `COMPLETED` without waiting for plan approval.

3. **WebSocket Disconnection:** If the WebSocket client disconnected during planning (before approval UI rendered), the user couldn't send the `approve_plan` message, so `approvePlan()` never executed.

**Timeline Example:**
```
00:10:51.608 → Status set to NEEDS_HELP (orchestration paused)
00:10:51.690 → Status set to COMPLETED (82ms later - BUG!)
00:10:49.058 → WebSocket disconnected (3.5s before, during planning)
```

**Fix Applied:**

1. **AgentProcessor (`packages/aria-agent/src/agent/agent.processor.ts`):**
   - Added check for `'awaiting_plan_approval'` status after orchestration returns
   - Now keeps task in `NEEDS_HELP` state instead of marking `COMPLETED`
   - Execution only completes after `approvePlan()` finishes Phase 3 & 4

2. **TasksGateway (`packages/aria-agent/src/tasks/tasks.gateway.ts`):**
   - Changed `handleApprovePlan()` to call `TasksService.approvePlan()` instead of just emitting Socket.io event
   - This properly triggers the EventEmitter2 `plan.approved` event that OrchestrationService listens for
   - Added error handling and confirmation events back to client

**Code Changes:**
```typescript
// agent.processor.ts - Added status check
const taskStatus = await this.sharedStateService.get<string>(taskId, 'status');

if (taskStatus === 'needs_clarification') {
  await this.tasksService.update(taskId, { status: TaskStatus.NEEDS_HELP });
} else if (taskStatus === 'awaiting_plan_approval') {
  // ✅ FIX: Don't mark as completed - wait for user approval
  this.logger.log(`Task ${taskId} awaiting user plan approval`);
  await this.tasksService.update(taskId, { status: TaskStatus.NEEDS_HELP });
} else {
  // Only mark completed if orchestration fully finished
  await this.tasksService.update(taskId, { status: TaskStatus.COMPLETED });
}
```

```typescript
// tasks.gateway.ts - Fixed event flow
@SubscribeMessage('approve_plan')
async handleApprovePlan(client: Socket, payload: { taskId: string; approvedPlan: any[] }) {
  try {
    // Call TasksService which emits 'plan.approved' event
    await this.tasksService.approvePlan(payload.taskId, payload.approvedPlan);
    
    // Emit confirmation back to client
    this.server.to(`task_${payload.taskId}`).emit('plan_approval_confirmed', {
      taskId: payload.taskId,
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    this.server.to(`task_${payload.taskId}`).emit('plan_approval_error', {
      taskId: payload.taskId,
      error: error.message,
    });
  }
}
```

**Bug Fix (March 19, 2026): Race Condition Causing `EditablePlanContent` to Disappear**

**Problem:** `EditablePlanContent` would disappear from the frontend while the user was awaiting plan approval, preventing them from approving the plan.

**Root Cause:** A `useEffect` hook in `page.tsx` that listened to `agentStatus` WebSocket events was erroneously setting `isAwaitingPlanApproval` to `false` whenever an agent emitted an `idle` or alternative transient status. This overrode the correct underlying task state (`NEEDS_HELP`).

**Fix Applied:**
- Modified `page.tsx` to stop setting `isAwaitingPlanApproval` to `false` based on transient `agentStatus` events. The variable is now securely turned off by the primary `useEffect` that listens to `taskStatus` changes instead.

**Event Flow (Fixed):**
```
1. OrchestrationService.run() → Phase 1 & 2 → PAUSE
2. Status = 'awaiting_plan_approval' in Redis
3. Task status = NEEDS_HELP in DB
4. AgentProcessor checks status → sees 'awaiting_plan_approval' → keeps NEEDS_HELP
5. WebSocket receives approve_plan message
6. TasksGateway calls TasksService.approvePlan()
7. TasksService emits 'plan.approved' event (EventEmitter2)
8. OrchestrationService.approvePlan() executes Phase 3 & 4
9. Desktop Agent runs and creates file
10. Task marked COMPLETED after actual execution
```

**Testing:** Create a task like "make a file named hello.txt" and verify:
- Task pauses at `NEEDS_HELP` status after planning
- Plan approval UI renders with editable steps
- Clicking "Build" triggers execution
- Desktop Agent runs and creates the file
- Task only completes after file is created

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

### Configuration (March 31, 2026 Fix)

**Backend Gateway:**
- **File:** `packages/aria-agent/src/tasks/tasks.gateway.ts`
- **Path:** `/socket.io` (default Socket.io path)
- **CORS:** Origin `*`, methods `['GET', 'POST']`

**Frontend Hooks:**
- **Files:** 
  - `packages/aria-ui/src/hooks/useWebSocket.ts` (main chat WebSocket)
  - `packages/aria-ui/src/hooks/useAgentStatus.ts` (agent status tracking)
  - `packages/aria-ui/src/lib/socket.ts` (singleton instance)
- **Configuration:**
  ```typescript
  io(process.env.NEXT_PUBLIC_API_URL!, {
    path: "/socket.io",
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  })
  ```

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Backend URL for Socket.io connections (e.g., `http://localhost:9991`)
- Must be set in `.env`, `.env.local`, `.env.production`, etc.

**Common Pitfall (Fixed March 31, 2026):**
- ❌ WRONG: `path: "/api/proxy/tasks"` - This was causing connection failures
- ✅ CORRECT: `path: "/socket.io"` - Standard Socket.io path matching backend

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

### UI Component Library

**Location:** `packages/aria-ui/src/components/ui/`

The project uses shadcn/ui components built on Radix UI primitives with Tailwind CSS 4. All components follow a consistent design system with the custom bronze color palette.

**Available Components:**
- `button.tsx` - Button with variants (default, destructive, outline, secondary, ghost, link)
- `input.tsx` - Text input field
- `textarea.tsx` - Multi-line text input (added March 23, 2026)
- `label.tsx` - Form labels
- `select.tsx` - Dropdown select
- `dialog.tsx` - Modal dialogs
- `card.tsx` - Content cards
- `badge.tsx` - Status badges
- `switch.tsx` - Toggle switches
- `scroll-area.tsx` - Scrollable containers
- `separator.tsx` - Visual dividers
- `popover.tsx` - Floating popovers
- `dropdown-menu.tsx` - Context menus

**Icon Library:** Hugeicons (free version)
- Import from `@hugeicons/core-free-icons`
- Render with `<HugeiconsIcon icon={IconName} />`
- Note: Some icon names differ from paid version (e.g., `KeyboardIcon` not `Keyboard01Icon`, `PlayIcon` not `Play01Icon`, `Loading02Icon` not `Loader02Icon`, `ComputerTerminal01Icon` not `Terminal01Icon`, `AppStoreIcon` not `ApplicationIcon`)

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

## Tool Call Display System

### Overview

The system provides real-time visibility of tool executions in the frontend through a WebSocket-based event pipeline. This applies to both agent tools (Web, Desktop) and workflow tools (type, screenshot, wait, etc.).

### Architecture

**Backend → Frontend Flow:**
```
Tool Execution
    ↓
BrowserLoggerService.logToolCall()
    ↓
EventEmitter2 ('browser.log' event)
    ↓
TasksGateway.handleBrowserLogEvent()
    ↓
WebSocket.emit('browser_log')
    ↓
Frontend useWebSocket hook
    ↓
useChatSession (tool call state)
    ↓
ToolCallContent component (UI)
```

### Backend Implementation

#### BrowserLoggerService

**File:** `packages/aria-agent/src/logger/browser-logger.service.ts`

Emits structured tool execution events:

```typescript
// Log tool call start
browserLogger.logToolCall(taskId, agentName, {
  name: toolName,
  input: toolInput
});

// Log tool result
browserLogger.logToolResult(taskId, agentName, {
  toolName,
  success: true,
  output: result,
  duration: 1234
});
```

**Event Structure:**
```typescript
{
  taskId: string;
  type: 'tool.call' | 'tool.result';
  timestamp: ISO8601;
  data: {
    agentName: string;
    toolName: string;
    toolInput?: any;
    success?: boolean;
    output?: any;
    error?: string;
    duration?: number;
  }
}
```

#### Agent Tool Logging

**Web Agent & Desktop Agent:**
- Automatically log all tool calls via `browserLogger.logToolCall()`
- Log results via `browserLogger.logToolResult()`
- Agent name format: `WEB_AGENT`, `DESKTOP_AGENT`

**Example (Web Agent):**
```typescript
// Before tool execution
this.browserLogger.logToolCall(taskId, 'WEB_AGENT', {
  name: 'pinchtab_click',
  input: { ref: 'e23' }
});

// After tool execution
this.browserLogger.logToolResult(taskId, 'WEB_AGENT', {
  toolName: 'pinchtab_click',
  success: true,
  output: { clicked: true },
  duration: 234
});
```

#### Workflow Tool Logging

**File:** `packages/aria-agent/src/workflows/workflow-logger.helper.ts`

Workflows use `WorkflowLogger` helper to wrap tool calls:

```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';

export async function execute(variables, services: WorkflowServices) {
  const { desktop, browserLogger, taskId } = services;
  
  // Create logger instance
  const logger = new WorkflowLogger(browserLogger, taskId, 'workflow-name');
  
  // Wrap tool calls
  await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
    desktop.launchApplication('terminal')
  );
  
  await logger.logToolCall('wait', { duration: 3000 }, () =>
    desktop.wait(3000)
  );
  
  const screenshot = await logger.logToolCall('screenshot', {}, () =>
    desktop.screenshot()
  );
}
```

**Agent Name Format:** `WORKFLOW:workflow-name` (e.g., `WORKFLOW:send-email-n8n`)

**WorkflowServices Interface:**
```typescript
interface WorkflowServices {
  pinchTab: PinchTabService;
  desktop: DesktopService;
  browserLogger: BrowserLoggerService;  // Added for logging
  taskId: string;                       // Added for logging context
}
```

### Frontend Implementation

#### useWebSocket Hook

**File:** `packages/aria-ui/src/hooks/useWebSocket.ts`

Listens for `browser_log` events:

```typescript
socket.on('browser_log', (log: BrowserLogEvent) => {
  onBrowserLogRef.current?.(log);
});
```

#### useChatSession Hook

**File:** `packages/aria-ui/src/hooks/useChatSession.ts`

Processes tool call events and maintains state:

```typescript
const [toolCalls, setToolCalls] = useState<Map<string, any>>(new Map());

const handleBrowserLog = useCallback((log: BrowserLogEvent) => {
  if (log.type === 'tool.call') {
    // Create pending tool call entry
    const toolCallId = `${log.data.agentName}-${log.data.toolName}-${log.timestamp}`;
    setToolCalls(prev => {
      const updated = new Map(prev);
      updated.set(toolCallId, {
        agentName: log.data.agentName,
        toolName: log.data.toolName,
        toolInput: log.data.toolInput,
        timestamp: log.timestamp,
        pending: true
      });
      return updated;
    });
  } else if (log.type === 'tool.result') {
    // Update with result
    const toolCallId = Array.from(toolCalls.keys()).find(key =>
      key.includes(log.data.toolName) && key.includes(log.data.agentName)
    );
    if (toolCallId) {
      setToolCalls(prev => {
        const updated = new Map(prev);
        const existing = updated.get(toolCallId);
        if (existing) {
          updated.set(toolCallId, {
            ...existing,
            success: log.data.success,
            output: log.data.output,
            error: log.data.error,
            duration: log.data.duration,
            pending: false
          });
        }
        return updated;
      });
    }
  }
}, [currentTaskId, toolCalls]);
```

#### ToolCallContent Component

**File:** `packages/aria-ui/src/components/messages/content/ToolCallContent.tsx`

Displays individual tool call with expandable details:

```typescript
<ToolCallContent
  agentName="WORKFLOW:send-email-n8n"
  toolName="launchApplication"
  toolInput={{ application: 'terminal' }}
  success={true}
  output={{ success: true }}
  duration={1234}
/>
```

**UI Features:**
- Wrench icon + agent name → tool name
- Status badge (✓ success, ✗ failure)
- Duration display
- Expandable sections:
  - Parameters (JSON formatted input)
  - Result/Error (JSON formatted output)
- Color coding:
  - Pending: Red background
  - Success: Green checkmark
  - Failure: Red X

#### ToolCallsFeed Component

**File:** `packages/aria-ui/src/components/tasks/ToolCallsFeed.tsx`

Renders collection of tool calls (newest first):

```typescript
<ToolCallsFeed toolCalls={toolCalls} />
```

### Example: Workflow Tool Display

**Workflow Execution:**
```typescript
// send-email-n8n.workflow.ts
await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
  desktop.launchApplication('terminal')
);
await logger.logToolCall('wait', { duration: 3000 }, () =>
  desktop.wait(3000)
);
await logger.logToolCall('pasteText', { text: command }, () =>
  desktop.pasteText(command)
);
await logger.logToolCall('pressKeys', { keys: ['Return'] }, () =>
  desktop.pressKeys(['Return'])
);
const screenshot = await logger.logToolCall('screenshot', {}, () =>
  desktop.screenshot()
);
```

**Frontend Display:**
```
WORKFLOW:send-email-n8n → launchApplication ✓ 1234ms
  Parameters: { application: 'terminal' }
  Result: { success: true }

WORKFLOW:send-email-n8n → wait ✓ 3001ms
  Parameters: { duration: 3000 }
  Result: { success: true }

WORKFLOW:send-email-n8n → pasteText ✓ 456ms
  Parameters: { text: 'aria-mail --to "user@example.com" ...' }
  Result: { success: true }

WORKFLOW:send-email-n8n → pressKeys ✓ 123ms
  Parameters: { keys: ['Return'] }
  Result: { success: true }

WORKFLOW:send-email-n8n → screenshot ✓ 2345ms
  Parameters: {}
  Result: { base64: '...' }
```

### Key Files

**Backend:**
- `packages/aria-agent/src/logger/browser-logger.service.ts` - Event emission
- `packages/aria-agent/src/workflows/workflow-logger.helper.ts` - Workflow logging wrapper
- `packages/aria-agent/src/workflows/workflow.interface.ts` - WorkflowServices interface
- `packages/aria-agent/src/services/workflow.service.ts` - Service injection
- `packages/aria-agent/src/tasks/tasks.gateway.ts` - WebSocket broadcasting

**Frontend:**
- `packages/aria-ui/src/hooks/useWebSocket.ts` - WebSocket listener
- `packages/aria-ui/src/hooks/useChatSession.ts` - Tool call state management
- `packages/aria-ui/src/components/messages/content/ToolCallContent.tsx` - Individual tool display
- `packages/aria-ui/src/components/tasks/ToolCallsFeed.tsx` - Tool collection display

**Documentation:**
- `packages/aria-agent/workflows/README-WORKFLOW-LOGGING.md` - Complete workflow logging guide

### Adding Logging to New Workflows

**Step 1:** Import WorkflowLogger
```typescript
import { WorkflowLogger } from '../src/workflows/workflow-logger.helper';
```

**Step 2:** Extract services
```typescript
const { desktop, pinchTab, browserLogger, taskId } = services;
const logger = new WorkflowLogger(browserLogger, taskId, 'your-workflow-name');
```

**Step 3:** Wrap tool calls
```typescript
// Before (no logging)
await desktop.launchApplication('terminal');

// After (with logging)
await logger.logToolCall('launchApplication', { application: 'terminal' }, () =>
  desktop.launchApplication('terminal')
);
```

**Best Practices:**
- Log all user-visible actions (launchApplication, type, click, screenshot)
- Log waits to help users understand timing
- Use descriptive tool names matching service method names
- Don't log sensitive data (passwords, API keys)
- Keep tool names consistent across workflows

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
| `packages/aria-agent/workflows/send-email-cli.workflow.ts` | Send email via CLI tool in desktop |
| `packages/aria-agent/workflows/send-gmail.workflow.ts` | Send Gmail via browser automation |
| `packages/aria-agent/workflows/deep-research.workflow.ts` | Deep research workflow |

---

## API Key Management & Rotation

### Overview

ARIA implements intelligent API key rotation across all three AI providers (Groq, Bytez/Claude, Google Gemini) to handle rate limits, quota exhaustion, and invalid keys automatically.

### Key Manager Architecture

**Files:**
- `packages/aria-agent/src/groq/groq-key-manager.service.ts`
- `packages/aria-agent/src/bytez/bytez-key-manager.service.ts`
- `packages/aria-agent/src/google/google-key-manager.service.ts`
- `packages/aria-ui/src/lib/groq-key-manager.ts` (frontend STT)

### Key Configuration

**Environment Variables:**
```bash
# Numbered keys (preferred)
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_yyy
GROQ_API_KEY_3=gsk_zzz

BYTEZ_API_KEY_1=bytez_xxx
BYTEZ_API_KEY_2=bytez_yyy

GOOGLE_API_KEY_1=AIza_xxx
GOOGLE_API_KEY_2=AIza_yyy

# Fallback (single key)
GROQ_API_KEY=gsk_xxx
BYTEZ_API_KEY=bytez_xxx
GOOGLE_API_KEY=AIza_xxx
```

### Rotation Logic

#### Immediate Rotation (API Key Errors)

When ANY of these errors occur, the key is IMMEDIATELY disabled and rotation happens:
- Rate limit exceeded (TPM/RPM)
- Quota exceeded
- Invalid API key
- Unauthorized
- Insufficient credits
- Billing/payment errors

**Error Detection:**
```typescript
const errorMessage = error?.message?.toLowerCase() || '';
const isApiKeyError = 
  errorMessage.includes('rate limit') ||
  errorMessage.includes('quota') ||
  errorMessage.includes('tokens per minute') ||
  errorMessage.includes('tpm') ||
  errorMessage.includes('rpm') ||
  errorMessage.includes('invalid api key') ||
  errorMessage.includes('unauthorized') ||
  errorMessage.includes('insufficient') ||
  errorMessage.includes('exceeded') ||
  errorMessage.includes('billing') ||
  errorMessage.includes('payment');
```

#### Gradual Rotation (Other Errors)

For non-API-key errors (network issues, timeouts, etc.):
- Failure count increments
- Key disabled after 3 failures
- Rotation to next available key

### Key States

```typescript
interface KeyConfig {
  key: string;
  failureCount: number;      // 0-3 for gradual rotation
  lastFailure?: Date;        // Timestamp of last failure
  isDisabled: boolean;       // true = skip this key
}
```

### Auto-Recovery

Disabled keys are automatically re-enabled after 30 minutes:
```typescript
const minutesSinceFailure = (now - lastFailure) / (1000 * 60);
if (minutesSinceFailure >= 30) {
  key.isDisabled = false;
  key.failureCount = 0;
}
```

### Retry Flow

Each AI service retries with ALL available keys before failing:

```typescript
const maxRetries = keyManager.getTotalKeys();

for (let attempt = 0; attempt < maxRetries; attempt++) {
  const apiKey = keyManager.getCurrentKey();
  
  try {
    const response = await callAPI(apiKey);
    keyManager.markCurrentKeyAsSuccessful(); // Reset failure count
    return response;
  } catch (error) {
    keyManager.markCurrentKeyAsFailed(error); // Rotate to next key
    
    if (attempt === maxRetries - 1) {
      throw new Error('All API keys exhausted');
    }
  }
}
```

### Example Scenario: Token Limit Error

**Problem:** Orchestrator sends 8,148 tokens but Groq free tier limit is 8,000 TPM

**Flow:**
1. Groq API returns: `Request too large for model... Limit 8000, Requested 8148`
2. Error message contains "tokens per minute" → Detected as API key error
3. Key 1 IMMEDIATELY disabled (no failure count increment)
4. Rotation to Key 2
5. Retry with Key 2
6. If Key 2 also fails → Rotate to Key 3
7. Continue until success or all keys exhausted
8. After 30 minutes, Key 1 re-enabled automatically

### Logging

**Key Rotation:**
```
[GroqKeyManager] Key 1 IMMEDIATELY DISABLED due to API key error: Request too large... 
                 It will be re-enabled after 30 minutes.
[GroqKeyManager] Rotated to Key 2
```

**Success:**
```
[GroqKeyManager] Key 2 succeeded, resetting failure count
```

**All Keys Exhausted:**
```
[GroqKeyManager] All Groq API keys are disabled due to failures
```

### Integration Points

**Services Using Key Managers:**
- `GroqService.generateMessage()` - Groq API calls
- `BytezService.generateMessage()` - Bytez/Claude API calls
- `GoogleService.generateMessage()` - Google Gemini API calls
- `packages/aria-ui/src/app/api/stt/route.ts` - Frontend speech-to-text

**Agents Affected:**
- CLARIFIER (Groq)
- ORCHESTRATOR (Bytez or Groq, user-selectable)
- WEB (Google Gemini)
- DESKTOP (Bytez or Groq, user-selectable)
- PERCEPTION (Groq)
- VERIFIER (Groq)
- RECOVERY (Bytez)
- REPORTER (Groq)

### Best Practices

1. **Use numbered keys** - Easier to manage multiple keys
2. **Mix free/paid tiers** - Distribute load across accounts
3. **Monitor logs** - Watch for rotation patterns
4. **Set up alerts** - Notify when all keys exhausted
5. **Rotate keys manually** - Refresh disabled keys if needed

---

## Deployment Architecture

### Docker Compose Setup (Full Stack Containerized)

**File:** `docker/docker-compose.yml`

**Last Updated:** March 18, 2026 - Complete Docker-based deployment (UI, Agent, Desktop, Postgres, Redis)

**Project Name:** `aria` (creates grouped dropdown in Docker Desktop)

**🎉 COMPLETE DOCKER DEPLOYMENT:** The entire ARIA application stack now runs in Docker containers - frontend (aria-ui), backend (aria-agent), desktop environment (aria-desktop), database (postgres), and cache (redis). No local Node.js or development servers needed!

**Services:**

| Service | Image | Build Source | Ports | Purpose |
|---------|-------|--------------|-------|---------|
| **aria-desktop** | `aria-desktop:local` | `packages/ariad/Dockerfile` | 9990 (VNC), 9867 (PinchTab) | Ubuntu desktop with noVNC + PinchTab |
| **postgres** | `postgres:16-alpine` | Docker Hub (official) | 5432 | PostgreSQL database |
| **redis** | `redis:7-alpine` | Docker Hub (official) | 6379 | Shared state for multi-agent system |
| **aria-agent** | `aria-agent:local` | `packages/aria-agent/Dockerfile` | 9991 | NestJS backend API |
| **aria-ui** | `aria-ui:local` | `packages/aria-ui/Dockerfile` | 9992 | Next.js frontend |

**Network:** `aria-network` (bridge driver) - All services communicate via internal DNS

**Volumes:**
- `postgres_data` - Database persistence
- `redis_data` - Redis persistence

**⚠️ IMPORTANT: Local Builds Only**

The docker-compose.yml is configured for LOCAL BUILDS ONLY. All services use `:local` image tags and build from source Dockerfiles. This avoids GitHub Container Registry authentication issues.

**Previous Issue (FIXED):**
```yaml
# ❌ OLD: Conflicting build + image directives
aria-agent:
  build: ...
  image: ghcr.io/aria-ai/aria-agent:edge  # ← Caused GHCR pull attempts

# ✅ NEW: Local build only
aria-agent:
  build: ...
  image: aria-agent:local  # ← Builds locally, no registry needed
```

**Environment Variables (docker/.env):**

**🔒 SECURITY NOTICE:** Never commit `.env` file to version control. Use `.env.example` as template.

```env
# Required API Keys (Get from respective dashboards)
GROQ_API_KEY_1=your_key_here
GROQ_API_KEY_2=  # Optional: fallback keys
GOOGLE_API_KEY_1=your_key_here
GOOGLE_API_KEY_2=  # Optional: fallback keys
BYTEZ_API_KEY_1=your_key_here
BYTEZ_API_KEY_2=  # Optional: fallback keys

# Auto-configured (don't change)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ariadb
REDIS_URL=redis://redis:6379
ARIA_DESKTOP_BASE_URL=http://aria-desktop:9990
PINCHTAB_BASE_URL=http://aria-desktop:9867
ARIA_AGENT_BASE_URL=http://aria-agent:9991
ARIA_DESKTOP_VNC_URL=http://aria-desktop:9990/websockify

# Optional
ENABLE_MULTI_AGENT=true
AUTO_APPROVE_PLAN=true  # Skip plan approval, execute automatically
PINCHTAB_HEADED_MODE=true
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

**Quick Start:**
```bash
# 1. Create .env from template
cd docker
cp .env.example .env

# 2. Edit .env and add your API keys
nano .env  # or use your preferred editor

# 3. Build and start all services
docker-compose -f docker-compose.yml down
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up -d

# 4. Run migrations (first time only)
docker exec aria-agent npx prisma migrate deploy

# 5. Open browser
http://localhost:9992
```

**Alternative: Use Startup Scripts**

Windows PowerShell:
```powershell
cd docker
.\start-all.ps1
```

Linux/Mac:
```bash
cd docker
./start-all.sh
```

**Docker Desktop View:**
```
📦 aria (dropdown)
  ├── aria-ui ✅ (port 9992)
  ├── aria-agent ✅ (port 9991)
  ├── aria-desktop ✅ (ports 9990, 9867)
  ├── postgres ✅ (port 5432)
  └── redis ✅ (port 6379)
```

**Benefits:**
- ✅ One command starts everything
- ✅ All services grouped in Docker Desktop
- ✅ Internal networking (no localhost issues)
- ✅ Persistent data (volumes)
- ✅ Easy logs: `docker-compose logs -f`
- ✅ Easy restart: `docker-compose restart`
- ✅ No GHCR authentication required
- ✅ Builds from source locally

**Troubleshooting:**

**Issue:** "denied: permission denied" when pulling images
**Solution:** This is fixed! The compose file now builds locally instead of pulling from GHCR.

**Issue:** "Cannot connect to backend"
**Solution:** Wait 30 seconds for services to start, then refresh browser.

**Issue:** "Database connection failed"
**Solution:** Run migrations: `docker exec aria-agent npx prisma migrate deploy`

**Issue:** Services not showing in Docker Desktop dropdown
**Solution:** Use `docker-compose up` (not `docker run`). The `name: aria` directive groups services.

**Health Check Commands:**

Check if services are running:

```bash
# Check aria-ui (Frontend)
curl http://localhost:9992
# Expected: HTML response from Next.js

# Check aria-agent (Backend API)
curl http://localhost:9991/health
# Expected: {"status":"ok","timestamp":"..."}

# Check aria-desktop (VNC + PinchTab)
curl http://localhost:9990
# Expected: noVNC HTML page

# Check PinchTab service
curl http://localhost:9867/health
# Expected: {"status":"healthy"}

# Check Postgres
docker exec aria-postgres pg_isready
# Expected: /var/run/postgresql:5432 - accepting connections

# Check Redis
docker exec aria-redis redis-cli ping
# Expected: PONG

# Check all container status
docker-compose -f docker/docker-compose.yml ps
# Shows all 5 services with their status
```

**View Logs:**

```bash
# All services
docker-compose -f docker/docker-compose.yml logs -f

# Specific service
docker-compose -f docker/docker-compose.yml logs -f aria-agent
docker-compose -f docker/docker-compose.yml logs -f aria-ui
docker-compose -f docker/docker-compose.yml logs -f aria-desktop

# Last 50 lines
docker logs aria-agent --tail 50
```

**🔄 Development Workflow: Code Changes & Rebuilds**

**Q: Do I need to rebuild Docker every time I change code?**

**A: YES for production Docker setup, but there are FASTER alternatives:**

**Option 1: Full Docker Rebuild (SLOW - 5-10 minutes)**
```bash
# When you change aria-agent or aria-ui code:
cd docker
docker-compose -f docker-compose.yml build aria-agent  # Rebuild only agent
docker-compose -f docker-compose.yml build aria-ui     # Rebuild only UI
docker-compose -f docker-compose.yml up -d             # Restart services
```

**Option 2: Hybrid Development Mode (FAST - Recommended for Development)**

Use `docker-compose.development.yml` which runs ONLY infrastructure in Docker (postgres, redis, aria-desktop), and run aria-agent + aria-ui locally with hot reload:

```bash
# Terminal 1: Start infrastructure only
cd docker
docker-compose -f docker-compose.development.yml up -d

# Terminal 2: Run backend locally (hot reload enabled)
cd packages/aria-agent
npm run start:dev  # ← Changes reload automatically!

# Terminal 3: Run frontend locally (hot reload enabled)
cd packages/aria-ui
npm run dev  # ← Changes reload automatically!
```

**Benefits of Hybrid Mode:**
- ✅ Code changes reload instantly (no rebuild)
- ✅ Full TypeScript error checking in IDE
- ✅ Faster iteration cycle
- ✅ Still uses Docker for infrastructure (postgres, redis, desktop)
- ✅ Same URLs: http://localhost:9991 (agent), http://localhost:9992 (ui)

**Option 3: Docker Volumes for Hot Reload (ADVANCED - Not Configured Yet)**

Mount source code as volumes in docker-compose.yml:

```yaml
# NOT CURRENTLY CONFIGURED - Would require changes to docker-compose.yml
aria-agent:
  volumes:
    - ../packages/aria-agent/src:/app/aria-agent/src  # Mount source
    - ../packages/aria-agent/dist:/app/aria-agent/dist
  command: npm run start:dev  # Use dev mode instead of production
```

**Recommendation:**
- **Production/Testing:** Use full Docker (docker-compose.yml)
- **Active Development:** Use hybrid mode (docker-compose.development.yml + local npm run dev)
- **Quick Changes:** Rebuild only the changed service (not all 5)

**Rebuild Time Optimization:**

```bash
# ❌ SLOW: Rebuild everything (10+ minutes)
docker-compose -f docker-compose.yml build

# ✅ FAST: Rebuild only what changed (2-3 minutes)
docker-compose -f docker-compose.yml build aria-agent  # Only backend
docker-compose -f docker-compose.yml build aria-ui     # Only frontend

# ✅ FASTER: Use Docker layer caching
# Docker caches unchanged layers, so if you only changed src/ files,
# the npm install layer is reused (saves 1-2 minutes)

# ✅ FASTEST: Use hybrid development mode (see above)
```

**Related Files:**
- `docker/docker-compose.yml` - Full stack Docker (production-like)
- `docker/docker-compose.development.yml` - Hybrid mode (infrastructure only)
- `docker/.env.example` - Template for environment variables
- `docker/README.md` - Detailed setup guide
- `docker/SECURITY_NOTICE.md` - Security remediation guide
- `docker/DOCKER_FIXES_SUMMARY.md` - Complete changelog of fixes
- `docker/start-all.ps1` - Windows PowerShell startup script
- `docker/start-all.sh` - Linux/Mac startup script

---

### Kubernetes Deployment (Production)

**File:** `helm/Chart.yaml`

**Helm Charts:**
- `helm/charts/aria-desktop/` - Desktop service
- `helm/charts/aria-agent/` - Backend API
- `helm/charts/aria-ui/` - Frontend
- `helm/charts/postgresql/` - Database (subchart)

**Configuration:** `helm/values.yaml`

**Key Features:**
- Auto-scaling for agent and UI
- Persistent volumes for database
- Ingress with TLS/SSL
- Secret management for API keys
- Resource limits and requests
- Health checks and readiness probes

**Quick Deploy:**
```bash
# Create values.yaml with API keys
cat > values.yaml <<EOF
aria-agent:
  apiKeys:
    anthropic:
      value: "sk-ant-your-key"
    openai:
      value: "sk-your-key"
    gemini:
      value: "your-key"
EOF

# Install
helm install aria ./helm --namespace aria --create-namespace -f values.yaml

# Access
kubectl port-forward -n aria svc/aria-ui 9992:9992
```

**Production Considerations:**
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Google Memorystore)
- Set up monitoring (Prometheus, Grafana)
- Configure ingress with custom domain
- Enable auto-scaling based on CPU/memory

---

### Railway Deployment (Easiest Cloud Option)

**Template:** https://railway.com/deploy/bytebot

**Services Deployed:**
- `bytebot-ui` - Frontend (public URL)
- `bytebot-agent` - Backend API
- `bytebot-desktop` - Desktop service
- `postgres` - Managed PostgreSQL
- `redis` - Managed Redis (optional)

**Configuration:**
- All services use Railway's private networking
- Only UI is exposed publicly
- Environment variables set via Railway dashboard
- Automatic SSL/HTTPS
- Zero-downtime deployments

**Benefits:**
- ✅ One-click deployment
- ✅ Automatic SSL
- ✅ Private networking
- ✅ Per-service logs
- ✅ Zero ops
- ❌ Can get expensive at scale

---

### Deployment Comparison

| Feature | Docker Compose | Railway | Kubernetes |
|---------|---------------|---------|------------|
| **Setup Time** | 5 minutes | 2 minutes | 30+ minutes |
| **Cost** | $5-20/month (VPS) | $20-100/month | $50-200+/month |
| **Scalability** | Manual | Auto (limited) | Full auto-scaling |
| **Maintenance** | You manage | Zero ops | DevOps team needed |
| **Best For** | Development, self-hosting | Small-medium scale | Enterprise, high scale |
| **SSL/HTTPS** | Manual (Let's Encrypt) | Automatic | Automatic (Ingress) |
| **Monitoring** | Manual setup | Built-in | Full observability stack |

**Recommendation:**
- **Development:** Docker Compose
- **Small-Medium Scale:** Railway
- **Enterprise/High Scale:** Kubernetes

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
11. **Automatic Key Rotation** - Immediate rotation on API key errors, gradual on other failures
12. **Docker Compose Deployment** - All services grouped under "aria" project in Docker Desktop
13. **Multi-Environment Support** - Docker (dev), Railway (cloud), Kubernetes (enterprise)

---

---

## Recent Fixes

### Fix: Plan Approval UI Not Displaying (March 19, 2026)

**Problem:** After the Orchestrator generated an execution plan, the task status changed to `NEEDS_HELP` but the plan approval UI component (`EditablePlanContent`) was not rendering in the frontend. Users couldn't see or approve the plan. The backend paused correctly, but no plan message was created for the frontend to display.

**Root Causes:**

1. **Missing Plan Message Creation**: The orchestrator was NOT creating a message with `MessageContentType.AgentPlan` content block after planning. Without this message, the frontend had no plan data to display in the chat area.

2. **Missing API Proxy Route**: The frontend was calling `/api/proxy/tasks/${taskId}/shared-state` but the `/api/proxy/` route handler didn't exist, causing 404 errors.

3. **Fallback to Old Plan Component**: The frontend was rendering the read-only `AgentPlanContent` component when `isAwaitingPlanApproval` was false, showing the old plan UI instead of nothing.

**Symptoms:**
- Backend logs showed: `[PAUSED] Waiting for user to approve or edit plan...`
- Backend correctly set status to `'awaiting_plan_approval'` in Redis
- Backend emitted WebSocket `agent_status` event
- Frontend logs showed: `GET /ff176873-e668-4e45-b6c2-6f379316f9e1/shared-state → 404`
- No plan message appeared in chat area
- User had to click "Proceed" button on VNC display to see old plan component
- Task remained stuck in `NEEDS_HELP` status

**Fixes Applied:**

**1. Backend: Create Plan Message** (`packages/aria-agent/src/orchestration/orchestration.service.ts`)

Added plan message creation after orchestrator planning, before pausing for approval:

```typescript
await this.sharedState.set(taskId, 'execution_plan', plan.steps);

// CREATE PLAN MESSAGE FOR FRONTEND DISPLAY
await this.messagesService.createAgentActionMessage(
  taskId,
  'ORCHESTRATOR',
  'plan',
  { plan: { steps: plan.steps } }
);

// PAUSE FOR USER APPROVAL
this.logger.log(`\n[PAUSED] Waiting for user to approve or edit plan...`);
await this.sharedState.set(taskId, 'status', 'awaiting_plan_approval');
this.emitStatus(taskId, 'awaiting_plan_approval', null);
```

**Why:** This creates a message with `MessageContentType.AgentPlan` content block that gets saved to the database and emitted via WebSocket. The frontend receives this message and can render it as `EditablePlanContent`.

**2. Frontend: Create API Proxy Route** (`packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts`)

Created the missing catch-all proxy route that forwards `/api/proxy/*` requests to the backend at `http://localhost:9991`.

**Why:** The frontend needs to call `/api/proxy/tasks/${taskId}/shared-state` to check if the task is awaiting plan approval. Without this route, all requests returned 404.

**3. Frontend: Remove Old Plan Component** (`packages/aria-ui/src/components/messages/content/MessageContent.tsx`)

Changed from conditional rendering (editable vs read-only) to only rendering editable plan:

```typescript
// BEFORE:
{isAgentPlanContentBlock(block) && (
  <>
    {isAwaitingPlanApproval && taskId ? (
      <EditablePlanContent {...} />
    ) : (
      <AgentPlanContent {...} />  // OLD COMPONENT
    )}
  </>
)}

// AFTER:
{isAgentPlanContentBlock(block) && isAwaitingPlanApproval && taskId && (
  <EditablePlanContent {...} />
)}
```

**Why:** Users should never see the read-only plan component. If the plan isn't awaiting approval, don't show it at all.

**Data Flow (Fixed):**

```
1. Orchestrator generates plan
         ↓
2. messagesService.createAgentActionMessage('plan', { plan })
         ↓
3. Message saved to DB with AgentPlanContentBlock
         ↓
4. TasksGateway.emitNewMessage() → WebSocket broadcast
         ↓
5. Redis: status = 'awaiting_plan_approval'
         ↓
6. Task status = NEEDS_HELP
         ↓
7. Frontend receives 'new_message' event
         ↓
8. Message added to chat history
         ↓
9. Page detects taskStatus === NEEDS_HELP
         ↓
10. Fetches /api/proxy/tasks/{taskId}/shared-state (via new proxy route)
         ↓
11. Confirms status === 'awaiting_plan_approval'
         ↓
12. Sets isAwaitingPlanApproval = true
         ↓
13. MessageContent finds isAgentPlanContentBlock(block) = true
         ↓
14. Checks: isAwaitingPlanApproval && taskId = true
         ↓
15. EditablePlanContent renders in chat area
         ↓
16. User edits steps and clicks "Build"
         ↓
17. POST /api/proxy/tasks/{taskId}/approve-plan
         ↓
18. Backend resumes execution with approved plan
```

**Testing:**

1. Create a task: "make a file named hello.txt"
2. Wait for clarifier to complete
3. **Verify:** Editable plan component appears in chat area (right side)
4. **Verify:** Each step shows type badge (WORKFLOW/DESKTOP/WEB)
5. **Verify:** Can click pencil icon to edit step description
6. **Verify:** "Build" button is visible at bottom
7. Click "Build" button
8. **Verify:** Page reloads and execution resumes
9. **Verify:** Desktop agent creates the file
10. **Verify:** Task completes successfully

**Files Changed:**
- **Modified:** `packages/aria-agent/src/orchestration/orchestration.service.ts` (added plan message creation)
- **Created:** `packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts` (API proxy route)
- **Modified:** `packages/aria-ui/src/components/messages/content/MessageContent.tsx` (removed old plan component)

**Related Components:**
- `packages/aria-ui/src/components/messages/content/EditablePlanContent.tsx` - Plan approval UI
- `packages/aria-ui/src/components/messages/content/AgentActionContent.tsx` - Old plan component (no longer used)
- `packages/aria-ui/src/app/tasks/[id]/page.tsx` - Plan approval status detection
- `packages/aria-agent/src/tasks/tasks.controller.ts` - Backend endpoints
- `packages/aria-agent/src/messages/messages.service.ts` - Message creation service

**Why This Happened:**

The plan approval feature was implemented with all the UI components and backend logic, but the critical step of creating the plan message was missing. The orchestrator was storing the plan in Redis and pausing execution, but never creating a message that the frontend could display. Additionally, the API proxy route was never created, preventing the frontend from checking the approval status.

**Prevention:**

When implementing features that require frontend-backend coordination:
1. Ensure messages are created for all data that needs to be displayed in the UI
2. Verify API proxy routes exist for all frontend API calls
3. Test the complete flow from backend to frontend
4. Check browser network tab for 404 errors
5. Verify WebSocket events are being emitted and received

---

### Fix: API Proxy Header Forwarding Issue (March 23, 2026)

**Problem:** Frontend requests to `/api/proxy/tasks` were failing with errors in `apiRequest()` even though direct curl requests to `http://localhost:9991/tasks` worked perfectly. The proxy was returning responses but the frontend couldn't parse them.

**Root Cause:** The Next.js API proxy route (`packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts`) was hardcoding `Content-Type: application/json` for both requests and responses, regardless of what the backend actually returned. This caused:
1. Non-JSON responses from backend to fail parsing in the frontend
2. Important request/response headers to be stripped
3. Error responses with different content types to be mishandled

**The Fix:**

**1. Forward All Headers (Except Hop-by-Hop)**

Changed from hardcoded headers to forwarding all headers from both request and response:

```typescript
// BEFORE:
const init: RequestInit = {
  method: req.method,
  headers: {
    "Content-Type": "application/json",
    ...(cookies && { Cookie: cookies }),
  },
  body: ...
};

// AFTER:
const forwardHeaders = new Headers();
const hopByHopHeaders = new Set([
  'connection', 'keep-alive', 'transfer-encoding', 
  'te', 'trailer', 'proxy-authorization', 'proxy-authenticate', 'upgrade'
]);

req.headers.forEach((value, key) => {
  if (!hopByHopHeaders.has(key.toLowerCase())) {
    forwardHeaders.set(key, value);
  }
});

const init: RequestInit = {
  method: req.method,
  headers: forwardHeaders,
  body: ...
};
```

**2. Preserve Backend Response Headers**

Changed from hardcoded response headers to forwarding actual backend headers:

```typescript
// BEFORE:
const responseHeaders = new Headers({
  "Content-Type": "application/json",
});

// AFTER:
const responseHeaders = new Headers();
res.headers.forEach((value, key) => {
  if (!hopByHopHeaders.has(key.toLowerCase())) {
    responseHeaders.set(key, value);
  }
});
```

**3. Improved Error Handling**

Added distinction between network errors and application errors:

```typescript
// BEFORE:
return new Response(
  JSON.stringify({ error: "Failed to proxy request" }),
  { status: 500, headers: { "Content-Type": "application/json" } }
);

// AFTER:
const isNetworkError = errorMessage.includes("fetch failed") || 
                      errorMessage.includes("ECONNREFUSED") ||
                      errorMessage.includes("ETIMEDOUT");

return new Response(
  JSON.stringify({ 
    error: "Failed to proxy request",
    details: errorMessage,
    type: isNetworkError ? "network_error" : "proxy_error",
    backendUrl: url
  }),
  {
    status: isNetworkError ? 503 : 500,
    headers: { "Content-Type": "application/json" }
  }
);
```

**4. Enhanced Frontend Error Logging**

Added response body logging to `apiRequest()` for better debugging:

```typescript
if (!response.ok) {
  const errorBody = await response.text();
  logger.error(
    { event: 'api.request_failed', endpoint, status: response.status, body: errorBody },
    `API request failed: ${response.status} ${response.statusText}`
  );
  throw new Error(...);
}
```

**Why This Matters:**

- **Content-Type Preservation:** Backend can return HTML error pages, plain text, or other formats - proxy now forwards the correct type
- **Header Forwarding:** Authorization, cache control, CORS, and other important headers are now preserved
- **Better Debugging:** Error responses include full details about what went wrong and where
- **Network vs App Errors:** 503 for network issues (backend down) vs 500 for proxy errors

**Files Changed:**
- **Modified:** `packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts` (header forwarding, error handling)
- **Modified:** `packages/aria-ui/src/utils/taskUtils.ts` (enhanced error logging, fixed fetchModels to use proxy)

**Testing:**
1. Start backend: `cd packages/aria-agent && npm run start:dev`
2. Start frontend: `cd packages/aria-ui && npm run dev`
3. Navigate to tasks page
4. **Verify:** No 404 errors in console
5. **Verify:** Tasks load correctly
6. **Verify:** Models dropdown populates
7. Stop backend
8. **Verify:** Frontend shows 503 network error (not 500)
9. Restart backend
10. **Verify:** Frontend reconnects and loads data

---

### Fix: Custom Server Express Middleware Conflict (March 23, 2026)

**Problem:** After fixing the proxy route headers, the frontend was still failing with "Failed to parse JSON response" errors. Testing revealed that `/api/proxy/tasks?limit=5` was returning "Hello World!" (12 bytes, `text/html`) instead of proxying to the backend. Direct backend requests worked fine, but the Next.js proxy route wasn't being executed at all.

**Root Cause:** The custom Express server in `packages/aria-ui/server.ts` had this line:

```typescript
expressApp.use("/api/proxy/tasks", tasksProxy);
```

This Express middleware intercepted ALL HTTP requests to `/api/proxy/tasks/*` BEFORE they could reach the Next.js API route handler. The `tasksProxy` middleware was configured to proxy to the backend's Socket.IO endpoint (`/socket.io`), not the REST API, causing it to return the Socket.IO HTTP polling response ("Hello World!") instead of task data.

**The Request Flow (Broken):**

```
Browser → /api/proxy/tasks?limit=5
    ↓
Express middleware intercepts
    ↓
Proxies to http://localhost:9991/socket.io (Socket.IO HTTP endpoint)
    ↓
Returns "Hello World!" (Socket.IO polling response)
    ↓
Frontend tries to parse as JSON → FAILS
```

**The Fix:**

Removed the Express HTTP middleware and let Next.js API routes handle regular HTTP requests. The WebSocket upgrade handler still works for Socket.IO connections.

```typescript
// BEFORE (server.ts):
expressApp.use("/api/proxy/tasks", tasksProxy);

// AFTER (server.ts):
// DON'T apply HTTP proxy here - let Next.js API routes handle it
// expressApp.use("/api/proxy/tasks", tasksProxy);
```

**The Request Flow (Fixed):**

```
Browser → /api/proxy/tasks?limit=5
    ↓
Express passes to Next.js (not intercepted)
    ↓
Next.js API route: /api/proxy/[[...path]]/route.ts
    ↓
Proxies to http://localhost:9991/tasks?limit=5
    ↓
Backend returns JSON task data
    ↓
Frontend parses successfully ✓
```

**WebSocket Flow (Still Works):**

```
Browser → WebSocket upgrade to /api/proxy/tasks
    ↓
server.on("upgrade") handler intercepts
    ↓
Proxies to http://localhost:9991/socket.io
    ↓
Socket.IO connection established ✓
```

**Additional Fixes:**

**1. Handle 304 Not Modified Responses**

The backend was returning `304 Not Modified` for cached requests, but the response body was empty. The frontend tried to parse the empty string as JSON and failed.

```typescript
// Added to apiRequest() in taskUtils.ts:
if (response.status === 304) {
  logger.debug({ event: 'api.cache_hit', endpoint }, `Using cached response for ${endpoint}`);
  return null; // Browser cache will handle this
}

// Handle empty responses
if (!bodyText || bodyText.trim() === '') {
  logger.warn({ event: 'api.empty_response', endpoint }, `Empty response from ${endpoint}`);
  return null;
}
```

**2. Strip Cache Headers in Proxy**

To avoid 304 responses with empty bodies, the proxy now strips cache validation headers before forwarding to the backend:

```typescript
// Added to proxy route:
forwardHeaders.delete('if-none-match');
forwardHeaders.delete('if-modified-since');
```

This ensures the proxy always gets fresh data (200 with body) instead of 304 (no body).

**Why This Matters:**

- **Separation of Concerns:** HTTP REST API requests go through Next.js API routes, WebSocket upgrades go through Express middleware
- **Correct Endpoints:** REST API calls hit `/tasks`, Socket.IO calls hit `/socket.io`
- **No Conflicts:** Express middleware doesn't intercept requests meant for Next.js
- **Cache Handling:** 304 responses and empty bodies are handled gracefully

**Files Changed:**
- **Modified:** `packages/aria-ui/server.ts` (removed Express middleware for `/api/proxy/tasks`)
- **Modified:** `packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts` (strip cache headers)
- **Modified:** `packages/aria-ui/src/utils/taskUtils.ts` (handle 304 and empty responses)

**Testing:**
1. Clear Next.js cache: `rm -rf packages/aria-ui/.next`
2. Start backend: `cd packages/aria-agent && npm run start:dev`
3. Start frontend: `cd packages/aria-ui && npm run dev`
4. Test direct backend: `curl http://localhost:9991/tasks?limit=5` → Should return JSON
5. Test proxy: `curl http://localhost:9992/api/proxy/tasks?limit=5` → Should return same JSON (not "Hello World!")
6. Open browser to `http://localhost:9992`
7. **Verify:** Tasks load without errors
8. **Verify:** No "Failed to parse JSON" errors in console
9. **Verify:** WebSocket connection still works (real-time updates)
10. Check Next.js terminal for `[Proxy] Forwarding GET http://localhost:9991/tasks?limit=5` logs

**Debugging Tips:**

If you see "Hello World!" from the proxy:
- The Express middleware is still intercepting requests
- Check `server.ts` and ensure the `expressApp.use("/api/proxy/tasks", ...)` line is commented out
- Restart the Next.js dev server

If you see "Failed to parse JSON":
- Check if the response is 304 with empty body
- Verify cache headers are being stripped in the proxy
- Check the response Content-Type header

If the proxy route isn't being hit:
- Clear the `.next` cache and restart
- Check for syntax errors in `route.ts`
- Verify the file is at `packages/aria-ui/src/app/api/proxy/[[...path]]/route.ts`

---

## Mock LLM Testing Flow

The system includes a deterministic mock LLM interceptor to facilitate end-to-end UI and state testing without spending real LLM tokens or relying on non-deterministic generation.

**Trigger:**
Enter the exact phrase `MOCK_TEST_COMPLEX_FLOW` as the initial task prompt in the frontend.

**Behavior:**
1. **Clarifier Agent:** Pauses to ask 2 predefined follow-up questions.
2. **Clarifier Agent (Pass 2):** Accepts answers and finalizes the clarified goal.
3. **Orchestrator Agent:** Issues a `list_workflows` tool call.
4. **Orchestrator Agent:** Issues a `read_workflow` tool call for `google-search`.
5. **Orchestrator Agent:** Generates a 5-step "edgy" hacker-themed plan (workflow, desktop, web, workflow, web) covering multiple execution agents.
6. **Plan Approval:** Execution pauses, rendering the `EditablePlanContent` UI for the user to verify and approve.
7. **Execution Agents:** 
   - Workflow executes naturally.
   - Desktop and Web agents execute benign mock tool calls (e.g., `echo` to terminal, `navigate` to example.com) and autonomously mark their steps complete.

This workflow uses `MockLlmModule` to globally intercept `GroqService` and `BytezService` API calls only for matching tasks, meaning it can be run safely in live environments.

---

## Frontend UI Fixes (March 19, 2026)

### Fix 1: WebSocket Reconnection Storm on Typing

**Problem:** Every keystroke in the chat input caused a full WebSocket disconnect/reconnect cycle. In the server logs this appeared as rapid-fire `Client connected / Client disconnected` pairs whenever the user typed.

**Root Cause:** `useWebSocket` passed all handler callbacks (`onTaskUpdate`, `onNewMessage`, etc.) as dependencies of the `connect` `useCallback`. These callbacks were recreated each render because `useChatSession` had them depend on state like `currentTaskId` and `toolCalls`. Typing updates `input` state → re-render → new callback instances → `connect` recreated → `useEffect` re-runs → socket disconnects and reconnects.

**Fix:** `packages/aria-ui/src/hooks/useWebSocket.ts`
- Socket is created in a `useEffect(() => { ... }, [])` with an **empty dependency array** — created exactly once on mount.
- Handler callbacks are stored in refs (`onTaskUpdateRef`, `onNewMessageRef`, etc.) that are updated **inline on each render** (no `useEffect` needed) — so socket listeners always call the latest callback without ever re-registering.
- Socket event listeners registered once, cleaned up only on unmount.

```typescript
// Before (broken): connect recreated every time handlers changed
const connect = useCallback(() => { ... }, [onTaskUpdate, onNewMessage, ...]); 
useEffect(() => { connect(); }, [connect]); // reconnects constantly!

// After (fixed): socket created once, refs always up-to-date
onTaskUpdateRef.current = onTaskUpdate; // inline — no effect needed
useEffect(() => {
  const socket = io(...);
  socket.on("task_updated", () => onTaskUpdateRef.current?.(task)); // always latest
  return () => socket.disconnect();
}, []); // ← empty: created once, never reconnects
```

---

### Fix 2: ToolCallContent Output Scrolling

**Problem:** When a tool call had a large output (e.g. `list_workflows` returning 11 workflows), the Result section would expand to unlimited height with no way to scroll, and only horizontal scroll was sort-of available.

**Fix:** `packages/aria-ui/src/components/messages/content/ToolCallContent.tsx`
- **Parameters box:** `max-h-40 overflow-auto` — capped at 160px, scrollable in both directions
- **Result/Error box:** `max-h-56 overflow-auto` — capped at 224px, scrollable in both directions
- Changed `whitespace-pre-wrap break-all` → **`whitespace-pre min-w-max`** on the `<pre>` — this preserves exact JSON formatting and allows proper horizontal scrolling (content doesn't word-wrap, container scrolls instead).

---

## Conversational Clarifier Redesign (March 19, 2026)

### Overview

The ClarifierAgent was redesigned from a "bulk Q&A form" model (ask all questions at once, max 6) to a **conversational chatbot** model:

- Asks **exactly ONE question per round** 
- User replies in the normal chat input
- Clarifier receives `originalPrompt + Q1 + A1 + Q2 + A2 + ...` and decides: clear enough? Or need one more question?
- **Maximum 6 rounds** enforced in both system prompt and prompt-building logic

### Bug Fixed: Clarification History Lost on Resume

**Root cause:** Every time the user answered a clarification question, `AgentProcessor.handleTaskResume()` only appended the LATEST user message to `task.description` and passed that to the orchestrator. This meant all prior Q&A context was silently dropped. The clarifier started fresh each round and asked the same questions repeatedly.

**Before (broken):**
```
Round 1: Clarifier asks "Who to send to?"
User answers "thangenabil@gmail.com"
Round 2: Clarifier gets: "send me a mail\n\nUser clarification: thangenabil@gmail.com"
  → STILL asks "Who to send to?" (no subject in context!)
```

**After (fixed):** Full Q&A history accumulates in Redis under `clarification_history` key:
```typescript
// Redis key: task:{taskId}:clarification_history
[
  { question: "Who to send to?", answer: "thangenabil@gmail.com" },
  { question: "What should the subject be?", answer: "Hello" },
]
```

### Files Changed

| File | Change |
|---|---|
| `clarifier.types.ts` | Added `ClarificationTurn`, `ClarificationHistory`. Changed `questions[]` → singular `question?`. `questions_asked` is now `0 \| 1` |
| `system-prompts.config.ts` | Rewrote CLARIFIER prompt: one-question-at-a-time, receives history section, max 6 rounds |
| `clarifier.agent.ts` | Accepts `{ userInput, history }` input. Builds prompt with full history. Parses singular question. Stores pending question in Redis |
| `orchestration.service.ts` | Reads `clarification_history` from Redis before calling clarifier. Passes full history. Wraps single question as `questions: [question]` for backend compat |
| `agent.processor.ts` | `handleTaskResume()` and `handleClarificationCompleted()` now accumulate history: load existing history → append `{pendingQuestion, latestAnswer}` → save back to Redis → call `orchestrationService.run(task.description, ...)` |

### Data Flow

```
User sends ambiguous task
  → Orchestrator reads clarification_history (empty on first run)
  → Clarifier receives { userInput, history: [] }
  → Clarifier asks Q1 → stored in messages + pending_clarification_question Redis key
  → Task paused (NEEDS_HELP)

User types answer in chat
  → handleTaskResume fires
  → Loads pending_clarification_question ("Who to send to?")
  → Gets latest user message answer ("thangenabil@gmail.com")  
  → Appends { question, answer } to clarification_history in Redis
  → Runs orchestration again with task.description (no concatenation needed)
  → Clarifier gets { userInput, history: [{Q, A}] }
  → Evaluates: "Do I have enough now?" → asks Q2 or produces clarified_goal
  → Repeats until questions_asked = 0, up to 6 rounds
```

---

**END OF DOCUMENTATION**

Generated: March 18, 2026  
Last Updated: March 19, 2026 - Conversational clarifier redesign (one-question-at-a-time, full Q&A history accumulation via Redis)  
Total Lines: ~3400+  
Coverage: Complete frontend-backend flow with exact tools, inputs, outputs, context sources, API key management, deployment options, Docker configuration fixes, plan approval UI fixes, WebSocket/UI component fixes, and conversational clarifier system




---

## PinchTab Authentication (March 21, 2026)

### Issue
PinchTab requires Bearer token authentication for all API endpoints, but the `PinchTabService` was not sending authentication headers, causing all requests to fail with `{"code":"missing_token","error":"unauthorized"}`.

### Root Cause
- PinchTab generates a random token on first startup and stores it in `~/.pinchtab/config.json`
- The token is required in the `Authorization: Bearer <token>` header for all API calls
- The backend service had no mechanism to retrieve or use this token

### Solution Implemented

#### 1. Updated PinchTabService (packages/aria-agent/src/services/pinchtab.service.ts)
- Added `authToken` property to store the authentication token
- Added `PINCHTAB_AUTH_TOKEN` environment variable support
- Added `fetchAuthToken()` method to retrieve token from ariad API endpoint
- Added `ensureAuthToken()` method to lazily fetch token on first request
- Modified `request()` method to include `Authorization: Bearer <token>` header

```typescript
// Constructor now reads token from environment
constructor() {
  this.baseUrl = process.env.PINCHTAB_BASE_URL || 'http://aria-desktop:9867';
  this.authToken = process.env.PINCHTAB_AUTH_TOKEN || null;
}

// Token is fetched from ariad service if not in environment
private async fetchAuthToken(): Promise<string | null> {
  const configUrl = `${this.baseUrl.replace(':9867', ':9990')}/api/pinchtab-config`;
  const response = await fetch(configUrl);
  const config = await response.json();
  return config?.server?.token || null;
}

// All requests now include Authorization header
headers['Authorization'] = `Bearer ${this.authToken}`;
```

#### 2. Added Ariad API Endpoint (packages/ariad/src/app.controller.ts)
- Added `/api/pinchtab-config` GET endpoint
- Reads `~/.pinchtab/config.json` from container filesystem
- Returns server configuration including authentication token

```typescript
@Get('/api/pinchtab-config')
async getPinchTabConfig() {
  const configPath = path.join(process.env.HOME || '/home/user', '.pinchtab', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return {
    server: {
      token: config?.server?.token || null,
      bind: config?.server?.bind || null,
      port: config?.server?.port || null,
    },
  };
}
```

#### 3. Updated Environment Variables
Added `PINCHTAB_AUTH_TOKEN` to:
- `packages/aria-agent/.env`
- `docker/.env`
- `docker/.env.example`

### Token Flow

1. **Container Startup**: PinchTab generates random token on first run
2. **Token Storage**: Token saved to `/home/user/.pinchtab/config.json`
3. **Backend Request**: PinchTabService calls `/api/pinchtab-config` endpoint
4. **Token Retrieval**: Ariad service reads config file and returns token
5. **Authentication**: All subsequent PinchTab requests include `Authorization: Bearer <token>` header

### Configuration Options

**Option 1: Auto-fetch (Recommended)**
Leave `PINCHTAB_AUTH_TOKEN` empty - token will be fetched automatically from ariad service.

**Option 2: Manual Configuration**
Set `PINCHTAB_AUTH_TOKEN` in environment variables if token is known in advance.

### Testing

```bash
# Without token (fails)
curl http://localhost:9867/health
# Returns: {"code":"missing_token","error":"unauthorized"}

# With token (succeeds)
curl -H "Authorization: Bearer <token>" http://localhost:9867/health
# Returns: {"status":"ok","mode":"dashboard","version":"0.8.4",...}
```

### Files Modified
- `packages/aria-agent/src/services/pinchtab.service.ts` - Added authentication support
- `packages/ariad/src/app.controller.ts` - Added config endpoint
- `packages/aria-agent/.env` - Added PINCHTAB_AUTH_TOKEN variable
- `docker/.env` - Added PINCHTAB_AUTH_TOKEN variable
- `docker/.env.example` - Added PINCHTAB_AUTH_TOKEN variable

### Impact
- All PinchTab API calls now work correctly with authentication
- No manual token configuration required (auto-fetched)
- Backward compatible (works with or without environment variable)
- Fixes "Empty reply from server" and "unauthorized" errors



---

## Environment Configuration & Docker Deployment

**Last Updated:** March 22, 2026  
**Purpose:** Dual-mode environment setup for local development and Docker deployment

### Overview

ARIA supports two deployment modes with environment-aware configuration:

1. **Local Development** - Backend/frontend on host, Docker services in containers
2. **Full Docker** - All services run in Docker containers

### The Problem (Fixed)

**Before:** Hardcoded `localhost` references in agent code prevented Docker deployment:
- `web.agent.ts` line 1283: Hardcoded `http://localhost:9867` for PinchTab screenshots
- `desktop.agent.ts` line 31: Wrong fallback `http://localhost:3001` (should be 9990)
- Services couldn't communicate via Docker service names

**After:** All services respect environment variables with proper fallbacks:
- Local development: Uses `localhost` to reach Docker services
- Docker deployment: Uses Docker service names (`aria-desktop`, `redis`, `postgres`)

### Environment Files Structure

```
packages/
├── aria-agent/
│   ├── .env              # Active configuration (copy from .env.local or .env.docker)
│   ├── .env.local        # Local development (localhost URLs)
│   ├── .env.docker       # Docker deployment (service names)
│   └── .env.example      # Template with all variables
├── aria-ui/
│   ├── .env              # Active configuration
│   ├── .env.local        # Local development
│   ├── .env.docker       # Docker deployment
│   └── .env.example      # Template
docker/
└── .env                  # API keys for docker-compose
```

### Environment Variables Reference

#### Backend (aria-agent)

| Variable | Local Value | Docker Value | Description |
|----------|-------------|--------------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/ariadb` | `postgresql://postgres:postgres@postgres:5432/ariadb` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379` | `redis://redis:6379` | Redis connection |
| `ARIA_DESKTOP_BASE_URL` | `http://localhost:9990` | `http://aria-desktop:9990` | Desktop service URL |
| `PINCHTAB_BASE_URL` | `http://localhost:9867` | `http://aria-desktop:9867` | PinchTab service URL |
| `ENABLE_MULTI_AGENT` | `true` | `true` | Enable multi-agent system |
| `AUTO_APPROVE_PLAN` | `true` | `true` | Auto-approve execution plans |
| `PORT` | `9991` | `9991` | Backend server port |

#### Frontend (aria-ui)

| Variable | Local Value | Docker Value | Description |
|----------|-------------|--------------|-------------|
| `ARIA_AGENT_BASE_URL` | `http://localhost:9991` | `http://aria-agent:9991` | Backend API URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:9991` | `http://aria-agent:9991` | Public API URL (Socket.io) |
| `ARIA_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | `ws://aria-desktop:9990/websockify` | VNC WebSocket URL |
| `NEXT_PUBLIC_DESKTOP_VNC_URL` | `ws://localhost:9990/websockify` | `ws://aria-desktop:9990/websockify` | Public VNC URL |

### Setup Instructions

#### Scenario 1: Local Development (Recommended)

**What runs where:**
- ✅ aria-agent: HOST MACHINE (npm run start:dev)
- ✅ aria-ui: HOST MACHINE (npm run dev)
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Quick Setup:**

```bash
# Option 1: Use setup script (Windows)
setup-local-dev.bat

# Option 2: Use setup script (Linux/Mac)
chmod +x setup-local-dev.sh
./setup-local-dev.sh

# Option 3: Manual setup
cd packages/aria-agent && cp .env.local .env
cd ../aria-ui && cp .env.local .env
```

**Start Services:**

```bash
# Terminal 1: Start Docker services
cd docker
docker-compose up postgres redis aria-desktop -d

# Terminal 2: Start backend (first time: run migrations)
cd packages/aria-agent
npx prisma migrate dev
npx prisma generate
npm run start:dev

# Terminal 3: Start frontend
cd packages/aria-ui
npm run dev
```

**Access:**
- Frontend: http://localhost:9992
- Backend API: http://localhost:9991
- Desktop VNC: http://localhost:9990

---

#### Scenario 2: Full Docker Deployment

**What runs where:**
- 🐳 aria-agent: DOCKER
- 🐳 aria-ui: DOCKER
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Setup:**

```bash
# 1. Ensure API keys are in docker/.env
cd docker
# Edit .env file and add your API keys

# 2. Build and start all services
docker-compose up --build

# 3. Run database migrations (first time only)
docker exec aria-agent npx prisma migrate deploy
docker exec aria-agent npx prisma generate
```

**Access:**
- Frontend: http://localhost:9992
- Backend API: http://localhost:9991
- Desktop VNC: http://localhost:9990

---

#### Scenario 3: Mixed Mode (UI in Docker, Agent on Host)

**What runs where:**
- ✅ aria-agent: HOST MACHINE
- 🐳 aria-ui: DOCKER
- 🐳 postgres: DOCKER
- 🐳 redis: DOCKER
- 🐳 aria-desktop: DOCKER

**Setup:**

```bash
# 1. Start Docker services (including UI)
cd docker
docker-compose up postgres redis aria-desktop aria-ui -d

# 2. Configure backend for local development
cd ../packages/aria-agent
cp .env.local .env

# 3. Start backend on host
npm run start:dev
```

**Note:** The UI container connects to `localhost:9991` which maps to your host machine.

### Code Changes (Fixed Issues)

#### 1. Fixed Desktop Agent Port (desktop.agent.ts)

**Before:**
```typescript
private readonly DESKTOP_BASE_URL = process.env.ARIA_DESKTOP_BASE_URL || 'http://localhost:3001';
```

**After:**
```typescript
private readonly DESKTOP_BASE_URL = process.env.ARIA_DESKTOP_BASE_URL || 'http://localhost:9990';
```

#### 2. Fixed PinchTab Screenshot URL (web.agent.ts)

**Before:**
```typescript
const response = await fetch(`http://localhost:9867/tabs/${tabId}/screenshot`, {
  method: 'GET',
});
```

**After:**
```typescript
const pinchtabBaseUrl = process.env.PINCHTAB_BASE_URL || 'http://localhost:9867';
const response = await fetch(`${pinchtabBaseUrl}/tabs/${tabId}/screenshot`, {
  method: 'GET',
});
```

### Docker Compose Configuration

The `docker-compose.yml` properly injects environment variables with Docker service names as defaults:

```yaml
aria-agent:
  environment:
    - DATABASE_URL=${DATABASE_URL:-postgresql://postgres:postgres@postgres:5432/ariadb}
    - ARIA_DESKTOP_BASE_URL=${ARIA_DESKTOP_BASE_URL:-http://aria-desktop:9990}
    - PINCHTAB_BASE_URL=${PINCHTAB_BASE_URL:-http://aria-desktop:9867}
    - REDIS_URL=${REDIS_URL:-redis://redis:6379}
    - ENABLE_MULTI_AGENT=${ENABLE_MULTI_AGENT:-true}
    # API keys passed from docker/.env
    - GROQ_API_KEY_1=${GROQ_API_KEY_1}
    - GOOGLE_API_KEY_1=${GOOGLE_API_KEY_1}
    - BYTEZ_API_KEY_1=${BYTEZ_API_KEY_1}
```

### Troubleshooting

#### aria-agent fails to connect to services in Docker

**Symptom:** Connection refused errors for postgres, redis, or aria-desktop

**Solution:** Make sure you're using the correct `.env` file:
```bash
# Local development
cd packages/aria-agent && cp .env.local .env

# Docker deployment - no need to copy, docker-compose injects variables
```

#### aria-ui can't connect to backend

**Symptom:** API calls fail, Socket.io disconnects

**Solution:** Check that `ARIA_AGENT_BASE_URL` matches your deployment:
- Local: `http://localhost:9991`
- Docker: `http://aria-agent:9991`

#### VNC viewer shows connection error

**Symptom:** Desktop viewer fails to connect

**Solution:** Verify `ARIA_DESKTOP_VNC_URL`:
- Local: `ws://localhost:9990/websockify`
- Docker: `ws://aria-desktop:9990/websockify`

#### Docker containers can't reach each other

**Symptom:** Services timeout when connecting to other containers

**Solution:** 
1. Ensure all services are on the same Docker network (`aria-network`)
2. Use Docker service names (not `localhost`) in environment variables
3. Check `docker-compose ps` to verify all containers are running

### Best Practices

1. **Never commit `.env` files** - They contain sensitive API keys
2. **Use `.env.local` for development** - Faster iteration with hot reload
3. **Use Docker for production** - Consistent deployment environment
4. **Keep `docker/.env` updated** - Ensure API keys are current
5. **Run migrations after switching modes** - Database schema must be up to date

### Quick Reference Commands

```bash
# Switch to local development
cd packages/aria-agent && cp .env.local .env
cd ../aria-ui && cp .env.local .env

# View current configuration
cat packages/aria-agent/.env
cat packages/aria-ui/.env
cat docker/.env

# Start Docker services only (local dev)
cd docker && docker-compose up postgres redis aria-desktop -d

# Start all services in Docker
cd docker && docker-compose up --build

# Stop all Docker services
cd docker && docker-compose down

# View Docker logs
docker logs aria-agent -f
docker logs aria-ui -f
docker logs aria-desktop -f

# Restart a specific service
docker-compose restart aria-agent
```

### Files Created/Modified

**New Files:**
- `packages/aria-agent/.env.local` - Local development configuration
- `packages/aria-agent/.env.docker` - Docker deployment configuration
- `packages/aria-ui/.env.local` - Frontend local configuration
- `packages/aria-ui/.env.docker` - Frontend Docker configuration
- `docker/.env` - API keys for docker-compose
- `ENVIRONMENT_SETUP.md` - Complete setup guide
- `setup-local-dev.bat` - Windows setup script
- `setup-local-dev.sh` - Linux/Mac setup script

**Modified Files:**
- `packages/aria-agent/src/agents/desktop/desktop.agent.ts` - Fixed port fallback
- `packages/aria-agent/src/agents/web/web.agent.ts` - Fixed hardcoded PinchTab URL
- `packages/aria-agent/.env.example` - Added missing environment variables
- `packages/aria-ui/.env.example` - Added missing environment variables

### Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Network (aria-network)            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   postgres   │  │    redis     │  │ aria-desktop │     │
│  │   :5432      │  │    :6379     │  │   :9990      │     │
│  │              │  │              │  │   :9867      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         ▲                 ▲                  ▲              │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │   aria-agent    │                        │
│                  │     :9991       │                        │
│                  └────────┬────────┘                        │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │    aria-ui      │                        │
│                  │     :9992       │                        │
│                  └─────────────────┘                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Host Machine
                  (localhost:9992)
```

**Local Development Mode:**
- aria-agent and aria-ui run on host
- Connect to Docker services via `localhost:5432`, `localhost:6379`, `localhost:9990`
- Docker services expose ports to host

**Full Docker Mode:**
- All services run in Docker
- Services communicate via Docker service names
- Only frontend port (9992) exposed to host

### Summary

The environment configuration system now supports:
- ✅ Seamless switching between local and Docker deployment
- ✅ No hardcoded URLs in code
- ✅ Environment-aware service discovery
- ✅ Proper Docker networking with service names
- ✅ Easy setup with automated scripts
- ✅ Clear documentation and troubleshooting guides

This fixes the original issue where aria-agent couldn't run in Docker due to hardcoded localhost references.


---

## Control Center Pages

**Added:** March 23, 2026  
**Purpose:** Operator interface for manual task control and tool execution

### Overview

Control Center provides a specialized interface at `/control/tasks` for operators to manually control ARIA tasks with enhanced capabilities beyond the standard user interface.

### Routes

| Route | Purpose |
|-------|---------|
| `/control/tasks` | Control center task list with operator view |
| `/control/tasks/[id]` | Individual task control page with Stream Deck tool panel |

### Key Features

**Stream Deck Tool Panel:**
- Manual execution of Web Agent tools (30 PinchTab tools)
- Manual execution of Desktop Agent tools (18 desktop tools)
- Real-time tool execution with modal feedback
- Stop/Resume agent controls

**Operator Role:**
- WebSocket connection joins as `OPERATOR` role (not `USER`)
- Receives control-specific events
- Can execute tools manually while agent is stopped

**VNC Interaction Control:**
- VNC is interactive ONLY when user has taken over control (`control === Role.USER`)
- Same rules as regular task page - requires "takeover" status
- Previously had bug where VNC was always interactive in control mode (fixed March 23, 2026)

### Components

**Control Task List:**
- `packages/aria-ui/src/app/control/tasks/page.tsx` - Main control center page
- `packages/aria-ui/src/components/tasks/ControlTaskItem.tsx` - Task list item component

**Control Task Detail:**
- `packages/aria-ui/src/app/control/tasks/[id]/page.tsx` - Individual task control page
- `packages/aria-ui/src/components/control/StreamDeckToolPanel.tsx` - Tool execution panel
- `packages/aria-ui/src/components/control/ToolExecutionModal.tsx` - Tool execution feedback modal
- `packages/aria-ui/src/components/control/TaskStatusDropdown.tsx` - Task status dropdown (NEW - March 23, 2026)

**Hooks:**
- `packages/aria-ui/src/hooks/useControlCenter.ts` - Control center state management

### VNC Interaction Rules

Both regular task pages (`/tasks/[id]`) and control pages (`/control/tasks/[id]`) follow the same VNC interaction rules:

```typescript
// Determine if user has control or is in takeover mode
function hasUserControl(): boolean {
  return (
    control === Role.USER &&
    (taskStatus === TaskStatus.RUNNING ||
      taskStatus === TaskStatus.NEEDS_HELP)
  );
}

// VNC is interactive ONLY when user has control
function vncViewOnly(): boolean {
  return !hasUserControl();
}
```

**VNC States:**
- `viewOnly={true}` - Read-only, no mouse/keyboard interaction
- `viewOnly={false}` - Interactive, full mouse/keyboard control

**When VNC is Interactive:**
- User has clicked "Take Over" button (sets `control = Role.USER`)
- Task status is `RUNNING` or `NEEDS_HELP`

**When VNC is Read-Only:**
- Agent is in control (`control = Role.ASSISTANT`)
- Task is inactive (`COMPLETED`, `FAILED`, `CANCELLED`)
- Task is pending (`PENDING`)

### Bug Fix: VNC Always Interactive in Control Mode (March 23, 2026)

**Problem:** VNC was always interactive on `/control/tasks/[id]` page regardless of takeover status, violating the requirement that VNC should only be interactive when user has taken over control.

**Root Cause:** The `vncViewOnly()` function in control task page was hardcoded to return `false`, bypassing the takeover status check.

**Fix:** Changed `vncViewOnly()` to use the same logic as regular task page: `return !hasUserControl()`.

**Files Modified:**
- `packages/aria-ui/src/app/control/tasks/[id]/page.tsx` - Fixed VNC interaction control

### Bug Fix: Stop Agent Doesn't Actually Stop Agents (March 23, 2026)

**Problem:** Clicking "Stop Agent" button set Redis flags (`manual_control = true`) but agents continued executing. The orchestration service didn't check these flags during execution, so agents would keep running through all steps.

**Root Cause:** The orchestration service had no polling mechanism to check the `manual_control` flag. It would execute the entire plan without pausing, even when operator clicked "Stop Agent".

**Fix:** Added `waitForManualControlRelease()` method that:
1. Checks `manual_control` flag before each step execution
2. Pauses execution when flag is `true`
3. Polls Redis every 2 seconds to check if flag changes
4. Resumes execution when flag is set to `false`
5. Throws error if task is cancelled during pause

**Files Modified:**
- `packages/aria-agent/src/orchestration/orchestration.service.ts` - Added manual control polling

**Implementation:**
```typescript
private async waitForManualControlRelease(taskId: string): Promise<void> {
  const manualControl = await this.sharedState.get<boolean>(taskId, 'manual_control');
  
  if (!manualControl) {
    return; // Not in manual control, continue execution
  }
  
  this.logger.log(`\n[PAUSED] Manual control active - agent execution paused`);
  
  // Poll every 2 seconds until manual control is released
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const stillInManualControl = await this.sharedState.get<boolean>(taskId, 'manual_control');
    
    if (!stillInManualControl) {
      this.logger.log(`[RESUMED] Manual control released - resuming agent execution\n`);
      return;
    }
    
    // Check if task was cancelled while paused
    const task = await this.tasksService.findById(taskId);
    if (task.status === TaskStatus.CANCELLED) {
      throw new Error(`Task ${taskId} was cancelled during manual control`);
    }
  }
}
```

### Feature: Task Status Dropdown (March 23, 2026)

**Purpose:** Allow operators to manually change task status from control page to any valid TaskStatus value.

**Implementation:**

**Backend Endpoint:**
- `POST /control/tasks/:taskId/update-status` - Update task status
- Validates status against allowed values
- Updates database and Redis shared state
- Emits WebSocket event for status change
- Triggers cleanup for CANCELLED/FAILED statuses

**Frontend Component:**
- `TaskStatusDropdown` component with Select UI
- Color-coded status options
- Real-time status updates via API
- Integrated into control page header

**Files Created:**
- `packages/aria-ui/src/components/control/TaskStatusDropdown.tsx` - Status dropdown component

**Files Modified:**
- `packages/aria-agent/src/control-center/control-center.controller.ts` - Added update-status endpoint
- `packages/aria-agent/src/control-center/control-center.service.ts` - Added updateTaskStatus method
- `packages/aria-ui/src/app/control/tasks/[id]/page.tsx` - Added dropdown to header

**Valid Status Values:**
- `PENDING` - Task is queued
- `RUNNING` - Task is executing
- `NEEDS_HELP` - Task needs user input
- `NEEDS_REVIEW` - Task needs review
- `COMPLETED` - Task finished successfully
- `CANCELLED` - Task was cancelled
- `FAILED` - Task failed

**Usage:**
1. Open control page at `/control/tasks/[id]`
2. Click status dropdown in header (next to "CONTROL MODE" badge)
3. Select new status from dropdown
4. Status updates immediately across all clients via WebSocket

### Feature: Operator Tool Usage Display in Chat (March 23, 2026)

**Purpose:** Make operator tool usage appear in the chat section just like agent tool usage, providing visual feedback and transparency.

**Problem:** When operators manually execute tools from the Stream Deck panel, the tool calls were not visible in the chat. Only agents' tool usage was displayed, making it unclear what the operator had done.

**Solution:** Integrated `BrowserLoggerService` into control center to emit `browser_log` events for operator tool execution.

**Implementation:**

**Backend Changes:**
- Added `BrowserLoggerService` dependency to `ControlCenterService`
- Emit `tool.call` event before tool execution
- Emit `tool.result` event after tool execution (success or failure)
- Track execution duration for display

**Flow:**
1. Operator clicks tool in Stream Deck panel
2. Backend emits `browser_log` event with type `tool.call` and agentName `OPERATOR`
3. Tool executes (Web, Desktop, or Workflow)
4. Backend emits `browser_log` event with type `tool.result` including success/error/duration
5. Frontend `useChatSession` receives events and updates `toolCalls` Map
6. `ToolCallContent` component renders operator tool call in chat

**Visual Display:**
- Operator tool calls appear with agent name "OPERATOR"
- Same UI as agent tool calls (wrench icon, expandable details)
- Shows tool name, parameters, result, duration, and success/error status
- Color-coded: green for success, red for error

**Files Modified:**
- `packages/aria-agent/src/control-center/control-center.service.ts` - Added BrowserLoggerService integration

**Example:**
```
🔧 OPERATOR → pinchtab_screenshot ✓ 1234ms
   Input: {}
   Output: { base64: "...", width: 1920, height: 1080 }
```

**Benefits:**
- Full transparency of operator actions
- Same visual treatment as agent actions
- Easy to track what was done manually vs automatically
- Helps with debugging and audit trails

### Usage

**Accessing Control Center:**
1. Navigate to `/control/tasks` to see all tasks in operator view
2. Click on a task to open control page at `/control/tasks/[id]`
3. Use Stream Deck panel to manually execute tools
4. Click "Take Over" to gain VNC interaction control
5. Click "Proceed" to return control to agent

**Manual Tool Execution:**
1. Ensure agent is stopped (click "Stop Agent" if needed)
2. Select tool from Stream Deck panel
3. Fill in tool parameters in modal
4. Execute tool and view result in modal AND chat
5. Tool call appears in chat with "OPERATOR" label
6. Resume agent when ready

### Differences from Regular Task Page

| Feature | Regular Task Page | Control Task Page |
|---------|------------------|-------------------|
| Route | `/tasks/[id]` | `/control/tasks/[id]` |
| WebSocket Role | `USER` | `OPERATOR` |
| Stream Deck Panel | ❌ No | ✅ Yes |
| Manual Tool Execution | ❌ No | ✅ Yes |
| VNC Interaction | Only on takeover | Only on takeover (same) |
| Stop/Resume Agent | ❌ No | ✅ Yes |
| Task Status Dropdown | ❌ No | ✅ Yes (NEW - March 23, 2026) |
| Badge | None | "🎮 CONTROL MODE" |


### Webhook-Based Workflow Completion (March 31, 2026)

**Problem:** Long-running workflows (like OpenCode) need to notify the system when they're done. Previously used slow AI vision polling.

**Solution:** Event-driven webhook system where external processes (OpenCode, scripts) send HTTP POST when complete.

#### Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  OpenCode   │  curl   │  Webhook         │  emit   │  Workflow       │
│  (Desktop)  │────────>│  Controller      │────────>│  Execution      │
│             │         │  (NestJS)        │         │  (Waiting)      │
└─────────────┘         └──────────────────┘         └─────────────────┘
                                │                              │
                                │ EventEmitter2                │
                                └──────────────────────────────┘
                                   workflow.{taskId}.{name}.complete
```

#### Webhook Endpoints

**1. Completion Notification**
```bash
POST /workflows/completion/:taskId/:workflowName
Content-Type: application/json

{
  "success": true,
  "message": "Task completed successfully",
  "files": ["/home/user/Desktop/report.pdf"],
  "metadata": {
    "duration_seconds": 45,
    "library": "reportlab"
  }
}
```

**2. Progress Updates (Optional)**
```bash
POST /workflows/progress/:taskId/:workflowName
Content-Type: application/json

{
  "progress": 50,
  "status": "Creating slides...",
  "metadata": {"slides_done": 3}
}
```

#### Implementation Files

**Controller:** `packages/aria-agent/src/workflows/workflow-completion.controller.ts`
```typescript
@Controller('workflows/completion')
export class WorkflowCompletionController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post(':taskId/:workflowName')
  async markComplete(
    @Param('taskId') taskId: string,
    @Param('workflowName') workflowName: string,
    @Body() payload: WorkflowCompletionPayload,
  ) {
    // Emit event that workflow is waiting for
    this.eventEmitter.emit(`workflow.${taskId}.${workflowName}.complete`, payload);
    return { received: true, timestamp: new Date().toISOString() };
  }
}
```

**Helper:** `packages/aria-agent/workflows/helpers/webhook-completion.helper.ts`
```typescript
export async function waitForWebhookCompletion(
  taskId: string,
  workflowName: string,
  eventEmitter: EventEmitter2,
  logger: WorkflowLogger,
  timeoutMs: number = 300000,
): Promise<WebhookCompletionResult> {
  return new Promise((resolve, reject) => {
    const eventName = `workflow.${taskId}.${workflowName}.complete`;
    
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Webhook not received within ${timeoutMs / 1000}s`));
    }, timeoutMs);

    eventEmitter.once(eventName, (payload) => {
      clearTimeout(timeoutHandle);
      resolve({
        success: payload.success,
        message: payload.message,
        files: payload.files,
        completionMethod: 'webhook',
      });
    });
  });
}

export function generateWebhookInstructions(
  taskId: string,
  workflowName: string,
  backendUrl: string = 'http://localhost:9991',
): string {
  return `
After completing ALL tasks, run this command:

curl -X POST ${backendUrl}/workflows/completion/${taskId}/${workflowName} \\
  -H "Content-Type: application/json" \\
  -d '{"success": true, "message": "Task completed", "files": ["/path/to/file.ext"]}'
  `;
}
```

#### Usage in Workflows

**Example: OpenCode Workflow**
```typescript
export async function execute(variables, services) {
  const { desktop, taskId, eventEmitter } = services;
  
  // 1. Generate webhook instructions for OpenCode
  const webhookInstructions = generateWebhookInstructions(taskId, 'opencode-request');
  
  // 2. Append to prompt
  const finalPrompt = userPrompt + webhookInstructions;
  
  // 3. Submit prompt to OpenCode
  await desktop.pasteText(finalPrompt);
  await desktop.pressKeys(['Return']);
  
  // 4. Wait for webhook (with vision fallback)
  const result = await Promise.race([
    // Primary: webhook (instant)
    waitForWebhookCompletion(taskId, 'opencode-request', eventEmitter, logger, 480000),
    
    // Fallback: vision detection after 6 min
    (async () => {
      await desktop.wait(360000);
      return await visionFallbackDetection(desktop, logger);
    })(),
  ]);
  
  return {
    success: result.success,
    message: result.message,
    data: {
      files: result.files,
      completionMethod: result.completionMethod, // 'webhook' or 'vision-fallback'
    },
  };
}
```

#### Benefits

| Aspect | Vision Polling (Old) | Webhook (New) |
|--------|---------------------|---------------|
| Detection Speed | 30-60s delay | Instant (0s) |
| Token Cost | High (screenshots + AI) | Zero |
| Reliability | ~85% (AI guessing) | 100% (exact) |
| Metadata | None | Rich (files, status, etc.) |
| Progress Updates | No | Yes (optional) |
| Max Wait Time | 3 minutes | 8 minutes |

#### Fallback Strategy

If webhook not received after 6 minutes:
1. Log warning: "No webhook received, falling back to vision"
2. Run old AI vision detection loop
3. Mark completion method as `'vision-fallback'`
4. Continue workflow execution

This ensures workflows never hang indefinitely if OpenCode fails to send webhook.

