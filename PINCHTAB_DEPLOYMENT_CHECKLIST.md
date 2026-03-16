# PinchTab Deployment Checklist

## Pre-Deployment

- [ ] Review `PINCHTAB_INTEGRATION.md` for architecture
- [ ] Review `PINCHTAB_IMPLEMENTATION_SUMMARY.md` for changes
- [ ] Verify all files are created:
  - [ ] `packages/aria-agent/src/services/pinchtab.service.ts`
  - [ ] `packages/aria-agent/src/agent/agent.pinchtab-tools.ts`
  - [ ] `packages/aria-agent/src/utils/browser-detection.ts`
- [ ] Verify all files are modified:
  - [ ] `docker/docker-compose.yml`
  - [ ] `packages/aria-agent/src/agent/agent.computer-use.ts`
  - [ ] `packages/aria-agent/src/agent/agent.processor.ts`
  - [ ] `packages/aria-agent/src/agent/agent.module.ts`
  - [ ] `packages/aria-agent/src/agent/agent.constants.ts`
- [ ] Run diagnostics: `npm run lint` (no errors)
- [ ] Run type check: `npm run type-check` (no errors)

## Build

- [ ] Build aria-agent: `docker build -t aria-agent:latest packages/aria-agent`
- [ ] Verify build succeeds
- [ ] Check image size is reasonable (~500MB)

## Deployment

### Local Development
```bash
# 1. Start all services
docker-compose up -d

# 2. Verify services are running
docker-compose ps
# Expected: pinchtab, aria-desktop, postgres, aria-agent, aria-ui all "Up"

# 3. Check health
curl http://localhost:9867/health  # PinchTab
curl http://localhost:9991/health  # Aria Agent
curl http://localhost:9992/health  # Aria UI

# 4. Check logs
docker logs pinchtab
docker logs aria-agent
```

### Production Deployment
```bash
# 1. Update docker-compose.yml with production settings
# - Use pre-built images instead of building from source
# - Set resource limits
# - Configure logging

# 2. Deploy
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 3. Verify
docker-compose ps
curl https://your-domain/health
```

### Kubernetes Deployment
```bash
# 1. Update helm/values.yaml
# - Set image tags
# - Configure resources
# - Set environment variables

# 2. Deploy
helm install aria helm/

# 3. Verify
kubectl get pods
kubectl logs -f deployment/aria-agent
```

## Testing

### Unit Tests
- [ ] PinchTabService tests
  - [ ] Test navigate()
  - [ ] Test snapshot()
  - [ ] Test click()
  - [ ] Test fill()
  - [ ] Test submit()
  - [ ] Test scroll()
  - [ ] Test wait()
  - [ ] Test error handling

### Integration Tests
- [ ] Test web task detection
- [ ] Test PinchTab tool routing
- [ ] Test full Gmail workflow
- [ ] Test form filling
- [ ] Test navigation
- [ ] Test error recovery

### Manual Tests
```bash
# Test 1: Simple navigation
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Navigate to google.com and take a screenshot",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'
# Expected: Task completes, uses PinchTab, ~2,400 tokens

# Test 2: Form filling
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Go to example.com/form and fill in name field with John",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'
# Expected: Form filled, uses element refs

# Test 3: Gmail workflow
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Send email to test@example.com with subject Hello and body Test message",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'
# Expected: Email sent, uses PinchTab tools

# Test 4: Error handling
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Navigate to invalid-url-12345.com",
    "model": {"provider": "anthropic", "name": "claude-opus-4"}
  }'
# Expected: Graceful error handling, task marked as failed
```

## Monitoring

### Logs
```bash
# Watch agent logs
docker logs aria-agent -f

# Watch PinchTab logs
docker logs pinchtab -f

# Search for errors
docker logs aria-agent | grep -i error
docker logs pinchtab | grep -i error
```

