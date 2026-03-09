const http = require('http');
const httpProxy = require('http-proxy');
const express = require('express');

const app = express();
const proxy = httpProxy.createProxyServer({
  target: 'http://localhost:9990',
  ws: true,
  changeOrigin: true
});

// Enable CORS for all origins (since this is local)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Proxy HTTP requests
app.use('/', (req, res) => {
  proxy.web(req, res, {}, (err) => {
    console.error('Proxy error:', err);
    res.status(502).send('Bad Gateway');
  });
});

const server = http.createServer(app);

// Proxy WebSocket connections
server.on('upgrade', (req, socket, head) => {
  console.log('WebSocket upgrade request:', req.url);
  proxy.ws(req, socket, head, {}, (err) => {
    console.error('WebSocket proxy error:', err);
    socket.destroy();
  });
});

const PORT = 9992;
server.listen(PORT, () => {
  console.log(`🔗 ARIA Local Proxy running on http://localhost:${PORT}`);
  console.log(`📡 Proxying to desktop daemon at http://localhost:9990`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}/websockify`);
  console.log('');
  console.log('✅ You can now connect from https://ai-aria.vercel.app/desktop');
});

proxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  if (res && res.writeHead) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
});
