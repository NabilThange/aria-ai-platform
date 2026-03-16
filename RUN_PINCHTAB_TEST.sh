#!/bin/bash

# PinchTab Test Runner
# This script runs the PinchTab web agent simulation test

echo "🚀 PinchTab Web Agent Test Runner"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "packages/aria-agent" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: Project root containing packages/aria-agent"
    exit 1
fi

# Check if PinchTab is available
echo "🔍 Checking PinchTab availability..."
if curl -s -f http://localhost:9867/health > /dev/null 2>&1; then
    echo "✅ PinchTab is available at http://localhost:9867"
else
    echo "❌ PinchTab is not available at http://localhost:9867"
    echo "   Make sure the Docker container is running:"
    echo "   cd docker && docker-compose up -d aria-desktop"
    echo ""
    echo "   Then verify: curl http://localhost:9867/health"
    exit 1
fi

echo ""
echo "📋 Test Options:"
echo "   1. Simple standalone test (recommended)"
echo "   2. Full Jest test suite"
echo ""
read -p "Choose option (1 or 2): " choice

cd packages/aria-agent

case $choice in
    1)
        echo ""
        echo "🏃 Running simple standalone test..."
        echo "   This will open Chrome, go to Google, and search 'hello world'"
        echo "   Watch in VNC to see it happen live!"
        echo ""
        npm run test:pinchtab:simple
        ;;
    2)
        echo ""
        echo "🏃 Running full Jest test suite..."
        echo ""
        npm run test:pinchtab
        ;;
    *)
        echo "❌ Invalid choice. Please run again and choose 1 or 2."
        exit 1
        ;;
esac

echo ""
echo "✅ Test complete!"
echo ""
echo "📚 For more information, see:"
echo "   - PINCHTAB_QUICK_START.md"
echo "   - PINCHTAB_TEST_SUITE_SUMMARY.md"
echo "   - packages/aria-agent/test/PINCHTAB_TEST_README.md"
