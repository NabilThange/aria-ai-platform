#!/bin/bash
# Start all ARIA services as a Docker Compose project
# This will create the "aria" dropdown in Docker Desktop

cd "$(dirname "$0")"

echo "🚀 Starting ARIA Docker Compose project..."
echo ""

# Stop any existing containers first
echo "Stopping existing containers..."
docker-compose -f docker-compose.yml down

echo ""
echo "Building and starting all services..."
docker-compose -f docker-compose.yml up -d

echo ""
echo "✅ ARIA project started!"
echo ""
echo "Check Docker Desktop - you should see 'aria' dropdown with all 5 services:"
echo "  - aria-desktop (ports 9990, 9867)"
echo "  - aria-postgres (port 5432)"
echo "  - aria-redis (port 6379)"
echo "  - aria-agent (port 9991)"
echo "  - aria-ui (port 9992)"
echo ""
echo "View logs: docker-compose -f docker-compose.yml logs -f"
echo "Stop all: docker-compose -f docker-compose.yml down"
