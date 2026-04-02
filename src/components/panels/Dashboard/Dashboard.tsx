/**
 * Dashboard (ISS TELEMETRY)
 *
 * 目的:
 *  - 現在の ISS テレメトリ（速度/高度/緯度/経度）を画面左上にコンパクト表示する。
 *
 * 単位:
 *  - speed: km/s
 *  - altitude: km
 *  - latitude/longitude: deg
 *
 * 設計メモ:
 *  - 表示値は視認性重視で固定小数桁に丸める（速度 3 桁、高度 2 桁、緯度経度 4 桁）。
 *  - スタイルはインラインで固定し、App 側の絶対配置と整合。
 *  - pointerEvents: 'none' にして、背面の 3D 操作を阻害しない。
 *  - コンポーネント自体は純粋表示のため、ロジック・副作用なし。
 */

import React from 'react';
import type { IssState } from '@/types';
import sharedStyles from '../panels.module.css';
import styles from './Dashboard.module.css';

interface DashboardProps {
  /** ISSの現在のテレメトリ情報（速度、高度、緯度、経度など） */
  state: IssState;
}

export const Dashboard: React.FC<DashboardProps> = ({ state }) => {
  // 表示用の丸め関数（小数点以下の桁を明示）。toFixedの丸め誤差を避けるため、Math.roundで明示的に丸めてからフォーマットする
  const fmt = {
    speed: (v: number) => (Math.round(v * 1000) / 1000).toFixed(3),
    alt:   (v: number) => (Math.round(v * 100) / 100).toFixed(2),
    lat:   (v: number) => (Math.round(v * 10000) / 10000).toFixed(4),
    lon:   (v: number) => (Math.round(v * 10000) / 10000).toFixed(4),
  };

  return (
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      <h3 className={`${sharedStyles.header} ${styles.title}`}>
        ISS TELEMETRY
      </h3>

      <div className={styles.grid}>
        <span>Velocity:</span>
        <strong style={{ color: '#fff' }}>{fmt.speed(state.speed)} km/s</strong>

        <span>Altitude:</span>
        <strong style={{ color: '#fff' }}>{fmt.alt(state.altitude)} km</strong>

        <span>Lat:</span>
        <strong style={{ color: '#fff' }}>{fmt.lat(state.latitude)}°</strong>

        <span>Lon:</span>
        <strong style={{ color: '#fff' }}>{fmt.lon(state.longitude)}°</strong>
      </div>
    </div>
  );
};