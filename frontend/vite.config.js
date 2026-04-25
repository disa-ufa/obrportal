import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined
  }

  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/scheduler/')
  ) {
    return 'vendor-react'
  }

  if (id.includes('/react-router-dom/') || id.includes('/@remix-run/')) {
    return 'vendor-router'
  }

  if (id.includes('/qrcode.react/')) {
    return 'vendor-qr'
  }

  if (id.includes('/lucide-react/')) {
    return 'vendor-icons'
  }

  return 'vendor'
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
