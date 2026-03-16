# ============================================================================
# PinchTab VNC Integration - Rebuild Script
# ============================================================================

Write-Host "=== PinchTab VNC Integration Rebuild ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop all containers
Write-Host "[1/7] Stopping all containers..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.yml down
if ($LASTEXITCODE -ne 0) {
    Write-Host "Warning: Some containers may not have been running" -ForegroundColor Yellow
}
Write-Host "✓ Containers stopped" -ForegroundColor Green
Write-Host ""

# Step 2: Remove old pinchtab container (if exists)
Write-Host "[2/7] Removing old pinchtab container..." -ForegroundColor Yellow
docker rm -f pinchtab 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Old pinchtab container removed" -ForegroundColor Green
} else {
    Write-Host "✓ No old pinchtab container found (OK)" -ForegroundColor Green
}
Write-Host ""

# Step 3: Remove old pinchtab volume (if exists)
Write-Host "[3/7] Removing old pinchtab volume..." -ForegroundColor Yellow
docker volume rm aria_pinchtab-data 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Old pinchtab volume removed" -ForegroundColor Green
} else {
    Write-Host "✓ No old pinchtab volume found (OK)" -ForegroundColor Green
}
Write-Host ""

# Step 4: Build aria-desktop with NO CACHE
Write-Host "[4/7] Building aria-desktop container (NO CACHE - this will take several minutes)..." -ForegroundColor Yellow
Write-Host "    This ensures PinchTab is freshly installed..." -ForegroundColor Gray
docker-compose -f docker/docker-compose.yml build --no-cache aria-desktop
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ aria-desktop built successfully" -ForegroundColor Green
Write-Host ""

# Step 5: Start all services
Write-Host "[5/7] Starting all services..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Failed to start services!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ All services started" -ForegroundColor Green
Write-Host ""

# Step 6: Wait for services to be ready
Write-Host "[6/7] Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host "✓ Services should be ready" -ForegroundColor Green
Write-Host ""

# Step 7: Verify PinchTab is running
Write-Host "[7/7] Verifying PinchTab integration..." -ForegroundColor Yellow

# Check if PinchTab process is running
Write-Host "    Checking PinchTab process..." -ForegroundColor Gray
docker exec aria-desktop ps aux | Select-String "pinchtab"
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✓ PinchTab process is running" -ForegroundColor Green
} else {
    Write-Host "    ✗ PinchTab process not found" -ForegroundColor Red
}

# Check supervisord status
Write-Host "    Checking supervisord status..." -ForegroundColor Gray
docker exec aria-desktop supervisorctl status pinchtab

# Check PinchTab health endpoint
Write-Host "    Checking PinchTab health endpoint..." -ForegroundColor Gray
try {
    $health = Invoke-RestMethod -Uri "http://localhost:9867/health" -Method Get -TimeoutSec 5
    Write-Host "    ✓ PinchTab is healthy: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "    ✗ PinchTab health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Connect to VNC at localhost:9990" -ForegroundColor White
Write-Host "2. Run test-headed-mode.ps1 to test headed browser" -ForegroundColor White
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Yellow
Write-Host "  docker logs -f aria-desktop" -ForegroundColor White
Write-Host ""
