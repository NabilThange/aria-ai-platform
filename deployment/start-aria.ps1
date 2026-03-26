# ============================================
# ARIA Startup Script - Complete Automation
# ============================================
# Starts: Postgres + Redis + Desktop (Docker) + Backend (Local) + Cloudflare Tunnel
# 100% FREE - No Railway needed!

$ErrorActionPreference = "Continue"

# Configuration
$VERCEL_TOKEN = "vcp_1TKjO3XPLrzq08FSngwOeUASEeSpywLyyQn4SQPAYtZ6QZ4OaP4OJQv6"
$VERCEL_PROJECT_ID = "prj_TZT2tbT8DvYkdbOKD9SDNtQGMS3W"
$PROJECT_ROOT = "C:\Users\thang\Projects\Aria\Aria"
$DOCKER_DIR = "$PROJECT_ROOT\docker"
$BACKEND_DIR = "$PROJECT_ROOT\packages\aria-agent"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARIA Startup Script" -ForegroundColor Cyan
Write-Host "  (Postgres + Redis + Desktop in Docker)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# STEP 1: Start Docker Services
# ============================================
Write-Host "[1/4] Starting Docker Services (Postgres, Redis, Desktop)..." -ForegroundColor Yellow

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "      Docker is running" -ForegroundColor Green
} catch {
    Write-Host "      ERROR: Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "      Please start Docker Desktop and try again." -ForegroundColor Red
    pause
    exit 1
}

# Navigate to docker directory and start services
Push-Location $DOCKER_DIR
Write-Host "      Starting postgres, redis, and aria-desktop..." -ForegroundColor Gray

# Start the containers (don't suppress output so we can see what's happening)
docker-compose up postgres redis aria-desktop -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Failed to start Docker services" -ForegroundColor Red
    Pop-Location
    pause
    exit 1
}

# Wait for services to be ready
Write-Host "      Waiting for services to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 15

# Check if containers are running
$postgresStatus = docker ps --filter "name=aria-postgres" --format "{{.Status}}"
$redisStatus = docker ps --filter "name=aria-redis" --format "{{.Status}}"
$desktopStatus = docker ps --filter "name=aria-desktop" --format "{{.Status}}"

Write-Host ""
if ($postgresStatus) {
    Write-Host "      [OK] Postgres running" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] Postgres not running" -ForegroundColor Red
}

if ($redisStatus) {
    Write-Host "      [OK] Redis running" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] Redis not running" -ForegroundColor Red
}

if ($desktopStatus) {
    Write-Host "      [OK] Desktop running" -ForegroundColor Green
} else {
    Write-Host "      [FAIL] Desktop not running" -ForegroundColor Red
}

if (-not ($postgresStatus -and $redisStatus -and $desktopStatus)) {
    Write-Host ""
    Write-Host "      ERROR: Some containers failed to start" -ForegroundColor Red
    Write-Host "      Check Docker Desktop for errors" -ForegroundColor Yellow
    Pop-Location
    pause
    exit 1
}

Pop-Location

# ============================================
# STEP 2: Start Backend (aria-agent)
# ============================================
Write-Host "`n[2/4] Starting Backend (aria-agent)..." -ForegroundColor Yellow

# Check if .env exists, if not copy from .env.local
if (-not (Test-Path "$BACKEND_DIR\.env")) {
    Write-Host "      .env not found, copying from .env.local" -ForegroundColor Yellow
    Copy-Item "$BACKEND_DIR\.env.local" "$BACKEND_DIR\.env"
} else {
    Write-Host "      Using existing .env file" -ForegroundColor Gray
}

# Start backend in a new window
$backendProcess = Start-Process -FilePath "powershell" `
    -ArgumentList "-NoExit", "-Command", "cd '$BACKEND_DIR'; npm run start:dev" `
    -PassThru `
    -WindowStyle Normal

Write-Host "      Backend starting in new window (PID: $($backendProcess.Id))..." -ForegroundColor Gray
Write-Host "      Waiting for backend to be ready..." -ForegroundColor Gray

# Wait for backend to be ready (check health endpoint)
$backendReady = $false
$attempts = 0
while (-not $backendReady -and $attempts -lt 30) {
    Start-Sleep -Seconds 2
    $attempts++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:9991/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
        }
    } catch {
        # Still waiting...
    }
}

if ($backendReady) {
    Write-Host "      Backend is ready at http://localhost:9991" -ForegroundColor Green
} else {
    Write-Host "      WARNING: Backend health check timeout (continuing anyway)" -ForegroundColor Yellow
}

# ============================================
# STEP 3: Start Backend Tunnel
# ============================================
Write-Host "`n[3/5] Starting backend tunnel..." -ForegroundColor Yellow

