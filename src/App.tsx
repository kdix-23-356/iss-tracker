import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, EllipseGraphics } from 'resium';
import { Cartesian3, Color } from 'cesium';
import * as satellite from 'satellite.js';

import type { IssState } from './types';
import { calculateIssTelemetry, checkAosStatus, calculateOrbitPoints } from './utils/orbitalLogic';
import { Dashboard } from './components/Dashboard';
import { ConfigPanel } from './components/ConfigPanel';
import { GroundStationLayer } from './components/GroundStationLayer';
import { EventLogPanel, type LogEvent } from './components/EventLogPanel';

// TLEの型
type Tle = { line1: string; line2: string };

const App: React.FC = () => {
  const [tle, setTle] = useState<Tle | null>(null);
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[]; future: Cartesian3[] }>({ past: [], future: [] });
  const [isAOS, setIsAOS] = useState(false);

  const [settings, setSettings] = useState({ orbit: true, station: true, footprint: true, log: true });
  const [logs, setLogs] = useState<LogEvent[]>([
    { id: Date.now(), time: new Date(), message: 'System Initialized', type: 'info' }
  ]);

  const prevAosRef = useRef<boolean | null>(null);

  const orbitPastMat = useMemo(() => Color.CYAN.withAlpha(0.3), []);
  const orbitFutureMat = useMemo(() => Color.YELLOW.withAlpha(0.4), []);
  const footprintFill = useMemo(() => Color.YELLOW.withAlpha(0.15), []);
  const footprintOutline = useMemo(() => Color.YELLOW.withAlpha(0.8), []);

  // TLE取得（Abort対応）
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544/tles', { signal: controller.signal });
        if (!res.ok) throw new Error(`TLE ${res.status}`);
        const json = await res.json();
        // APIは { line1, line2 } を返す前提
        setTle({ line1: json.line1, line2: json.line2 });
      } catch (e) {
        // 必要ならログへ
        const warnLog = {
        id: Date.now(),
        time: new Date(),
        message: `TLE fetch failed: ${(e as Error).message}`,
        type: 'warning',
        } satisfies LogEvent;

setLogs(prev => [warnLog, ...prev].slice(0, 5));

      }
    })();
    return () => controller.abort();
  }, []);

  // AOSの状態が変わった時だけログを追加
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

  // タイマーをrefで一元管理し、StrictModeの二重実行でも重複を確実に解除
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
        setIsAOS(checkAosStatus(result.pEci, result.gmst));
      }
    };

    const updateOrbit = () => {
      const now = new Date();
      // 例：90分の軌道、2分刻み
      const points = calculateOrbitPoints(satrec, now, 90, 2);
      // ★変更：分割位置を動的に
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

    // cleanup
    return () => {
      timersRef.current.forEach(clearInterval);
      timersRef.current = [];
    };
  }, [satrec]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* UIレイヤー */}
      {issState && <Dashboard state={issState} />}
      <ConfigPanel settings={settings} setSettings={setSettings} />
      {settings.log && <EventLogPanel logs={logs} />}

      {/* 3Dキャンバスレイヤー */}
      <Viewer
        full
        timeline={false}
        animation={false}
        selectionIndicator={false}
        infoBox={false}
        // 変化時のみ再描画
        requestRenderMode
      >
        {settings.station && <GroundStationLayer isAOS={isAOS} issPos={position} />}

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

            {/* フットプリント */}
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