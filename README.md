# ISS Tracker — Realtime & Time‑Travel (Cesium × satellite.js)
**JP 🇯🇵 / EN 🇺🇸 bilingual README**

> **JP**: 国際宇宙ステーション（ISS）の現在位置と軌道（±90分）を 3D（Cesium）で可視化し、世界各地の地上局に対する **AOS/LOS（可視/不可視）** をリアルタイム判定・表示する Web アプリです。任意時刻の再現（タイムトラベル）と **局別 AOS/LOS イベントログ** を備え、UI は必要時のみ表示される Progressive Disclosure を採用しています。
> **EN**: A web app that visualizes the ISS current position and its orbit (±90 min) in 3D using Cesium, and computes **AOS/LOS** visibility to worldwide ground stations in real time. It supports time travel (state reproduction at any timestamp) and **per‑station AOS/LOS event logs**, with a Progressive Disclosure UI.

---

## 🔗 Repository
- GitHub: <https://github.com/kdix-23-356/iss-tracker>

---

## ✨ Features / 機能
- **3D Orbit & Position / 3D 軌道と位置**
  Visualize current ISS position and color‑segmented orbit paths (past/future, ±90 min, 2‑min steps). Around the ±180° date line, mid‑points are inserted to avoid polyline breaks.
  現在位置と軌道（過去/未来を色分け、±90分・2分刻み）を表示。±180° 跨ぎでは中間点を挿入して軌跡の断裂を防止します。

- **Realtime AOS/LOS / リアルタイム AOS/LOS 判定**
  Compute elevation/range for each ground station and judge AOS by a threshold (default **10°**). AOS stations are highlighted and linked to ISS by lines.
  各地上局に対して仰角・距離を算出し、しきい値（既定 **10°**）で AOS 判定。AOS 中の局は色分けし、ISS へのリンク線を描画します。

- **Per‑station Event Logs / 局別イベントログ**
  Append AOS/LOS transitions **only in realtime mode** to keep audit‑trail purity; display the latest N (5–10) per station.
  **リアルタイム時のみ** AOS/LOS 遷移を記録して証跡の純度を担保。各局で最新 N 件（5〜10件）を表示可能です。

- **Time‑Travel (Seek/Play) / タイムトラベル**
  Reproduce any state within a ±window (default ±6h). Playback with rates **1/10/60/300x**. No logging while time‑traveling.
  既定の ±6 時間でシーク・再生（**1/10/60/300x**）。タイムトラベル中はログを記録しません。

- **Performance & UX / 性能と UX**
  Use Cesium **`requestRenderMode`** (render on change), **lazy loading** for heavy panels (Board/Logs/TimeControl), and **vendor chunk splitting** in Vite to optimize initial load.
  変化時のみ再描画する `requestRenderMode`、重いパネルの遅延読込、Vite による**ベンダーチャンク分割**などで初期読み込みと実行負荷を抑えます。

- **Responsive & Dark Mode / レスポンシブ＆ダークモード対応**
  Automatically adapts to the OS's light/dark theme preference and scales smoothly on smaller screens using CSS Modules.
  OS のライト/ダークテーマ設定に自動連動し、CSS Modules による画面幅に応じたレスポンシブなレイアウト調整を行います。

---

## 🖼️ Screenshots / スクリーンショット
![image](/images/image.png)

---

## 🚀 Quick Start / クイックスタート

```bash
# Install deps / 依存関係のインストール
npm install

# Dev server / 開発サーバ
npm run dev

# Build / 本番ビルド
npm run build

# Preview / ローカルプレビュー
npm run preview

# Type check / 型チェック
npm run typecheck

# Lint / 静的解析
npm run lint
```

---

## 🌐 Deployment / デプロイ
This project is configured to be easily deployed to GitHub Pages.
GitHub Pages へのデプロイが npm スクリプトとして設定されています。

```bash
# Build and deploy to the `gh-pages` branch / gh-pages ブランチへデプロイ
npm run deploy
```

> **Note / 注意**: Ensure the `base` path in `vite.config.ts` matches your repository name (e.g., `/iss-tracker/`). / `vite.config.ts` の `base` 指定がリポジトリ名と一致していることを確認してください。

---

## ⚙️ Configuration & Assets / 設定・アセット

### TLE Source / TLE 取得先
ISS（NORAD ID: 25544）の TLE は以下の API から取得しています。

- https://api.wheretheiss.at/v1/satellites/25544/tles

取得処理では、HMR やコンポーネントのアンマウントによる fetch 中断（Abort）を **正常系（INFO）** として扱い、
通信失敗などの本当のエラーのみを **WARNING** として System Event Log に記録します。

EN:
TLE for ISS (NORAD 25544) is fetched from the API above.
Fetch aborts (HMR/unmount) are treated as **INFO**, while true failures are logged as **WARNING**.

---

### Cesium Static Assets
実行時に以下をグローバルに設定しています。

```ts
window.CESIUM_BASE_URL = `${import.meta.env.BASE_URL}cesium/`
```

Cesium の静的アセットは `/cesium/` 配下で配信される必要があります（例: `public/cesium/`）。

EN:
Cesium static assets must be served under `/cesium/` (e.g., place assets under `public/cesium/`).

---

### AOS Threshold / AOS 判定しきい値
- デフォルト値: **10°**
- 定義箇所: `src/constants/index.ts`

```ts
export const AOS_ELEVATION_THRESHOLD_DEG = 10
```

