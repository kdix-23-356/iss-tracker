/**
 * ConfigPanel
 *
 * 目的:
 *  - レイヤ表示（Orbit/Footprint/Station）と各パネル（Telemetry/Board/Logs/SystemLog/TimeControl）
 *    の ON/OFF を切り替える最小 UI。
 *  - 駅ごとのイベントログの「表示件数（5..10）」をスライダで調整。
 *
 * 設計メモ:
 *  - toggle は UiSettings の任意キーに対して真偽値を反転（型安全に実装）。
 *  - スライダ値は constants の MIN/MAX でクランプして「想定外の値」を防ぐ。
 *  - UI の見た目・配置は従来のまま（スタイルはインラインで固定）。
 */

import React from 'react';
import {
  STATION_EVENT_LOG_VISIBLE_MIN,
  STATION_EVENT_LOG_VISIBLE_MAX,
} from '@/constants';
import sharedStyles from '../panels.module.css';
import styles from './ConfigPanel.module.css';

/**
 * パネルやレイヤーの表示状態、およびイベントログの表示件数を管理する設定オブジェクト
 */
export type UiSettings = {
  /** 軌道パス（過去・未来）を3D空間上に表示するかどうか */
  orbit: boolean;
  /** ISS直下のフットプリント（円）を表示するかどうか */
  footprint: boolean;
  /** 地上局のマーカーとラベルを表示するかどうか */
  station: boolean;
  
  /** テレメトリパネル（左上）の表示状態 */
  telemetry: boolean;
  /** 地上局ボード（右上）の表示状態 */
  stationBoard: boolean;
  /** 局別イベントログパネル（右下）の表示状態 */
  stationLogs: boolean;
  /** システムイベントログパネル（右下・StationLogsより下）の表示状態 */
  systemLog: boolean;
  /** タイムトラベル操作パネル（上部中央）の表示状態 */
  timeControl: boolean;
  
  /** 局別イベントログの表示件数（5〜10件） */
  stationLogVisibleCount: number;
};

interface ConfigPanelProps {
  /** 現在のUI設定状態 */
  settings: UiSettings;
  /** UI設定を更新するためのセッター関数 */
  setSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ settings, setSettings }) => {
  /** 任意のブールキーを反転（型安全） */
  const toggle = <K extends keyof UiSettings>(key: K) =>
    setSettings((s) => ({
      ...s,
      [key]: typeof s[key] === 'boolean' ? !s[key] : s[key],
    }));

  /** 表示件数（5..10）をクランプして反映 */
  const setCount = (v: number) => {
    const clamped = Math.max(
      STATION_EVENT_LOG_VISIBLE_MIN,
      Math.min(STATION_EVENT_LOG_VISIBLE_MAX, v)
    );
    setSettings((s) => ({ ...s, stationLogVisibleCount: clamped }));
  };

  return (
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      {/* LAYER CONTROL */}
      <div className={styles.sectionTitle}>
        LAYER CONTROL
      </div>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.orbit}
          onChange={() => toggle('orbit')}
        />{' '}
        Show Orbit Path
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.footprint}
          onChange={() => toggle('footprint')}
        />{' '}
        Show Footprint
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.station}
          onChange={() => toggle('station')}
        />{' '}
        Ground Station Layer
      </label>

      {/* PANELS */}
      <div className={styles.sectionTitle}>
        PANELS
      </div>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.telemetry}
          onChange={() => toggle('telemetry')}
        />{' '}
        Telemetry
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.stationBoard}
          onChange={() => toggle('stationBoard')}
        />{' '}
        Station Board
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.stationLogs}
          onChange={() => toggle('stationLogs')}
        />{' '}
        Station Logs
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.systemLog}
          onChange={() => toggle('systemLog')}
        />{' '}
        System Event Log
      </label>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={settings.timeControl}
          onChange={() => toggle('timeControl')}
        />{' '}
        Time Control
      </label>

      {/* Station Logs 表示件数の調整（Logs ON 時のみ表示） */}
      {settings.stationLogs && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Station log visible: {settings.stationLogVisibleCount}
          </div>
          <input
            type="range"
            min={STATION_EVENT_LOG_VISIBLE_MIN}
            max={STATION_EVENT_LOG_VISIBLE_MAX}
            value={settings.stationLogVisibleCount}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: '100%' }}
            title={`Visible logs: ${STATION_EVENT_LOG_VISIBLE_MIN}..${STATION_EVENT_LOG_VISIBLE_MAX}`}
          />
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            （内部保持は最大10件・表示は{STATION_EVENT_LOG_VISIBLE_MIN}〜
            {STATION_EVENT_LOG_VISIBLE_MAX}件で調整）
          </div>
        </div>
      )}
    </div>
  );
};