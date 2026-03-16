#!/bin/bash

echo "🔄 Restarting Aria Development Environment..."
echo ""

# Stop existing containers
echo "📦 Stopping existing containers..."
cd docker
docker-compose -f docker-compose.development.yml down
cd ..

# Start containers
echo "🚀 Starting containers (Desktop, Postgres, Redis)..."
cd docker
docker-compose -f docker-compose.development.yml up -d
cd ..

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if services are running
echo ""
echo "✅ Checking service status..."
docker ps --filter "name=aria-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "📝 Next steps:"
echo "1. In terminal 1: cd packages/aria-agent && npm run dev"
echo "2. In terminal 2: cd packages/aria-ui && npm run dev"
echo ""
echo "🌐 Access points:"
echo "   - UI: http://localhost:3000"
echo "   - Agent API: http://localhost:9991"
echo "   - Desktop VNC: ws://localhost:9990/websockify"
echo "   - Postgres: localhost:5432"
echo "   - Redis: localhost:6379"
echo ""
echo "✨ Done! Your development environment is ready."