EN:
The default AOS (visibility) threshold is **10 degrees**, configurable in `src/constants/index.ts`.

---

### Ground Stations / 地上局
以下の地上局を例として内蔵しています（緯度・経度は度表記）。

- JAXA Tsukuba
- NASA White Sands Complex
- NASA Wallops Flight Facility
- NASA Kennedy Space Center
- ESA New Norcia (DSA 1)
- ESA ESOC (Darmstadt)
- ESA Malargüe (DSA 3)

定義箇所: `src/constants/index.ts`

EN:
Several ground stations (JAXA, NASA, ESA) are embedded with IDs & coordinates.

---

## 🕹️ Usage / 使い方

### Telemetry Panel / テレメトリ（左上）
- Velocity: km/s
- Altitude: km
- Latitude / Longitude: deg

EN:
Displays current ISS telemetry (speed, altitude, latitude, longitude).

---

### Config Panel / 設定パネル（左下）
以下の表示 ON/OFF を切り替えられます。

- Layers: Orbit / Footprint / Ground Station
- Panels: Telemetry / Station Board / Station Logs / System Event Log / Time Control
- Station Logs 表示件数（5〜10件）

EN:
Toggle layers and panels, and adjust the number of visible station log entries.

---

### Station Board / 地上局ボード（右上）
- 全地上局を **仰角の降順** で表示
- 同一仰角の場合は 1) 距離の昇順 → 2) ID の昇順 で決定的に並び替え

EN:
Displays all stations sorted by elevation (desc), then range (asc), then ID (asc).

---

### Station Logs / 局別イベントログ（右下）
- 各地上局ごとの AOS / LOS イベント履歴
- 表示順は「最新イベント時刻の降順」
- リアルタイム時のみ記録（タイムトラベル中は記録しない）

EN:
Shows per-station AOS/LOS history, recorded **only in realtime mode**.

---

### Time Control / タイムトラベル（上部中央）
- Realtime / Time‑Travel 切替
- シーク（スライダ）
- ±1分 / ±5分 移動
- Now ジャンプ
- 再生 / 一時停止
- 再生レート: 1x / 10x / 60x / 300x
- 時間ウィンドウ: ±30〜1440分

EN:
Allows seeking, playback, rate control, and time‑window adjustment in time‑travel mode.

---

## 🧱 Architecture / アーキテクチャ

### Core Design
`src/App.tsx` に **renderAt(target: Date)** を中核として設計。
- Realtime / Time‑Travel の両モードで共通利用
- 地上局ステータス・ISS テレメトリ・軌道再計算を集約
- ログ記録の有無（Realtime のみ）をここで制御

EN:
All core computations converge in `renderAt(target: Date)`, shared by realtime and time‑travel modes.

---

### State Management & Data Flow / 状態管理とデータフロー
The application employs a hook-based architecture to separate concerns, creating a clear one-way data flow.
フックベースのアーキテクチャで関心を分離し、明確な単一方向のデータフローを構築しています。

- **`useTle`**: Fetches TLE data and provides a `satrec` object. / TLE データを取得し、`satrec` オブジェクトを提供します。
- **`useIssSimulation`**: Takes the `satrec` object and manages all simulation-related state (ISS position, orbit, station statuses, event logs, clock). It encapsulates the core `renderAt` logic. / `satrec` を受け取り、シミュレーション関連の全状態（ISS位置、軌道、地上局ステータス、イベントログ、クロック）を管理します。コアロジックである `renderAt` を内包します。
- **`App.tsx`**: Consumes the state from `useIssSimulation` and passes it down to presentational components. It also manages UI-specific state (e.g., panel visibility). / `useIssSimulation` から状態を受け取り、表示コンポーネントに渡します。また、UI固有の状態（パネル表示など）も管理します。

This results in a clear data flow: `API → useTle → useIssSimulation → App → UI Components`.
これにより `API → useTle → useIssSimulation → App → UIコンポーネント` というデータフローが実現されます。

---

### Utilities / ユーティリティ設計
`src/utils` は **純粋関数** が基本。明示的 re-export により API 境界を明確化。
- `calculateIssTelemetry`
- `computeStationsStatus`
- `calculateOrbitPoints`
- `diffStationAos`
- `rankStationsByElevation`

EN:
Utilities are pure and explicitly re‑exported via `utils/index.ts`.

---

### Orbit Rendering Detail / 軌道描画の工夫
- ±90分を 2分刻みでサンプリング
- 経度 ±180° 跨ぎを検出
- 中間点を挿入してポリライン断裂を防止

EN:
Mid‑points are inserted around the ±180° longitude crossing to keep polylines continuous.

---

## 🧪 Tests / テスト

Vitest により以下を検証。
- 角度補助関数の性質（正規化・反対称性・連結性）— **プロパティベーステスト**で検証
- 軌道点列の点数下限
- AOS / LOS 判定の一貫性
- AOS / LOS イベント差分検出
- 地上局ランキングの決定的順序
- Config / TimeTravel パネルの最小 UI 動作

```bash
npm run test
```

EN:
Unit tests cover orbital‑math properties, AOS/LOS consistency, event detection, deterministic sorting, and minimal UI interactions.

---

## 🛠️ Tech Stack / 使用技術
- React / TypeScript / Vite
- Cesium / Resium
- satellite.js
- Vitest / Testing Library

---

## 🙏 Acknowledgements
- Cesium / Resium
- satellite.js
- Open‑source community
