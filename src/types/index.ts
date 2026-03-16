// src/types/index.ts
export interface IssState {
  speed: number;
  altitude: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

export interface GroundStation {
  id: string;
  name: string;
  agency: 'JAXA' | 'NASA' | 'ESA' | 'Other';
  lat: number;
  lon: number;
  heightM?: number;
}

export interface GroundStationStatus {
  id: string;
  elevationDeg: number;
  rangeKm: number;
  isAOS: boolean;
}

/** --- 局別のAOS/LOSイベント --- */
export type StationEventType = 'AOS' | 'LOS';

export interface GroundStationEvent {
  type: StationEventType;
  at: number;            // epoch ms
  elevationDeg: number;  // 遷移時の仰角
  rangeKm: number;       // 遷移時の距離
}

export type StationEventLogMap = Record<string, GroundStationEvent[]>;