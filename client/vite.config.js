import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';

  const baseConfig = {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: process.env.VITE_SERVER_URL || 'http://localhost:5000',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            // Log proxy requests for debugging (dev only)
            proxy.on('proxyReq', (proxyReq, req, res) => {
              if (!isProduction) {
                console.log('Proxying:', {
                  method: req.method,
                  path: req.url,
                  target: `${options.target}${req.url}`,
                  headers: {
                    ...proxyReq.getHeaders(),
                    authorization: proxyReq.getHeader('authorization') ? 'Bearer [token]' : undefined
                  }
                });
              }
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (!isProduction) {
                console.log('Proxy response:', {
                  status: proxyRes.statusCode,
                  path: req.url,
                  headers: proxyRes.headers
                });
              }
            });
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
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
  };

  // Enhanced production build configuration to remove console logs
  if (isProduction) {
    baseConfig.build = {
      minify: 'esbuild',
      esbuild: {
        // Remove console logs, debugger statements, but keep console.error
        drop: ['console', 'debugger'],
        // Alternative approach using pure annotations (more granular control)
        pure: ['console.log', 'console.warn', 'console.info', 'console.debug']
      },
      // Additional minification options
      terserOptions: {
        compress: {
          // Remove console statements except console.error
          drop_console: true,
          pure_funcs: ['console.log', 'console.warn', 'console.info', 'console.debug']
        }
      }
    };
  }

  return baseConfig;
});
