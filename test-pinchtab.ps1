$TOKEN = "641bb2ae832a1a7aab35bcc9632b470b601a8827056db2d0"

# Start instance
Write-Host "Starting instance..."
$instance = Invoke-RestMethod -Uri "http://localhost:9867/instances/start" -Method POST -Headers @{"Authorization"="Bearer $TOKEN"; "Content-Type"="application/json"} -Body '{"name":"test-instance","mode":"headed"}'
$INSTANCE_ID = $instance.id
Write-Host "Instance ID: $INSTANCE_ID"

# Wait for instance to be ready
Start-Sleep -Seconds 5

# Open tab
Write-Host "Opening tab..."
$tab = Invoke-RestMethod -Uri "http://localhost:9867/instances/$INSTANCE_ID/tabs/open" -Method POST -Headers @{"Authorization"="Bearer $TOKEN"; "Content-Type"="application/json"} -Body '{"url":"https://www.bing.com/search?q=test"}'
$TAB_ID = $tab.tabId
Write-Host "Tab ID: $TAB_ID"

# Wait for page to load
Write-Host "Waiting for page to load..."
Start-Sleep -Seconds 10

# Test snapshot
Write-Host "`nTesting snapshot..."
$start = Get-Date
try {
    $snapshot = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/snapshot?filter=all" -Headers @{"Authorization"="Bearer $TOKEN"} -TimeoutSec 60
    $duration = (Get-Date) - $start
    Write-Host "Snapshot SUCCESS in $($duration.TotalSeconds) seconds"
    Write-Host "Elements found: $($snapshot.elements.Count)"
} catch {
    $duration = (Get-Date) - $start
    Write-Host "Snapshot FAILED after $($duration.TotalSeconds) seconds"
    Write-Host "Error: $_"
}

# Test text extraction
Write-Host "`nTesting text extraction..."
$start = Get-Date
try {
    $text = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/text" -Headers @{"Authorization"="Bearer $TOKEN"} -TimeoutSec 60
    $duration = (Get-Date) - $start
    Write-Host "Text extraction SUCCESS in $($duration.TotalSeconds) seconds"
    Write-Host "Text length: $($text.Length) characters"
} catch {
    $duration = (Get-Date) - $start
    Write-Host "Text extraction FAILED after $($duration.TotalSeconds) seconds"
    Write-Host "Error: $_"
}
