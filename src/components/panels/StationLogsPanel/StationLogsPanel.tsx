/**
 * StationLogsPanel
 *
 * 目的:
 *  - 各地上局の AOS/LOS イベント履歴（直近 showCount 件）を表示する。
 *  - 表示順は「局ごとの最新イベント時刻の降順」。
 *
 * 単位:
 *  - elevationDeg: [deg]
 *  - rangeKm: [km]
 *  - イベント時刻 at: [epoch ms]
 *
 * 設計メモ:
 *  - Object.entries の戻り値はタプルにキャストして unknown を排除（型を堅牢に）。
 *  - STATIONS → Map<string,string> にして局名解決を O(1) に固定。
 *  - 日時フォーマットは軽量フォーマッタを内製（i18n が必要になったら将来差し替え）。
 *  - stations 配列・idToName の計算は useMemo で依存時のみ再計算。
 */

import React, { useMemo } from 'react';
import type { StationEventLogMap, GroundStationEvent } from '@/types';
import { STATIONS } from '@/constants';
import { formatDateTimeMs } from '@/utils';
import sharedStyles from '../panels.module.css';
import styles from './StationLogsPanel.module.css';

export const StationLogsPanel: React.FC<{
  logsMap: StationEventLogMap;
  showCount: number; // 5..10
}> = ({ logsMap, showCount }) => {
  // 局ID -> 局名 の解決表
  const idToName = useMemo(
    () => new Map<string, string>(STATIONS.map((s) => [s.id, s.name] as const)),
    []
  );

  // 局ごとの最新イベント時刻で降順ソートし、各局の先頭 showCount 件を表示
  const stations = useMemo(() => {
    const entries = Object.entries(logsMap) as [string, GroundStationEvent[]][];

    return entries
      .filter(([, arr]) => Array.isArray(arr) && arr.length > 0)
      .map(([id, arr]) => ({
        id,
        latestAt: arr[0].at,
        events: arr.slice(0, showCount),
      }))
      .sort((a, b) => b.latestAt - a.latestAt);
  }, [logsMap, showCount]);

  return (
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      <div className={sharedStyles.header} style={{ fontSize: '0.9rem' }}>
        STATION EVENT LOG (per station)
      </div>

      {stations.length === 0 ? (
        <div className={styles.empty}>No AOS/LOS events yet.</div>
      ) : (
        stations.map(({ id, events }) => (
          <div key={id} className={styles.logGroup}>
            <div className={styles.logGroupHeader}>
              <strong style={{ color: '#fff' }}>{idToName.get(id) ?? id}</strong>
              {/* 最上段のイベント（events[0]）が最新 */}
              <span style={{ opacity: 0.75, fontSize: 12 }}>
                latest {formatDateTimeMs(events[0].at)}
              </span>
            </div>
            <ul className={styles.logList}>
              {events.map((e, i) => (
                <li
                  key={`${id}-${e.at}-${i}`}
                  className={styles.logItem}
                >
                  <span
                    className={styles.logType}
                    style={{
                      color: e.type === 'AOS' ? '#00ffaa' : '#ffaa00',
                    }}
                  >
                    {e.type}
                  </span>
                  <span style={{ opacity: 0.85 }}>{formatDateTimeMs(e.at)}</span>
                  <span style={{ marginLeft: 10, opacity: 0.9 }}>
                    El {e.elevationDeg.toFixed(1)}° / {Math.round(e.rangeKm)} km
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
};