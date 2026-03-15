import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  base: '/iss-tracker/',
  plugins: [react(), cesium()],
  define: { CESIUM_BASE_URL: JSON.stringify('/iss-tracker/') },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          // Cesium 関連を専用チャンクに
          if (id.includes('node_modules/cesium')) return 'cesium'
        },
      },
    },
  },
})