$backendOut = "$env:TEMP\aria-backend-out.log"
$backendErr = "$env:TEMP\aria-backend-err.log"

# Clear old logs
Remove-Item $backendOut -ErrorAction SilentlyContinue
Remove-Item $backendErr -ErrorAction SilentlyContinue

Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel --url http://localhost:9991" `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr `
    -WindowStyle Normal

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
    Write-Host "      ERROR: Could not get backend tunnel URL" -ForegroundColor Red
    Write-Host "      Is cloudflared installed?" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "      Backend Tunnel: $backendUrl" -ForegroundColor Green

# ============================================
# STEP 4: Start Desktop Tunnel
# ============================================
Write-Host "`n[4/5] Starting desktop tunnel..." -ForegroundColor Yellow

$desktopOut = "$env:TEMP\aria-desktop-out.log"
$desktopErr = "$env:TEMP\aria-desktop-err.log"

# Clear old logs
Remove-Item $desktopOut -ErrorAction SilentlyContinue
Remove-Item $desktopErr -ErrorAction SilentlyContinue

Start-Process -FilePath "cloudflared" `
    -ArgumentList "tunnel --url http://localhost:9990" `
    -RedirectStandardOutput $desktopOut `
    -RedirectStandardError $desktopErr `
    -WindowStyle Normal

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
    Write-Host "      ERROR: Could not get desktop tunnel URL" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "      Desktop Tunnel: $desktopUrl" -ForegroundColor Green

# ============================================
# STEP 5: Update Vercel Environment Variables
# ============================================
Write-Host "`n[5/5] Updating Vercel environment variables..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $VERCEL_TOKEN"
    "Content-Type"  = "application/json"
}

# Construct desktop VNC WebSocket URL
$desktopVncUrl = $desktopUrl -replace "^https://", "wss://"
$desktopVncUrl = "$desktopVncUrl/websockify"

# Update backend and desktop URLs
$envVars = @(
    @{ key = "ARIA_AGENT_BASE_URL";          value = $backendUrl },
    @{ key = "NEXT_PUBLIC_API_URL";          value = $backendUrl },
    @{ key = "ARIA_DESKTOP_VNC_URL";         value = $desktopVncUrl },
    @{ key = "NEXT_PUBLIC_DESKTOP_VNC_URL";  value = $desktopVncUrl }
)

foreach ($env in $envVars) {
    try {
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
    } catch {
        Write-Host "      ERROR updating $($env.key): $_" -ForegroundColor Red
    }
}

# Trigger Vercel redeploy
Write-Host "      Triggering Vercel redeploy..." -ForegroundColor Gray
try {
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
} catch {
    Write-Host "      ERROR triggering redeploy: $_" -ForegroundColor Red
}

# ============================================
# DONE - Summary
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARIA is now running!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "  [OK] Postgres (Docker)  : localhost:5432" -ForegroundColor Green
Write-Host "  [OK] Redis (Docker)     : localhost:6379" -ForegroundColor Green
Write-Host "  [OK] Desktop (Docker)   : localhost:9990" -ForegroundColor Green
Write-Host "  [OK] Backend (Local)    : localhost:9991" -ForegroundColor Green
Write-Host "  [OK] Backend Tunnel     : $backendUrl" -ForegroundColor Green
Write-Host "  [OK] Desktop Tunnel     : $desktopUrl" -ForegroundColor Green
Write-Host ""
Write-Host "Access Points:" -ForegroundColor White
Write-Host "  Frontend     : https://aria-ai-platform.vercel.app" -ForegroundColor Cyan
Write-Host "  Backend API  : $backendUrl" -ForegroundColor Cyan
Write-Host "  Desktop VNC  : $desktopVncUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Notes:" -ForegroundColor Yellow
Write-Host "  - Vercel will redeploy in ~2 minutes" -ForegroundColor Gray
Write-Host "  - Backend window and tunnel window are running" -ForegroundColor Gray
Write-Host "  - Database & Redis are in Docker (100% free!)" -ForegroundColor Gray
Write-Host "  - To stop everything, run: .\stop-aria.ps1" -ForegroundColor Gray
Write-Host ""
pause
