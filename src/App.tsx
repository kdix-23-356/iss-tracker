// src/App.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, EllipseGraphics } from 'resium';
import type { CesiumComponentRef } from 'resium';
import { Cartesian3, Color } from 'cesium';
import * as satellite from 'satellite.js';
import type { Viewer as CesiumViewer } from 'cesium';

import type {
  IssState,
  GroundStationStatus,
  StationEventLogMap,
  GroundStationEvent
} from './types';
import { calculateIssTelemetry, calculateOrbitPoints, computeStationsStatus } from './utils';
import {
  AOS_ELEVATION_THRESHOLD_DEG,
  STATIONS,
  STATION_EVENT_LOG_MAX,
  STATION_EVENT_LOG_DEFAULT_VISIBLE
} from './constants';

import { Dashboard } from './components/Dashboard';
import { ConfigPanel, type UiSettings } from './components/ConfigPanel';
import { GroundStationLayer } from './components/GroundStationLayer';
import { EventLogPanel, type LogEvent } from './components/EventLogPanel';
import { StationBoard } from './components/StationBoard';
import { StationLogsPanel } from './components/StationLogsPanel';

// TLEの型
type Tle = { line1: string; line2: string };

const App: React.FC = () => {
  const [tle, setTle] = useState<Tle | null>(null);
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[]; future: Cartesian3[] }>({ past: [], future: [] });

  // 互換用（ISSのポイント色などに使用）
  const [isAOS, setIsAOS] = useState(false);
  const [elevationDeg, setElevationDeg] = useState<number | null>(null);

  // 全地上局のステータス
  const [stationStatuses, setStationStatuses] = useState<Record<string, GroundStationStatus>>({});

  // UI設定（トグル拡充）
  const [settings, setSettings] = useState<UiSettings>({
    // layers
    orbit: true,
    station: true,
    footprint: true,
    // panels
    telemetry: true,
    stationBoard: false,
    stationLogs: false,
    systemLog: false,
    // per-station log
    stationLogVisibleCount: STATION_EVENT_LOG_DEFAULT_VISIBLE,
  });

  // System側の簡易ログ（右下）
  const [logs, setLogs] = useState<LogEvent[]>([
    { id: Date.now(), time: new Date(), message: 'System Initialized', type: 'info' }
  ]);

  const prevAosRef = useRef<boolean | null>(null);
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  // 局別イベントログ（AOS/LOS）
  const [stationEventLogs, setStationEventLogs] = useState<StationEventLogMap>({});
  const prevStationIsAOSRef = useRef<Record<string, boolean>>({});

  const orbitPastMat = useMemo(() => Color.CYAN.withAlpha(0.3), []);
  const orbitFutureMat = useMemo(() => Color.YELLOW.withAlpha(0.4), []);
  const footprintFill = useMemo(() => Color.YELLOW.withAlpha(0.15), []);
  const footprintOutline = useMemo(() => Color.YELLOW.withAlpha(0.8), []);

  // TLE取得
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(
          'https://api.wheretheiss.at/v1/satellites/25544/tles',
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(`TLE HTTP ${res.status}`);
        const json = await res.json();
        setTle({ line1: json.line1, line2: json.line2 });

        const infoLog: LogEvent = {
          id: Date.now(),
          time: new Date(),
          message: 'TLE fetched',
          type: 'info',
        };
        setLogs(prev => [infoLog, ...prev].slice(0, 5));
      } catch (e: unknown) {
        const isAbortError =
          (e instanceof DOMException && e.name === 'AbortError') ||
          controller.signal.aborted ||
          typeof e === 'string' ||
          ((e as any)?.name === 'AbortError');

        if (isAbortError) {
          const reason =
            (controller.signal as any).reason ??
            ((e as Error)?.message || (typeof e === 'string' ? e : 'aborted'));
          const abortedLog: LogEvent = {
            id: Date.now(),
            time: new Date(),
            message: `TLE fetch aborted: ${String(reason)}`,
            type: 'info',
          };
          setLogs(prev => [abortedLog, ...prev].slice(0, 5));
          return;
        }

        const msg = (e as Error)?.message ?? String(e);
        const warnLog: LogEvent = {
          id: Date.now(),
          time: new Date(),
          message: `TLE fetch failed: ${msg}`,
          type: 'warning',
        };
        setLogs(prev => [warnLog, ...prev].slice(0, 5));
      }
    })();

    return () => controller.abort('component unmounted or superseded');
  }, []);

  // AOS変化時だけSystemログ
  useEffect(() => {
    if (prevAosRef.current !== null && prevAosRef.current !== isAOS) {
      const newLog: LogEvent = {
        id: Date.now(),
        time: new Date(),
        message: isAOS ? 'AOS: JAXA Tsukuba (Comm Link Established)' : 'LOS: JAXA Tsukuba (Comm Link Lost)',
        type: isAOS ? 'success' : 'warning'
      };
      setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 5));
    }
    prevAosRef.current = isAOS;
  }, [isAOS]);

  // satrecをメモ化（TLEが変わった時のみ生成）
  const satrec = useMemo(() => (tle ? satellite.twoline2satrec(tle.line1, tle.line2) : null), [tle]);

  // タイマー（tick & 予報）
  const timersRef = useRef<number[]>([]);
  useEffect(() => {
    // 既存のタイマーがあれば必ず解除（StrictMode対策）
    if (timersRef.current.length) {
      timersRef.current.forEach(clearInterval);
      timersRef.current = [];
    }
    if (!satrec) return;

    const tick = () => {
      const now = new Date();
      const result = calculateIssTelemetry(satrec, now);
      if (result) {
        setPosition(result.cartesian);
        setIssState(result.telemetry);

        // 全地上局のステータスを計算
        const list = computeStationsStatus(STATIONS, result.pEci, result.gmst, AOS_ELEVATION_THRESHOLD_DEG);
        setStationStatuses(Object.fromEntries(list.map(s => [s.id, s])));

        // --- 局別のAOS/LOS遷移検出 ---
        const prev = prevStationIsAOSRef.current;
        const nowMs = Date.now();
        const eventsToAppend: Array<{ id: string; event: GroundStationEvent }> = [];

        for (const s of list) {
          const prevIsAOS = prev[s.id];
          const currIsAOS = s.isAOS;

          // 初回は prev が undefined なのでスキップ（ノイズ防止）
          if (typeof prevIsAOS === 'boolean' && prevIsAOS !== currIsAOS) {
            eventsToAppend.push({
              id: s.id,
              event: {
                type: currIsAOS ? 'AOS' : 'LOS',
                at: nowMs,
                elevationDeg: s.elevationDeg,
                rangeKm: s.rangeKm,
              }
            });
          }
        }
        // prev を更新（次tick用）
        prevStationIsAOSRef.current = Object.fromEntries(list.map(s => [s.id, s.isAOS]));

        // イベントがあれば局別ログに反映（リングバッファ10）
        if (eventsToAppend.length > 0) {
          setStationEventLogs(prevLogs => {
            const next = { ...prevLogs };
            for (const { id, event } of eventsToAppend) {
              const arr = next[id] ? [...next[id]] : [];
              arr.unshift(event);
              next[id] = arr.slice(0, STATION_EVENT_LOG_MAX);
            }
            return next;
          });
        }

        // 互換：筑波のAOS/仰角（ポイント色に使用）
        const tsukuba = list.find(s => s.id === 'tsukuba');
        setElevationDeg(tsukuba ? tsukuba.elevationDeg : null);
        setIsAOS(tsukuba ? tsukuba.isAOS : false);

        // 変化時のみ再描画
        viewerRef.current?.cesiumElement?.scene.requestRender();
      }
    };

    const updateOrbit = () => {
      const now = new Date();
      const points = calculateOrbitPoints(satrec, now, 90, 2);
      const mid = Math.floor(points.length / 2);
      setOrbit({ past: points.slice(0, mid + 1), future: points.slice(mid) });
    };

    // 初回即時実行
    tick();
    updateOrbit();

    // タイマー登録＆保持
    const id1 = window.setInterval(tick, 1000);
    const id2 = window.setInterval(updateOrbit, 60_000);
    timersRef.current = [id1, id2];

    return () => {
      timersRef.current.forEach(clearInterval);
      timersRef.current = [];
    };
  }, [satrec]);

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden'}}>
      {/* UIレイヤー */}
      {issState && settings.telemetry && (
        <Dashboard state={issState} />
      )}

      {settings.stationBoard && (
        <StationBoard stationStatuses={stationStatuses} />
      )}

      {settings.stationLogs && (
        <StationLogsPanel logsMap={stationEventLogs} showCount={settings.stationLogVisibleCount} />
      )}

      <ConfigPanel settings={settings} setSettings={setSettings} />
      {settings.systemLog && <EventLogPanel logs={logs} />}

      {/* 3Dキャンバスレイヤー */}
      <Viewer
        full
        timeline={false}
        animation={false}
        selectionIndicator={false}
        infoBox={false}
        requestRenderMode
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
              color={isAOS ? Color.LIME : Color.YELLOW}
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