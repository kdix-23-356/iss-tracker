// src/components/TimeTravelPanel.tsx
import React from 'react';
import type { SimClock, ClockMode } from '@/types';
import { TIME_TRAVEL_RATES } from '@/constants';

function fmt(dtMs: number) {
  const d = new Date(dtMs);
  // ローカル時刻 & 短縮表示
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} `
       + `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export const TimeTravelPanel: React.FC<{
  clock: SimClock;
  setClock: React.Dispatch<React.SetStateAction<SimClock>>;
}> = ({ clock, setClock }) => {
  const { mode, selectedMs, playing, rate, windowMin } = clock;

  const setMode = (m: ClockMode) => setClock(c => ({ ...c, mode: m, playing: false }));
  const seekTo = (ms: number) => setClock(c => ({ ...c, selectedMs: ms }));
  const bump = (deltaMs: number) => setClock(c => ({ ...c, selectedMs: c.selectedMs + deltaMs }));
  const setRate = (r: number) => setClock(c => ({ ...c, rate: r }));
  const togglePlay = () => setClock(c => ({ ...c, playing: !c.playing }));
  const setWindow = (m: number) => setClock(c => ({ ...c, windowMin: Math.max(30, Math.min(24 * 60, m)) }));

  const nowMs = Date.now();
  const minMs = nowMs - windowMin * 60_000;
  const maxMs = nowMs + windowMin * 60_000;

  // スライダ値（0..1000）に正規化して扱いやすく
  const sliderVal = Math.round(((selectedMs - minMs) / (maxMs - minMs)) * 1000);
  const onSlider = (v: number) => {
    const ms = minMs + (v / 1000) * (maxMs - minMs);
    seekTo(Math.round(ms));
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(8px, 2vh, 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 18, 40, 0.8)',
        color: '#00e5ff',
        padding: '12px',
        borderRadius: 10,
        border: '1px solid #00e5ff',
        fontFamily: '"Share Tech Mono", monospace',
        minWidth: 320,
        maxWidth: 'min(96vw, 720px)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setMode('realtime')}
            style={{ cursor: 'pointer', opacity: mode === 'realtime' ? 1 : 0.6 }}
            title="Realtime mode"
          >
            Realtime
          </button>
          <button
            onClick={() => setMode('time-travel')}
            style={{ cursor: 'pointer', opacity: mode === 'time-travel' ? 1 : 0.6 }}
            title="Time-travel mode"
          >
            Time Travel
          </button>
        </div>

        <div style={{ fontSize: 12, opacity: 0.85 }}>
          Window ±
          <input
            type="number"
            value={windowMin}
            min={30}
            max={1440}
            step={30}
            onChange={(e) => setWindow(Number(e.target.value))}
            style={{ width: 70, marginLeft: 4 }}
            title="Slider window (minutes)"
          />
          min
        </div>
      </div>

      {mode === 'time-travel' && (
        <>
          <div style={{ marginTop: 8 }}>
            <input
              type="range"
              min={0}
              max={1000}
              value={sliderVal}
              onChange={(e) => onSlider(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.85 }}>
            <span>{fmt(minMs)}</span>
            <span>{fmt(maxMs)}</span>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => bump(-5 * 60_000)} title="-5 minutes">◀ -5m</button>
            <button onClick={() => bump(-60_000)} title="-1 minute">-1m</button>
            <button onClick={() => seekTo(nowMs)} title="Jump to now">Now</button>
            <button onClick={() => bump(60_000)} title="+1 minute">+1m</button>
            <button onClick={() => bump(5 * 60_000)} title="+5 minutes">+5m ▶</button>

            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>
              {fmt(selectedMs)}
            </span>
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={togglePlay} title="Play/Pause">{playing ? 'Pause' : 'Play'}</button>
            <span style={{ fontSize: 12 }}>Rate:</span>
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              {TIME_TRAVEL_RATES.map(r => (
                <option key={r} value={r}>{r}x</option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};