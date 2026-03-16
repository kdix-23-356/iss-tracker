// src/components/Dashboard.tsx
import React from 'react';
import type { IssState, GroundStationStatus } from '../types';
import { STATIONS, AOS_ELEVATION_THRESHOLD_DEG } from '../constants';

export const Dashboard: React.FC<{
  state: IssState;
  elevationDeg?: number;      // 筑波の仰角（オプション）
  aosThresholdDeg?: number;
  stationStatuses?: Record<string, GroundStationStatus>; // 全地上局ステータス
}> = ({ state, elevationDeg, aosThresholdDeg = AOS_ELEVATION_THRESHOLD_DEG, stationStatuses }) => {
  // 表示用：仰角の高い順に上位5件
  const rows = stationStatuses
    ? STATIONS
        .map(st => ({ st, s: stationStatuses[st.id] }))
        .filter(({ s }) => s)
        .sort((a, b) => (b.s!.elevationDeg - a.s!.elevationDeg))
        .slice(0, 5)
    : [];

  return (
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
        {typeof elevationDeg === 'number' && (
          <>
            <span>Elevation (Tsukuba):</span>
            <strong style={{ color: elevationDeg >= aosThresholdDeg ? '#00ffaa' : '#ffaa00' }}>
              {elevationDeg.toFixed(1)}° {elevationDeg >= aosThresholdDeg ? '— AOS' : '— LOS'}
            </strong>
          </>
        )}
      </div>

      {/* ▼ 全地上局の上位5件（仰角順） */}
      {rows.length > 0 && (
        <>
          <hr style={{ borderColor: '#00e5ff22', margin: '15px 0' }} />
          <div style={{ fontSize: '0.8rem' }}>
            <div style={{ marginBottom: '8px', opacity: 0.8, fontSize: '0.7rem' }}>
              GROUND STATIONS — Top Elevation (deg)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.6fr 0.6fr', gap: '6px' }}>
              <div style={{ opacity: 0.7 }}>Station</div>
              <div style={{ opacity: 0.7, textAlign: 'right' }}>El</div>
              <div style={{ opacity: 0.7, textAlign: 'right' }}>State</div>
              {rows.map(({ st, s }) => (
                <React.Fragment key={st.id}>
                  <div style={{ color: '#fff' }}>{st.name}</div>
                  <div style={{ color: '#fff', textAlign: 'right' }}>{s!.elevationDeg.toFixed(1)}°</div>
                  <div style={{ color: s!.isAOS ? '#00ffaa' : '#ffaa00', textAlign: 'right' }}>
                    {s!.isAOS ? 'AOS' : 'LOS'}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </>
      )}

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
};