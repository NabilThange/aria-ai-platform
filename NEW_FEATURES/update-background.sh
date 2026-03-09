#!/bin/bash
# Script to update ARIA VNC background image

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎨 ARIA VNC Background Updater${NC}"
echo "================================"

# Define paths
SOURCE_IMAGE="packages/aria-ui/public/ARIA-BG.png"
DEST_IMAGE="packages/ariad/root/usr/share/backgrounds/aria-background.jpg"

# Check if source exists
if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Source image not found: $SOURCE_IMAGE"
    exit 1
fi

# Create destination directory if needed
mkdir -p "$(dirname "$DEST_IMAGE")"

# Copy and convert image
echo "📋 Copying $SOURCE_IMAGE"
echo "   to $DEST_IMAGE"

cp "$SOURCE_IMAGE" "$DEST_IMAGE"

echo -e "${GREEN}✅ Background updated successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Rebuild Docker image: docker-compose -f docker-compose.core.yml build aria-desktop"
echo "2. Restart container: docker-compose -f docker-compose.core.yml up -d aria-desktop"
echo "3. Open VNC to see new background"
