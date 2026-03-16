// src/utils/stationRanking.test.ts
import { describe, test, expect } from 'vitest';
import { rankStationsByElevation } from './stationRanking';
import type { GroundStation, GroundStationStatus } from '@/types';

const STS = [
  { id: 'a', name: 'A', agency: 'Other', lat: 0, lon: 0 } as GroundStation,
  { id: 'b', name: 'B', agency: 'Other', lat: 0, lon: 0 } as GroundStation,
  { id: 'c', name: 'C', agency: 'Other', lat: 0, lon: 0 } as GroundStation,
];

describe('rankStationsByElevation', () => {
  test('仰角の降順で並ぶ', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      b: { id: 'b', elevationDeg: 20, rangeKm: 800, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    expect(rows.map(r => r.st.id)).toEqual(['b', 'c', 'a']);
  });

  test('statusMap に無い局は除外される', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      // b: なし
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    expect(rows.map(r => r.st.id)).toEqual(['c', 'a']);
  });

  test('同一仰角の場合は rangeKm の昇順で並ぶ', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 10, rangeKm: 800, isAOS: true },
      b: { id: 'b', elevationDeg: 10, rangeKm: 600, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 700, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    expect(rows.map(r => r.st.id)).toEqual(['b', 'c', 'a']); // 600 < 700 < 800
  });

  test('limit 指定で先頭 N 件だけ返す', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      b: { id: 'b', elevationDeg: 20, rangeKm: 800, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map, { limit: 2 });
    expect(rows.map(r => r.st.id)).toEqual(['b', 'c']);
  });
});