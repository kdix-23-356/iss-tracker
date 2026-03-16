// src/utils/stationEvents.ts
import type { GroundStationStatus, GroundStationEvent } from '@/types';

/**
 * 前回の isAOS マップと今回の判定結果から、発生したイベントを抽出する純粋関数。
 * 入力が同じなら出力が同じ（副作用なし）。
 *
 * @param prevIsAosMap - 局ID -> isAOS（前回値）
 * @param current - 現在の判定結果配列
 * @param nowMs - イベント時刻（epoch ms）
 * @returns [events, nextMap]
 *   - events: { id, event } の配列（AOS/LOS が発生した局だけ）
 *   - nextMap: 局ID -> isAOS（今回値）
 */
export function diffStationAos(
  prevIsAosMap: Record<string, boolean>,
  current: GroundStationStatus[],
  nowMs: number
): [Array<{ id: string; event: GroundStationEvent }>, Record<string, boolean>] {
  const nextMap: Record<string, boolean> = {};
  const events: Array<{ id: string; event: GroundStationEvent }> = [];

  for (const s of current) {
    const prev = prevIsAosMap[s.id];
    const cur = s.isAOS;
    nextMap[s.id] = cur;

    if (typeof prev === 'boolean' && prev !== cur) {
      events.push({
        id: s.id,
        event: {
          type: cur ? 'AOS' : 'LOS',
          at: nowMs,
          elevationDeg: s.elevationDeg,
          rangeKm: s.rangeKm,
        },
      });
    }
  }
  return [events, nextMap];
}