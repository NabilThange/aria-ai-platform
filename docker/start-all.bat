@echo off
REM ============================================================================
REM ARIA - ONE COMMAND TO START EVERYTHING!
REM ============================================================================
REM This script starts ALL 5 services in Docker Desktop:
REM   ✅ Frontend (aria-ui) on port 9992
REM   ✅ Backend (aria-agent) on port 9991
REM   ✅ Database (postgres) on port 5432
REM   ✅ Redis on port 6379
REM   ✅ Desktop (aria-desktop) on ports 9990, 9867
REM ============================================================================

cd /d "%~dp0"

echo.
echo ============================================================================
echo 🚀 ARIA - Starting Complete Stack
echo ============================================================================
echo.

REM Check if .env file exists
if not exist ".env" (
    echo ❌ ERROR: .env file not found!
    echo.
    echo Please create docker/.env file with your API keys:
    echo   GOOGLE_API_KEY=your_key_here
    echo   GROQ_API_KEY=your_key_here
    echo   BYTEZ_API_KEY=your_key_here
    echo.
    pause
    exit /b 1
)

REM Stop any existing containers
echo 🛑 Stopping existing containers...
docker-compose -f docker-compose.yml down
echo.

REM Build images (first time or after code changes)
echo 🔨 Building Docker images (this may take 5-10 minutes first time)...
docker-compose -f docker-compose.yml build
echo.

REM Start all services
echo 🚀 Starting all 5 services...
docker-compose -f docker-compose.yml up -d
echo.

REM Wait for services to be ready
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul
echo.

echo ============================================================================
echo ✅ ARIA STARTED SUCCESSFULLY!
echo ============================================================================
echo.
echo 📦 Check Docker Desktop - you should see "aria" dropdown with 5 services:
echo.
echo   🖥️  aria-desktop  → http://localhost:9990 (Desktop + PinchTab)
echo   🗄️  aria-postgres → localhost:5432 (Database)
echo   💾 aria-redis    → localhost:6379 (Cache)
echo   ⚙️  aria-agent   → http://localhost:9991 (Backend API)
echo   🌐 aria-ui       → http://localhost:9992 (Frontend - OPEN THIS!)
echo.
echo ============================================================================
echo 🎯 NEXT STEPS:
echo ============================================================================
echo.
echo 1. Open your browser: http://localhost:9992
echo 2. Create a task and watch the magic happen!
echo.
echo 📋 Useful Commands:
echo   View logs:    docker-compose -f docker-compose.yml logs -f
echo   Stop all:     docker-compose -f docker-compose.yml down
echo   Restart:      docker-compose -f docker-compose.yml restart
echo   Check status: docker-compose -f docker-compose.yml ps
echo.
echo ============================================================================
echo.
pause
