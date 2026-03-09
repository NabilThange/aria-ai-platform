# Testing the ARIA Planning System

## 🧪 Quick Test Guide

### Prerequisites
1. PostgreSQL database running
2. Backend server running (`npm run start:dev` in `packages/aria-agent`)
3. Frontend server running (`npm run dev` in `packages/aria-ui`)

---

## Test 1: Backend API Test (Using curl or Postman)

### Step 1: Create a Task with Planning Enabled
```bash
curl -X POST http://localhost:3001/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a file called test.txt with content Hello World",
    "model": {
      "provider": "anthropic",
      "name": "claude-sonnet-4-20250514",
      "title": "Claude Sonnet 4"
    },
    "planningEnabled": true
  }'
```

**Expected Response**:
```json
{
  "id": "task-uuid",
  "description": "Create a file called test.txt with content Hello World",
  "planningEnabled": true,
  "status": "PENDING",
  ...
}
```

### Step 2: Create a Plan for the Task
```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task-uuid-from-step-1",
    "taskDescription": "Create a file called test.txt with content Hello World",
    "model": {
      "provider": "anthropic",
      "name": "claude-sonnet-4-20250514",
      "title": "Claude Sonnet 4"
    }
  }'
```

**Expected Response**:
```json
{
  "id": "plan-uuid",
  "taskId": "task-uuid",
  "taskDescription": "Create a file called test.txt with content Hello World",
  "status": "PENDING",
  "paths": [
    {
      "id": "path-1",
      "name": "Terminal Approach",
      "strategy": "TERMINAL",
      "estimatedTokens": 200,
      "steps": [
        {
          "action": "Create file with echo command",
          "type": "TERMINAL",
          "command": "echo 'Hello World' > test.txt",
          "estimatedTokens": 200
        }
      ],
      "pros": ["Fast", "Efficient", "Low token cost"],
      "cons": ["No visual feedback"]
    },
    {
      "id": "path-2",
      "name": "GUI Approach",
      "strategy": "GUI",
      "estimatedTokens": 4500,
      "steps": [...]
    }
  ]
}
```

### Step 3: Approve the Plan
```bash
curl -X PUT http://localhost:3001/plans/plan-uuid/approve \
  -H "Content-Type: application/json" \
  -d '{
    "pathId": "path-1"
  }'
```

**Expected Response**:
```json
{
  "id": "plan-uuid",
  "status": "APPROVED",
  "selectedPathId": "path-1",
  ...
}
```

---

## Test 2: Frontend UI Test

### Step 1: Open the App
1. Navigate to http://localhost:3000
2. You should see the ARIA home page

### Step 2: Create a Task with Planning
1. Check the "Enable Planning Mode" checkbox
2. Enter task: "Create a file called test.txt with content 'Hello World'"
3. Click submit

### Step 3: Review the Plan
You should see:
- **Plan Viewer** with 2-3 execution paths
- **Path 1 (Terminal)**: 
  - 1 step
  - ~200 tokens
  - Command: `echo 'Hello World' > test.txt`
  - Pros: Fast, efficient, low cost
  - Cons: No visual feedback
- **Path 2 (GUI)**:
  - 3 steps
  - ~4500 tokens
  - Steps: Open file manager → Create file → Type content

### Step 4: Select and Approve
1. Click on "Terminal Approach"
2. Review the step
3. (Optional) Click "Edit" to modify the command
4. Click "Approve & Execute"

### Step 5: Observe Execution
- Plan status changes to "APPROVED"
- (Once executor is implemented) You'll see execution progress

---

## Test 3: WebSocket Real-Time Updates

### Setup
1. Open browser DevTools → Network → WS
2. You should see WebSocket connection to `/api/proxy/tasks`

### Test
1. Create a plan (as in Test 2)
2. In DevTools, you should see:
   - `join_plan` event sent
   - `plan_updated` events received when plan status changes

### Expected Events
```javascript
// Sent by client
{ event: "join_plan", data: "plan-uuid" }

// Received from server
{ event: "plan_updated", data: { id: "plan-uuid", status: "PENDING", ... } }
{ event: "plan_updated", data: { id: "plan-uuid", status: "APPROVED", ... } }
```

---

## Test 4: Database Verification