### Metrics
```bash
# Check token usage
docker logs aria-agent | grep -i "token\|usage"

# Check task completion rate
docker logs aria-agent | grep -i "completed\|failed"

# Check PinchTab health
curl http://localhost:9867/health
```

### Performance
```bash
# Check response times
docker logs aria-agent | grep -i "duration\|time"

# Check memory usage
docker stats aria-agent pinchtab

# Check CPU usage
docker stats aria-agent pinchtab
```

## Troubleshooting

### PinchTab not starting
```bash
# Check logs
docker logs pinchtab

# Check port is available
lsof -i :9867

# Restart
docker-compose restart pinchtab

# Rebuild
docker-compose up -d --build pinchtab
```

### Agent not using PinchTab
```bash
# Check PinchTab is healthy
curl http://localhost:9867/health

# Check agent logs
docker logs aria-agent | grep -i pinchtab

# Check task description
# Must contain web keywords: gmail, email, browser, http, etc.

# Restart agent
docker-compose restart aria-agent
```

### Element refs not working
```bash
# Check snapshot format
docker logs aria-agent | grep -i "snapshot\|element"

# Verify refs are being extracted
# Should see: [e5] <button> "Compose"

# Check page is fully loaded
# Add wait after navigation: pinchtab_wait(2000)
```

### Token usage not improving
```bash
# Check if using PinchTab
docker logs aria-agent | grep -i "pinchtab"

# Check token counts
docker logs aria-agent | grep -i "token"

# Expected: ~2,400 tokens per action (vs 22,700 before)

# If still high, check:
# - Is task being detected as web task?
# - Is PinchTab service healthy?
# - Are snapshots being used instead of screenshots?
```

## Rollback

If issues occur:

```bash
# 1. Stop new version
docker-compose down

# 2. Revert code changes
git checkout HEAD~1

# 3. Rebuild old version
docker-compose build

# 4. Start old version
docker-compose up -d

# 5. Verify
docker-compose ps
curl http://localhost:9991/health
```

## Post-Deployment

- [ ] Verify all services are running
- [ ] Run smoke tests (see Testing section)
- [ ] Monitor logs for errors
- [ ] Check token usage is reduced
- [ ] Verify accuracy is improved
- [ ] Document any issues
- [ ] Update runbooks
- [ ] Notify team

## Performance Targets

After deployment, verify:

| Metric | Target | Actual |
|--------|--------|--------|
| Token usage | <3,000 per action | _____ |
| Accuracy | >95% | _____ |
| Speed | <5s per action | _____ |
| Uptime | >99% | _____ |
| Error rate | <1% | _____ |

## Rollout Strategy

### Phase 1: Development
- [ ] Deploy to dev environment
- [ ] Run full test suite
- [ ] Manual testing
- [ ] Performance testing

### Phase 2: Staging
- [ ] Deploy to staging
- [ ] Run production-like tests
- [ ] Load testing
- [ ] Security testing

### Phase 3: Production
- [ ] Deploy to production
- [ ] Monitor closely for 24 hours
- [ ] Gradual rollout (10% → 50% → 100%)
- [ ] Have rollback plan ready

## Documentation

- [ ] Update README.md with PinchTab info
- [ ] Update API documentation
- [ ] Update deployment guide
- [ ] Update troubleshooting guide
- [ ] Create runbook for common issues
- [ ] Document performance improvements

## Sign-Off

- [ ] Code review approved
- [ ] Tests passing
- [ ] Performance verified
- [ ] Documentation complete
- [ ] Team trained
- [ ] Ready for production

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________

## Post-Deployment Review (24 hours)

- [ ] No critical errors in logs
- [ ] Token usage reduced by 80%+
- [ ] Accuracy improved to 95%+
- [ ] No performance degradation
- [ ] User feedback positive
- [ ] Ready for full rollout

**Review Date**: _______________
**Reviewed By**: _______________
**Status**: ✅ Approved / ❌ Rollback
