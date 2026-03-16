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
  GroundStationEvent,
  SimClock,
} from './types';
import { calculateIssTelemetry, calculateOrbitPoints, computeStationsStatus } from './utils';
import {
  AOS_ELEVATION_THRESHOLD_DEG,
  STATIONS,
  STATION_EVENT_LOG_MAX,
  STATION_EVENT_LOG_DEFAULT_VISIBLE,
  TIME_TRAVEL_DEFAULT_RATE,
  TIME_TRAVEL_DEFAULT_WINDOW_MIN,
} from './constants';

import { Dashboard } from './components/Dashboard';
import { ConfigPanel, type UiSettings } from './components/ConfigPanel';
import { GroundStationLayer } from './components/GroundStationLayer';
import { EventLogPanel, type LogEvent } from './components/EventLogPanel';
import { StationBoard } from './components/StationBoard';
import { StationLogsPanel } from './components/StationLogsPanel';
import { TimeTravelPanel } from './components/TimeTravelPanel';

// TLEの型
type Tle = { line1: string; line2: string };

const App: React.FC = () => {
  const [tle, setTle] = useState<Tle | null>(null);
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[]; future: Cartesian3[] }>({ past: [], future: [] });

  // 互換用（ISSポイント色など）
  const [isAOS, setIsAOS] = useState(false);

  // 全地上局のステータス
  const [stationStatuses, setStationStatuses] = useState<Record<string, GroundStationStatus>>({});

  // UI設定：LayerはON、PanelsはデフォルトOFF（前回の希望どおり）
  const [settings, setSettings] = useState<UiSettings>({
    orbit: true,
    station: true,
    footprint: true,
    telemetry: false,
    stationBoard: false,
    stationLogs: false,
    systemLog: false,
    timeControl: false,
    stationLogVisibleCount: STATION_EVENT_LOG_DEFAULT_VISIBLE,
  });

  // System Event Log（簡易）
  const [logs, setLogs] = useState<LogEvent[]>([
    { id: Date.now(), time: new Date(), message: 'System Initialized', type: 'info' }
  ]);

  // 局別イベントログ（リアルタイム中のみ記録）
  const [stationEventLogs, setStationEventLogs] = useState<StationEventLogMap>({});
  const prevStationIsAOSRef = useRef<Record<string, boolean>>({});

  const prevAosRef = useRef<boolean | null>(null);
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  // シミュレーションクロック（モード・選択時刻・再生速度）
  const [clock, setClock] = useState<SimClock>({
    mode: 'realtime',
    selectedMs: Date.now(),
    playing: false,
    rate: TIME_TRAVEL_DEFAULT_RATE,
    windowMin: TIME_TRAVEL_DEFAULT_WINDOW_MIN,
  });

  const orbitPastMat = useMemo(() => Color.CYAN.withAlpha(0.3), []);
  const orbitFutureMat = useMemo(() => Color.YELLOW.withAlpha(0.4), []);
  const footprintFill = useMemo(() => Color.YELLOW.withAlpha(0.15), []);
  const footprintOutline = useMemo(() => Color.YELLOW.withAlpha(0.8), []);

  // -----------------------------
  // TLE取得（Abort対応・判定強化版）
  // -----------------------------
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
          id: Date.now(), time: new Date(), message: 'TLE fetched', type: 'info',
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
            id: Date.now(), time: new Date(), message: `TLE fetch aborted: ${String(reason)}`, type: 'info',
          };
          setLogs(prev => [abortedLog, ...prev].slice(0, 5));
          return;
        }

        const msg = (e as Error)?.message ?? String(e);
        const warnLog: LogEvent = {
          id: Date.now(), time: new Date(), message: `TLE fetch failed: ${msg}`, type: 'warning',
        };
        setLogs(prev => [warnLog, ...prev].slice(0, 5));
      }
    })();

    return () => controller.abort('component unmounted or superseded');
  }, []);

  // satrecをメモ化（TLEが変わった時のみ生成）
  const satrec = useMemo(() => (tle ? satellite.twoline2satrec(tle.line1, tle.line2) : null), [tle]);

  // --- 共通：指定時刻での計算・描画を1か所に集約 ---
  const renderAt = (target: Date, options?: { recordEvents?: boolean }) => {
    if (!satrec) return;

    const result = calculateIssTelemetry(satrec, target);
    if (!result) return;

    setPosition(result.cartesian);
    setIssState(result.telemetry);

    // 全地上局のステータス
    const list = computeStationsStatus(STATIONS, result.pEci, result.gmst, AOS_ELEVATION_THRESHOLD_DEG);
    setStationStatuses(Object.fromEntries(list.map(s => [s.id, s])));

    // 局別イベント（リアルタイム時のみ記録）
    const shouldRecord = options?.recordEvents ?? (clock.mode === 'realtime');
    if (shouldRecord) {
      const prev = prevStationIsAOSRef.current;
      const nowMs = target.getTime();
      const eventsToAppend: Array<{ id: string; event: GroundStationEvent }> = [];

      for (const s of list) {
        const prevIsAOS = prev[s.id];
        const currIsAOS = s.isAOS;
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
      prevStationIsAOSRef.current = Object.fromEntries(list.map(s => [s.id, s.isAOS]));

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
    }

    // 互換：筑波のAOS/仰角（ポイント色に使用）
    const tsukuba = list.find(s => s.id === 'tsukuba');
    setIsAOS(tsukuba ? tsukuba.isAOS : false);

    // 軌道（±90分）もターゲット時刻を中心に再生成
    const points = calculateOrbitPoints(satrec, target, 90, 2);
    const mid = Math.floor(points.length / 2);
    setOrbit({ past: points.slice(0, mid + 1), future: points.slice(mid) });

    // Cesium の再描画
    viewerRef.current?.cesiumElement?.scene.requestRender();
  };

  // --- リアルタイムモード：1秒Tickで現在時刻を描画 ---
  const realTimersRef = useRef<number[]>([]);
  useEffect(() => {
    if (!satrec) return;

    // クリーンアップ
    if (realTimersRef.current.length) {
      realTimersRef.current.forEach(clearInterval);
      realTimersRef.current = [];
    }

    if (clock.mode !== 'realtime') return;

    // 初回
    renderAt(new Date(), { recordEvents: true });

    // 1秒ごとに現在時刻で更新
    const id = window.setInterval(() => {
      renderAt(new Date(), { recordEvents: true });
    }, 1000);

    realTimersRef.current = [id];
    return () => {
      realTimersRef.current.forEach(clearInterval);
      realTimersRef.current = [];
    };
  }, [satrec, clock.mode]);

  // --- タイムトラベル：選択時刻の変更や再生に応じて描画 ---
  const playTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!satrec) return;

    // 常に：選択時刻が変わったら、その時刻で即描画（ログは記録しない）
    if (clock.mode === 'time-travel') {
      renderAt(new Date(clock.selectedMs), { recordEvents: false });
    }

    // 再生管理
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (clock.mode === 'time-travel' && clock.playing) {
      playTimerRef.current = window.setInterval(() => {
        setClock(c => {
          const nextMs = c.selectedMs + c.rate * 1000; // rate秒/秒
          // 境界（スライダ範囲）外に出たら止める or 折返し。ここでは止める。
          const nowMs = Date.now();
          const minMs = nowMs - c.windowMin * 60_000;
          const maxMs = nowMs + c.windowMin * 60_000;
          const clamped = Math.max(minMs, Math.min(maxMs, nextMs));
          return { ...c, selectedMs: clamped, playing: clamped !== nextMs ? false : c.playing };
        });
      }, 1000);
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
        playTimerRef.current = null;
      }
    };
  }, [satrec, clock.mode, clock.selectedMs, clock.playing, clock.rate, clock.windowMin]);

  // AOS（筑波）変化時のSystemログは、リアルタイム時のみ記録
  useEffect(() => {
    if (clock.mode !== 'realtime') return;
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
  }, [isAOS, clock.mode]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* UIレイヤー */}
      {issState && settings.telemetry && <Dashboard state={issState} />}
      {settings.stationBoard && <StationBoard stationStatuses={stationStatuses} />}
      {settings.stationLogs && (
        <StationLogsPanel logsMap={stationEventLogs} showCount={settings.stationLogVisibleCount} />
      )}
      {settings.timeControl && <TimeTravelPanel clock={clock} setClock={setClock} />}

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