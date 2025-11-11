import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:2100'
  const apiBasePath = env.VITE_API_BASE_PATH || '/api/data'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 2200,
      proxy: {
        [apiBasePath]: {
          target: apiUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${apiBasePath}`), '/data'),
        },
      },
    },
  }
})
