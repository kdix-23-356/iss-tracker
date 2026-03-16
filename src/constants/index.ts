// src/constants/index.ts
import type { GroundStation } from '../types';

// 筑波宇宙センターの座標（互換のため残す：height は km 単位）
export const TSUKUBA_STATION = {
  lat: 36.0658,
  lon: 140.1272,
  height: 0.025,
};

// AOS閾値（度）
export const AOS_ELEVATION_THRESHOLD_DEG = 10;

// 主要地上局（必要に応じて拡張）
export const STATIONS: GroundStation[] = [
  // --- JAXA ---
  { id: 'tsukuba',    name: 'JAXA Tsukuba',                   agency: 'JAXA', lat: 36.103,  lon: 140.085 },

  // --- NASA ---
  { id: 'wsc',        name: 'NASA White Sands Complex',       agency: 'NASA', lat: 32.430,  lon: -106.280 },
  { id: 'wff',        name: 'NASA Wallops Flight Facility',   agency: 'NASA', lat: 37.940,  lon:  -75.470 },
  { id: 'ksc',        name: 'NASA Kennedy Space Center',      agency: 'NASA', lat: 28.573,  lon:  -80.649 },

  // --- ESA ---
  { id: 'new-norcia', name: 'ESA New Norcia (DSA 1)',         agency: 'ESA',  lat: -31.050, lon: 116.190 },
  { id: 'esoc',       name: 'ESA ESOC (Darmstadt)',           agency: 'ESA',  lat:  49.870, lon:   8.660 },
  { id: 'malargue',   name: 'ESA Malargüe (DSA 3)',           agency: 'ESA',  lat: -35.775, lon:  -69.398 },
];
