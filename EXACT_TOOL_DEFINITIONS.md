# EXACT Tool Definitions - From Actual Code

## 🖥️ Desktop Agent Tools

**File**: `packages/aria-agent/src/agents/desktop/desktop.tools.ts`

### Tool 1: `computer`

**Description**: Control mouse and keyboard to interact with the desktop

**Parameters**:
```typescript
{
  action: 'click' | 'double_click' | 'right_click' | 'type' | 'paste' | 
          'key' | 'screenshot' | 'scroll' | 'application' | 'terminal_command',
  x?: number,              // For mouse actions
  y?: number,              // For mouse actions
  text?: string,           // For type/paste/key actions
  direction?: 'up'|'down', // For scroll
  amount?: number,         // For scroll
  application?: string,    // For application action
  command?: string         // For terminal_command
}
```

**Required**: `action` only

### Tool 2: `set_task_status`

**Description**: Mark the current step as completed or failed

**Parameters**:
```typescript
{
  status: 'completed' | 'failed',
  message: string
}
```

**Required**: Both `status` and `message`

---

## 🌐 Web Agent Tools

**File**: `packages/aria-agent/src/groq/pinchtab.tools.ts`

### Tool 1: `pinchtab_health`

**Description**: Check if PinchTab service is available and healthy

**Parameters**: None (empty object)

**Example**:
```json
{
  "name": "pinchtab_health",
  "input": {}
}
```

**Returns**: `{"status": "healthy"}` or `{"status": "unhealthy", "message": "..."}`

---

### Tool 2: `pinchtab_launch_instance`

**Description**: Launch a new browser instance (headed = visible in VNC, headless = background)

**Parameters**:
```typescript
{
  name: string,      // Instance name/profile (e.g., "myinstance", "default")
  mode: 'headed' | 'headless'  // headed = visible in VNC, headless = background
}
```

**Required**: Both `name` and `mode`

**Example**:
```json
{
  "name": "pinchtab_launch_instance",
  "input": {
    "name": "demo",
    "mode": "headed"
  }
}
```

**Returns**: `{"id": "instance-id", "url": "..."}`

---

### Tool 3: `pinchtab_list_instances`

**Description**: List all browser instances with their IDs and status

**Parameters**: None (empty object)

**Example**:
```json
{
  "name": "pinchtab_list_instances",
  "input": {}
}
```

**Returns**: `[{"id": "...", "status": "ready", ...}, ...]`

---

### Tool 4: `pinchtab_stop_instance`

**Description**: Stop and close a browser instance

**Parameters**:
```typescript
{
  instanceId: string  // The instance ID to stop
}
```

**Required**: `instanceId`

**Example**:
```json
{
  "name": "pinchtab_stop_instance",
  "input": {
    "instanceId": "instance-abc123"
  }
}
```

---

### Tool 5: `pinchtab_list_tabs`

**Description**: List all open tabs in the current or specified instance

**Parameters**:
```typescript
{
  instanceId?: string  // Optional, uses current instance if not provided
}
```

**Required**: None

**Example**:
```json
{
  "name": "pinchtab_list_tabs",
  "input": {}
}
```

**Returns**: `[{"tabId": "...", "url": "...", ...}, ...]`

---

### Tool 6: `pinchtab_switch_tab`

**Description**: Switch to a different tab by its ID

**Parameters**:
```typescript
{
  tabId: string  // The tab ID to switch to
}
```

**Required**: `tabId`

**Example**:
```json
{
  "name": "pinchtab_switch_tab",
  "input": {
    "tabId": "tab-xyz789"
  }
}
```

---

### Tool 7: `pinchtab_navigate`

**Description**: Navigate to a URL in the browser (opens a new tab)

**Parameters**:
```typescript
{
  url: string  // Must include protocol (e.g., https://)
}
```

**Required**: `url`

**Example**:
```json
{
  "name": "pinchtab_navigate",
  "input": {
    "url": "https://www.google.com"
  }
}
```

---

### Tool 8: `pinchtab_click`

**Description**: Click on an element in the browser by its reference ID