### Check Tables
```sql
-- Connect to PostgreSQL
psql -U postgres -d ariadb

-- Check if planning tables exist
\dt

-- Should see:
-- Plan
-- ExecutionPath
-- PlanStep
-- Checkpoint

-- Check plan data
SELECT * FROM "Plan";
SELECT * FROM "ExecutionPath";
SELECT * FROM "PlanStep";
```

### Expected Data
```sql
-- Plan table
id                  | taskId              | status  | selectedPathId
--------------------|---------------------|---------|----------------
plan-uuid           | task-uuid           | PENDING | NULL

-- ExecutionPath table
id      | planId    | name              | strategy | estimatedTokens
--------|-----------|-------------------|----------|----------------
path-1  | plan-uuid | Terminal Approach | TERMINAL | 200
path-2  | plan-uuid | GUI Approach      | GUI      | 4500

-- PlanStep table
id      | pathId  | order | action                    | type     | command
--------|---------|-------|---------------------------|----------|---------------------------
step-1  | path-1  | 0     | Create file with echo     | TERMINAL | echo 'Hello World' > test.txt
step-2  | path-2  | 0     | Open file manager         | GUI      | NULL
step-3  | path-2  | 1     | Create new file           | GUI      | NULL
step-4  | path-2  | 2     | Type content              | GUI      | NULL
```

---

## Test 5: Error Handling

### Test Invalid Plan Creation
```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "non-existent-task",
    "taskDescription": "Test",
    "model": { "provider": "anthropic", "name": "claude-sonnet-4" }
  }'
```

**Expected**: Error response with appropriate status code

### Test Invalid Path Approval
```bash
curl -X PUT http://localhost:3001/plans/plan-uuid/approve \
  -H "Content-Type: application/json" \
  -d '{
    "pathId": "non-existent-path"
  }'
```

**Expected**: 404 Not Found error

---

## Test 6: Token Estimation Accuracy

### Create Different Tasks and Compare

#### Task 1: Simple File Creation
```
Task: "Create test.txt with 'Hello'"
Expected Terminal: ~200 tokens
Expected GUI: ~4500 tokens
Savings: 95.6%
```

#### Task 2: Package Installation
```
Task: "Install Node.js"
Expected Terminal: ~200 tokens (apt install nodejs)
Expected GUI: ~6000 tokens (open software center, search, click install)
Savings: 96.7%
```

#### Task 3: Web Task
```
Task: "Search Google for 'ARIA AI'"
Expected Browser: ~1000 tokens
Expected GUI: ~1500 tokens
Savings: 33%
```

**Note**: Web tasks have lower savings since browser automation is inherently token-intensive.

---

## 🐛 Troubleshooting

### Issue: "Plan not found"
**Solution**: Make sure the task was created with `planningEnabled: true`

### Issue: "Failed to generate plan"
**Solution**: 
1. Check if LLM API key is configured
2. Check backend logs for errors
3. Verify model name is correct

### Issue: "WebSocket not connecting"
**Solution**:
1. Check if backend is running on port 3001
2. Check CORS configuration
3. Check browser console for errors

### Issue: "Prisma client error"
**Solution**:
1. Run `npx prisma generate` in `packages/aria-agent`
2. Restart backend server
3. Check if migration was applied: `npx prisma migrate status`

---

## ✅ Success Criteria

A successful test should show:
1. ✅ Plan created with 2-3 execution paths
2. ✅ Terminal approach has significantly fewer tokens than GUI
3. ✅ Steps are clear and actionable
4. ✅ Pros/cons are relevant
5. ✅ Plan can be approved
6. ✅ WebSocket updates work in real-time
7. ✅ Database contains correct data
8. ✅ UI is responsive and intuitive

---

## 📊 Performance Benchmarks

### Plan Generation Time
- **Target**: < 5 seconds
- **Acceptable**: < 10 seconds
- **Measure**: Time from plan creation to PENDING status

### Token Estimation Accuracy
- **Target**: Within 20% of actual usage
- **Measure**: Compare estimated vs actual tokens after execution

### WebSocket Latency
- **Target**: < 100ms
- **Measure**: Time from server event to client update

---

## 🎯 Next: Implement Executor

Once these tests pass, the next step is to implement the executor service that will actually run the approved plans. The executor will:

1. Take the approved plan
2. Execute steps in order
3. Create checkpoints
4. Handle errors and rollback
5. Emit progress updates
6. Mark plan as completed

**Estimated time**: 1-2 days

