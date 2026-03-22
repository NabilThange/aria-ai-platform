@echo off
REM ARIA Local Development Setup Script (Windows)
REM This script configures ARIA for local development mode

echo 🚀 Setting up ARIA for Local Development...
echo.

REM Check if we're in the right directory
if not exist "packages\aria-agent" (
    echo ❌ Error: Please run this script from the ARIA root directory
    exit /b 1
)
if not exist "packages\aria-ui" (
    echo ❌ Error: Please run this script from the ARIA root directory
    exit /b 1
)

REM Configure backend
echo 📦 Configuring aria-agent (backend)...
cd packages\aria-agent
if exist ".env.local" (
    copy /Y .env.local .env >nul
    echo ✅ Backend configured for local development
) else (
    echo ❌ Error: .env.local not found in packages\aria-agent
    exit /b 1
)
cd ..\..

REM Configure frontend
echo 📦 Configuring aria-ui (frontend)...
cd packages\aria-ui
if exist ".env.local" (
    copy /Y .env.local .env >nul
    echo ✅ Frontend configured for local development
) else (
    echo ❌ Error: .env.local not found in packages\aria-ui
    exit /b 1
)
cd ..\..

echo.
echo ✅ Local development setup complete!
echo.
echo Next steps:
echo 1. Start Docker services:
echo    cd docker ^&^& docker-compose up postgres redis aria-desktop -d
echo.
echo 2. Run database migrations (first time only):
echo    cd packages\aria-agent ^&^& npx prisma migrate dev
echo.
echo 3. Start backend (Terminal 1):
echo    cd packages\aria-agent ^&^& npm run start:dev
echo.
echo 4. Start frontend (Terminal 2):
echo    cd packages\aria-ui ^&^& npm run dev
echo.
echo 5. Access the application:
echo    Frontend: http://localhost:9992
echo    Backend:  http://localhost:9991
echo    Desktop:  http://localhost:9990
echo.
