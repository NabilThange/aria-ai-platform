# Stop all ARIA services

Write-Host ""
Write-Host "🛑 Stopping ARIA Docker Compose project..." -ForegroundColor Yellow
docker-compose -f docker-compose.yml down

Write-Host ""
Write-Host "✅ All ARIA services stopped!" -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
