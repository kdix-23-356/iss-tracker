/**
 * utils barrel
 *
 * 目的:
 *  - アプリ側が「@/utils」だけを import すれば、ロジック系の関数にアクセスできるようにする統一口。
 *  - どの関数が公開 API なのかを一目で分かるようにし、内部構造の変更に強くする。
 *
 * 設計メモ:
 *  - `export *` ではなく **明示的 re-export** にすることで、
 *    1) 不用意な公開漏れを防ぐ、2) ツリーシェイキングの観点で分かりやすい、3) API 破壊に気づきやすい。
 *  - グルーピング（計算/差分/ランク）のまとまりでコメントしておくと、将来の追加・削除で迷わない。
 */

/* ===== 計算・幾何（軌道/可視性/補助角度） ===== */
export {
  // ISS テレメトリ（cartesian[m] / speed[km/s] / altitude[km] など）
  calculateIssTelemetry,
  // 軌道可視化点列（±duration, step 分解 / 日付変更線跨ぎ補間）
  calculateOrbitPoints,

  // 経度ラップ/差分/補間（±180°またぎ対応）
  wrapLon,
  shortestLonDelta,
  lerpLon,
  lerpLat,
  lerpAltM,

  // 視線方向/仰角/距離の計算（deg/km）
  computeLookAnglesDeg,
  // 全局の AOS 判定（閾値deg / 純粋関数）
  computeStationsStatus,
} from './orbitalLogic';

/* ===== イベント検出（AOS/LOS の差分抽出） ===== */
export { diffStationAos } from './stationEvents';

/* ===== ステーションの並び替え（仰角降順 → 距離昇順 → id昇順） ===== */
export { rankStationsByElevation } from './stationRanking';

/* ===== フォーマット ===== */
export { formatTimeHMS, formatDateTimeMs } from './format';