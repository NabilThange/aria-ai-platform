# Simple PinchTab Snapshot Test
# Tests with a simple static page that should always have elements

$token = (Invoke-RestMethod http://localhost:9990/api/pinchtab-config).server.token
$headers = @{ "Content-Type"="application/json"; "Authorization"="Bearer $token" }

Write-Host "=== PinchTab Snapshot Test ===" -ForegroundColor Cyan

# Start instance
Write-Host "`n[1/5] Starting browser instance..." -ForegroundColor Yellow
$inst = (Invoke-RestMethod -Method POST http://localhost:9867/instances/start -Headers $headers -Body '{"name":"test","mode":"headed"}').id
Write-Host "Instance ID: $inst" -ForegroundColor Green

# Wait for instance
Start-Sleep -Seconds 3

# Try a simple static page first (example.com is very simple)
Write-Host "`n[2/5] Opening simple test page (example.com)..." -ForegroundColor Yellow
$tab = (Invoke-RestMethod -Method POST "http://localhost:9867/instances/$inst/tabs/open" -Headers $headers -Body '{"url":"http://example.com"}').tabId
Write-Host "Tab ID: $tab" -ForegroundColor Green

# Wait for page load
Write-Host "`n[3/5] Waiting 8 seconds for page to load..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

# Get text first (this always works)
Write-Host "`n[4/5] Getting page text..." -ForegroundColor Yellow
$text = (Invoke-RestMethod -Method GET "http://localhost:9867/tabs/$tab/text" -Headers $headers).text
Write-Host "Text length: $($text.Length) characters" -ForegroundColor Green
Write-Host "First 200 chars: $($text.Substring(0, [Math]::Min(200, $text.Length)))" -ForegroundColor Gray

# Try snapshot with 'all' filter
Write-Host "`n[5/5] Getting snapshot (filter=all)..." -ForegroundColor Yellow
$snapshot = Invoke-RestMethod -Method GET "http://localhost:9867/tabs/$tab/snapshot?filter=all" -Headers $headers

Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "Elements found: $($snapshot.elements.Count)" -ForegroundColor $(if ($snapshot.elements.Count -gt 0) { "Green" } else { "Red" })
Write-Host "Page URL: $($snapshot.url)" -ForegroundColor Gray
Write-Host "Page Title: $($snapshot.title)" -ForegroundColor Gray

if ($snapshot.elements.Count -gt 0) {
    Write-Host "`nFirst 10 elements:" -ForegroundColor Yellow
    $snapshot.elements | Select-Object -First 10 | ForEach-Object {
        Write-Host "  [$($_.ref)] <$($_.tag)> $($_.text.Substring(0, [Math]::Min(50, $_.text.Length)))" -ForegroundColor Gray
    }
} else {
    Write-Host "`nNO ELEMENTS FOUND - This indicates a PinchTab issue" -ForegroundColor Red
    Write-Host "Checking HTML content..." -ForegroundColor Yellow
    if ($snapshot.html) {
        Write-Host "HTML length: $($snapshot.html.Length) characters" -ForegroundColor Gray
        Write-Host "First 500 chars of HTML:" -ForegroundColor Gray
        Write-Host $snapshot.html.Substring(0, [Math]::Min(500, $snapshot.html.Length)) -ForegroundColor DarkGray
    }
}

# Cleanup
Write-Host "`nCleaning up..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method DELETE "http://localhost:9867/instances/$inst" -Headers $headers | Out-Null
    Write-Host "Instance stopped" -ForegroundColor Green
} catch {
    Write-Host "Cleanup failed (instance may have already stopped)" -ForegroundColor DarkYellow
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
