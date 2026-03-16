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

export const STATION_EVENT_LOG_MAX = 10;
export const STATION_EVENT_LOG_VISIBLE_MIN = 5;
export const STATION_EVENT_LOG_VISIBLE_MAX = 10;
export const STATION_EVENT_LOG_DEFAULT_VISIBLE = 5;

/** タイムトラベルUIの既定ウィンドウ（±分）と既定速度 */
export const TIME_TRAVEL_DEFAULT_WINDOW_MIN = 360; // ±6時間
export const TIME_TRAVEL_DEFAULT_RATE = 60;        // 60x（1秒で1分進む）
export const TIME_TRAVEL_RATES = [1, 10, 60, 300]; // 1x, 10x, 60x, 300x