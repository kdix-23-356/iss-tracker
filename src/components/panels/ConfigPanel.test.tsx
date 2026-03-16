// src/components/panels/ConfigPanel.test.tsx
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigPanel, type UiSettings } from './ConfigPanel';

/**
 * ConfigPanel の最小 UI テスト
 * - 各チェック操作で setSettings が呼ばれ、値が反転するアップデータが渡ることを確認
 */

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
  test('Orbit Path のトグル', () => {
    const setSettings = vi.fn();
    render(<ConfigPanel settings={base} setSettings={setSettings} />);

    fireEvent.click(screen.getByLabelText(/Show Orbit Path/i));
    const updater = setSettings.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, base);
    expect(next.orbit).toBe(false); // 反転
  });

  test('Station Logs のトグルとスライダ', () => {
    const setSettings = vi.fn();
    // stationLogs=true にしてスライダが出る状態に
    const s = { ...base, stationLogs: true };
    render(<ConfigPanel settings={s} setSettings={setSettings} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '8' } });
    const updater = setSettings.mock.calls.at(-1)?.[0];
    const next = applyUpdater(updater, s);
    expect(next.stationLogVisibleCount).toBe(8);
  });
});