# Simple Hello World Test - Uses existing instance

Write-Host ""
Write-Host "Simple PinchTab Hello World Test" -ForegroundColor Cyan
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

# List existing instances
Write-Host "Listing existing instances..." -ForegroundColor Yellow
$instances = Invoke-RestMethod -Uri "http://localhost:9867/instances" -Headers $headers
Write-Host "Found $($instances.Count) instances:" -ForegroundColor Green
$instances | ForEach-Object { Write-Host "  - $($_.id) (status: $($_.status))" -ForegroundColor Gray }
Write-Host ""

if ($instances.Count -eq 0) {
    Write-Host "ERROR - No instances available. Please start Docker services first." -ForegroundColor Red
    Write-Host "Run: docker-compose up aria-desktop" -ForegroundColor Yellow
    exit 1
}

# Use first instance
$INSTANCE_ID = $instances[0].id
Write-Host "Using instance: $INSTANCE_ID" -ForegroundColor Cyan
Write-Host ""

# Get tabs with retry
Write-Host "Getting tabs (with retry)..." -ForegroundColor Yellow
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
        else {
            Write-Host "  Retry $i/$maxRetries (no tabs yet)..." -ForegroundColor Yellow
            Start-Sleep -Seconds 3
        }
    }
    catch {
        Write-Host "  Retry $i/$maxRetries (error: $($_.Exception.Message))..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $TAB_ID) {
    Write-Host "ERROR - Failed to get tab. Instance may not be ready." -ForegroundColor Red
    Write-Host "Try opening http://localhost:9990 to check if browser is running" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Navigate to Google
Write-Host "Navigating to Google..." -ForegroundColor Yellow
try {
    $body = @{ url = "https://www.google.com" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/navigate" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "OK - Navigated" -ForegroundColor Green
    Write-Host "Waiting 8 seconds for page load..." -ForegroundColor Yellow
    Start-Sleep -Seconds 8
}
catch {
    Write-Host "ERROR - Navigation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Show Hello World popup
Write-Host "Executing JavaScript to show popup..." -ForegroundColor Yellow
try {
    $testScript = 'document.body.insertAdjacentHTML("beforeend", "<div style=\"position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4CAF50;color:white;padding:30px 50px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:999999;font-size:28px;font-weight:bold;font-family:Arial;\">Hello World!</div>"); "Popup shown!"'
    $body = @{ expression = $testScript } | ConvertTo-Json
    $result = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/evaluate" -Method Post -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "OK - Result: $($result.result)" -ForegroundColor Green
}
catch {
    Write-Host "ERROR - Evaluate failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Open http://localhost:9990 in your browser" -ForegroundColor Cyan
Write-Host "  You should see a green Hello World popup on Google" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Instance ID: $INSTANCE_ID" -ForegroundColor Gray
Write-Host "  Tab ID: $TAB_ID" -ForegroundColor Gray
Write-Host ""