**Parameters**:
```typescript
{
  ref: string  // Element reference from snapshot (e.g., "e1", "e42")
}
```

**Required**: `ref`

**Example**:
```json
{
  "name": "pinchtab_click",
  "input": {
    "ref": "e27"
  }
}
```

---

### Tool 9: `pinchtab_type`

**Description**: Type text into an element (✅ WORKS - use this instead of fill which is broken)

**Parameters**:
```typescript
{
  ref: string,   // Element reference of input field
  text: string   // Text to type
}
```

**Required**: Both `ref` and `text`

**Example**:
```json
{
  "name": "pinchtab_type",
  "input": {
    "ref": "e23",
    "text": "search query"
  }
}
```

**⚠️ IMPORTANT**: This is the tool that WORKS for text input. Never use `pinchtab_fill`.

---

### Tool 10: `pinchtab_press`

**Description**: Press a keyboard key or key combination

**Parameters**:
```typescript
{
  key: string  // Key to press (e.g., "Enter", "Escape", "Tab", "Ctrl+C")
}
```

**Required**: `key`

**Example**:
```json
{
  "name": "pinchtab_press",
  "input": {
    "key": "Enter"
  }
}
```

---

### Tool 11: `pinchtab_submit`

**Description**: Submit a form by clicking its submit button

**Parameters**:
```typescript
{
  ref: string  // Element reference of submit button
}
```

**Required**: `ref`

**Example**:
```json
{
  "name": "pinchtab_submit",
  "input": {
    "ref": "e27"
  }
}
```

---

### Tool 12: `pinchtab_scroll`

**Description**: Scroll the page up or down

**Parameters**:
```typescript
{
  direction: 'up' | 'down',
  amount?: number  // Pixels to scroll (default: 500)
}
```

**Required**: `direction`

**Example**:
```json
{
  "name": "pinchtab_scroll",
  "input": {
    "direction": "down",
    "amount": 500
  }
}
```

---

### Tool 13: `pinchtab_wait`

**Description**: Wait for a specified duration

**Parameters**:
```typescript
{
  ms: number  // Milliseconds to wait (max: 5000)
}
```

**Required**: `ms`

**Example**:
```json
{
  "name": "pinchtab_wait",
  "input": {
    "ms": 2000
  }
}
```

---

### Tool 14: `pinchtab_get_snapshot`

**Description**: Get the current page snapshot with element references

**Parameters**: None (empty object)

**Example**:
```json
{
  "name": "pinchtab_get_snapshot",
  "input": {}
}
```

**Returns**:
```json
{
  "count": 30,
  "nodes": [
    {"ref": "e23", "role": "combobox", "name": "Search", "focused": true},
    {"ref": "e27", "role": "button", "name": "Google Search"},
    {"ref": "e28", "role": "button", "name": "I'm Feeling Lucky"}
  ]
}
```

---

## 🔄 How Web Agent Executes Tools

### Execution Flow

```
1. Web Agent gets page snapshot from PinchTab
   ↓
2. Builds decision prompt with snapshot (element refs)
   ↓
3. Calls Groq with system prompt + messages + PinchTab tools
   ↓
4. LLM returns structured tool call:
   {name: "pinchtab_click", input: {ref: "e27"}}
   ↓
5. Web Agent extracts tool call
   ↓
6. Calls PinchTabService method:
   await pinchTabService.click("e27")
   ↓
7. PinchTabService makes HTTP request:
   POST http://aria-desktop:9867/tabs/{tabId}/action
   {kind: "click", ref: "e27"}
   ↓
8. PinchTab executes browser action
   ↓
9. Web Agent gets fresh snapshot and continues iteration
```

### Tool Execution Handler

**Location**: `packages/aria-agent/src/agents/web/web.agent.ts`

The `executeToolCall()` method handles all tool executions:

```typescript
private async executeToolCall(toolCall: any): Promise<void> {
  const { name, input } = toolCall;
  
  switch (name) {
    case 'pinchtab_health':
      result = await this.pinchTabService.getHealth();
      break;

    case 'pinchtab_launch_instance':
      result = await this.pinchTabService.launchInstance(input.name, input.mode);
      break;

    case 'pinchtab_list_instances':
      result = await this.pinchTabService.listInstances();
      break;

    case 'pinchtab_stop_instance':
      await this.pinchTabService.stopInstance(input.instanceId);
      break;

    case 'pinchtab_list_tabs':
      result = await this.pinchTabService.listTabs(input.instanceId);
      break;

    case 'pinchtab_switch_tab':
      await this.pinchTabService.switchTab(input.tabId);
      break;

    case 'pinchtab_navigate':
      await this.pinchTabService.navigate(input.url);
      break;

    case 'pinchtab_click':
      await this.pinchTabService.click(input.ref);
      break;

    case 'pinchtab_type':
      await this.pinchTabService.type(input.ref, input.text);
      break;

    case 'pinchtab_press':
      await this.pinchTabService.press(input.key);
      break;

    case 'pinchtab_submit':
      await this.pinchTabService.submit(input.ref);
      break;

    case 'pinchtab_scroll':
      await this.pinchTabService.scroll(input.direction, input.amount || 3);
      break;

    case 'pinchtab_wait':
      await this.pinchTabService.wait(input.ms);
      break;

    case 'pinchtab_get_snapshot':
      // No action needed - already have snapshot
      break;
  }
}
```

### PinchTab Service Methods

**Location**: `packages/aria-agent/src/services/pinchtab.service.ts`

Each tool maps to a service method that makes HTTP requests to PinchTab API:

```typescript
// Health check
async getHealth(): Promise<{ status: string; message?: string }>

// Instance management
async launchInstance(name: string, mode: 'headed' | 'headless'): Promise<PinchTabInstance>
async listInstances(): Promise<any[]>
async stopInstance(instanceId: string): Promise<void>

// Tab management
async listTabs(instanceId?: string): Promise<any[]>
async switchTab(tabId: string): Promise<void>

// Navigation
async navigate(url: string, instanceId?: string): Promise<string>

// Page interaction
async snapshot(filter: 'all' | 'interactive', tabId?: string): Promise<PinchTabSnapshot>
async click(ref: string, tabId?: string): Promise<{ success: boolean; message?: string }>
async type(ref: string, text: string, tabId?: string): Promise<{ success: boolean; message?: string }>
async press(key: string, tabId?: string): Promise<{ success: boolean; message?: string }>
async submit(ref: string, tabId?: string): Promise<{ success: boolean; message?: string }>
async scroll(direction: 'up' | 'down', amount: number, tabId?: string): Promise<{ success: boolean; message?: string }>
async wait(ms: number): Promise<{ success: boolean; message?: string }>
```

### PinchTab API Endpoints

All requests go to `http://aria-desktop:9867`:

| Tool | HTTP Method | Endpoint | Body |
|------|-------------|----------|------|
| health | GET | `/health` | - |
| launch_instance | POST | `/instances/launch` | `{name, mode}` |
| list_instances | GET | `/instances` | - |
| stop_instance | POST | `/instances/{id}/stop` | - |
| list_tabs | GET | `/instances/{id}/tabs` | - |
| navigate | POST | `/instances/{id}/tabs/open` | `{url}` |
| snapshot | GET | `/tabs/{id}/snapshot?filter=interactive` | - |
| click | POST | `/tabs/{id}/action` | `{kind: "click", ref}` |
| type | POST | `/tabs/{id}/action` | `{kind: "type", ref, text}` |
| press | POST | `/tabs/{id}/action` | `{kind: "press", key}` |
| submit | POST | `/tabs/{id}/action` | `{kind: "submit", ref}` |
| scroll | POST | `/tabs/{id}/action` | `{kind: "scroll", direction, amount}` |

---

## 📋 How Agents Mark Steps Complete

### Desktop Agent

Uses the `set_task_status` tool:

```json
{
  "name": "set_task_status",
  "arguments": {
    "status": "completed",
    "message": "Chrome opened successfully"
  }
}
```

Or for failure:

```json
{
  "name": "set_task_status",
  "arguments": {
    "status": "failed",
    "message": "Chrome icon not found after 3 attempts"
  }
}
```

### Web Agent

