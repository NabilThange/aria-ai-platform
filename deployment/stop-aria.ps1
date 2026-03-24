# ============================================
# ARIA Stop Script - Complete Shutdown
# ============================================
# Stops: Cloudflare Tunnel + Backend + Docker Services
# (Docker containers are stopped, not removed)

$ErrorActionPreference = "Continue"

$PROJECT_ROOT = "C:\Users\thang\Projects\Aria\Aria"
$DOCKER_DIR = "$PROJECT_ROOT\docker"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARIA Shutdown Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================
# STEP 1: Stop Cloudflare Tunnels
# ============================================
Write-Host "[1/3] Stopping Cloudflare Tunnels..." -ForegroundColor Yellow

# Find and kill all cloudflared processes
$cloudflaredProcesses = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue

if ($cloudflaredProcesses) {
    foreach ($process in $cloudflaredProcesses) {
        try {
            Write-Host "      Stopping cloudflared (PID: $($process.Id))..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force
            Write-Host "      Stopped cloudflared (PID: $($process.Id))" -ForegroundColor Green
        } catch {
            Write-Host "      Failed to stop cloudflared (PID: $($process.Id))" -ForegroundColor Red
        }
    }
} else {
    Write-Host "      No cloudflared processes found" -ForegroundColor Gray
}

# Clean up tunnel log files
Write-Host "      Cleaning up tunnel logs..." -ForegroundColor Gray
Remove-Item "$env:TEMP\aria-backend-out.log" -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\aria-backend-err.log" -ErrorAction SilentlyContinue
Write-Host "      Cloudflare tunnels stopped" -ForegroundColor Green

# ============================================
# STEP 2: Stop Backend (aria-agent)
# ============================================
Write-Host "`n[2/3] Stopping Backend (aria-agent)..." -ForegroundColor Yellow

# Find Node.js processes running aria-agent
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    $stoppedCount = 0
    foreach ($process in $nodeProcesses) {
        try {
            # Check if this is the aria-agent process by checking command line
            $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
            if ($commandLine -like "*aria-agent*" -or $commandLine -like "*start:dev*") {
                Write-Host "      Stopping aria-agent (PID: $($process.Id))..." -ForegroundColor Gray
                Stop-Process -Id $process.Id -Force
                Write-Host "      Stopped aria-agent (PID: $($process.Id))" -ForegroundColor Green
                $stoppedCount++
            }
        } catch {
            Write-Host "      Failed to stop process (PID: $($process.Id))" -ForegroundColor Red
        }
    }
    
    if ($stoppedCount -eq 0) {
        Write-Host "      No aria-agent processes found" -ForegroundColor Gray
    }
} else {
    Write-Host "      No Node.js processes found" -ForegroundColor Gray
}

# Also try to stop any PowerShell windows that might be running the backend
$powershellProcesses = Get-Process -Name "powershell" -ErrorAction SilentlyContinue | Where-Object {
    $_.MainWindowTitle -like "*aria-agent*" -or $_.MainWindowTitle -like "*start:dev*"
}

if ($powershellProcesses) {
    foreach ($process in $powershellProcesses) {
        try {
            Write-Host "      Stopping PowerShell window (PID: $($process.Id))..." -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force
            Write-Host "      Stopped PowerShell window (PID: $($process.Id))" -ForegroundColor Green
        } catch {
            Write-Host "      Failed to stop PowerShell window (PID: $($process.Id))" -ForegroundColor Red
        }
    }
}

Write-Host "      Backend stopped" -ForegroundColor Green

# ============================================
# STEP 3: Stop Docker Services (but keep them available)
# ============================================
Write-Host "`n[3/3] Stopping Docker Services..." -ForegroundColor Yellow

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "      Docker is running" -ForegroundColor Green
} catch {
    Write-Host "      Docker Desktop is not running (skipping)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ARIA Shutdown Complete!" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    pause
    exit 0
}

# Navigate to docker directory and stop services
Push-Location $DOCKER_DIR
try {
    Write-Host "      Stopping postgres, redis, and aria-desktop..." -ForegroundColor Gray
    
    # Use 'stop' instead of 'down' to keep containers (just stop them)
    docker-compose stop postgres redis aria-desktop
    
    # Verify containers are stopped
    $postgresStatus = docker ps --filter "name=aria-postgres" --format "{{.Status}}"
    $redisStatus = docker ps --filter "name=aria-redis" --format "{{.Status}}"
    $desktopStatus = docker ps --filter "name=aria-desktop" --format "{{.Status}}"
    
    Write-Host ""
    if (-not $postgresStatus) {
        Write-Host "      [OK] Postgres stopped" -ForegroundColor Green
    } else {
        Write-Host "      [WARN] Postgres still running" -ForegroundColor Yellow
    }
    
    if (-not $redisStatus) {
        Write-Host "      [OK] Redis stopped" -ForegroundColor Green
    } else {
        Write-Host "      [WARN] Redis still running" -ForegroundColor Yellow
    }
    
    if (-not $desktopStatus) {
        Write-Host "      [OK] Desktop stopped" -ForegroundColor Green
    } else {
        Write-Host "      [WARN] Desktop still running" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "      ERROR: Failed to stop Docker services" -ForegroundColor Red
    Write-Host "      $_" -ForegroundColor Red
} finally {
    Pop-Location
}

# ============================================
# DONE - Summary
# ============================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ARIA Shutdown Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services Status:" -ForegroundColor White
Write-Host "  [OK] Cloudflare Tunnels : Stopped" -ForegroundColor Green
Write-Host "  [OK] Backend (aria-agent) : Stopped" -ForegroundColor Green
Write-Host "  [OK] Docker Services    : Stopped (containers preserved)" -ForegroundColor Green
Write-Host ""
Write-Host "Notes:" -ForegroundColor Yellow
Write-Host "  - All ARIA services have been stopped" -ForegroundColor Gray
Write-Host "  - Docker containers are stopped but NOT removed" -ForegroundColor Gray
Write-Host "  - Data in Postgres and Redis is preserved" -ForegroundColor Gray
Write-Host "  - To start again, run: .\start-aria.ps1" -ForegroundColor Gray
Write-Host "  - Docker Desktop is still running (close manually if needed)" -ForegroundColor Gray
Write-Host ""
pause
