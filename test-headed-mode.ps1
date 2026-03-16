# ============================================================================
# Test PinchTab Headed Mode in VNC
# ============================================================================

Write-Host "=== PinchTab Headed Mode Test ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure you're connected to VNC at localhost:9990" -ForegroundColor Yellow
Write-Host "Press Enter when ready..." -ForegroundColor Yellow
Read-Host

try {
    # Step 1: Launch headed instance
    Write-Host "[1/5] Launching headed browser instance..." -ForegroundColor Cyan
    $launchBody = @{
        name = "vnc-test"
        mode = "headed"
    } | ConvertTo-Json
    
    $instance = Invoke-RestMethod -Uri "http://localhost:9867/instances/launch" -Method Post -ContentType "application/json" -Body $launchBody
    $instanceId = $instance.id
    Write-Host "✓ Instance ID: $instanceId" -ForegroundColor Green
    Write-Host ""
    
    # Step 2: Open example.com
    Write-Host "[2/5] Opening example.com..." -ForegroundColor Cyan
    Write-Host "    Watch your VNC viewer - browser should appear!" -ForegroundColor Yellow
    $tabBody = @{
        url = "https://example.com"
    } | ConvertTo-Json
    
    $tab = Invoke-RestMethod -Uri "http://localhost:9867/instances/$instanceId/tabs/open" -Method Post -ContentType "application/json" -Body $tabBody
    $tabId = $tab.tabId
    Write-Host "✓ Tab ID: $tabId" -ForegroundColor Green
    Write-Host ""
    
    Start-Sleep -Seconds 5
    
    # Step 3: Get snapshot
    Write-Host "[3/5] Getting page snapshot..." -ForegroundColor Cyan
    $snapshot = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$tabId/snapshot?filter=interactive" -Method Get
    Write-Host "✓ Found $($snapshot.elements.Count) interactive elements" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Navigate to Google
    Write-Host "[4/5] Navigating to Google..." -ForegroundColor Cyan
    Write-Host "    Watch the browser navigate in VNC!" -ForegroundColor Yellow
    $navBody = @{
        kind = "navigate"
        url = "https://google.com"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:9867/tabs/$tabId/action" -Method Post -ContentType "application/json" -Body $navBody
    Write-Host "✓ Navigated to Google" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Browser is visible in VNC. Press Enter to close..." -ForegroundColor Yellow
    Read-Host
    
    # Step 5: Cleanup
    Write-Host "[5/5] Closing browser..." -ForegroundColor Cyan
    Invoke-RestMethod -Uri "http://localhost:9867/instances/$instanceId" -Method Delete
    Write-Host "✓ Browser closed" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "=== Test Complete ===" -ForegroundColor Green
    Write-Host "If you saw the browser in VNC, the integration is working!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "✗ Test failed: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Check if PinchTab is running: docker exec aria-desktop supervisorctl status pinchtab" -ForegroundColor White
    Write-Host "2. Check logs: docker logs aria-desktop | Select-String pinchtab" -ForegroundColor White
    Write-Host "3. Verify health: curl http://localhost:9867/health" -ForegroundColor White
}
