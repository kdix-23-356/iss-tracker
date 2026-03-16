// src/constants/index.ts
import type { GroundStation } from '../types';

export const TSUKUBA_STATION = { lat: 36.0658, lon: 140.1272, height: 0.025 };
export const AOS_ELEVATION_THRESHOLD_DEG = 10;

export const STATIONS: GroundStation[] = [
  { id: 'tsukuba', name: 'JAXA Tsukuba', agency: 'JAXA', lat: 36.103, lon: 140.085 },
  { id: 'wsc', name: 'NASA White Sands Complex', agency: 'NASA', lat: 32.430, lon: -106.280 },
  { id: 'wff', name: 'NASA Wallops Flight Facility', agency: 'NASA', lat: 37.940, lon: -75.470 },
  { id: 'ksc', name: 'NASA Kennedy Space Center', agency: 'NASA', lat: 28.573, lon: -80.649 },
  { id: 'new-norcia', name: 'ESA New Norcia (DSA 1)', agency: 'ESA', lat: -31.050, lon: 116.190 },
  { id: 'esoc', name: 'ESA ESOC (Darmstadt)', agency: 'ESA', lat: 49.870, lon: 8.660 },
  { id: 'malargue', name: 'ESA Malargüe (DSA 3)', agency: 'ESA', lat: -35.775, lon: -69.398 },
];

/** --- 局別イベントログ --- */
export const STATION_EVENT_LOG_MAX = 10;           // 内部保持の上限
export const STATION_EVENT_LOG_VISIBLE_MIN = 5;    // UIでの最小表示件数
export const STATION_EVENT_LOG_VISIBLE_MAX = 10;   // UIでの最大表示件数
export const STATION_EVENT_LOG_DEFAULT_VISIBLE = 5;