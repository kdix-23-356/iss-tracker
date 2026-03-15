import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'

export default defineConfig({
  plugins: [
    react(),
    cesium()
  ],
  // 依存関係の解決を強制する設定を追加
  optimizeDeps: {
    base: '/iss-tracker/',
    include: ['tslib']
  }
})