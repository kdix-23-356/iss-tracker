import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ★ Cesium Widgets のCSSを必ず一度だけ読み込む
import 'cesium/Build/Cesium/Widgets/widgets.css'

// ★ 実行時保険：ViteのBASE_URLをグローバルへ
declare global {
  interface Window { CESIUM_BASE_URL?: string }
}
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
window.CESIUM_BASE_URL = import.meta.env.BASE_URL!

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