**Does NOT have a completion tool!** Instead:

1. Returns text response with keywords: "complete", "success", or "done"
2. The agent code checks for these keywords in text responses
3. If found, marks step as complete

**From code** (`web.agent.ts` line 235-241):
```typescript
if (responseText.includes('complete') || 
    responseText.includes('success') || 
    responseText.includes('done')) {
  stepCompleted = true;
  lastAction = 'Step completed successfully';
  break;
}
```

---

## 🎯 Complete Tool Call Examples

### Desktop Agent Examples

**Click at coordinates**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "click",
    "x": 100,
    "y": 200
  }
}
```

**Type short text**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "type",
    "text": "hello"
  }
}
```

**Paste long text (FASTER)**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "paste",
    "text": "This is a very long paragraph..."
  }
}
```

**Press keyboard shortcut**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "key",
    "text": "ctrl+c"
  }
}
```

**Open application**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "application",
    "application": "google-chrome"
  }
}
```

**Run terminal command**:
```json
{
  "name": "computer",
  "arguments": {
    "action": "terminal_command",
    "command": "ls -la"
  }
}
```

**Mark complete**:
```json
{
  "name": "set_task_status",
  "arguments": {
    "status": "completed",
    "message": "Task completed successfully"
  }
}
```

### Web Agent Examples

**Navigate to URL**:
```json
{
  "name": "pinchtab_navigate",
  "input": {
    "url": "https://www.google.com"
  }
}
```

**Click element**:
```json
{
  "name": "pinchtab_click",
  "input": {
    "ref": "e27"
  }
}
```

**Fill field (⚠️ DOESN'T WORK)**:
```json
{
  "name": "pinchtab_fill",
  "input": {
    "ref": "e23",
    "value": "search query"
  }
}
```

**Scroll page**:
```json
{
  "name": "pinchtab_scroll",
  "input": {
    "direction": "down",
    "amount": 500
  }
}
```

**Wait**:
```json
{
  "name": "pinchtab_wait",
  "input": {
    "ms": 2000
  }
}
```

**Get snapshot**:
```json
{
  "name": "pinchtab_get_snapshot",
  "input": {}
}
```

**Mark complete (text response)**:
```
COMPLETE: Search results loaded successfully
```

Or:
```
The task is done. All search results are visible.
```

Or:
```
Success! The page has loaded with the expected content.
```

---

## 🔑 Key Differences

### Desktop vs Web

| Aspect | Desktop Agent | Web Agent |
|--------|--------------|-----------|
| **Tool count** | 2 tools | 7 tools |
| **Main tool** | `computer` (unified) | Multiple `pinchtab_*` tools |
| **Completion** | `set_task_status` tool | Text response with keywords |
| **Parameter style** | `arguments` | `input` |
| **Action parameter** | Required `action` field | Tool name IS the action |

### Important Notes

1. **Desktop Agent** uses ONE unified `computer` tool with an `action` parameter
2. **Web Agent** uses MULTIPLE specialized tools (one per action type)
3. **Desktop Agent** has explicit completion tool (`set_task_status`)
4. **Web Agent** signals completion via text response (no tool)
5. **Parameter naming**: Desktop uses `arguments`, Web uses `input`

---

## 🚨 Common Mistakes to Avoid

### Desktop Agent

❌ **WRONG**: Separate tools per action
```json
{"name": "computer_left_click", "arguments": {"x": 100, "y": 200}}
```

✅ **CORRECT**: Unified tool with action parameter
```json
{"name": "computer", "arguments": {"action": "click", "x": 100, "y": 200}}
```

### Web Agent

❌ **WRONG**: Using `pinchtab_fill` (doesn't work)
```json
{"name": "pinchtab_fill", "input": {"ref": "e23", "value": "text"}}
```

✅ **CORRECT**: Use type action instead (via PinchTab HTTP API)
```
Type text into element e23 using PinchTab API
```

❌ **WRONG**: Using completion tool
```json
{"name": "set_task_status", "arguments": {"status": "completed"}}
```

✅ **CORRECT**: Text response
```
COMPLETE: Task finished successfully
```
