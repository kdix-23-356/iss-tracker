// src/types/index.ts
// ISSの状態を表す型定義。他のファイルから使えるように export をつけます。
export interface IssState {
  speed: number;
  altitude: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}