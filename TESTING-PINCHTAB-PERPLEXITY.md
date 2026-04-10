# PinchTab Perplexity Manual Testing Guide

This guide helps you manually test the Perplexity workflow operations from Step 7A of `freelancer-research-email.workflow.ts`.

## Prerequisites

1. **Services Running**: Ensure these services are running:
   - PostgreSQL (port 5432)
   - Redis (port 6379)
   - Aria Desktop (port 9990)
   - PinchTab (port 9867)

2. **Start Services**:
   ```powershell
   # Terminal 1: Start Docker services
   cd docker
   docker-compose up postgres redis aria-desktop -d
   ```

3. **Verify Services**:
   ```powershell
   # Check PinchTab
   curl http://localhost:9867/health
   
   # Check Aria Desktop
   curl http://localhost:9990
   ```

## Testing Options

### Option 1: Automated Script (Recommended)

Run the complete automated test script:

```powershell
.\test-pinchtab-perplexity.ps1
```

This script will:
1. ✅ Get authentication token automatically
2. ✅ Create/find Perplexity profile
3. ✅ Start browser instance
4. ✅ Navigate to Perplexity
5. ⏸️ Pause for you to manually type a query
6. ✅ Execute JavaScript to export conversation
7. ✅ Stop browser instance

### Option 2: Manual Commands (Step-by-Step)

For more control, run individual commands:

```powershell
# This displays all commands with explanations
.\test-pinchtab-curl-commands.ps1
```

Then copy and paste each command block one by one.

## What the JavaScript Does (Step 7A)

The JavaScript code from Step 7A performs these operations:

1. **Finds Conversation Elements**: Searches for `h1.group/query` elements (Perplexity's query headers)

2. **Extracts Data**: For each query/answer pair:
   - Query text
   - Answer text (from `.prose` elements)
   - Citations (numbered references with URLs)
   - Code blocks (with syntax highlighting info)

3. **Formats as Markdown**: Creates a structured markdown file with:
   - Thread title
   - Export metadata (date, source URL)
   - Query/answer pairs
   - Citations with links
   - Code blocks with language tags

4. **Auto-Downloads**: Triggers browser download of the markdown file

## Expected Output

When successful, you should see:

```json
{
  "success": true,
  "filename": "Aria_Research_[query_title].md",
  "turns": 1,
  "citations": 5
}
```

And a markdown file will be downloaded to your Downloads folder.

## API Endpoints Reference

### Authentication

```powershell
# Get token from environment
$TOKEN = $env:PINCHTAB_AUTH_TOKEN

# Or fetch from Aria Desktop config
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
$TOKEN = $config.server.token
```

### Profile Management

```powershell
# List profiles
GET http://localhost:9867/profiles
Headers: Authorization: Bearer $TOKEN

# Create profile
POST http://localhost:9867/profiles
Headers: Authorization: Bearer $TOKEN
Body: { "name": "perplexity-profile", "description": "Test profile" }

# Get profile instance status
GET http://localhost:9867/profiles/{profileId}/instance
Headers: Authorization: Bearer $TOKEN

# Stop profile instance
POST http://localhost:9867/profiles/{profileId}/stop
Headers: Authorization: Bearer $TOKEN
```

### Instance Management

```powershell
# Start instance with profile
POST http://localhost:9867/instances/start
Headers: Authorization: Bearer $TOKEN
Body: { "profileId": "{profileId}", "mode": "headed" }

# List all instances
GET http://localhost:9867/instances
Headers: Authorization: Bearer $TOKEN
```

### Navigation

```powershell
# Navigate to URL
POST http://localhost:9867/navigate
Headers: Authorization: Bearer $TOKEN
Body: { "url": "https://www.perplexity.ai", "instanceId": "{instanceId}" }
```

### JavaScript Execution

```powershell
# Execute JavaScript
POST http://localhost:9867/eval
Headers: Authorization: Bearer $TOKEN
Body: { "script": "{javascript_code}", "instanceId": "{instanceId}" }
```

## Troubleshooting

### Token Issues

```powershell
# Check if token is set
Write-Host "Token: $env:PINCHTAB_AUTH_TOKEN"

# Fetch from config
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
Write-Host "Token from config: $($config.server.token)"
```

### Service Health Checks

```powershell
# PinchTab health
Invoke-RestMethod -Uri "http://localhost:9867/health"

# Aria Desktop health
Invoke-RestMethod -Uri "http://localhost:9990"

# Check Docker containers
docker ps
```

### Browser Not Opening

```powershell
# Check if instance is running
$headers = @{ "Authorization" = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "http://localhost:9867/instances" -Headers $headers

# Check profile status
Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/instance" -Headers $headers
```

### JavaScript Execution Fails

Common issues:
- **No conversation exists**: Make sure you've typed a query and received a response in Perplexity
- **Page not loaded**: Wait longer after navigation (increase sleep time)
- **Selectors changed**: Perplexity may have updated their HTML structure

Debug by checking the page structure:
```powershell
# Take a snapshot to see available elements
$body = @{ filter = "all" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9867/snapshot" -Method Post -Headers $headers -Body $body -ContentType "application/json"
```

## Testing Workflow

1. **Start Services** (if not running)
2. **Run Automated Script** or **Manual Commands**
3. **Verify Browser Opens** to Perplexity
4. **Type a Test Query** (e.g., "What is the capital of France?")
5. **Wait for Response** to complete
6. **Continue Script** to export conversation
7. **Check Downloads Folder** for markdown file

## Example Test Query

Try this simple query to test:

```
Find 5 coffee shops in San Francisco with their addresses and phone numbers
```

This should generate a response with structured data that the export script can parse.

## Files Created

- `test-pinchtab-perplexity.ps1` - Automated testing script
- `test-pinchtab-curl-commands.ps1` - Manual command reference
- `TESTING-PINCHTAB-PERPLEXITY.md` - This guide

## Next Steps

After successful testing:
1. Integrate into your workflow
2. Add error handling for edge cases
3. Test with different query types
4. Verify markdown export quality
5. Test with multiple conversation turns

## Support

If you encounter issues:
1. Check service logs: `docker logs aria-desktop`
2. Check PinchTab logs in the container
3. Verify network connectivity between services
4. Ensure all environment variables are set correctly
