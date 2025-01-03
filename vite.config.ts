import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    copyPublicDir: true,
  },
  publicDir: 'public',
  base: '/aigent-twitter-x/',
  server: {
    proxy: {
      '/v1': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        secure: true,
      }
    }
  }
})
