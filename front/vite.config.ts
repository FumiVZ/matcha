import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/profile': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/notifications': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/search': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/recommendations': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/chat': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/likes': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
