# 🧪 Multi-Agent System Testing Guide

**Date**: 2026-03-12  
**Status**: Ready for Testing

---

## Prerequisites

Before testing, ensure you have:

1. **Redis running**
2. **Environment variables configured**
3. **Dependencies installed**
4. **Database migrated**

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Backend
cd packages/aria-agent
npm install

# Frontend
cd packages/aria-ui
npm install socket.io-client
```

### 2. Configure Environment

Edit `packages/aria-agent/.env`:

```bash
# Enable Multi-Agent System
ENABLE_MULTI_AGENT=true

# Redis (Required)
REDIS_URL=redis://localhost:6379

# API Keys (Required)
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here

# Bytez API Keys (Required for Orchestrator, Desktop, Recovery)
BYTEZ_API_KEY=your_bytez_key_here

# Telegram (Optional - for notifications)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 3. Start Redis

```bash
# Using Docker Compose
docker-compose up redis

# Or using Docker directly
docker run -d -p 6379:6379 redis:7-alpine
```

### 4. Start Services

```bash
# Terminal 1: Backend
cd packages/aria-agent
npm run dev

# Terminal 2: Frontend
cd packages/aria-ui
npm run dev

# Terminal 3: Desktop Service (if testing desktop tasks)
cd packages/aria-desktop
npm run dev
```

---

## What's Implemented

### ✅ Backend (100% Complete)

**All 8 Agents**:
- ClarifierAgent (Groq GPT-OSS 20B)
- OrchestratorAgent (Bytez Claude Opus 4.6)
- WebAgent (Groq GPT-OSS 120B)
- DesktopAgent (Bytez Claude Opus 4.6)
- PerceptionAgent (Groq Llama 4 Scout)
- VerifierAgent (Groq GPT-OSS 20B)
- RecoveryAgent (Bytez Claude Sonnet 4.6)
- ReporterAgent (Groq GPT-OSS 20B)

**Infrastructure**:
- Sequential orchestration pipeline
- 4-attempt escalation ladder
- Redis shared state management
- Cost tracking
- WebSocket events for UI updates

### ✅ Frontend (Partial - Testable)

**Implemented**:
- Agent status display (shows current agent)
- WebSocket connection for real-time updates
- Agent status badges with colors

**Not Yet Implemented**:
- Clarifier Q&A interface (TASK-060) ⚠️ **BLOCKS TESTING**
- Cost breakdown visualization
- Shared state viewer
- Full task execution history

---

## Testing Scenarios

### Test 1: Simple Web Task (No Clarification Needed)

**Task**: "Go to google.com and search for 'OpenAI'"

**Expected Flow**:
1. ✅ Clarifier analyzes (should be quick, no questions)
2. ✅ Orchestrator creates plan
3. ✅ WebAgent executes via PinchTab
4. ✅ Verifier validates each action
5. ✅ Reporter generates summary

**What to Watch**:
- Agent status badge should update in real-time
- Task should show: "Clarifying" → "Planning" → "Web Action" → "Verifying" → "Reporting"
- Check backend logs for agent execution
- Check Redis for shared state keys

### Test 2: Simple Desktop Task

**Task**: "Open calculator and add 2 + 2"

**Expected Flow**:
1. ✅ Clarifier analyzes
2. ✅ Orchestrator creates plan
3. ✅ DesktopAgent takes screenshot
4. ✅ PerceptionAgent analyzes UI
5. ✅ DesktopAgent executes actions
6. ✅ Verifier validates
7. ✅ Reporter generates summary

**What to Watch**:
- Agent status: "Desktop Action" → "Analyzing Screen" → "Verifying"
- Desktop service must be running
- Check screenshots in shared state

### Test 3: Escalation (Intentional Failure)

**Task**: "Go to nonexistent-website-12345.com"

**Expected Flow**:
1. ✅ WebAgent tries to navigate (fails)
2. ✅ Verifier detects failure
3. ✅ WebAgent retries (attempt 2)
4. ✅ RecoveryAgent generates strategy (attempt 3)
5. ✅ Orchestrator replans (attempt 4)
6. ⚠️ User notification (task paused)

**What to Watch**:
- Agent status should show "Recovering" after 2nd failure
- Check `failure_log` in Redis
- Check `recovery_strategy` in Redis
- Task should eventually fail or request help

---

## Known Limitations

### ⚠️ Critical: Clarifier Q&A Not Implemented

**Problem**: Clarifier cannot ask interactive questions yet

**Impact**: 
- Tasks requiring clarification will use assumptions
- TASK-032 notes this requires TASK-060 (Q&A interface)

**Workaround**: 
- Test with unambiguous tasks
- Clarifier will make reasonable assumptions

**Fix**: Implement TASK-060 (Clarifier Q&A interface)

### ⚠️ No Cost Visualization

**Problem**: Can't see cost breakdown in UI

**Workaround**: Check PostgreSQL `agentExecutions` field or backend logs

### ⚠️ No Shared State Viewer

**Problem**: Can't inspect Redis state from UI

**Workaround**: Use Redis CLI:
```bash
redis-cli
> KEYS task:*
> GET task:{taskId}:execution_plan
> GET task:{taskId}:recovery_strategy
```

---

## Debugging

### Check Agent Execution

```bash
# Backend logs
tail -f packages/aria-agent/logs/app.log

# Redis state
redis-cli
> KEYS task:*
> GET task:{taskId}:status
> GET task:{taskId}:execution_plan
> GET task:{taskId}:action_history
```

### Check WebSocket Connection

Open browser console:
```javascript
// Should see:
// "WebSocket connected"
// "Agent status update: { status: 'clarifying', activeAgent: 'CLARIFIER', ... }"
```

### Check Database

```sql
-- Check agent executions
SELECT id, description, status, "agentExecutions", "activeAgent", "totalCost"
FROM "Task"
WHERE "createdAt" > NOW() - INTERVAL '1 hour'
ORDER BY "createdAt" DESC;
```

---

## Success Criteria

### Minimum Viable Test

✅ Task created  
✅ Agent status badge appears  
✅ Badge updates as agents execute  
✅ Task completes or fails gracefully  
✅ No crashes or infinite loops  

### Full Success

✅ All 8 agents execute in sequence  
✅ Escalation ladder works (retry → Recovery → Orchestrator)  
✅ Cost tracking accurate  
✅ WebSocket events fire correctly  
✅ Redis state persists correctly  
✅ Reporter generates summary  
✅ Telegram notification sent (if configured)  

---

## Troubleshooting

### "Redis connection failed"
- Ensure Redis is running: `docker ps | grep redis`
- Check REDIS_URL in .env

### "Agent not found in registry"
- Agents may not be registered yet
- Check OrchestrationModule imports all agent modules

### "WebSocket not connecting"
- Check NEXT_PUBLIC_API_URL in frontend .env
- Ensure backend is running on correct port

### "Task stuck in RUNNING"
- Check backend logs for errors
- Check Redis for task state
- May need to manually update task status

---

## Next Steps After Testing

1. **If tests pass**: Move to Phase 8 (full testing suite)
2. **If Clarifier needs Q&A**: Implement TASK-060
3. **If cost tracking needed**: Implement TASK-055
4. **If debugging needed**: Implement TASK-058 (shared state viewer)

---

## Feedback

After testing, please report:

1. ✅ What worked
2. ❌ What failed
3. 🐛 Any bugs or unexpected behavior
4. 💡 Suggestions for improvement

---

**Ready to test!** 🚀

Start with Test 1 (simple web task) and work your way up to more complex scenarios.
