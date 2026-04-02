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
import { formatDateTimeMs } from '@/utils';
import sharedStyles from '../panels.module.css';
import styles from './TimeTravelPanel.module.css';

interface TimeTravelPanelProps {
  /** 現在のシミュレーションクロック状態（モード、選択時刻、再生状態など） */
  clock: SimClock;
  /** クロック状態を更新するためのセッター関数 */
  setClock: React.Dispatch<React.SetStateAction<SimClock>>;
}

export const TimeTravelPanel: React.FC<TimeTravelPanelProps> = ({ clock, setClock }) => {
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
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      {/* モード切替 ＋ ウィンドウ幅（±分） */}
      <div className={styles.header}>
        <div className={styles.flexRow}>
          <button
            onClick={() => setMode('realtime')}
            className={`${styles.button} ${mode === 'realtime' ? styles.buttonActive : styles.buttonInactive}`}
            title="Realtime mode"
          >
            Realtime
          </button>
          <button
            onClick={() => setMode('time-travel')}
            className={`${styles.button} ${mode === 'time-travel' ? styles.buttonActive : styles.buttonInactive}`}
            title="Time-travel mode"
          >
            Time Travel
          </button>
        </div>

        <div className={styles.hintText}>
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
          <div className={`${styles.header} ${styles.hintText}`} style={{ marginTop: 6 }}>
            <span>{formatDateTimeMs(minMs)}</span>
            <span>{formatDateTimeMs(maxMs)}</span>
          </div>

          {/* 微調整ボタン・現在時刻ジャンプ・現在選択時刻 */}
          <div className={styles.flexRow} style={{ marginTop: 8 }}>
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

            <span className={styles.hintText} style={{ marginLeft: 'auto' }}>
              {formatDateTimeMs(selectedMs)}
            </span>
          </div>

          {/* 再生/一時停止 ＋ レート */}
          <div className={styles.flexRow} style={{ marginTop: 8 }}>
            <button onClick={togglePlay} title="Play/Pause">
              {playing ? 'Pause' : 'Play'}
            </button>
            <span className={styles.hintText}>Rate:</span>
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