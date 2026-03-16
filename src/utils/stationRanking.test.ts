/**
 * stationRanking.test.ts
 *
 * 目的:
 * - 地上局の並び替えロジック `rankStationsByElevation` の単体テスト
 *
 * 方針:
 * - 基本仕様:
 *   1) elevationDeg の降順
 *   2) 同率なら rangeKm の昇順（近い方を先）
 *   3) さらに同値なら id の昇順（決定的順序）
 * - 追加で以下も担保:
 *   - statusMap に無い局は除外
 *   - limit 指定の境界（0/大きすぎる）
 *   - 入力の不変性（非破壊）
 *   - 空入力時の挙動
 */

import { describe, test, expect } from 'vitest';
import { rankStationsByElevation } from './stationRanking';
import type { GroundStation, GroundStationStatus } from '@/types';

// 固定ステーション（順序の独立性を担保するため id/名前のみ利用）
const STS: GroundStation[] = [
  { id: 'a', name: 'A', agency: 'Other', lat: 0, lon: 0 },
  { id: 'b', name: 'B', agency: 'Other', lat: 0, lon: 0 },
  { id: 'c', name: 'C', agency: 'Other', lat: 0, lon: 0 },
];

describe('rankStationsByElevation', () => {
  test('仰角の降順で並ぶ', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      b: { id: 'b', elevationDeg: 20, rangeKm: 800, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    expect(rows.map((r) => r.st.id)).toEqual(['b', 'c', 'a']);
  });

  test('statusMap に無い局は除外される', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      // b: なし
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    expect(rows.map((r) => r.st.id)).toEqual(['c', 'a']);
  });

  test('同一仰角の場合は rangeKm の昇順で並ぶ', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 10, rangeKm: 800, isAOS: true },
      b: { id: 'b', elevationDeg: 10, rangeKm: 600, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 700, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    // 600 < 700 < 800
    expect(rows.map((r) => r.st.id)).toEqual(['b', 'c', 'a']);
  });

  test('limit 指定で先頭 N 件だけ返す', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 5, rangeKm: 1000, isAOS: false },
      b: { id: 'b', elevationDeg: 20, rangeKm: 800, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 900, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map, { limit: 2 });
    expect(rows.map((r) => r.st.id)).toEqual(['b', 'c']);
  });

  // 追加テスト: 完全同率（仰角も距離も同じ）の場合は id 昇順で決定的に並ぶ
  test('同一仰角・同一距離では id の昇順で並ぶ（決定的順序）', () => {
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 10, rangeKm: 700, isAOS: true },
      c: { id: 'c', elevationDeg: 10, rangeKm: 700, isAOS: true },
      b: { id: 'b', elevationDeg: 10, rangeKm: 700, isAOS: true },
    };
    const rows = rankStationsByElevation(STS, map);
    // 'a' < 'b' < 'c'
    expect(rows.map((r) => r.st.id)).toEqual(['a', 'b', 'c']);
  });

// 置き換え前（落ちていた版）
// test('limit=0 は空、limit が要素数より大きい場合は全件返す', () => {
//   ...
//   const rows0 = rankStationsByElevation(STS, map, { limit: 0 });
//   const rowsBig = rankStationsByElevation(STS, map, { limit: 999 });
//   expect(rows0).toHaveLength(0);
//   expect(rowsBig.map((r) => r.st.id)).toEqual(['b', 'a']); // elevation 降順
// });

/**
 * 実装仕様に合わせた修正版:
 * - limit=0（または未指定）は「制限なし」= 全件返す
 * - limit が要素数より大きい場合も全件返す
 */
test('limit=0 は制限なし（全件）、limit が要素数より大きい場合も全件返す', () => {
  const map: Record<string, GroundStationStatus> = {
    a: { id: 'a', elevationDeg: 1, rangeKm: 1000, isAOS: true },
    b: { id: 'b', elevationDeg: 2, rangeKm: 1000, isAOS: true },
  };
  const rows0 = rankStationsByElevation(STS, map, { limit: 0 });   // ← 制限なし
  const rowsBig = rankStationsByElevation(STS, map, { limit: 999 }); // ← 制限なし

  // elevation 降順なので 'b', 'a'
  expect(rows0.map((r) => r.st.id)).toEqual(['b', 'a']);
  expect(rowsBig.map((r) => r.st.id)).toEqual(['b', 'a']);
});

  // 追加テスト: 入力の不変性（非破壊）— 引数を書き換えない
  test('入力（stations/statusMap）を破壊しない（参照・値は不変）', () => {
    const stations: GroundStation[] = [
      { id: 'a', name: 'A', agency: 'Other', lat: 0, lon: 0 },
      { id: 'b', name: 'B', agency: 'Other', lat: 0, lon: 0 },
    ];
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 1, rangeKm: 1000, isAOS: true },
      b: { id: 'b', elevationDeg: 2, rangeKm: 1000, isAOS: true },
    };

    const stationsClone = stations.map((x) => ({ ...x }));
    const mapClone = JSON.parse(JSON.stringify(map)) as typeof map;

    expect(stations).toEqual(stationsClone);
    expect(map).toEqual(mapClone);
  });

  // 追加テスト: 空入力
  test('stations が空 or statusMap が空のときは空配列', () => {
    const emptyMap: Record<string, GroundStationStatus> = {};
    const map: Record<string, GroundStationStatus> = {
      a: { id: 'a', elevationDeg: 1, rangeKm: 1000, isAOS: true },
    };
    expect(rankStationsByElevation([], map)).toHaveLength(0);
    expect(rankStationsByElevation(STS, emptyMap)).toHaveLength(0);
  });
});