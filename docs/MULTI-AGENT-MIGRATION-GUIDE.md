# Multi-Agent System Migration Guide

**Version**: 1.0  
**Date**: 2026-03-13  
**Status**: Ready for Production

---

## Overview

This guide helps you migrate from the legacy single-agent system to the new multi-agent orchestration system. The migration is designed to be **zero-downtime** with a feature flag that allows gradual rollout.

---

## What's New

The multi-agent system introduces:

- **8 Specialized Agents**: Each with a specific role and optimized model
- **Intelligent Orchestration**: Sequential task delegation with automatic escalation
- **Shared State Management**: Redis-based coordination between agents
- **Cost Optimization**: Right-sized models for each agent's role
- **Better Reliability**: 4-attempt escalation ladder with recovery strategies
- **Enhanced Observability**: Agent execution history, cost breakdown, and debug tools

---

## Prerequisites

Before migrating, ensure you have:

1. **Redis 7.x** installed and running
2. **API Keys** configured:
   - Groq API key (for fast agents: Clarifier, Web, Verifier, Reporter)
   - Bytez API key (for accurate agents: Orchestrator, Desktop, Recovery)
3. **Database Migration** applied (already done if you're on latest schema)
4. **Environment Variables** set (see Configuration section)

---

## Migration Steps

### Step 1: Install Redis

If Redis is not already running:

**Using Docker Compose** (Recommended):
```yaml
# Already configured in docker-compose.yml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  command: redis-server --appendonly yes
```

Start Redis:
```bash
docker-compose up -d redis
```

**Manual Installation**:
- macOS: `brew install redis && brew services start redis`
- Ubuntu: `sudo apt install redis-server && sudo systemctl start redis`
- Windows: Use Docker or WSL2

Verify Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Multi-Agent Feature Flag (default: false)
ENABLE_MULTI_AGENT=false

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty if no password

# API Keys (if not already configured)
GROQ_API_KEY=your_groq_key_here
BYTEZ_API_KEY=your_bytez_key_here

# Optional: Telegram notifications
TELEGRAM_BOT_TOKEN=your_telegram_token  # Optional
TELEGRAM_CHAT_ID=your_chat_id          # Optional
```

### Step 3: Test in Development

Enable multi-agent mode in development:

```bash
# In .env
ENABLE_MULTI_AGENT=true
```

Restart the application:
```bash
npm run dev
```

Test with a simple task:
1. Create a new task: "Search Google for weather in San Francisco"
2. Monitor the logs to see agent handoffs
3. Check the agent execution history in the UI
4. Verify the task completes successfully

### Step 4: Gradual Production Rollout

**Phase 1: Canary Deployment (1-5% of users)**

1. Deploy with `ENABLE_MULTI_AGENT=false` (default)
2. Enable for specific test users via feature flag service
3. Monitor metrics for 24-48 hours:
   - Task success rate
   - Average task duration
   - Cost per task
   - Error rates

**Phase 2: Beta Rollout (10-25% of users)**

1. If canary is successful, increase to 10-25% of users
2. Monitor for 3-7 days
3. Collect user feedback

**Phase 3: Full Rollout (100% of users)**

1. Set `ENABLE_MULTI_AGENT=true` globally
2. Monitor for 1 week
3. Remove feature flag code in next release (optional)

### Step 5: Verify Migration

Check that multi-agent mode is active:

```bash
# Check logs for this message:
# "AgentProcessor initialized (Multi-Agent: ENABLED)"

# Or check via API:
curl http://localhost:3001/health
```

Verify agent execution:
1. Create a test task
2. Open task detail page
3. Look for "Agent Execution History" section
4. Verify multiple agents executed (Clarifier → Orchestrator → Web/Desktop → Reporter)

---

## Configuration Reference

### Agent Model Assignments

These are **fixed** and cannot be changed (except Desktop Agent):

| Agent | Provider | Model | Why |
|-------|----------|-------|-----|
| Clarifier | Groq | GPT-OSS 20B | Fast Q&A, user is waiting |
| Orchestrator | Bytez | Claude Opus 4.6 | Brain of system - bad plan = failure |
| Web Agent | Groq | GPT-OSS 120B | Loops 15-20x, needs speed |
| Desktop Agent | Bytez | Claude Opus 4.6 | **User-selectable**, #1 failure point |
| Perception | Groq | Llama 4 Scout | Only Groq vision model |
| Verifier | Groq | GPT-OSS 20B | Runs 20-30x, needs speed + strict JSON |
| Recovery | Bytez | Claude Sonnet 4.6 | Needs creativity |
| Reporter | Groq | GPT-OSS 20B | Zero reasoning needed |

### Desktop Agent Model Selection

Users can override the Desktop Agent model via the UI dropdown:
- Default: Claude Opus 4.6 (most reliable)
- Alternative: Any Bytez Claude model

### Shared State TTL

All shared state keys have a **24-hour TTL**. Completed tasks are persisted to PostgreSQL before Redis expires them.

### Cost Estimates

Target cost per task: **~$0.24**

Breakdown:
- Clarifier: $0.001 (1 call)
- Orchestrator: $0.05 (2-3 calls)
- Web/Desktop: $0.10 (15-20 calls)
- Perception: $0.02 (10-15 calls)
- Verifier: $0.03 (20-30 calls)
- Recovery: $0.02 (0-2 calls)
- Reporter: $0.001 (1 call)

---

## Rollback Procedure

If you need to rollback to single-agent mode:

### Immediate Rollback (Zero Downtime)

1. Set environment variable:
   ```bash
   ENABLE_MULTI_AGENT=false
   ```

2. Restart the application:
   ```bash
   # No code changes needed!
   npm run start
   ```

3. Verify rollback:
   ```bash
   # Check logs for:
   # "AgentProcessor initialized (Multi-Agent: DISABLED)"
   ```

### What Happens During Rollback

- **In-flight tasks**: Continue with current mode (multi-agent or single-agent)
- **New tasks**: Use single-agent mode immediately
- **Shared state**: Remains in Redis (harmless, will expire in 24 hours)
- **Agent execution history**: Preserved in database
- **No data loss**: All task data is safe

### Rollback Checklist

- [ ] Set `ENABLE_MULTI_AGENT=false`
- [ ] Restart application
- [ ] Verify logs show "Multi-Agent: DISABLED"
- [ ] Test task creation and execution
- [ ] Monitor error rates for 1 hour
- [ ] Document rollback reason for post-mortem

---

## Troubleshooting

### Redis Connection Issues

**Symptom**: `Error: Redis connection failed`

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify `REDIS_HOST` and `REDIS_PORT` in `.env`
3. Check firewall rules
4. Review Redis logs: `docker logs redis`

### Agent Execution Failures

**Symptom**: Tasks fail with "Orchestrator returned empty plan"

**Solution**:
1. Check Bytez API key is valid
2. Verify Bytez API quota
3. Check system prompts in `config/system-prompts.config.ts`
4. Enable debug logging: `LOG_LEVEL=debug`

### High Costs

**Symptom**: Cost per task exceeds $0.50

**Solution**:
1. Check Verifier isn't looping excessively (should be 20-30 calls max)
2. Verify Recovery isn't being triggered too often
3. Review agent execution history for anomalies
4. Consider adjusting escalation thresholds

### Clarifier Q&A Not Showing

**Symptom**: Clarification questions don't appear in UI

**Solution**:
1. Verify frontend is on latest version
2. Check WebSocket connection is active
3. Ensure `clarification_session` exists in shared state
4. Check browser console for errors

### Shared State Viewer Not Visible

**Symptom**: Debug state viewer doesn't appear

**Solution**:
1. Set `isAdmin=true` in localStorage:
   ```javascript
   localStorage.setItem('isAdmin', 'true')
   ```
2. Or set environment variable: `NEXT_PUBLIC_ENABLE_DEBUG=true`
3. Refresh the page

---

## Monitoring & Observability

### Key Metrics to Monitor

1. **Task Success Rate**
   - Target: >95%
   - Alert if: <90%

2. **Average Task Duration**
   - Baseline: Measure before migration
   - Alert if: >2x baseline

3. **Cost Per Task**
   - Target: ~$0.24
   - Alert if: >$0.50

4. **Agent Failure Rate**
   - Target: <5% per agent
   - Alert if: >10%

5. **Redis Memory Usage**
   - Target: <1GB for 100 concurrent tasks
   - Alert if: >2GB

### Logging

Multi-agent mode provides detailed logging:

```
[ClarifierAgent] Clarified task: Goal: Search weather...
[OrchestratorAgent] Generated plan: 3 steps
[WebAgent] Executing step 1: Navigate to Google
[VerifierAgent] Verification result: Success
[ReporterAgent] Task completed in 45s, cost: $0.23
```

Enable debug logging:
```bash
LOG_LEVEL=debug npm run start
```

### Admin Tools

1. **Shared State Viewer**: View all Redis keys for a task (admin only)
2. **Agent Execution History**: See timeline of agent executions
3. **Cost Breakdown**: Per-agent cost visualization
4. **Agent Handoff Notifications**: Real-time agent transitions

---

## FAQ

### Q: Can I use multi-agent mode without Redis?
**A**: No, Redis is required for shared state coordination between agents.

### Q: Will my existing tasks break?
**A**: No, existing tasks continue to work. The feature flag only affects new tasks.

### Q: Can I customize agent models?
**A**: Only the Desktop Agent model is user-selectable. Other agents have fixed models optimized for their roles.

### Q: What happens if an agent fails?
**A**: The system uses a 4-attempt escalation ladder:
1. Retry with different approach
2. Recovery Agent generates alternative strategies
3. Orchestrator replans entire task
4. Notify user and pause task

### Q: How do I disable Telegram notifications?
**A**: Simply don't set `TELEGRAM_BOT_TOKEN`. The system gracefully disables notifications.

### Q: Can I run multi-agent and single-agent simultaneously?
**A**: Yes! The feature flag is per-deployment. You can have staging on multi-agent and production on single-agent.

### Q: How do I test multi-agent mode locally?
**A**: Set `ENABLE_MULTI_AGENT=true` in your local `.env` and ensure Redis is running.

---

## Support

If you encounter issues during migration:

1. Check this guide's Troubleshooting section
2. Review logs with `LOG_LEVEL=debug`
3. Use the Shared State Viewer (admin tool) to inspect task state
4. Check the architecture document: `plan/architecture-multi-agent-system-1.md`
5. Review test cases: `packages/aria-agent/src/agent/agent.processor.spec.ts`

---

## Next Steps

After successful migration:

1. **Monitor metrics** for 1 week
2. **Collect user feedback** on task reliability
3. **Optimize costs** by reviewing agent execution patterns
4. **Consider Phase 8**: Comprehensive testing (see architecture doc)
5. **Plan Phase 9**: Full production deployment

---

## Appendix: Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     User Creates Task                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  Clarifier    │ ← Groq GPT-OSS 20B (fast)
                  │  Q&A Loop     │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Orchestrator  │ ← Bytez Claude Opus (smart)
                  │ Create Plan   │
                  └───────┬───────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Execute Steps        │
              │  (Web or Desktop)     │
              └───────┬───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   Verifier    │ ← Groq GPT-OSS 20B (fast)
              │ Check Result  │
              └───────┬───────┘
                      │
          ┌───────────┴───────────┐
          │                       │
      Success                  Failure
          │                       │
          ▼                       ▼
    Next Step            ┌────────────────┐
                         │ Escalation     │
                         │ Ladder         │
                         │ (4 attempts)   │
                         └────────────────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │   Reporter    │ ← Groq GPT-OSS 20B
                         │   Summary     │
                         └───────────────┘
```

---

**End of Migration Guide**
