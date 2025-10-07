// Custom server middleware for ember-cli
// This middleware intercepts /auth/* and /api/* requests and proxies them to the backend.
// The /auth/* proxy is critical for OAuth/OIDC flows to work correctly.

module.exports = function (app, options) {
  console.log('[Hermes Proxy] SERVER MIDDLEWARE LOADING');
  
  const { createProxyMiddleware } = require('http-proxy-middleware');
  
  // Get the proxy target from the --proxy flag or environment
  const proxyTarget = options.proxy || process.env.PROXY_URL || 'http://127.0.0.1:8001';
  
  console.log(`[Hermes Proxy] Configuring proxies to ${proxyTarget}`);
  
  // Auth proxy configuration - must come FIRST to handle login/callback/logout
  const authProxyConfig = {
    target: proxyTarget,
    changeOrigin: true,
    ws: false,
    followRedirects: false,
    // Prepend /auth back to the path since Express strips it
    pathRewrite: (path, req) => '/auth' + path,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[Auth Proxy] ${req.method} ${req.url} → ${proxyTarget}${proxyReq.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Auth Proxy] ${req.method} ${req.url} ← ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error(`[Auth Proxy] ERROR ${req.url}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Backend proxy error');
    }
  };
  
  // API proxy configuration
  const apiProxyConfig = {
    target: proxyTarget,
    changeOrigin: true,
    ws: false,
    // Prepend /api back to the path since Express strips it
    pathRewrite: (path, req) => '/api' + path,
    onProxyReq: (proxyReq, req, res) => {
      console.log(`[API Proxy] ${req.method} ${req.url} → ${proxyTarget}${proxyReq.path}`);
    },
    onError: (err, req, res) => {
      console.error(`[API Proxy] ERROR ${req.url}:`, err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Backend proxy error');
    }
  };
  
  // Register proxies - order matters!
  // Auth proxy MUST be registered before API proxy
  const authMiddleware = createProxyMiddleware(authProxyConfig);
  const apiMiddleware = createProxyMiddleware(apiProxyConfig);
  
  console.log('[Hermes Proxy] About to register middleware...');
  app.use('/auth', authMiddleware);
  console.log('[Hermes Proxy] Registered /auth proxy');
  app.use('/api', apiMiddleware);
  console.log('[Hermes Proxy] Registered /api proxy');
  
  console.log('[Hermes Proxy] Middleware registered: /auth/*, /api/*');
  console.log('[Hermes Proxy] Proxy target:', proxyTarget);
};
