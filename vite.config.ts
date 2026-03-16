// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import path from 'path'

const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumOut = 'cesium' // dist/cesium/ にまとめる

export default defineConfig({
  base: '/iss-tracker/',

  plugins: [
    react(),
    // 4フォルダを dist/cesium/ にコピー
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Assets`,     dest: cesiumOut },
        { src: `${cesiumSource}/Widgets`,    dest: cesiumOut },
        { src: `${cesiumSource}/Workers`,    dest: cesiumOut },
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumOut },
      ],
    }),
  ],

  // 実行時/ビルド時のモジュール解決（tsconfig.app.json の paths と揃える）
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  define: {
    // GitHub Pages の公開パスに揃える
    CESIUM_BASE_URL: JSON.stringify('/iss-tracker/cesium/'),
  },

  build: {
    rollupOptions: {
      output: {
        // ✅ ベンダ分割（初回 index-*.js を軽量化）
        manualChunks(id: string) {
          if (id.includes('node_modules/cesium')) return 'cesium'
          if (id.includes('/react/')) return 'react'              // react, react-dom 等
          if (id.includes('node_modules/resium')) return 'resium' // resium
          if (id.includes('node_modules/satellite.js')) return 'satellite'
          // それ以外はデフォルト分割に任せる
        },
      },
    },
    // （任意）警告の閾値を調整したいとき
    // chunkSizeWarningLimit: 1500,
  },
})