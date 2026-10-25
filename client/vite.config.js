import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'google-redirect-callback-handler',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && (req.url === '/' || req.url === '/login' || req.url?.startsWith('/login?'))) {
            req.url = '/api/auth/google/callback'
          }
          next()
        })
      }
    }
  ],
  server: {
    port: 3000,
    host: '0.0.0.0', // Allow access from network
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
