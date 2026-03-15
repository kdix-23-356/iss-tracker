import React from 'react';

export interface LogEvent {
  id: number;
  time: Date;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export const EventLogPanel: React.FC<{ logs: LogEvent[] }> = ({ logs }) => (
  <div style={{
    position: 'absolute', bottom: '10vh', right: '2vw', zIndex: 1000,
    backgroundColor: 'rgba(0, 18, 40, 0.8)', color: '#00e5ff',
    padding: '15px', borderRadius: '8px', fontFamily: '"Share Tech Mono", monospace',
    border: '1px solid #00e5ff', minWidth: '300px', pointerEvents: 'none'
  }}>
    <div style={{ marginBottom: '8px', fontSize: '0.8rem', borderBottom: '1px solid #00e5ff55', paddingBottom: '4px' }}>
      SYSTEM EVENT LOG
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      {logs.map(log => {
        // ログのタイプによって色を変える
        const color = log.type === 'success' ? '#00ffaa' : log.type === 'warning' ? '#ffaa00' : '#ffffff';
        return (
          <div key={log.id} style={{ fontSize: '0.8rem', display: 'flex', gap: '10px', color }}>
            <span style={{ opacity: 0.7 }}>[{log.time.toISOString().split('T')[1].slice(0, 8)}]</span>
            <span>{log.message}</span>
          </div>
        );
      })}
    </div>
  </div>
);