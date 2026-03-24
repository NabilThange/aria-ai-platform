# ARIA Startup Script - Auto updates Vercel with new tunnel URLs
# Run this every time you want to start ARIA

$VERCEL_TOKEN = "vcp_1TKjO3XPLrzq08FSngwOeUASEeSpywLyyQn4SQPAYtZ6QZ4OaP4OJQv6"
$VERCEL_PROJECT_ID = "prj_TZT2tbT8DvYkdbOKD9SDNtQGMS3W"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARIA Startup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ---- STEP 1: Start Backend Tunnel ----
Write-Host "`n[1/4] Starting backend tunnel..." -ForegroundColor Yellow
$backendOut = "$env:TEMP\aria-backend-out.log"
$backendErr = "$env:TEMP\aria-backend-err.log"
Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:9991" -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -WindowStyle Normal

# Wait for backend tunnel URL
Write-Host "      Waiting for backend tunnel URL..." -ForegroundColor Gray
$backendUrl = $null
$attempts = 0
while (-not $backendUrl -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
    foreach ($log in @($backendOut, $backendErr)) {
        if (Test-Path $log) {
            $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
            if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
                $backendUrl = $matches[0]
                break
            }
        }
    }
}

if (-not $backendUrl) {
    Write-Host "ERROR: Could not get backend tunnel URL. Is cloudflared installed?" -ForegroundColor Red
    exit 1
}
Write-Host "      Backend URL: $backendUrl" -ForegroundColor Green

# ---- STEP 2: Start Desktop Tunnel ----
Write-Host "`n[2/4] Starting desktop tunnel..." -ForegroundColor Yellow
$desktopOut = "$env:TEMP\aria-desktop-out.log"
$desktopErr = "$env:TEMP\aria-desktop-err.log"
Start-Process -FilePath "cloudflared" -ArgumentList "tunnel --url http://localhost:9990" -RedirectStandardOutput $desktopOut -RedirectStandardError $desktopErr -WindowStyle Normal

# Wait for desktop tunnel URL
Write-Host "      Waiting for desktop tunnel URL..." -ForegroundColor Gray
$desktopUrl = $null
$attempts = 0
while (-not $desktopUrl -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
    foreach ($log in @($desktopOut, $desktopErr)) {
        if (Test-Path $log) {
            $content = Get-Content $log -Raw -ErrorAction SilentlyContinue
            if ($content -match "https://[a-z0-9\-]+\.trycloudflare\.com") {
                $desktopUrl = $matches[0]
                break
            }
        }
    }
}

if (-not $desktopUrl) {
    Write-Host "ERROR: Could not get desktop tunnel URL." -ForegroundColor Red
    exit 1
}
Write-Host "      Desktop URL: $desktopUrl" -ForegroundColor Green

# ---- STEP 3: Update Vercel Environment Variables ----
Write-Host "`n[3/4] Updating Vercel environment variables..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $VERCEL_TOKEN"
    "Content-Type"  = "application/json"
}

$wssDesktopUrl = $desktopUrl -replace "^https://", "wss://"

$envVars = @(
    @{ key = "ARIA_AGENT_BASE_URL";          value = $backendUrl },
    @{ key = "NEXT_PUBLIC_API_URL";          value = $backendUrl },
    @{ key = "ARIA_DESKTOP_VNC_URL";         value = "$wssDesktopUrl/websockify" },
    @{ key = "NEXT_PUBLIC_DESKTOP_VNC_URL";  value = "$wssDesktopUrl/websockify" }
)

foreach ($env in $envVars) {
    # Check if variable exists
    $getUrl = "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env"
    $existing = Invoke-RestMethod -Uri $getUrl -Headers $headers -Method GET

    $existingVar = $existing.envs | Where-Object { $_.key -eq $env.key }

    if ($existingVar) {
        # Update existing
        $updateUrl = "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env/$($existingVar.id)"
        $body = @{ value = $env.value } | ConvertTo-Json
        Invoke-RestMethod -Uri $updateUrl -Headers $headers -Method PATCH -Body $body | Out-Null
        Write-Host "      Updated: $($env.key)" -ForegroundColor Green
    } else {
        # Create new
        $createUrl = "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID/env"
        $body = @{
            key    = $env.key
            value  = $env.value
            type   = "plain"
            target = @("production", "preview", "development")
        } | ConvertTo-Json
        Invoke-RestMethod -Uri $createUrl -Headers $headers -Method POST -Body $body | Out-Null
        Write-Host "      Created: $($env.key)" -ForegroundColor Green
    }
}

# ---- STEP 4: Trigger Vercel Redeploy ----
Write-Host "`n[4/4] Triggering Vercel redeploy..." -ForegroundColor Yellow

$deploymentsUrl = "https://api.vercel.com/v6/deployments?projectId=$VERCEL_PROJECT_ID&limit=1"
$deployments = Invoke-RestMethod -Uri $deploymentsUrl -Headers $headers -Method GET
$latestDeploymentId = $deployments.deployments[0].uid

$redeployUrl = "https://api.vercel.com/v13/deployments"
$redeployBody = @{
    deploymentId = $latestDeploymentId
    name         = "aria-ai-platform"
    target       = "production"
} | ConvertTo-Json

Invoke-RestMethod -Uri $redeployUrl -Headers $headers -Method POST -Body $redeployBody | Out-Null
Write-Host "      Redeploy triggered!" -ForegroundColor Green

# ---- DONE ----
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  ARIA is starting up!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nBackend : $backendUrl" -ForegroundColor White
Write-Host "Desktop : $desktopUrl" -ForegroundColor White
Write-Host "Frontend: https://aria-ai-platform.vercel.app" -ForegroundColor White
Write-Host "`nVercel will redeploy in ~2 minutes." -ForegroundColor Gray
Write-Host "Tunnels are running in the background. Close this window to stop them.`n" -ForegroundColor Gray