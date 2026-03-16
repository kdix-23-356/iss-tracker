// src/utils/stationRanking.ts
import type { GroundStation, GroundStationStatus } from '@/types';

/**
 * GroundStation の並び替え（降順: elevationDeg）
 *  - statusMap に無い局は除外
 *  - 同一仰角は rangeKm の昇順（近い方を先）
 *  - さらに同値なら id の昇順（決定的順序）
 *
 * @param stations GroundStation[] ・・・STATIONS 等
 * @param statusMap Record<id, GroundStationStatus>
 * @param opts.limit 先頭 N 件だけ返す（省略可）
 * @returns Array<{ st, s }> …… UI で使いやすい形
 */
export function rankStationsByElevation(
  stations: GroundStation[],
  statusMap: Record<string, GroundStationStatus | undefined>,
  opts?: { limit?: number }
): Array<{ st: GroundStation; s: GroundStationStatus }> {
  const rows: Array<{ st: GroundStation; s: GroundStationStatus }> = [];

  for (const st of stations) {
    const s = statusMap[st.id];
    if (s) rows.push({ st, s });
  }

  rows.sort((a, b) => {
    // 1) elevation 降順
    const de = b.s.elevationDeg - a.s.elevationDeg;
    if (de !== 0) return de;

    // 2) range 昇順（数値が小さい方＝近い方を先）
    const dr = (a.s.rangeKm ?? Number.POSITIVE_INFINITY) - (b.s.rangeKm ?? Number.POSITIVE_INFINITY);
    if (dr !== 0) return dr;

    // 3) id 昇順（決定的順序）
    return a.st.id.localeCompare(b.st.id);
  });

  if (opts?.limit && opts.limit > 0 && rows.length > opts.limit) {
    return rows.slice(0, opts.limit);
  }
  return rows;
}