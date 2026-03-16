// src/types/index.ts
// ISSの状態を表す型定義
export interface IssState {
  speed: number;
  altitude: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

// 地上局の定義とステータス
export interface GroundStation {
  id: string;
  name: string;
  agency: 'JAXA' | 'NASA' | 'ESA' | 'Other';
  lat: number;      // degrees
  lon: number;      // degrees
  heightM?: number; // meters
}

export interface GroundStationStatus {
  id: string;
  elevationDeg: number; // 仰角（度）
  rangeKm: number;      // 衛星までの距離（km）
  isAOS: boolean;       // AOS/LOS
}