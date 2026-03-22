# ARIA API - curl Command Guide

Complete guide for calling ARIA's REST API from your local machine using curl commands.

---

## Service Ports

- **Backend API (aria-agent)**: `http://localhost:9991`
- **Frontend (aria-ui)**: `http://localhost:9992`
- **Desktop VNC (ariad)**: `http://localhost:9990`
- **PinchTab**: `http://localhost:9867`

---

## Task Management

### 1. Create a Task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Search Google for Python tutorials",
    "model": {
      "name": "gemini-3-flash-preview",
      "provider": "google"
    }
  }'
```

**Response:**
```json
{
  "id": "cm5abc123xyz",
  "description": "Search Google for Python tutorials",
  "status": "PENDING",
  "createdAt": "2026-03-17T10:30:00.000Z",
  "model": {
    "name": "gemini-3-flash-preview",
    "provider": "google"
  }
}
```

### 2. List All Tasks

```bash
# Get all tasks (paginated)
curl http://localhost:9991/tasks?page=1&limit=10

# Filter by status
curl http://localhost:9991/tasks?status=RUNNING

# Filter by multiple statuses
curl "http://localhost:9991/tasks?statuses=RUNNING,COMPLETED"
```

### 3. Get Task by ID

```bash
curl http://localhost:9991/tasks/cm5abc123xyz
```

### 4. Get Task Messages

```bash
# Get all messages for a task
curl http://localhost:9991/tasks/cm5abc123xyz/messages

# Paginated messages
curl "http://localhost:9991/tasks/cm5abc123xyz/messages?page=1&limit=20"

# Raw messages (unprocessed)
curl http://localhost:9991/tasks/cm5abc123xyz/messages/raw

# Processed messages (formatted)
curl http://localhost:9991/tasks/cm5abc123xyz/messages/processed
```

### 5. Get Task Shared State (Redis)

```bash
curl http://localhost:9991/tasks/cm5abc123xyz/shared-state
```

**Response:**
```json
{
  "task_goal": {...},
  "execution_plan": {...},
  "action_history": [...],
  "status": "running"
}
```

### 6. Task Control

```bash
# Takeover (pause AI, allow manual control)
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/takeover

# Resume (continue AI execution)
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/resume

# Cancel task
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/cancel
```

### 7. Delete Task

```bash
curl -X DELETE http://localhost:9991/tasks/cm5abc123xyz
```

---

## Plan Approval

### Get Clarification Questions

```bash
curl http://localhost:9991/tasks/cm5abc123xyz/clarification
```

### Submit Clarification Answer

```bash
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/clarification/answer \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "q1",
    "answer": "Yes, use Gmail"
  }'
```

### Skip Clarification

```bash
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/clarification/skip
```

### Approve Execution Plan

```bash
curl -X POST http://localhost:9991/tasks/cm5abc123xyz/approve-plan \
  -H "Content-Type: application/json" \
  -d '{
    "approvedPlan": [
      {
        "id": "step_1",
        "type": "web",
        "description": "Navigate to Google",
        "success_criteria": "Google homepage loaded"
      },
      {
        "id": "step_2",
        "type": "web",
        "description": "Search for Python tutorials",
        "success_criteria": "Search results visible"
      }
    ]
  }'
```

---

## Model Management

### Get Available Models

```bash
curl http://localhost:9991/tasks/models
```

**Response:**
```json
{
  "grouped": {
    "groq": [
      {
        "name": "openai/gpt-oss-20b",
        "provider": "groq",
        "contextWindow": 8192
      }
    ],
    "bytez": [
      {
        "name": "anthropic/claude-opus-4-6",
        "provider": "bytez",
        "contextWindow": 200000
      }
    ],
    "google": [
      {
        "name": "gemini-3-flash-preview",
        "provider": "google",
        "contextWindow": 1000000
      }
    ]
  },
  "flat": [...]
}
```

---

## Workflows API

### List All Workflows

```bash
curl http://localhost:9991/workflows
```

**Response:**
```json
[
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
  },
  {
    "name": "take-screenshot",
    "description": "Capture browser screenshot",
    "version": "1.0.0",
    "timeout_ms": 10000,
    "variables": []
  }
]
```

### Get Workflow Details

```bash
curl http://localhost:9991/workflows/google-search
```

**Response:**
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

### Execute Workflow Directly

```bash
curl -X POST http://localhost:9991/workflows/google-search/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "query": "Python tutorials"
    },
    "taskId": "manual-test-123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Google search completed for \"Python tutorials\"",
  "data": {
    "query": "Python tutorials",
    "results": [
      "Learn Python - Full Course for Beginners",
      "Python Tutorial - W3Schools",
      "The Python Tutorial — Python 3.12 documentation"
    ],
    "resultCount": 10
  }
}
```

### Available Workflows

Located in `packages/aria-agent/workflows/`:

| Workflow Name | Description | Variables |
|---------------|-------------|-----------|
| `google-search` | Search Google and return results | `query` (string) |
| `take-screenshot` | Capture browser screenshot | None |
| `search-and-email` | Search Google and email results | `query` (string), `email` (string) |
| `desktop-screenshot` | Take desktop screenshot via VNC | None |
| `desktop-notepad` | Open notepad and type text | `text` (string) |
| `desktop-file-manager` | Open file manager | None |
| `desktop-mouse-demo` | Demonstrate mouse movements | None |
| `hybrid-browser-desktop` | Mix web + desktop actions | Varies |
| `summarise-url` | Fetch URL and summarize content | `url` (string) |

### Workflow Execution Examples

**Example 1: Google Search**
```bash
curl -X POST http://localhost:9991/workflows/google-search/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "query": "AI news 2026"
    }
  }'
