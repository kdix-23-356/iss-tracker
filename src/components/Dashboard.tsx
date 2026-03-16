// src/components/Dashboard.tsx
import React from 'react';
import type { IssState } from '../types';

export const Dashboard: React.FC<{ state: IssState }> = ({ state }) => {
  return (
    <div style={{
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
      pointerEvents: 'none',
      minWidth: 220,
      maxWidth: 'min(92vw, 420px)',   // ← ビューポートに合わせて上限
      boxSizing: 'border-box',

    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', textAlign: 'center', borderBottom: '1px solid #00e5ff55' }}>
        ISS TELEMETRY
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px', fontSize: '0.9rem' }}>
        <span>Velocity:</span> <strong style={{color: '#fff'}}>{state.speed.toFixed(3)} km/s</strong>
        <span>Altitude:</span> <strong style={{color: '#fff'}}>{state.altitude.toFixed(2)} km</strong>
        <span>Lat:</span> <strong style={{color: '#fff'}}>{state.latitude.toFixed(4)}°</strong>
        <span>Lon:</span> <strong style={{color: '#fff'}}>{state.longitude.toFixed(4)}°</strong>
      </div>
    </div>
  );
};