/**
 * stationEvents.test.ts
 *
 * 目的:
 * - AOS/LOS 遷移検出関数 `diffStationAos` の単体テスト
 *
 * 方針:
 * - 「前回 → 今回」の isAOS の変化から AOS/LOS を抽出し、次回用の状態マップも返す仕様を検証する
 * - 基本3ケース（AOS・LOS・初回はイベントなし）に加え、
 *   複数局が混在するケースでも期待通りに抽出されるかを検証する
 */

import { describe, test, expect } from 'vitest';
import { diffStationAos } from './stationEvents';
import type { GroundStationStatus } from '@/types';

describe('diffStationAos()', () => {
  test('前回 false → 今回 true で AOS を返す', () => {
    const prev = { a: false };
    const current: GroundStationStatus[] = [
      { id: 'a', elevationDeg: 12, rangeKm: 1000, isAOS: true },
    ];
    const [events, next] = diffStationAos(prev, current, 123456);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('a');
    expect(events[0].event.type).toBe('AOS');
    expect(events[0].event.elevationDeg).toBeCloseTo(12, 10);
    expect(events[0].event.rangeKm).toBeCloseTo(1000, 10);
    expect(next.a).toBe(true);
  });

  test('前回 true → 今回 false で LOS を返す', () => {
    const prev = { b: true };
    const current: GroundStationStatus[] = [
      { id: 'b', elevationDeg: 5, rangeKm: 1500, isAOS: false },
    ];
    const [events, next] = diffStationAos(prev, current, 1);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('b');
    expect(events[0].event.type).toBe('LOS');
    expect(events[0].event.elevationDeg).toBeCloseTo(5, 10);
    expect(events[0].event.rangeKm).toBeCloseTo(1500, 10);
    expect(next.b).toBe(false);
  });

  test('初回（前回値なし）はイベントを返さない', () => {
    const prev = {};
    const current: GroundStationStatus[] = [
      { id: 'c', elevationDeg: 20, rangeKm: 800, isAOS: true },
    ];
    const [events, next] = diffStationAos(prev as Record<string, boolean>, current, Date.now());
    expect(events).toHaveLength(0);
    // nextMap は今回値を反映していること
    expect(next.c).toBe(true);
  });

  test('複数局混在: 変化した局のみ抽出され、nextMap は全局分更新される', () => {
    const prev = { a: false, b: true, c: false };
    const current: GroundStationStatus[] = [
      // a: false -> true (AOS)  …抽出対象
      { id: 'a', elevationDeg: 10.1, rangeKm: 900, isAOS: true },
      // b: true -> true (変化なし) …抽出対象外
      { id: 'b', elevationDeg: 2.5, rangeKm: 1600, isAOS: true },
      // c: false -> false (変化なし) …抽出対象外
      { id: 'c', elevationDeg: -3.2, rangeKm: 2200, isAOS: false },
      // d: 新規（prev 未定義） -> true（初回はイベント化しない想定）
      { id: 'd', elevationDeg: 15.0, rangeKm: 700, isAOS: true },
    ];

    const [events, next] = diffStationAos(prev, current, 42);

    // 抽出は a の AOS のみ
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('a');
    expect(events[0].event.type).toBe('AOS');

    // nextMap は current 全局の isAOS を反映
    expect(next.a).toBe(true);
    expect(next.b).toBe(true);
    expect(next.c).toBe(false);
    expect(next.d).toBe(true);
  });
});