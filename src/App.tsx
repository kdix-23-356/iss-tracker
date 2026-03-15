import React, { useEffect, useState, useRef } from 'react';
import { Viewer, Entity, PointGraphics, PolylineGraphics, EllipseGraphics } from 'resium';
import { Cartesian3, Color } from 'cesium';
import * as satellite from 'satellite.js';

import type { IssState } from './types';
import { calculateIssTelemetry, checkAosStatus, calculateOrbitPoints } from './utils/orbitalLogic';
import { Dashboard } from './components/Dashboard';
import { ConfigPanel } from './components/ConfigPanel';
import { GroundStationLayer } from './components/GroundStationLayer';
import { EventLogPanel, type LogEvent } from './components/EventLogPanel';

const App: React.FC = () => {
  const [tle, setTle] = useState<any>(null);
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[], future: Cartesian3[] }>({ past: [], future: [] });
  const [isAOS, setIsAOS] = useState(false);

  // 新機能用のState
  const [settings, setSettings] = useState({ orbit: true, station: true, footprint: true, log: true });
  const [logs, setLogs] = useState<LogEvent[]>([
    { id: Date.now(), time: new Date(), message: 'System Initialized', type: 'info' }
  ]);

  // 状態変化（エッジ検知）のためのRef
  const prevAosRef = useRef<boolean | null>(null);

  useEffect(() => {
    fetch('https://api.wheretheiss.at/v1/satellites/25544/tles')
      .then(res => res.json()).then(setTle);
  }, []);

  // AOSの状態が変わった時だけログを追加する副作用
  useEffect(() => {
    if (prevAosRef.current !== null && prevAosRef.current !== isAOS) {
      const newLog: LogEvent = {
        id: Date.now(),
        time: new Date(),
        message: isAOS ? 'AOS: JAXA Tsukuba (Comm Link Established)' : 'LOS: JAXA Tsukuba (Comm Link Lost)',
        type: isAOS ? 'success' : 'warning'
      };
      // 最新の5件だけを保持する
      setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 5));
    }
    prevAosRef.current = isAOS;
  }, [isAOS]);

  useEffect(() => {
    if (!tle) return;
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

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
      const points = calculateOrbitPoints(satrec, now, 90, 2);
      setOrbit({ past: points.slice(0, 46), future: points.slice(45) });
    };

    tick();
    updateOrbit();
    const timers = [setInterval(tick, 1000), setInterval(updateOrbit, 60000)];
    return () => timers.forEach(clearInterval);
  }, [tle]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* UIレイヤー */}
      {issState && <Dashboard state={issState} />}
      <ConfigPanel settings={settings} setSettings={setSettings} />
      {settings.log && <EventLogPanel logs={logs} />}

      {/* 3Dキャンバスレイヤー */}
      <Viewer full timeline={false} animation={false} selectionIndicator={false} infoBox={false}>
        {settings.station && <GroundStationLayer isAOS={isAOS} issPos={position} />}

        {settings.orbit && (
          <>
            <Entity><PolylineGraphics positions={orbit.past} width={2} material={Color.CYAN.withAlpha(0.3)} /></Entity>
            <Entity><PolylineGraphics positions={orbit.future} width={2} material={Color.YELLOW.withAlpha(0.4)} /></Entity>
          </>
        )}

        {position && (
            <Entity position={position} name="ISS">
            <PointGraphics pixelSize={12} color={isAOS ? Color.LIME : Color.YELLOW} outlineColor={Color.BLACK} outlineWidth={2} />

            {/* フットプリントの描画 */}
            {settings.footprint && (
              <EllipseGraphics
                semiMajorAxis={2200000} // 約2200km
                semiMinorAxis={2200000}
                height={0}
                material={Color.YELLOW.withAlpha(0.15)}
                outline={true}
                outlineColor={Color.YELLOW.withAlpha(0.8)}
              />
            )}
          </Entity>
        )}
      </Viewer>
    </div>
  );
};

export default App;