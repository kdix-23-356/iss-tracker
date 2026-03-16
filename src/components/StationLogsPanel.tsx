// src/components/StationLogsPanel.tsx
import React from 'react';
import type { StationEventLogMap } from '../types';
import { STATIONS } from '../constants';

function formatTime(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString();
}

export const StationLogsPanel: React.FC<{
  logsMap: StationEventLogMap;
  showCount: number; // 5..10
}> = ({ logsMap, showCount }) => {
  const idToName = new Map(STATIONS.map(s => [s.id, s.name]));

  const stations = Object.entries(logsMap)
    .filter(([, arr]) => arr && arr.length > 0)
    .map(([id, arr]) => ({ id, latestAt: arr[0].at, events: arr.slice(0, showCount) }))
    .sort((a, b) => b.latestAt - a.latestAt);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'clamp(8px, 10vh, 64px)',
        right: 'clamp(8px, 2vw, 24px)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 18, 40, 0.8)',
        color: '#00e5ff',
        padding: '12px',
        borderRadius: '10px',
        border: '1px solid #00e5ff',
        fontFamily: '"Share Tech Mono", monospace',
        minWidth: 260,
        maxWidth: 'min(92vw, 460px)',
        maxHeight: '40vh',
        overflow: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ marginBottom: 8, fontSize: '0.9rem', textAlign: 'center', borderBottom: '1px solid #00e5ff55', paddingBottom: 6 }}>
        STATION EVENT LOG (per station)
      </div>

      {stations.length === 0 ? (
        <div style={{ opacity: 0.8, fontSize: 13 }}>No AOS/LOS events yet.</div>
      ) : (
        stations.map(({ id, events }) => (
          <div key={id} style={{ marginBottom: 10, padding: 8, border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <strong style={{ color: '#fff' }}>{idToName.get(id) ?? id}</strong>
              <span style={{ opacity: 0.75, fontSize: 12 }}>latest {formatTime(events[0].at)}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {events.map((e, i) => (
                <li key={i} style={{ fontSize: 13, color: '#fff' }}>
                  <span style={{ display: 'inline-block', width: 44, color: e.type === 'AOS' ? '#00ffaa' : '#ffaa00' }}>
                    {e.type}
                  </span>
                  <span style={{ opacity: 0.85 }}>{formatTime(e.at)}</span>
                  <span style={{ marginLeft: 10, opacity: 0.9 }}>
                    El {e.elevationDeg.toFixed(1)}° / {e.rangeKm.toFixed(0)} km
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};