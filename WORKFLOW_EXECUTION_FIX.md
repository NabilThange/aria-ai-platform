# Workflow Direct Execution Fix

## Problem
When executing workflows directly via `/workflows/{name}/execute` endpoint, the system was failing with:
```
Foreign key constraint violated on the constraint: `Message_taskId_fkey`
```

This happened because:
1. Direct workflow execution uses `taskId = 'manual-execution'` (not a real task in DB)
2. Workflows call `WorkflowLogger.think()` which creates messages in the database
3. Database constraint requires `taskId` to reference an existing Task record

## Solution
Modified `MessagesService.create()` to handle `'manual-execution'` taskId gracefully:
- Detects when `taskId === 'manual-execution'`
- Returns a mock Message object instead of writing to database
- Allows workflows to run without a real task context

## Files Changed
- `packages/aria-agent/src/messages/messages.service.ts`

## How to Use

### Option 1: Direct Workflow Execution (for testing/debugging)
```powershell
Invoke-RestMethod -Uri "http://localhost:9991/workflows/email-doc-deep-research/execute" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{"variables":{"topic":"AI","email":"test@example.com","documentType":"txt","includeYouTube":false,"maxLinks":1,"maxVideos":0}}'
```

**Note:** This requires all services to be running:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Aria Desktop (port 9990)
- PinchTab (port 9867)

### Option 2: Via Task Creation (recommended for production)
```powershell
$body = @{
    description = "Run email-doc-deep-research workflow with topic='AI', email='test@example.com', documentType='txt', includeYouTube=false, maxLinks=1, maxVideos=0"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9991/tasks" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

This creates a proper task that the ORCHESTRATOR agent will process and execute the workflow.

## Testing
The fix was verified by:
1. Attempting direct workflow execution
2. Confirming no database constraint error
3. Workflow now fails on actual execution logic (web research) rather than message creation

## Next Steps
To fully test the workflow, ensure all required services are running:
```bash
# Terminal 1: Docker services
cd docker
docker-compose up postgres redis aria-desktop -d

# Terminal 2: Backend
cd packages/aria-agent
npm run start:dev

# Terminal 3: Check services
curl http://localhost:9990  # Desktop
curl http://localhost:9867/health  # PinchTab
```
