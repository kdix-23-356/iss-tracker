import React from 'react';
import  type { IssState } from '../types';

export const Dashboard: React.FC<{ state: IssState }> = ({ state }) => (
  <div style={{
    position: 'absolute', top: '2vh', left: '2vw', zIndex: 1000,
    backgroundColor: 'rgba(0, 18, 40, 0.8)', color: '#00e5ff',
    padding: '20px', borderRadius: '12px', fontFamily: '"Share Tech Mono", monospace',
    border: '1px solid #00e5ff', pointerEvents: 'none', minWidth: '240px'
  }}>
    <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', textAlign: 'center', borderBottom: '1px solid #00e5ff55' }}>ISS TELEMETRY</h3>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px', fontSize: '0.9rem' }}>
      <span>Velocity:</span> <strong style={{color: '#fff'}}>{state.speed.toFixed(3)} km/s</strong>
      <span>Altitude:</span> <strong style={{color: '#fff'}}>{state.altitude.toFixed(2)} km</strong>
      <span>Lat:</span> <strong style={{color: '#fff'}}>{state.latitude.toFixed(4)}°</strong>
      <span>Lon:</span> <strong style={{color: '#fff'}}>{state.longitude.toFixed(4)}°</strong>
    </div>
    <hr style={{ borderColor: '#00e5ff22', margin: '15px 0' }} />
    <div style={{ fontSize: '0.8rem' }}>
      <div style={{ marginBottom: '8px', opacity: 0.8, fontSize: '0.7rem' }}>ORBIT LEGEND (-/+ 90min)</div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
        <div style={{ width: '20px', height: '2px', backgroundColor: 'rgba(0, 255, 255, 0.5)', marginRight: '10px' }}></div>
        <span>Past Path (Cyan)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ width: '20px', height: '2px', backgroundColor: 'rgba(255, 255, 0, 0.5)', marginRight: '10px' }}></div>
        <span>Predicted Path (Yellow)</span>
      </div>
    </div>
  </div>
);