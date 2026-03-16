/**
 * constants
 *
 * 目的:
 * - アプリ全体で使う定数（地上局の一覧、AOS しきい値、UI 既定値など）を一元管理する。
 *
 * 単位の取り扱い（重要）:
 * - `TSUKUBA_STATION.height`: [km]
 *   - 軌道計算（`satellite.js` の geodetic）で使うため **km** 単位。
 * - `STATIONS` の `lat/lon`: [deg]
 * - `STATIONS` の高度:
 *   - 現状は省略（地表 0m 扱い）。もし将来使う場合は **`heightM` [m]** を追加する方針。
 *     （描画系（Cesium）はメートル系なので m が自然）
 */

import type { GroundStation } from '../types';

/** 筑波（satellite.js 用：geodetic の height は **km**） */
export const TSUKUBA_STATION = {
  lat: 36.0658,
  lon: 140.1272,
  height: 0.025, // km （= 25m）
} as const;

/** AOS（通信可能）とみなす仰角のしきい値 [deg] */
export const AOS_ELEVATION_THRESHOLD_DEG = 10 as const;

/**
 * 地上局の一覧（描画・ボード表示・イベント紐づけ用）
 * - 緯度/経度: [deg]
 * - 高度は省略（地表 0m 扱い）。必要になれば `heightM` [m] を各局に追加。
 */
export const STATIONS: GroundStation[] = [
  { id: 'tsukuba',     name: 'JAXA Tsukuba',                 agency: 'JAXA', lat:  36.103, lon:  140.085 },
  { id: 'wsc',         name: 'NASA White Sands Complex',     agency: 'NASA', lat:  32.430, lon: -106.280 },
  { id: 'wff',         name: 'NASA Wallops Flight Facility', agency: 'NASA', lat:  37.940, lon:  -75.470 },
  { id: 'ksc',         name: 'NASA Kennedy Space Center',    agency: 'NASA', lat:  28.573, lon:  -80.649 },
  { id: 'new-norcia',  name: 'ESA New Norcia (DSA 1)',       agency: 'ESA',  lat: -31.050, lon:  116.190 },
  { id: 'esoc',        name: 'ESA ESOC (Darmstadt)',         agency: 'ESA',  lat:  49.870, lon:    8.660 },
  { id: 'malargue',    name: 'ESA Malargüe (DSA 3)',         agency: 'ESA',  lat: -35.775, lon:  -69.398 },
] as const;

/** 1局あたりのイベント履歴の最大保持件数（内部リングバッファ用途） */
export const STATION_EVENT_LOG_MAX = 10 as const;
/** パネルで表示する最小件数 [件]（スライダ下限） */
export const STATION_EVENT_LOG_VISIBLE_MIN = 5 as const;
/** パネルで表示する最大件数 [件]（スライダ上限 / 内部保持と同値にしておくとシンプル） */
export const STATION_EVENT_LOG_VISIBLE_MAX = 10 as const;
/** パネルで表示する既定件数 [件] */
export const STATION_EVENT_LOG_DEFAULT_VISIBLE = 5 as const;

/** タイムトラベル UI の既定ウィンドウ（±分） */
export const TIME_TRAVEL_DEFAULT_WINDOW_MIN = 360 as const; // ±6時間
/** タイムトラベルの既定速度（sec/sec）: 60x = 1秒で1分進む */
export const TIME_TRAVEL_DEFAULT_RATE = 60 as const;
/** 選択可能な再生レート（sec/sec） */
export const TIME_TRAVEL_RATES = [1, 10, 60, 300] as const;