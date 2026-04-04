# Solution: Create a task first, then the workflow will run within that task context

# Step 1: Create a task that will trigger the workflow
$taskBody = @{
    description = "Run email-doc-deep-research workflow with topic='Artificial Intelligence', email='thangenabil@gmail.com', documentType='ppt', includeYouTube=true, maxLinks=3, maxVideos=2"
} | ConvertTo-Json

Write-Host "Creating task..." -ForegroundColor Cyan
$task = Invoke-RestMethod -Uri "http://localhost:9991/tasks" `
    -Method POST `
    -ContentType "application/json" `
    -Body $taskBody

Write-Host "Task created with ID: $($task.id)" -ForegroundColor Green
Write-Host "Status: $($task.status)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Monitor the task at: http://localhost:9992/tasks/$($task.id)" -ForegroundColor Cyan
Write-Host ""
Write-Host "The ORCHESTRATOR agent will detect the workflow request and execute it automatically."
