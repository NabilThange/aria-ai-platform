# ============================================================================
# ARIA - ONE COMMAND TO START EVERYTHING!
# ============================================================================
# This script starts ALL 5 services in Docker Desktop:
#   ✅ Frontend (aria-ui) on port 9992
#   ✅ Backend (aria-agent) on port 9991
#   ✅ Database (postgres) on port 5432
#   ✅ Redis on port 6379
#   ✅ Desktop (aria-desktop) on ports 9990, 9867
# ============================================================================

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🚀 ARIA - Starting Complete Stack" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: .env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please create docker/.env file from the example:" -ForegroundColor Yellow
    Write-Host "  1. Copy .env.example to .env:" -ForegroundColor White
    Write-Host "     cp .env.example .env" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  2. Edit .env and add your API keys:" -ForegroundColor White
    Write-Host "     GOOGLE_API_KEY_1=your_key_here" -ForegroundColor Cyan
    Write-Host "     GROQ_API_KEY_1=your_key_here" -ForegroundColor Cyan
    Write-Host "     BYTEZ_API_KEY_1=your_key_here" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml down
Write-Host ""

# Build images (first time or after code changes)
Write-Host "🔨 Building Docker images (this may take 5-10 minutes first time)..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml build
Write-Host ""

# Start all services
Write-Host "🚀 Starting all 5 services..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml up -d
Write-Host ""

# Wait for services to be ready
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "✅ ARIA STARTED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Check Docker Desktop - you should see 'aria' dropdown with 5 services:" -ForegroundColor White
Write-Host ""
Write-Host "  🖥️  aria-desktop  → http://localhost:9990 (Desktop + PinchTab)" -ForegroundColor White
Write-Host "  🗄️  aria-postgres → localhost:5432 (Database)" -ForegroundColor White
Write-Host "  💾 aria-redis    → localhost:6379 (Cache)" -ForegroundColor White
Write-Host "  ⚙️  aria-agent   → http://localhost:9991 (Backend API)" -ForegroundColor White
Write-Host "  🌐 aria-ui       → http://localhost:9992 (Frontend - OPEN THIS!)" -ForegroundColor Cyan
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "🎯 NEXT STEPS:" -ForegroundColor Green
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run migrations (FIRST TIME ONLY):" -ForegroundColor Yellow
Write-Host "   docker exec aria-agent npx prisma migrate deploy" -ForegroundColor White
Write-Host ""
Write-Host "2. Open your browser: http://localhost:9992" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Create a task and watch the magic happen!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Useful Commands:" -ForegroundColor Green
Write-Host "  View logs:    docker-compose -f docker-compose.yml logs -f" -ForegroundColor White
Write-Host "  Stop all:     docker-compose -f docker-compose.yml down" -ForegroundColor White
Write-Host "  Restart:      docker-compose -f docker-compose.yml restart" -ForegroundColor White
Write-Host "  Check status: docker-compose -f docker-compose.yml ps" -ForegroundColor White
Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"
