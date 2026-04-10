# Cleanup broken instances and test Hello World

Write-Host ""
Write-Host "PinchTab Cleanup and Test" -ForegroundColor Cyan
Write-Host ""

# Get token
Write-Host "Getting auth token..." -ForegroundColor Yellow
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
$TOKEN = $config.server.token
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}
Write-Host "OK - Token obtained" -ForegroundColor Green
Write-Host ""

# Stop all instances
Write-Host "Stopping all broken instances..." -ForegroundColor Yellow
$profiles = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Headers $headers
foreach ($profile in $profiles) {
    try {
        Write-Host "  Stopping profile: $($profile.id)" -ForegroundColor Gray
        Invoke-RestMethod -Uri "http://localhost:9867/profiles/$($profile.id)/stop" -Method Post -Headers $headers -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
        # Ignore errors
    }
}
Write-Host "OK - All instances stopped" -ForegroundColor Green
Write-Host "Waiting 5 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# Start fresh instance
Write-Host "Starting fresh instance..." -ForegroundColor Yellow
$defaultProfile = $profiles | Where-Object { $_.name -eq "default" } | Select-Object -First 1
if (-not $defaultProfile) {
    Write-Host "ERROR - No default profile found" -ForegroundColor Red
    exit 1
}
$PROFILE_ID = $defaultProfile.id
Write-Host "Using profile: $PROFILE_ID" -ForegroundColor Gray

$body = @{ headless = $false } | ConvertTo-Json
try {
    $instance = Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/start" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    $INSTANCE_ID = $instance.id
    Write-Host "OK - Instance started: $INSTANCE_ID" -ForegroundColor Green
}
catch {
    Write-Host "ERROR - Failed to start instance: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to restart Docker services:" -ForegroundColor Yellow
    Write-Host "  cd docker" -ForegroundColor Cyan
    Write-Host "  docker-compose restart aria-desktop" -ForegroundColor Cyan
    exit 1
}

Write-Host "Waiting 20 seconds for instance to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 20
Write-Host ""

# Get tabs
Write-Host "Getting tabs..." -ForegroundColor Yellow
$TAB_ID = $null
$maxRetries = 10
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $tabs = Invoke-RestMethod -Uri "http://localhost:9867/instances/$INSTANCE_ID/tabs" -Headers $headers -ErrorAction Stop
        if ($tabs -and $tabs.Count -gt 0) {
            $TAB_ID = $tabs[0].id
            Write-Host "OK - Tab: $TAB_ID" -ForegroundColor Green
            break
        }
        Write-Host "  Retry $i/$maxRetries..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
    catch {
        Write-Host "  Retry $i/$maxRetries (error: $($_.Exception.Message))..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $TAB_ID) {
    Write-Host "ERROR - Instance still not ready after cleanup" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please restart Docker services manually:" -ForegroundColor Yellow
    Write-Host "  cd docker" -ForegroundColor Cyan
    Write-Host "  docker-compose down" -ForegroundColor Cyan
    Write-Host "  docker-compose up -d aria-desktop" -ForegroundColor Cyan
    exit 1
}
Write-Host ""

# Navigate to Google
Write-Host "Navigating to Google..." -ForegroundColor Yellow
$body = @{ url = "https://www.google.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/navigate" -Method Post -Headers $headers -Body $body
Write-Host "OK - Navigated" -ForegroundColor Green
Write-Host "Waiting 8 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 8
Write-Host ""

# Show popup
Write-Host "Showing Hello World popup..." -ForegroundColor Yellow
$testScript = 'document.body.insertAdjacentHTML("beforeend", "<div style=\"position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4CAF50;color:white;padding:30px 50px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:999999;font-size:28px;font-weight:bold;font-family:Arial;\">Hello World!</div>"); "Popup shown!"'
$body = @{ expression = $testScript } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/evaluate" -Method Post -Headers $headers -Body $body
Write-Host "OK - Result: $($result.result)" -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Open http://localhost:9990 to see the popup!" -ForegroundColor Cyan
Write-Host ""
