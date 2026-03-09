# ARIA Local Proxy

This proxy allows your browser to connect to the local desktop daemon from the hosted Vercel site.

## Why is this needed?

When you visit `https://ai-aria.vercel.app` (HTTPS), browsers block direct connections to `ws://localhost:9990` due to mixed content security policy. This proxy runs on `localhost:9991` and forwards connections to your desktop on `localhost:9990`.

## Installation

```bash
cd packages/aria-local-proxy
npm install
```

## Usage

### Start the proxy:
```bash
npm start
```

You should see:
```
🔗 ARIA Local Proxy running on http://localhost:9991
📡 Proxying to desktop daemon at http://localhost:9990
🌐 WebSocket endpoint: ws://localhost:9991/websockify
```

### Then:
1. Make sure your desktop daemon is running on port 9990
2. Visit https://ai-aria.vercel.app/desktop
3. Toggle to "Local Desktop"
4. It will connect through the proxy!

## Troubleshooting

**"Bad Gateway" error:**
- Make sure the desktop daemon is running on port 9990
- Check: `docker-compose ps` or verify ariad is running

**Port 9991 already in use:**
- Change the PORT in `index.js` (line 32)
- Update the port in the frontend VncViewer.tsx accordingly

**Connection refused:**
- Ensure both desktop (9990) and proxy (9991) are running
- Check firewall settings
