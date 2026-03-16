/**
 * TimeTravelPanel の最小 UI テスト
 *
 * 方針:
 * - a11y ラベルは付けていない現行 UI に合わせ、要素の取得は getByRole を使用
 * - 複数のパネルが同時にレンダリングされるケースでも衝突しないよう
 *   `within(container)` で **このテストが描画した範囲に限定**してクエリする
 * - スライダは初期値（ほぼ 500）から **確実に変化**する 600 を与えて updater を発火
 */

import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { TimeTravelPanel } from './TimeTravelPanel';
import type { SimClock } from '@/types';

/** setState の “アップデータ関数 or 値” を、テスト側で適用して次状態を得るユーティリティ */
function applyUpdater<T>(updater: T | ((prev: T) => T), prev: T): T {
  return typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
}

// ベースとなる時計状態（表示は Realtime）
const baseClock: SimClock = {
  mode: 'realtime',
  selectedMs: Date.now(),
  playing: false,
  rate: 60,
  windowMin: 360,
};

describe('TimeTravelPanel', () => {
  test('モード切替: Realtime -> Time Travel（切替時に playing は false）', () => {
    const setClock = vi.fn();

    // container を受け取り、以降この範囲に限定して要素を探索
    const { container } = render(<TimeTravelPanel clock={baseClock} setClock={setClock} />);
    const scoped = within(container);

    // 「Time Travel」ボタンを押す
    fireEvent.click(scoped.getByRole('button', { name: /Time Travel/i }));

    // setClock の最終呼び出しを取り出し、アップデータ関数を適用して次状態を得る
    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, baseClock);

    expect(next.mode).toBe('time-travel');
    expect(next.playing).toBe(false);
  });

  test('Play/Pause 反転（Time-travel モード時のみボタンが出る）', () => {
    const setClock = vi.fn();
    const travelClock: SimClock = { ...baseClock, mode: 'time-travel' };

    const { container } = render(<TimeTravelPanel clock={travelClock} setClock={setClock} />);
    const scoped = within(container);

    // 「Play」を押す
    fireEvent.click(scoped.getByRole('button', { name: /Play/i }));

    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, travelClock);
    expect(next.playing).toBe(true);
  });

  test('Rate 変更（select: combobox）で 60x -> 300x に変更', () => {
    const setClock = vi.fn();
    const travelClock: SimClock = { ...baseClock, mode: 'time-travel' };

    const { container } = render(<TimeTravelPanel clock={travelClock} setClock={setClock} />);
    const scoped = within(container);

    // select を取得して value を '300' に変更
    const select = scoped.getByRole('combobox');
    fireEvent.change(select, { target: { value: '300' } });

    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, travelClock);
    expect(next.rate).toBe(300);
  });

  test('スライダ onChange が selectedMs を更新する（0..1000 の 600 を与えて確実に変化）', () => {
    const now = Date.now();
    const clock: SimClock = { ...baseClock, mode: 'time-travel', selectedMs: now };

    const setClock = vi.fn();
    const { container } = render(<TimeTravelPanel clock={clock} setClock={setClock} />);
    const scoped = within(container);

    // role=slider を取得し、値を 600 に変更（500 付近のままだと変化が起きないことがある）
    const slider = scoped.getByRole('slider');
    fireEvent.change(slider, { target: { value: '600' } });

    const updater = setClock.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, clock);

    // 値が更新されたことを確認（厳密な境界は Date.now の揺れがあるため緩めに）
    expect(typeof next.selectedMs).toBe('number');
    expect(next.selectedMs).not.toBe(clock.selectedMs);

    // windowMin に基づくレンジ内に入っていることを緩く検証
    const minMs = Date.now() - clock.windowMin * 60_000;
    const maxMs = Date.now() + clock.windowMin * 60_000;
    expect(next.selectedMs).toBeGreaterThan(minMs);
    expect(next.selectedMs).toBeLessThan(maxMs);
  });
});