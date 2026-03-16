/**
 * 型定義（domain types）
 *
 * 方針:
 * - 「単位」を各プロパティで明記（km / km/s / deg / epoch ms など）
 * - UI/ロジック層に跨って参照される型はここで一元管理
 */

/** ISS のテレメトリ（瞬時値） */
export interface IssState {
  /** 速度 [km/s] */
  speed: number;
  /** 高度 [km]（地表からの相対） */
  altitude: number;
  /** 緯度 [deg] */
  latitude: number;
  /** 経度 [deg] */
  longitude: number;
  /** 計測（再現）時刻 */
  timestamp: Date;
}

/** 地上局のメタデータ（描画・ボード表示・イベント紐づけ用） */
export interface GroundStation {
  /** 一意なID（ロワーケース英数字/ハイフン推奨） */
  id: string;
  /** 表示名 */
  name: string;
  /** 所管機関 */
  agency: 'JAXA' | 'NASA' | 'ESA' | 'Other';
  /** 緯度 [deg] */
  lat: number;
  /** 経度 [deg] */
  lon: number;
  /**
   * 高度 [m]（地表からの相対）
   * - 省略時は 0m 扱い（大半の地上局はこれで十分）
   * - Cesium（描画）はメートル系、satellite.js（軌道計算）は km 系なので注意
   */
  heightM?: number;
}

/** 現在の可視性/幾何情報（1局ぶん） */
export interface GroundStationStatus {
  /** 対象局のID */
  id: string;
  /** 仰角 [deg]（負値は地平線下） */
  elevationDeg: number;
  /** 斜距離 [km] */
  rangeKm: number;
  /** AOS（可視: true）/ LOS（不可視: false） */
  isAOS: boolean;
}

/** 局別のAOS/LOSイベント（切り替わりの瞬間を記録） */
export type StationEventType = 'AOS' | 'LOS';
export interface GroundStationEvent {
  /** イベント種別（AOS/LOS） */
  type: StationEventType;
  /** 発生時刻 [epoch ms] */
  at: number;
  /** 遷移時点の仰角 [deg] */
  elevationDeg: number;
  /** 遷移時点の斜距離 [km] */
  rangeKm: number;
}

/** 局ID → 時系列イベント配列（先頭が最新） */
export type StationEventLogMap = Record<string, GroundStationEvent[]>;

/** 時間モード（実時間 or タイムトラベル） */
export type ClockMode = 'realtime' | 'time-travel';

/** シミュレーションクロックの状態 */
export interface SimClock {
  /** 現在のモード */
  mode: ClockMode;
  /** 選択中のUTCミリ秒（`mode==='time-travel'` のとき意味を持つ） */
  selectedMs: number;
  /** 再生中か（`mode==='time-travel'` のときのみ意味あり） */
  playing: boolean;
  /** 再生レート [sec/sec]（例: 1, 10, 60, 300） */
  rate: number;
  /** スライダの可動範囲 [±分]（例: 360 = ±6h） */
  windowMin: number;
}

/** System Event Log のレベル */
export type LogLevel = 'info' | 'success' | 'warning';

/** System Event Log の 1 エントリ */
export interface LogEvent {
  /** 識別子（通常は Date.now()） */
  id: number;
  /** 発生時刻（表示用に Date を保持） */
  time: Date;
  /** 表示メッセージ */
  message: string;
  /** 表示レベル */
  type: LogLevel;
}