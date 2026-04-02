/**
 * EventLogPanel
 *
 * 目的:
 *  - システムイベント（INFO/SUCCESS/WARNING）を右下に簡潔表示する。
 *  - 非インタラクティブ（pointerEvents: 'none'）で背面操作を阻害しない。
 *
 * 単位/前提:
 *  - LogEvent.time は Date インスタンス（App 側で生成）。
 *  - 表示時刻はローカル時刻の「HH:mm:ss」に揃える（視認性重視）。
 *
 * 設計メモ:
 *  - ログの色決定は type で分岐（success=緑/ warning=黄/ info=白）。
 *  - フォーマッタ fmtTime を内製し、toLocale の環境差を避ける。
 *  - 重複定義を避けるため、LogEvent 型は `@/types` から import。
 */

import React, { useMemo } from 'react';
import type { LogEvent } from '@/types';
import { formatTimeHMS } from '@/utils';
import sharedStyles from './panels/panels.module.css';
import styles from './EventLogPanel.module.css';

interface EventLogPanelProps {
  /** 表示するシステムイベントログの配列（先頭が最新であることを想定） */
  logs: LogEvent[];
}

export const EventLogPanel: React.FC<EventLogPanelProps> = React.memo(function EventLogPanel({ logs }) {
  // 表示色マップ（メモ化でインスタンス固定）
  const colorMap = useMemo(
    () => ({
      success: '#00ffaa',
      warning: '#ffaa00',
      info: '#ffffff',
    }),
    []
  );

  return (
    <div className={`${sharedStyles.basePanel} ${styles.container}`}>
      <div className={`${sharedStyles.header} ${styles.title}`}>
        SYSTEM EVENT LOG
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {logs.map((log) => {
          const color = colorMap[log.type] ?? '#ffffff';

          return (
            <div
              key={log.id}
              style={{ fontSize: '0.8rem', display: 'flex', gap: '10px', color }}
            >
              <span style={{ opacity: 0.7 }}>[{formatTimeHMS(log.time)}]</span>
              <span>{log.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});