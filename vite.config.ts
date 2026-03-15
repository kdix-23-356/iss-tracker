import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

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

  define: {
    // GitHub Pages の公開パスに揃える
    CESIUM_BASE_URL: JSON.stringify('/iss-tracker/cesium/'),
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/cesium')) return 'cesium'
        },
      },
    },
  },
})