// src/utils/stationEvents.test.ts
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
    expect(next.a).toBe(true);
  });

  test('前回 true → 今回 false で LOS を返す', () => {
    const prev = { b: true };
    const current: GroundStationStatus[] = [
      { id: 'b', elevationDeg: 5, rangeKm: 1500, isAOS: false },
    ];
    const [events] = diffStationAos(prev, current, 1);
    expect(events).toHaveLength(1);
    expect(events[0].event.type).toBe('LOS');
  });

  test('初回（前回値なし）はイベントを返さない', () => {
    const prev = {};
    const current: GroundStationStatus[] = [
      { id: 'c', elevationDeg: 20, rangeKm: 800, isAOS: true },
    ];
    const [events] = diffStationAos(prev, current, Date.now());
    expect(events).toHaveLength(0);
  });
});