import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ★ WidgetsのCSS
import 'cesium/Build/Cesium/Widgets/widgets.css'

// 実行時の保険：BASE_URL + 'cesium/' をグローバルに
declare global { interface Window { CESIUM_BASE_URL?: string } }
window.CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/` // '/iss-tracker/cesium/'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)