// src/components/panels/TimeTravelPanel.test.tsx
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { TimeTravelPanel } from './TimeTravelPanel';
import type { SimClock } from '@/types';

function applyUpdater<T>(updater: T | ((prev: T) => T), prev: T): T {
  return typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
}

const baseClock: SimClock = {
  mode: 'realtime',
  selectedMs: Date.now(),
  playing: false,
  rate: 60,
  windowMin: 360,
};

describe('TimeTravelPanel', () => {
  // …既存の2テスト（モード切替 / Play-Pause）はそのまま…

  test('Rate 変更（select）', () => {
    const setClock = vi.fn();
    const travelClock: SimClock = { ...baseClock, mode: 'time-travel' };

    // ▼ このテストで描画した範囲に限定してクエリする（重複回避）
    const { container } = render(<TimeTravelPanel clock={travelClock} setClock={setClock} />);
    const scoped = within(container);

    // select（combobox）を範囲内から1つ取得
    const select = scoped.getByRole('combobox');

    // 300x に変更
    fireEvent.change(select, { target: { value: '300' } });

    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, travelClock);
    expect(next.rate).toBe(300);
  });

  test('スライダの onChange が selectedMs を更新する（概念検証）', () => {
    const now = Date.now();
    const clock: SimClock = { ...baseClock, mode: 'time-travel', selectedMs: now };

    const setClock = vi.fn();
    const { container } = render(<TimeTravelPanel clock={clock} setClock={setClock} />);
    const scoped = within(container);

    // range スライダ（初期は概ね中央=500）。必ず変化させるため 600 に設定
    const slider = scoped.getByRole('slider');
    fireEvent.change(slider, { target: { value: '600' } });

    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, clock);

    // 値が更新されたことを確認（厳密な境界は Date.now の揺れがあるため緩めに）
    expect(typeof next.selectedMs).toBe('number');
    expect(next.selectedMs).not.toBe(clock.selectedMs);

    // 参考：ウィンドウ範囲内に収まっていること（緩くチェック）
    const minMs = Date.now() - clock.windowMin * 60_000;
    const maxMs = Date.now() + clock.windowMin * 60_000;
    expect(next.selectedMs).toBeGreaterThan(minMs);
    expect(next.selectedMs).toBeLessThan(maxMs);
  });
});