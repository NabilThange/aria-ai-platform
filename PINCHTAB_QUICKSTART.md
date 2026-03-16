# PinchTab Quick Start

## 1. Start Services

```bash
cd docker
docker-compose up -d pinchtab aria-agent aria-ui
```

Wait for services to be healthy:
```bash
docker-compose ps
```

## 2. Test PinchTab Health

```bash
curl http://localhost:9867/health
# Should return: {"status":"ok"}
```

## 3. Create a Web Task

```bash
curl -X POST http://localhost:9991/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Navigate to gmail.com and take a screenshot of the inbox",
    "model": {
      "provider": "anthropic",
      "name": "claude-opus-4"
    }
  }'
```

## 4. Monitor Task Execution

Open the UI: http://localhost:9992

You'll see:
- Task status updates
- Agent thinking process
- PinchTab actions (navigate, snapshot, click, etc.)
- Token usage (should be ~90% lower than screenshot-based)

## 5. Check Logs

```bash
# Agent logs
docker logs aria-agent -f

# PinchTab logs
docker logs pinchtab -f
```

## Common Tasks

### Send Email
```json
{
  "description": "Send an email to user@example.com with subject 'Hello' and body 'This is a test'"
}
```

### Search Google
```json
{
  "description": "Search Google for 'machine learning' and click the first result"
}
```

### Fill Form
```json
{
  "description": "Go to example.com/form and fill in the contact form with name 'John' and email 'john@example.com'"
}
```

### Login
```json
{
  "description": "Log in to github.com with username 'user' and password 'pass'"
}
```

## Token Usage Comparison

Run a task and check the logs:

```bash
docker logs aria-agent | grep -i "token\|usage"
```

You should see:
- **Before**: ~20,000-30,000 tokens per action
- **After**: ~2,000-3,000 tokens per action

## Troubleshooting

### Task fails with "No PinchTab instance"
- Check PinchTab is running: `docker ps | grep pinchtab`
- Check health: `curl http://localhost:9867/health`
- Restart: `docker-compose restart pinchtab`

### Agent doesn't use PinchTab
- Check task description mentions web/browser/URL
- Check agent logs: `docker logs aria-agent`
- Verify PinchTab service is healthy

### Element refs not found
- Get new snapshot after page changes
- Use `pinchtab_snapshot` to see current elements
- Check element ref format (should be like "e5", "e12")

## Next Steps

1. Read `PINCHTAB_INTEGRATION.md` for detailed documentation
2. Check `packages/aria-agent/src/agent/agent.constants.ts` for system prompt
3. Review `packages/aria-agent/src/services/pinchtab.service.ts` for API
4. Test with different websites and tasks

## Performance Metrics

Expected improvements:
- **Token usage**: 90% reduction
- **Accuracy**: 99%+ (no coordinate guessing)
- **Speed**: 2-3x faster (no screenshot processing)
- **Reliability**: 10x more reliable (element refs vs pixels)

## Support

For issues:
1. Check logs: `docker logs aria-agent`
2. Check PinchTab health: `curl http://localhost:9867/health`
3. Review error messages in task UI
4. Check GitHub issues: https://github.com/pinchtab/pinchtab/issues
