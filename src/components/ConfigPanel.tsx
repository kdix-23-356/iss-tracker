import React from 'react';

export const ConfigPanel: React.FC<{
  settings: { orbit: boolean; station: boolean; footprint: boolean; log: boolean };
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}> = ({ settings, setSettings }) => {
  const toggle = (key: keyof typeof settings) => {
    setSettings((s: any) => ({ ...s, [key]: !s[key] }));
  };

  return (
    <div style={{
      position: 'absolute', bottom: '10vh', left: '2vw', zIndex: 1000,
      backgroundColor: 'rgba(0, 18, 40, 0.8)', color: '#00e5ff', padding: '15px',
      borderRadius: '8px', border: '1px solid #00e5ff', fontFamily: 'monospace'
    }}>
    <div style={{ marginBottom: '10px', fontSize: '0.8rem', opacity: 0.7 }}>LAYER CONTROL</div>
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input type="checkbox" checked={settings.orbit} onChange={() => toggle('orbit')} /> Show Orbit Path
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.footprint} onChange={() => toggle('footprint')} /> Show Footprint
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.station} onChange={() => toggle('station')} /> Ground Station (JAXA)
      </label>
      <label style={{ display: 'block', cursor: 'pointer', marginTop: '5px' }}>
        <input type="checkbox" checked={settings.log} onChange={() => toggle('log')} /> Show Event Log
      </label>
    </div>
  );
};