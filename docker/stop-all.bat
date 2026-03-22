@echo off
REM Stop all ARIA services

cd /d "%~dp0"

echo 🛑 Stopping ARIA Docker Compose project...
docker-compose -f docker-compose.yml down

echo.
echo ✅ All ARIA services stopped!
echo.
pause
