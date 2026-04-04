# Correct way to trigger email-doc-deep-research workflow

$body = @{
    description = "Run email-doc-deep-research workflow with topic 'Artificial Intelligence', email 'thangenabil@gmail.com', documentType 'ppt', includeYouTube true, maxLinks 3, maxVideos 2"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:9991/tasks" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
