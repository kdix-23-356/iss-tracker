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

/** 局別のAOS/LOSイベント */
export type StationEventType = 'AOS' | 'LOS';
export interface GroundStationEvent {
  type: StationEventType;
  at: number;            // epoch ms
  elevationDeg: number;  // 遷移時の仰角
  rangeKm: number;       // 遷移時の距離
}
export type StationEventLogMap = Record<string, GroundStationEvent[]>;

/** シミュレーションクロック */
export type ClockMode = 'realtime' | 'time-travel';
export interface SimClock {
  mode: ClockMode;
  /** 選択中のUTCミリ秒（mode==='time-travel'で有効） */
  selectedMs: number;
  /** 再生中か否か（time-travelのときのみ意味あり） */
  playing: boolean;
  /** 再生レート（秒/秒：1, 10, 60, 300 など） */
  rate: number;
  /** スライダの可動範囲（±分） */
  windowMin: number;
}

// System Event Log の型を共通化
export type LogLevel = 'info' | 'success' | 'warning';

export interface LogEvent {
  id: number;         // Date.now() の値等
  time: Date;         // 表示用に Date を保持
  message: string;    // 表示メッセージ
  type: LogLevel;     // 表示レベル
}
