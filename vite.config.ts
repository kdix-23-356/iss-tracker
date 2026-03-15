import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  // GitHub Pages のプロジェクトページ。repo名に合わせて固定
  base: '/iss-tracker/',
  plugins: [react(), cesium()],
  define: {
    // Cesiumが参照する静的アセットのベースURLを固定
    CESIUM_BASE_URL: JSON.stringify('/iss-tracker/'),
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        // 初回以降の体感改善（Cesiumを独立チャンクに）
        manualChunks: { cesium: ['cesium'] },
      },
    },
  },
})
