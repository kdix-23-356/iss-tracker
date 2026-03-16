/**
 * ConfigPanel の最小 UI テスト
 *
 * 方針:
 * - setSettings に渡る「アップデータ関数」をテスト側で適用し、次状態を検証する
 * - DOM は @testing-library/react の render() が返す container を基点に
 *   within(container) でスコープを限定（他テストの DOM と衝突しない）
 * - スライダは role='slider' にマッピングされる input[type="range"] を取得
 */

import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { ConfigPanel, type UiSettings } from './ConfigPanel';

/** setState の “アップデータ関数 or 値” を、テスト側で適用して次状態を得るユーティリティ */
function applyUpdater<T>(updater: T | ((prev: T) => T), prev: T): T {
  return typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
}

const base: UiSettings = {
  orbit: true,
  footprint: true,
  station: true,
  telemetry: true,
  stationBoard: false,
  stationLogs: false,
  systemLog: false,
  timeControl: false,
  stationLogVisibleCount: 5,
};

describe('ConfigPanel', () => {
  test('Orbit Path のトグル（boolean の反転を検証）', () => {
    const setSettings = vi.fn();

    // このテストで render した範囲だけをクエリ対象にする
    const { container } = render(<ConfigPanel settings={base} setSettings={setSettings} />);
    const scoped = within(container);

    // "Show Orbit Path" のラベルをクリック（チェックボックスの onChange 発火）
    fireEvent.click(scoped.getByLabelText(/Show Orbit Path/i));

    // 最後に呼ばれたアップデータを適用して、次状態を検証
    const updater = setSettings.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, base);
    expect(next.orbit).toBe(false); // 反転
  });

  test('Station Logs のトグルとスライダ（表示件数の変更を検証）', () => {
    const setSettings = vi.fn();

    // stationLogs=true にして、スライダが表示される状態を用意
    const s = { ...base, stationLogs: true };
    const { container } = render(<ConfigPanel settings={s} setSettings={setSettings} />);
    const scoped = within(container);

    // role="slider" でスライダを取得し、値を 8 に変更
    fireEvent.change(scoped.getByRole('slider'), { target: { value: '8' } });

    const updater = setSettings.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, s);
    expect(next.stationLogVisibleCount).toBe(8);
  });
});