```

**Example 2: Desktop Screenshot**
```bash
curl -X POST http://localhost:9991/workflows/desktop-screenshot/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {}
  }'
```

**Example 3: Desktop Notepad**
```bash
curl -X POST http://localhost:9991/workflows/desktop-notepad/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "text": "Hello from curl command!"
    }
  }'
```

**Example 4: Summarize URL**
```bash
curl -X POST http://localhost:9991/workflows/summarise-url/execute \
  -H "Content-Type: application/json" \
  -d '{
    "variables": {
      "url": "https://example.com/article"
    }
  }'
```

---

## Workflows (ORCHESTRATOR Integration)

**Important:** Workflows can also be discovered and used automatically by the ORCHESTRATOR agent during task planning.
1. Discovered by the ORCHESTRATOR agent during planning
2. Executed internally by the WorkflowService
3. Included in execution plans automatically

### Available Workflows

Located in `packages/aria-agent/workflows/`:
- `google-search.workflow.ts` - Search Google and return results
- `take-screenshot.workflow.ts` - Capture browser screenshot
- `search-and-email.workflow.ts` - Search Google and email results
- `desktop-screenshot.workflow.ts` - Take desktop screenshot via VNC
- `desktop-notepad.workflow.ts` - Open notepad and type text
- `desktop-file-manager.workflow.ts` - Open file manager
- `desktop-mouse-demo.workflow.ts` - Demonstrate mouse movements
- `hybrid-browser-desktop.workflow.ts` - Mix web + desktop actions
- `summarise-url.workflow.ts` - Fetch URL and summarize content

### How Workflows Are Used by ORCHESTRATOR

Workflows are automatically discovered and used by the ORCHESTRATOR agent:

```bash
# Create a task that will trigger workflow discovery
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Search Google for Python courses and take a screenshot",
    "model": {
      "name": "anthropic/claude-opus-4-6",
      "provider": "bytez"
    }
  }'
```

The ORCHESTRATOR will:
1. Call `list_workflows` tool internally
2. Find `google-search` and `take-screenshot` workflows
3. Include them in the execution plan
4. WorkflowService executes them

---

## PinchTab Browser Control (Port 9867)

### Health Check

```bash
curl http://localhost:9867/health
```

### List Browser Instances

```bash
curl http://localhost:9867/instances
```

### List Profiles

```bash
curl http://localhost:9867/profiles
```

### Create Profile

```bash
curl -X POST http://localhost:9867/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gmail-profile",
    "description": "Profile for Gmail automation"
  }'
```

### Start Instance with Profile

```bash
curl -X POST http://localhost:9867/instances/start \
  -H "Content-Type: application/json" \
  -d '{
    "profileId": "profile-id-here",
    "mode": "headed"
  }'
```

### Navigate to URL

```bash
curl -X POST http://localhost:9867/instances/{instanceId}/navigate \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://google.com"
  }'
```

### Get Page Snapshot

```bash
curl http://localhost:9867/instances/{instanceId}/snapshot
```

### Click Element

```bash
curl -X POST http://localhost:9867/instances/{instanceId}/click \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "e42"
  }'
```

### Type Text

```bash
curl -X POST http://localhost:9867/instances/{instanceId}/type \
  -H "Content-Type: application/json" \
  -d '{
    "ref": "e23",
    "text": "Hello World"
  }'
