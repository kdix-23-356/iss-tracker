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
import sharedStyles from '../panels.module.css';
import styles from './StationBoard.module.css';

type Row = { st: GroundStation; s: GroundStationStatus };

interface StationBoardProps {
  /** 全地上局の現在のステータス（AOS/LOS、仰角、距離など）のマップ */
  stationStatuses: Record<string, GroundStationStatus>;
}

export const StationBoard: React.FC<StationBoardProps> = React.memo(function StationBoard({ stationStatuses }) {
  const rows: Row[] = rankStationsByElevation(STATIONS, stationStatuses);

  return (
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      <h3 className={`${sharedStyles.header} ${styles.title}`}>
        GROUND STATIONS — Status
      </h3>

      {rows.length === 0 ? (
        <div className={styles.empty}>No station data yet.</div>
      ) : (
        <div className={styles.grid}>
          {/* ヘッダ */}
          <div className={styles.headerCell}>Station</div>
          <div className={`${styles.headerCell} ${styles.cellRight}`}>El</div>
          <div className={`${styles.headerCell} ${styles.cellRight}`}>State</div>
          <div className={`${styles.headerCell} ${styles.cellRight}`}>Range</div>

          {/* 本体 */}
          {rows.map(({ st, s }) => (
            <React.Fragment key={st.id}>
              <div style={{ color: '#fff' }}>{st.name}</div>
              <div className={styles.cellRight} style={{ color: '#fff' }}>
                {s.elevationDeg.toFixed(1)}°
              </div>
              <div className={`${styles.cellRight} ${s.isAOS ? styles.aos : styles.los}`}>
                {s.isAOS ? 'AOS' : 'LOS'}
              </div>
              <div className={styles.cellRight} style={{ color: '#fff' }}>
                {Math.round(s.rangeKm)} km
              </div>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
});