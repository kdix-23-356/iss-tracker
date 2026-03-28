// src/App.tsx
/**
 * ISS Tracker – App root
 *
 * 目的：
 *  - Cesium（3D）上で ISS の現在/任意時刻の位置・軌道を描画
 *  - 全地上局の AOS/LOS をリアルタイムに判定
 *  - 局別 AOS/LOS イベントを“リアルタイム時のみ”記録（証跡の純度を担保）
 *  - タイムトラベルで任意時刻の状態を再現（ログは汚さない）
 *  - UI は Progressive Disclosure（必要なときだけ表示）
 *
 * 本ファイルでは：
 *  - 計算と状態更新のコアを renderAt(target: Date) に集約
 *  - HMR/アンマウント由来の fetch 中断は INFO としてログ（エラーにしない）
 *  - Cesium の requestRenderMode を活かして必要時のみ再描画
 *  - 重いパネル（Board/Logs/TimeControl）は React.lazy + Suspense で遅延読込
 */

import React, {  useState, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, EllipseGraphics } from 'resium';
import type { CesiumComponentRef } from 'resium';
import {  Color } from 'cesium';
import type { Viewer as CesiumViewer } from 'cesium';

import type { LogEvent } from '@/types';

import { useTle, useIssSimulation } from '@/hooks';
import {
  STATION_EVENT_LOG_DEFAULT_VISIBLE,
} from '@/constants';

// panels: ダッシュボード/コンフィグは軽量なので即時 import
import { Dashboard, ConfigPanel, type UiSettings } from '@/components/panels';
import { GroundStationLayer } from '@/components/layers';
import { EventLogPanel } from './components/EventLogPanel';

// 遅延ロード対象（ON時に初めて読み込む）
const StationBoardLazy = lazy(() =>
  import('@/components/panels/StationBoard').then(m => ({ default: m.StationBoard }))
);
const StationLogsPanelLazy = lazy(() =>
  import('@/components/panels/StationLogsPanel').then(m => ({ default: m.StationLogsPanel }))
);
const TimeTravelPanelLazy = lazy(() =>
  import('@/components/panels/TimeTravelPanel').then(m => ({ default: m.TimeTravelPanel }))
);

/* ======================================================
 *  小さなユーティリティ（副作用なし）
 * ====================================================== */
/** 先頭へ追加し、最大長で丸める（リングバッファ的に扱う） */
function unshiftAndTrim<T>(xs: T[], item: T, max: number): T[] {
  const next = [item, ...xs];
  if (next.length > max) next.length = max;
  return next;
}


/* ======================================================
 *  Component
 * ====================================================== */
const App: React.FC = () => {
  // UI設定：LayerはON、Panelsはデフォルト（TelemetryのみON）
  const [settings, setSettings] = useState<UiSettings>({
    orbit: true,
    station: true,
    footprint: true,
    telemetry: true,     // TelemetryはON
    stationBoard: false,
    stationLogs: false,
    systemLog: false,
    timeControl: false,
    stationLogVisibleCount: STATION_EVENT_LOG_DEFAULT_VISIBLE,
  });

  // ---------- Logs ----------
  /** 簡易 System Event Log（右下） */
  const [logs, setLogs] = useState<LogEvent[]>([
    { id: Date.now(), time: new Date(), message: 'System Initialized', type: 'info' }
  ]);

  /** Cesium viewer ref（手動 requestRender に使用） */
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  // ---------- Constant materials（再作成を避ける） ----------
  const orbitPastMat = useMemo(() => Color.CYAN.withAlpha(0.3), []);
  const orbitFutureMat = useMemo(() => Color.YELLOW.withAlpha(0.4), []);
  const footprintFill = useMemo(() => Color.YELLOW.withAlpha(0.15), []);
  const footprintOutline = useMemo(() => Color.YELLOW.withAlpha(0.8), []);

  const addSystemLog = useCallback((entry: Omit<LogEvent, 'id' | 'time'>) => {
    setLogs(prev => unshiftAndTrim(prev, { id: Date.now(), time: new Date(), ...entry }, 5));
  }, []);

  const satrec = useTle(addSystemLog);

  const {
    position,
    issState,
    orbit,
    isAOS,
    stationStatuses,
    stationEventLogs,
    clock,
    setClock,
  } = useIssSimulation(satrec, addSystemLog, viewerRef);

  /* ======================================================
   *  Render
   * ====================================================== */
  return (
    <div
      style={{
        position: 'fixed',  // Viewport にフィット
        inset: 0,
        overflow: 'hidden', // ズーム時のスクロール防止
      }}
    >
      {/* UIレイヤー（軽量コンポーネントは即時） */}
      {issState && settings.telemetry && <Dashboard state={issState} />}

      {/* 遅延領域（ONになったら読み込む） */}
      <Suspense fallback={null}>
        {settings.stationBoard && <StationBoardLazy stationStatuses={stationStatuses} />}
        {settings.stationLogs && (
          <StationLogsPanelLazy logsMap={stationEventLogs} showCount={settings.stationLogVisibleCount} />
        )}
        {settings.timeControl && <TimeTravelPanelLazy clock={clock} setClock={setClock} />}
      </Suspense>

      <ConfigPanel settings={settings} setSettings={setSettings} />
      {settings.systemLog && <EventLogPanel logs={logs} />}

      {/* 3Dキャンバスレイヤー */}
      <Viewer
        full
        timeline={false}
        animation={false}
        selectionIndicator={false}
        infoBox={false}
        requestRenderMode // 変化時のみ描画 → 省リソース
        ref={viewerRef}
      >
        {settings.station && (
          <GroundStationLayer stationStatuses={stationStatuses} issPos={position} />
        )}

        {settings.orbit && (
          <>
            <Entity>
              <PolylineGraphics positions={orbit.past} width={2} material={orbitPastMat} />
            </Entity>
            <Entity>
              <PolylineGraphics positions={orbit.future} width={2} material={orbitFutureMat} />
            </Entity>
          </>
        )}

        {position && (
          <Entity position={position} name="ISS">
            <PointGraphics
              pixelSize={12}
              color={isAOS ? Color.LIME : Color.YELLOW} // 筑波 AOS の状態色
              outlineColor={Color.BLACK}
              outlineWidth={2}
            />
            {settings.footprint && (
              <EllipseGraphics
                semiMajorAxis={2_200_000}
                semiMinorAxis={2_200_000}
                height={0}
                material={footprintFill}
                outline
                outlineColor={footprintOutline}
              />
            )}
          </Entity>
        )}
      </Viewer>
    </div>
  );
};

export default App;