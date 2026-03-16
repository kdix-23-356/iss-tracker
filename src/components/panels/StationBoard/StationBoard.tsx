/**
 * StationBoard
 *
 * 目的:
 *  - 全地上局の現在ステータスを「仰角の降順」で一覧表示するパネル。
 *  - 並び替えは utils（rankStationsByElevation）に委譲し、UI は描画に専念する。
 *
 * 単位:
 *  - elevationDeg: [deg]
 *  - rangeKm: [km]（整数丸めで表示）
 *
 * 設計メモ:
 *  - rankStationsByElevation(stations, statusMap) で {st, s} の配列を得る。
 *  - 空データ時は簡潔にプレースホルダを表示（初期化直後などを想定）。
 *  - 文字サイズ/余白は既存 UI と整合（見た目は変えない）。
 */

import React from 'react';
import { STATIONS } from '@/constants';
import type { GroundStation, GroundStationStatus } from '@/types';
import { rankStationsByElevation } from '@/utils';

type Row = { st: GroundStation; s: GroundStationStatus };

export const StationBoard: React.FC<{
  stationStatuses: Record<string, GroundStationStatus>;
}> = React.memo(function StationBoard({ stationStatuses }) {
  const rows: Row[] = rankStationsByElevation(STATIONS, stationStatuses);

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(8px, 2vh, 24px)',
        right: 'clamp(8px, 2vw, 24px)',
        zIndex: 1000,
        backgroundColor: 'rgba(0, 18, 40, 0.8)',
        color: '#00e5ff',
        padding: '14px',
        borderRadius: '12px',
        border: '1px solid #00e5ff',
        fontFamily: '"Share Tech Mono", monospace',
        minWidth: 260,
        maxWidth: 'min(92vw, 460px)',
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          margin: '0 0 10px 0',
          fontSize: '1.0rem',
          textAlign: 'center',
          borderBottom: '1px solid #00e5ff55',
          paddingBottom: 6,
        }}
      >
        GROUND STATIONS — Status
      </h3>

      {rows.length === 0 ? (
        <div style={{ opacity: 0.8, fontSize: 13 }}>No station data yet.</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr 0.6fr 0.6fr 0.9fr',
            gap: '6px',
            fontSize: '0.85rem',
          }}
        >
          {/* ヘッダ */}
          <div style={{ opacity: 0.7 }}>Station</div>
          <div style={{ opacity: 0.7, textAlign: 'right' }}>El</div>
          <div style={{ opacity: 0.7, textAlign: 'right' }}>State</div>
          <div style={{ opacity: 0.7, textAlign: 'right' }}>Range</div>

          {/* 本体 */}
          {rows.map(({ st, s }) => (
            <React.Fragment key={st.id}>
              <div style={{ color: '#fff' }}>{st.name}</div>
              <div style={{ color: '#fff', textAlign: 'right' }}>
                {s.elevationDeg.toFixed(1)}°
              </div>
              <div
                style={{
                  color: s.isAOS ? '#00ffaa' : '#ffaa00',
                  textAlign: 'right',
                }}
              >
                {s.isAOS ? 'AOS' : 'LOS'}
              </div>
              <div style={{ color: '#fff', textAlign: 'right' }}>
                {Math.round(s.rangeKm)} km
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});