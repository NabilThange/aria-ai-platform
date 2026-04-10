# Complete PinchTab Hello World Test
# Run this entire script at once

Write-Host ""
Write-Host "Starting PinchTab Hello World Test" -ForegroundColor Cyan
Write-Host ""

# Step 1: Get token
Write-Host "1. Getting auth token..." -ForegroundColor Yellow
$config = Invoke-RestMethod -Uri "http://localhost:9990/api/pinchtab-config"
$TOKEN = $config.server.token
$headers = @{
    "Authorization" = "Bearer $TOKEN"
    "Content-Type" = "application/json"
}
Write-Host "   OK - Token obtained" -ForegroundColor Green
Write-Host ""

# Step 2: Create temporary profile
Write-Host "2. Creating temporary profile..." -ForegroundColor Yellow
$tempProfile = "temp-$(Get-Random)"
$body = @{ name = $tempProfile } | ConvertTo-Json
$profile = Invoke-RestMethod -Uri "http://localhost:9867/profiles" -Method Post -Headers $headers -Body $body
$PROFILE_ID = $profile.id
Write-Host "   OK - Profile: $PROFILE_ID" -ForegroundColor Green
Write-Host ""

# Step 3: Start headed instance
Write-Host "3. Starting headed browser instance..." -ForegroundColor Yellow
$body = @{ headless = $false } | ConvertTo-Json
$instance = Invoke-RestMethod -Uri "http://localhost:9867/profiles/$PROFILE_ID/start" -Method Post -Headers $headers -Body $body
$INSTANCE_ID = $instance.id
Write-Host "   OK - Instance: $INSTANCE_ID" -ForegroundColor Green
Write-Host "   Waiting 15 seconds for instance to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15
Write-Host ""

# Step 4: Get tab with retry
Write-Host "4. Getting tab (with retry)..." -ForegroundColor Yellow
$TAB_ID = $null
$maxRetries = 5
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $tabs = Invoke-RestMethod -Uri "http://localhost:9867/instances/$INSTANCE_ID/tabs" -Headers $headers
        if ($tabs -and $tabs.Count -gt 0) {
            $TAB_ID = $tabs[0].id
            Write-Host "   OK - Tab: $TAB_ID" -ForegroundColor Green
            break
        }
    }
    catch {
        Write-Host "   Retry $i/$maxRetries..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $TAB_ID) {
    Write-Host "   ERROR - Failed to get tab after $maxRetries attempts" -ForegroundColor Red
    Write-Host ""
    exit 1
}
Write-Host ""

# Step 5: Navigate to Google
Write-Host "5. Navigating to Google..." -ForegroundColor Yellow
$body = @{ url = "https://www.google.com" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/navigate" -Method Post -Headers $headers -Body $body
Write-Host "   OK - Navigated" -ForegroundColor Green
Write-Host "   Waiting 8 seconds for page load..." -ForegroundColor Yellow
Start-Sleep -Seconds 8
Write-Host ""

# Step 6: Show Hello World popup
Write-Host "6. Executing JavaScript to show popup..." -ForegroundColor Yellow
$testScript = 'document.body.insertAdjacentHTML("beforeend", "<div style=\"position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#4CAF50;color:white;padding:30px 50px;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.5);z-index:999999;font-size:28px;font-weight:bold;font-family:Arial;\">Hello World!</div>"); "Popup shown!"'
$body = @{ expression = $testScript } | ConvertTo-Json
$result = Invoke-RestMethod -Uri "http://localhost:9867/tabs/$TAB_ID/evaluate" -Method Post -Headers $headers -Body $body
Write-Host "   OK - Result: $($result.result)" -ForegroundColor Green
Write-Host ""

Write-Host "============================================================" -ForegroundColor Magenta
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Open http://localhost:9990 in your browser" -ForegroundColor Cyan
Write-Host "  You should see a green Hello World popup on Google" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Instance ID: $INSTANCE_ID" -ForegroundColor Gray
Write-Host "  Tab ID: $TAB_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "============================================================" -ForegroundColor Magenta
Write-Host ""