```

---

## Desktop Control (Port 9990)

### Health Check

```bash
curl http://localhost:9990/health
```

### Take Screenshot

```bash
curl http://localhost:9990/screenshot
```

**Response:** Base64-encoded PNG image

### Click at Coordinates

```bash
curl -X POST http://localhost:9990/click \
  -H "Content-Type: application/json" \
  -d '{
    "x": 500,
    "y": 300
  }'
```

### Type Text

```bash
curl -X POST http://localhost:9990/type \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello from curl"
  }'
```

### Press Key

```bash
curl -X POST http://localhost:9990/key \
  -H "Content-Type: application/json" \
  -d '{
    "key": "Return"
  }'
```

### Run Terminal Command

```bash
curl -X POST http://localhost:9990/terminal \
  -H "Content-Type: application/json" \
  -d '{
    "command": "ls -la"
  }'
```

---

## Complete Task Creation Examples

### Example 1: Web-Only Task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Go to GitHub and search for NestJS repositories",
    "model": {
      "name": "gemini-3-flash-preview",
      "provider": "google"
    }
  }'
```

### Example 2: Desktop-Only Task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Open terminal and run ls command",
    "model": {
      "name": "anthropic/claude-sonnet-4-6",
      "provider": "bytez"
    }
  }'
```

### Example 3: Mixed Web + Desktop Task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Search Google for Python tutorials, take a screenshot, and save it to desktop",
    "model": {
      "name": "anthropic/claude-opus-4-6",
      "provider": "bytez"
    }
  }'
```

### Example 4: Task with Workflow Trigger

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Search Google for AI news and email the results to me",
    "model": {
      "name": "anthropic/claude-opus-4-6",
      "provider": "bytez"
    }
  }'
```

This will trigger the `search-and-email` workflow automatically.

---

## Monitoring Task Progress

### Method 1: Polling (REST)

```bash
# Poll task status every 2 seconds
while true; do
  curl -s http://localhost:9991/tasks/cm5abc123xyz | jq '.status'
  sleep 2
done
```

### Method 2: WebSocket (Recommended)

Use a WebSocket client to connect to `ws://localhost:9991` and listen for real-time events:

```javascript
const socket = io('http://localhost:9991');
socket.emit('join_task', 'cm5abc123xyz');

socket.on('agent_status', (data) => {
  console.log('Agent:', data.activeAgent, 'Status:', data.status);
});

socket.on('new_message', (message) => {
  console.log('New message:', message);
});

socket.on('task_status_changed', (data) => {
  console.log('Task status:', data.status);
});
```

---

## Debugging & Troubleshooting

### Check Service Health

```bash
# Backend
curl http://localhost:9991/health || echo "Backend not running"

# Desktop
curl http://localhost:9990/health || echo "Desktop not running"

# PinchTab
curl http://localhost:9867/health || echo "PinchTab not running"
```

### View Task Execution Details

```bash
# Get full task state
curl http://localhost:9991/tasks/cm5abc123xyz/shared-state | jq

# Get action history
curl http://localhost:9991/tasks/cm5abc123xyz/shared-state | jq '.action_history'

# Get failure log
curl http://localhost:9991/tasks/cm5abc123xyz/shared-state | jq '.failure_log'

# Get cost tracking
curl http://localhost:9991/tasks/cm5abc123xyz/shared-state | jq '.cost_tracking'
```

---

## Summary

| Service | Port | Purpose |
|---------|------|---------|
| **aria-agent** | 9991 | Main backend API (tasks, messages, orchestration) |
| **aria-ui** | 9992 | Frontend web interface |
| **ariad** | 9990 | Desktop control (VNC + unified computer tool) |
| **PinchTab** | 9867 | Browser automation (30 tools) |

**Key Endpoints:**
- `POST /tasks` - Create task
- `GET /tasks/:id` - Get task details
- `GET /tasks/:id/messages` - Get task messages
- `GET /tasks/:id/shared-state` - Get Redis state
- `POST /tasks/:id/approve-plan` - Approve execution plan
- `POST /tasks/:id/takeover` - Pause AI
- `POST /tasks/:id/resume` - Resume AI
- `POST /tasks/:id/cancel` - Cancel task
- `GET /workflows` - List all workflows
- `GET /workflows/:name` - Get workflow details
- `POST /workflows/:name/execute` - Execute workflow directly

**Workflows can be:**
1. Called directly via REST API (`POST /workflows/:name/execute`)
2. Discovered and executed automatically by the ORCHESTRATOR agent during task planning
