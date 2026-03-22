#!/bin/bash
# PinchTab wrapper to set bind address to 0.0.0.0

CONFIG_DIR="/home/user/.pinchtab"
CONFIG_FILE="$CONFIG_DIR/config.json"

# Ensure config directory exists
mkdir -p "$CONFIG_DIR"

# Set environment variables for PinchTab
export PINCHTAB_SERVER_BIND="0.0.0.0"
export PINCHTAB_SERVER_PORT="9867"

# If config doesn't exist, let PinchTab create it first
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Creating initial PinchTab config..."
  timeout 5 pinchtab server &
  PID=$!
  sleep 3
  kill $PID 2>/dev/null || true
  wait $PID 2>/dev/null || true
fi

# Update bind address and port in config
if [ -f "$CONFIG_FILE" ]; then
  python3 -c "
import json
try:
    with open('$CONFIG_FILE', 'r+') as f:
        data = json.load(f)
        # Set bind to 0.0.0.0 to allow external connections
        data['server']['bind'] = '0.0.0.0'
        # Explicitly set port to 9867
        data['server']['port'] = '9867'
        f.seek(0)
        json.dump(data, f, indent=2)
        f.truncate()
        print('Updated PinchTab config: bind=0.0.0.0, port=9867')
except Exception as e:
    print(f'Failed to update config: {e}')
"
fi

# Start PinchTab
exec pinchtab server
