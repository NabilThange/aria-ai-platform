#!/bin/bash
# Stop all ARIA services

cd "$(dirname "$0")"

echo "🛑 Stopping ARIA Docker Compose project..."
docker-compose -f docker-compose.yml down

echo ""
echo "✅ All ARIA services stopped!"
