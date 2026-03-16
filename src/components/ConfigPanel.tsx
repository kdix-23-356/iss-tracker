// src/components/ConfigPanel.tsx
import React from 'react';
import {
  STATION_EVENT_LOG_VISIBLE_MIN,
  STATION_EVENT_LOG_VISIBLE_MAX,
  STATION_EVENT_LOG_DEFAULT_VISIBLE
} from '../constants';

export type UiSettings = {
  // layers
  orbit: boolean;
  footprint: boolean;
  station: boolean;
  // panels
  telemetry: boolean;
  stationBoard: boolean;
  stationLogs: boolean;
  systemLog: boolean;
  // per-station log
  stationLogVisibleCount: number; // 5..10
};

export const ConfigPanel: React.FC<{
  settings: UiSettings;
  setSettings: React.Dispatch<React.SetStateAction<UiSettings>>;
}> = ({ settings, setSettings }) => {
  const toggle = (key: keyof UiSettings) => {
    setSettings(s => ({ ...s, [key]: !s[key] as any }));
  };

  const setCount = (v: number) => {
    const clamped = Math.max(STATION_EVENT_LOG_VISIBLE_MIN, Math.min(STATION_EVENT_LOG_VISIBLE_MAX, v));
    setSettings(s => ({ ...s, stationLogVisibleCount: clamped }));
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 'clamp(8px, 10vh, 64px)',
      left: 'clamp(8px, 2vw, 24px)',
      zIndex: 1000,
      backgroundColor: 'rgba(0, 18, 40, 0.8)',
      color: '#00e5ff',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #00e5ff',
      fontFamily: '"Share Tech Mono", monospace',
      minWidth: 240,
      maxWidth: 'min(92vw, 360px)',
      boxSizing: 'border-box',
    }}>
      <div style={{ marginBottom: '10px', fontSize: '0.85rem', opacity: 0.8 }}>LAYER CONTROL</div>
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input type="checkbox" checked={settings.orbit} onChange={() => toggle('orbit')} /> Show Orbit Path
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.footprint} onChange={() => toggle('footprint')} /> Show Footprint
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.station} onChange={() => toggle('station')} /> Ground Station Layer
      </label>

      <div style={{ margin: '12px 0 8px', fontSize: '0.85rem', opacity: 0.8 }}>PANELS</div>
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input type="checkbox" checked={settings.telemetry} onChange={() => toggle('telemetry')} /> Telemetry
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.stationBoard} onChange={() => toggle('stationBoard')} /> Station Board
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.stationLogs} onChange={() => toggle('stationLogs')} /> Station Logs
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.systemLog} onChange={() => toggle('systemLog')} /> System Event Log
      </label>

      {settings.stationLogs && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            Station log visible: {settings.stationLogVisibleCount}
          </div>
          <input
            type="range"
            min={STATION_EVENT_LOG_DEFAULT_VISIBLE}
            max={STATION_EVENT_LOG_VISIBLE_MAX}
            value={settings.stationLogVisibleCount}
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ fontSize: 11, opacity: 0.7 }}>（内部保持は最大10件・表示は5〜10件で調整）</div>
        </div>
      )}
    </div>
  );
};
``