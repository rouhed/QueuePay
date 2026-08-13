import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://127.0.0.1:5000',
      '/admin': {
        target: 'http://127.0.0.1:5000',
        bypass(req) {
          // Only proxy actual API calls (Accept: application/json), serve SPA for page loads
          if (req.headers.accept && req.headers.accept.includes('text/html')) {
            return '/index.html';
          }
        }
      },
      '/entity': 'http://127.0.0.1:5000',
      '/agent': 'http://127.0.0.1:5000',
      '/client': 'http://127.0.0.1:5000',
    },
  },
  // SPA fallback: serve index.html for any unmatched route
  appType: 'spa',
})
