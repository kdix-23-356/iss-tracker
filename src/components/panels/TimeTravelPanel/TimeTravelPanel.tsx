/**
 * TimeTravelPanel
 *
 * 目的:
 *  - 時間モード（Realtime / Time-travel）の切り替えと、Time-travel 時の
 *    シーク・微調整・再生・レート変更・ウィンドウ幅（±分）の調整を行う。
 *
 * 単位:
 *  - selectedMs / minMs / maxMs: [epoch ms]
 *  - windowMin: [minute]
 *  - rate: [sec/sec]（Time-travel 再生時、1秒あたりに何秒進めるか）
 *
 * 設計メモ:
 *  - スライダは 0..1000 の正規化値を使い、ウィンドウ [minMs..maxMs] と線形変換する。
 *  - Realtime に入ると playing は false に落とす（誤動作防止）。
 *  - windowMin は入力時に 30..1440 の範囲でクランプ。
 *  - UI は純表示＋イベント発火のみ（ロジックは App 側の renderAt が担う）。
 */

import React from 'react';
import type { SimClock, ClockMode } from '@/types';
import { TIME_TRAVEL_RATES } from '@/constants';

function fmt(dtMs: number) {
  const d = new Date(dtMs);
  // ローカル時刻（yyyy-MM-dd HH:mm:ss）
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export const TimeTravelPanel: React.FC<{
  clock: SimClock;
  setClock: React.Dispatch<React.SetStateAction<SimClock>>;
}> = ({ clock, setClock }) => {
  const { mode, selectedMs, playing, rate, windowMin } = clock;

  /** モード変更：Realtime に入ると playing は false に */
  const setMode = (m: ClockMode) =>
    setClock((c) => ({ ...c, mode: m, playing: false }));

  /** 絶対時刻シーク */
  const seekTo = (ms: number) => setClock((c) => ({ ...c, selectedMs: ms }));

  /** 相対移動（±分） */
  const bump = (deltaMs: number) =>
    setClock((c) => ({ ...c, selectedMs: c.selectedMs + deltaMs }));

  /** 再生レート変更（sec/sec） */
  const setRate = (r: number) => setClock((c) => ({ ...c, rate: r }));

  /** 再生/一時停止 トグル */
  const togglePlay = () => setClock((c) => ({ ...c, playing: !c.playing }));

  /** ウィンドウ幅（±分）をクランプして反映（30..1440） */
  const setWindow = (m: number) =>
    setClock((c) => ({
      ...c,
      windowMin: Math.max(30, Math.min(24 * 60, m)),
    }));

  // 現在時刻の前後 windowMin 分をシーク可能範囲とする
  const nowMs = Date.now();
  const minMs = nowMs - windowMin * 60_000;
  const maxMs = nowMs + windowMin * 60_000;

  // スライダ値（0..1000）に正規化して扱いやすく
  const denom = Math.max(1, maxMs - minMs); // 念のため 0 回避
  const sliderVal = Math.round(((selectedMs - minMs) / denom) * 1000);

  // スライダから絶対時刻に射影
  const onSlider = (v: number) => {
    const t = v / 1000; // 0..1
    const ms = minMs + t * (maxMs - minMs);
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
      {/* モード切替 ＋ ウィンドウ幅（±分） */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
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

      {/* Time-travel 操作群 */}
      {mode === 'time-travel' && (
        <>
          {/* シークスライダ（0..1000） */}
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

          {/* 範囲表示（左=最小/右=最大） */}
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              opacity: 0.85,
            }}
          >
            <span>{fmt(minMs)}</span>
            <span>{fmt(maxMs)}</span>
          </div>

          {/* 微調整ボタン・現在時刻ジャンプ・現在選択時刻 */}
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button onClick={() => bump(-5 * 60_000)} title="-5 minutes">
              ◀ -5m
            </button>
            <button onClick={() => bump(-60_000)} title="-1 minute">
              -1m
            </button>
            <button onClick={() => seekTo(nowMs)} title="Jump to now">
              Now
            </button>
            <button onClick={() => bump(60_000)} title="+1 minute">
              +1m
            </button>
            <button onClick={() => bump(5 * 60_000)} title="+5 minutes">
              +5m ▶
            </button>

            <span style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.85 }}>
              {fmt(selectedMs)}
            </span>
          </div>

          {/* 再生/一時停止 ＋ レート */}
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button onClick={togglePlay} title="Play/Pause">
              {playing ? 'Pause' : 'Play'}
            </button>
            <span style={{ fontSize: 12 }}>Rate:</span>
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
              {TIME_TRAVEL_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
};