/**
 * Dashboard (ISS TELEMETRY)
 *
 * 目的:
 *  - 現在の ISS テレメトリ（速度/高度/緯度/経度）を画面左上にコンパクト表示する。
 *
 * 単位:
 *  - speed: km/s
 *  - altitude: km
 *  - latitude/longitude: deg
 *
 * 設計メモ:
 *  - 表示値は視認性重視で固定小数桁に丸める（速度 3 桁、高度 2 桁、緯度経度 4 桁）。
 *  - スタイルはインラインで固定し、App 側の絶対配置と整合。
 *  - pointerEvents: 'none' にして、背面の 3D 操作を阻害しない。
 *  - コンポーネント自体は純粋表示のため、ロジック・副作用なし。
 */

import React from 'react';
import type { IssState } from '@/types';

export const Dashboard: React.FC<{ state: IssState }> = ({ state }) => {
  // 表示用の丸め関数（小数点以下の桁を明示）
  const fmt = {
    speed: (v: number) => v.toFixed(3),     // km/s
    alt:   (v: number) => v.toFixed(2),     // km
    lat:   (v: number) => v.toFixed(4),     // deg
    lon:   (v: number) => v.toFixed(4),     // deg
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(8px, 2vh, 24px)',
        left: 'clamp(8px, 2vw, 24px)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 18, 40, 0.8)',
        color: '#00e5ff',
        padding: '16px',
        borderRadius: '12px',
        fontFamily: '"Share Tech Mono", monospace',
        border: '1px solid #00e5ff',
        pointerEvents: 'none',           // 背面の Cesium 操作を阻害しない
        minWidth: 220,
        maxWidth: 'min(92vw, 420px)',    // ビューポートに合わせて上限
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '1.1rem',
          textAlign: 'center',
          borderBottom: '1px solid #00e5ff55',
          paddingBottom: 6,
        }}
      >
        ISS TELEMETRY
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '8px',
          fontSize: '0.9rem',
        }}
      >
        <span>Velocity:</span>
        <strong style={{ color: '#fff' }}>{fmt.speed(state.speed)} km/s</strong>

        <span>Altitude:</span>
        <strong style={{ color: '#fff' }}>{fmt.alt(state.altitude)} km</strong>

        <span>Lat:</span>
        <strong style={{ color: '#fff' }}>{fmt.lat(state.latitude)}°</strong>

        <span>Lon:</span>
        <strong style={{ color: '#fff' }}>{fmt.lon(state.longitude)}°</strong>
      </div>
    </div>
  );
};