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

import React, { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, EllipseGraphics } from 'resium';
import type { CesiumComponentRef } from 'resium';
import { Cartesian3, Color } from 'cesium';
import * as satellite from 'satellite.js';
import type { Viewer as CesiumViewer } from 'cesium';

import type {
  IssState,
  GroundStationStatus,
  StationEventLogMap,
  SimClock,
  LogEvent,
} from '@/types';

import { diffStationAos } from '@/utils/stationEvents';
import { calculateIssTelemetry, calculateOrbitPoints, computeStationsStatus } from './utils';
import {
  AOS_ELEVATION_THRESHOLD_DEG,
  STATIONS,
  STATION_EVENT_LOG_MAX,
  STATION_EVENT_LOG_DEFAULT_VISIBLE,
  TIME_TRAVEL_DEFAULT_RATE,
  TIME_TRAVEL_DEFAULT_WINDOW_MIN,
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
 *  定数（魔法数の排除・変更箇所の一元化）
 * ====================================================== */
const TLE_URL = 'https://api.wheretheiss.at/v1/satellites/25544/tles';
const TICK_MS = 1000;                      // リアルタイム更新間隔（1秒）
const ORBIT_UPDATE_INTERVAL_MS = 60_000;   // 軌道再計算の最短間隔（60秒）

// TLEの型
type Tle = { line1: string; line2: string };

/* ======================================================
 *  小さなユーティリティ（副作用なし）
 * ====================================================== */
/** 先頭へ追加し、最大長で丸める（リングバッファ的に扱う） */
function unshiftAndTrim<T>(xs: T[], item: T, max: number): T[] {
  const next = [item, ...xs];
  if (next.length > max) next.length = max;
  return next;
}

/** System Event Log へ 1 件 push（最大 5 件表示） */
function pushSystemLog(
  setter: React.Dispatch<React.SetStateAction<LogEvent[]>>,
  entry: LogEvent,
  max = 5
) {
  setter(prev => unshiftAndTrim(prev, entry, max));
}

/* ======================================================
 *  Component
 * ====================================================== */
const App: React.FC = () => {
  // ---------- Core states ----------
  const [tle, setTle] = useState<Tle | null>(null);
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[]; future: Cartesian3[] }>({ past: [], future: [] });

  /** 旧 UI 互換：ISS ポイント色に利用（筑波 AOS を代表） */
  const [isAOS, setIsAOS] = useState(false);

  /** 全地上局の「現在」判定結果 */
  const [stationStatuses, setStationStatuses] = useState<Record<string, GroundStationStatus>>({});

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

  /** 局別の AOS/LOS イベント履歴（リアルタイム時のみ追記） */
  const [stationEventLogs, setStationEventLogs] = useState<StationEventLogMap>({});

  /** 局 ID -> 前回 isAOS（遷移検出のため） */
  const prevStationIsAOSRef = useRef<Record<string, boolean>>({});

  /** 筑波 isAOS の前回値（System Log の適正化） */
  const prevAosRef = useRef<boolean | null>(null);

  /** Cesium viewer ref（手動 requestRender に使用） */
  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);

  // ---------- Simulation Clock（Realtime / Time-travel） ----------
  const [clock, setClock] = useState<SimClock>({
    mode: 'realtime',
    selectedMs: Date.now(),
    playing: false,
    rate: TIME_TRAVEL_DEFAULT_RATE,
    windowMin: TIME_TRAVEL_DEFAULT_WINDOW_MIN,
  });

  // ---------- Constant materials（再作成を避ける） ----------
  const orbitPastMat = useMemo(() => Color.CYAN.withAlpha(0.3), []);
  const orbitFutureMat = useMemo(() => Color.YELLOW.withAlpha(0.4), []);
  const footprintFill = useMemo(() => Color.YELLOW.withAlpha(0.15), []);
  const footprintOutline = useMemo(() => Color.YELLOW.withAlpha(0.8), []);

  /* ======================================================
   *  Fetch TLE once（Abort は正常系として扱う）
   * ====================================================== */
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(TLE_URL, { signal: controller.signal });
        if (!res.ok) throw new Error(`TLE HTTP ${res.status}`);
        const json = await res.json();
        setTle({ line1: json.line1, line2: json.line2 });

        pushSystemLog(setLogs, {
          id: Date.now(), time: new Date(), message: 'TLE fetched', type: 'info',
        });
      } catch (e: unknown) {
        // HMR/アンマウント等での中断は日常的 → INFO として扱う
        const isAbortError =
          (e instanceof DOMException && e.name === 'AbortError') ||
          controller.signal.aborted ||
          typeof e === 'string' ||
          ((e as any)?.name === 'AbortError');

        if (isAbortError) {
          const reason =
            (controller.signal as any).reason ??
            ((e as Error)?.message || (typeof e === 'string' ? e : 'aborted'));
          pushSystemLog(setLogs, {
            id: Date.now(), time: new Date(), message: `TLE fetch aborted: ${String(reason)}`, type: 'info',
          });
          return;
        }

        // 本当の失敗のみ WARN
        const msg = (e as Error)?.message ?? String(e);
        pushSystemLog(setLogs, {
          id: Date.now(), time: new Date(), message: `TLE fetch failed: ${msg}`, type: 'warning',
        });
      }
    })();

    // 理由付き abort（“置換/アンマウントによる中断”をログに残す）
    return () => controller.abort('component unmounted or superseded');
  }, []);

  /* ======================================================
   *  satrec（TLE 変更時のみ生成）
   * ====================================================== */
  const satrec = useMemo(() => (tle ? satellite.twoline2satrec(tle.line1, tle.line2) : null), [tle]);

  /* ======================================================
   *  renderAt(target) – 計算と状態更新の集約点
   *  - Realtime / Time-travel 共用
   *  - options.recordEvents: true で局別ログを追記
   *  - 軌道再計算は 60 秒に 1 回に抑制（Time-travel では毎回）
   * ====================================================== */
  const lastOrbitUpdateMsRef = useRef(0);

  const renderAt = (target: Date, options?: { recordEvents?: boolean }) => {
    if (!satrec) return;

    const result = calculateIssTelemetry(satrec, target);
    if (!result) return;

    setPosition(result.cartesian);
    setIssState(result.telemetry);

    // 全地上局のステータス（現在判定）
    const list = computeStationsStatus(STATIONS, result.pEci, result.gmst, AOS_ELEVATION_THRESHOLD_DEG);
    setStationStatuses(Object.fromEntries(list.map(s => [s.id, s])));

    // 局別イベント（リアルタイム時のみ記録：証跡の純度を担保）
    const shouldRecord = options?.recordEvents ?? (clock.mode === 'realtime');
    if (shouldRecord) {
      const nowMs = target.getTime();
      const [eventsToAppend, nextMap] = diffStationAos(prevStationIsAOSRef.current, list, nowMs);
      prevStationIsAOSRef.current = nextMap;

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

    // 互換：筑波AOS（ISS ポイント色）
    const tsukuba = list.find(s => s.id === 'tsukuba');
    setIsAOS(tsukuba ? tsukuba.isAOS : false);

    // 軌道（±90分）は Time-travel では毎回、Realtime では一定間隔でのみ再計算
    const nowMs = target.getTime();
    const shouldUpdateOrbit =
      clock.mode === 'time-travel' ||
      nowMs - lastOrbitUpdateMsRef.current >= ORBIT_UPDATE_INTERVAL_MS;

    if (shouldUpdateOrbit) {
      const points = calculateOrbitPoints(satrec, target, 90, 2);
      const mid = Math.floor(points.length / 2);
      setOrbit({ past: points.slice(0, mid + 1), future: points.slice(mid) });
      lastOrbitUpdateMsRef.current = nowMs;
    }

    // Cesium の再描画（requestRenderMode前提）
    viewerRef.current?.cesiumElement?.scene.requestRender();
  };

  /* ======================================================
   *  Realtime – 1s Tick
   * ====================================================== */
  const realTimersRef = useRef<number[]>([]);
  useEffect(() => {
    if (!satrec) return;

    // 既存の Timer を確実に解除（StrictMode/HMR 対策）
    if (realTimersRef.current.length) {
      realTimersRef.current.forEach(clearInterval);
      realTimersRef.current = [];
    }
    if (clock.mode !== 'realtime') return;

    // 初回（リアルタイム）：記録ありで描画
    renderAt(new Date(), { recordEvents: true });

    // 1 秒ごとに現在時刻で更新（記録あり）
    const id = window.setInterval(() => {
      renderAt(new Date(), { recordEvents: true });
    }, TICK_MS);

    realTimersRef.current = [id];
    return () => {
      realTimersRef.current.forEach(clearInterval);
      realTimersRef.current = [];
    };
  }, [satrec, clock.mode]);

  /* ======================================================
   *  Time-travel – Seek & Play
   *  - 選択時刻が変わる都度、その時刻で単発描画（記録なし）
   *  - 再生中は rate 秒/秒 で selectedMs を進める
   * ====================================================== */
  const playTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!satrec) return;

    // Seek：選択時刻が変わったら、その時刻で即描画（ログは記録しない）
    if (clock.mode === 'time-travel') {
      renderAt(new Date(clock.selectedMs), { recordEvents: false });
    }

    // 再生タイマーの張り替え
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }
    if (clock.mode === 'time-travel' && clock.playing) {
      playTimerRef.current = window.setInterval(() => {
        setClock(c => {
          const nextMs = c.selectedMs + c.rate * 1000; // rate秒/秒
          // スライダ範囲外に出たら停止（折返しでも可）
          const nowMs = Date.now();
          const minMs = nowMs - c.windowMin * 60_000;
          const maxMs = nowMs + c.windowMin * 60_000;
          const clamped = Math.max(minMs, Math.min(maxMs, nextMs));
          // 範囲外なら停止（折返し設計も可）
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

  /* ======================================================
   *  System Log（筑波 AOS の変化のみ通知）
   *  - Realtime の時だけ（Time-travel は通知しない）
   * ====================================================== */
  useEffect(() => {
    if (clock.mode !== 'realtime') return;
    if (prevAosRef.current !== null && prevAosRef.current !== isAOS) {
      pushSystemLog(setLogs, {
        id: Date.now(),
        time: new Date(),
        message: isAOS
          ? 'AOS: JAXA Tsukuba (Comm Link Established)'
          : 'LOS: JAXA Tsukuba (Comm Link Lost)',
        type: isAOS ? 'success' : 'warning',
      });
    }
    prevAosRef.current = isAOS;
  }, [isAOS, clock.mode]);

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