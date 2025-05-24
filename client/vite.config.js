import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Log proxy requests for debugging
            console.log('Proxying:', {
              method: req.method,
              path: req.url,
              target: `${options.target}${req.url}`,
              headers: {
                ...proxyReq.getHeaders(),
                // Don't log the full auth token
                authorization: proxyReq.getHeader('authorization') ? 'Bearer [token]' : undefined
              }
            });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', {
              status: proxyRes.statusCode,
              path: req.url,
              headers: proxyRes.headers
            });
          });
          proxy.on('error', (err, req, res) => {
            console.error('Proxy error:', err);
            // Send a more helpful error response
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ 
                message: 'Proxy error occurred',
                error: err.message 
              }));
            }
          });
        }
      }
    }
  }
})
