import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 2200,
    proxy: {
      '/api/data': {
        target: 'http://localhost:2100',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/data/, '/data'),
      },
    },
  },
})
