import { useState, useEffect, useRef, useCallback } from 'react';
import { Cartesian3 } from 'cesium';
import * as satellite from 'satellite.js';
import type { Viewer as CesiumViewer } from 'cesium';
import type { CesiumComponentRef } from 'resium';

import type {
  IssState,
  GroundStationStatus,
  StationEventLogMap,
  SimClock,
  LogEvent,
} from '@/types';

import { calculateIssTelemetry, calculateOrbitPoints, computeStationsStatus, diffStationAos } from '@/utils';
import {
  AOS_ELEVATION_THRESHOLD_DEG,
  STATIONS,
  STATION_EVENT_LOG_MAX,
  TIME_TRAVEL_DEFAULT_RATE,
  TIME_TRAVEL_DEFAULT_WINDOW_MIN,
} from '@/constants';

const TICK_MS = 1000;
const ORBIT_UPDATE_INTERVAL_MS = 60_000;

export function useIssSimulation(
  satrec: satellite.SatRec | null,
  addSystemLog: (entry: Omit<LogEvent, 'id' | 'time'>) => void,
  viewerRef: React.RefObject<CesiumComponentRef<CesiumViewer> | null>
) {
  const [position, setPosition] = useState<Cartesian3 | null>(null);
  const [issState, setIssState] = useState<IssState | null>(null);
  const [orbit, setOrbit] = useState<{ past: Cartesian3[]; future: Cartesian3[] }>({ past: [], future: [] });
  const [stationStatuses, setStationStatuses] = useState<Record<string, GroundStationStatus>>({});
  const [stationEventLogs, setStationEventLogs] = useState<StationEventLogMap>({});

  const [clock, setClock] = useState<SimClock>({
    mode: 'realtime',
    selectedMs: Date.now(),
    playing: false,
    rate: TIME_TRAVEL_DEFAULT_RATE,
    windowMin: TIME_TRAVEL_DEFAULT_WINDOW_MIN,
  });

  const prevStationIsAOSRef = useRef<Record<string, boolean>>({});
  const prevAosRef = useRef<boolean | null>(null);
  const lastOrbitUpdateMsRef = useRef(0);
  const realTimersRef = useRef<number[]>([]);
  const playTimerRef = useRef<number | null>(null);

  // 派生状態（筑波のAOS状態）
  const isAOS = stationStatuses['tsukuba']?.isAOS ?? false;

  const renderAt = useCallback((target: Date, options?: { recordEvents?: boolean }) => {
    if (!satrec) return;

    const result = calculateIssTelemetry(satrec, target);
    if (!result) return;

    setPosition(result.cartesian);
    setIssState(result.telemetry);

    const list = computeStationsStatus(STATIONS, result.pEci, result.gmst, AOS_ELEVATION_THRESHOLD_DEG);
    setStationStatuses(Object.fromEntries(list.map(s => [s.id, s])));

    const shouldRecord = options?.recordEvents ?? (clock.mode === 'realtime');
    if (shouldRecord) {
      const nowMs = target.getTime();
      const [eventsToAppend, nextMap] = diffStationAos(prevStationIsAOSRef.current, list, nowMs);
      prevStationIsAOSRef.current = nextMap;

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
    } else {
      prevStationIsAOSRef.current = Object.fromEntries(list.map(s => [s.id, s.isAOS]));
    }

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

    viewerRef.current?.cesiumElement?.scene.requestRender();
  }, [satrec, clock.mode, viewerRef]);

  // Realtime Timer
  useEffect(() => {
    if (!satrec || clock.mode !== 'realtime') {
      realTimersRef.current.forEach(clearInterval);
      realTimersRef.current = [];
      return;
    }

    renderAt(new Date(), { recordEvents: true });
    const id = window.setInterval(() => renderAt(new Date(), { recordEvents: true }), TICK_MS);
    realTimersRef.current = [id];
    
    return () => clearInterval(id);
  }, [satrec, clock.mode, renderAt]);

  // Time-travel Timer
  useEffect(() => {
    if (!satrec) return;
    if (clock.mode === 'time-travel') renderAt(new Date(clock.selectedMs), { recordEvents: false });

    if (playTimerRef.current) clearInterval(playTimerRef.current);

    if (clock.mode === 'time-travel' && clock.playing) {
      playTimerRef.current = window.setInterval(() => {
        setClock(c => {
          const nextMs = c.selectedMs + c.rate * 1000;
          const nowMs = Date.now();
          const clamped = Math.max(nowMs - c.windowMin * 60_000, Math.min(nowMs + c.windowMin * 60_000, nextMs));
          return { ...c, selectedMs: clamped, playing: clamped !== nextMs ? false : c.playing };
        });
      }, 1000);
    }
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
  }, [satrec, clock.mode, clock.selectedMs, clock.playing, clock.rate, clock.windowMin, renderAt]);

  // System Log (JAXA Tsukuba AOS/LOS)
  useEffect(() => {
    if (clock.mode === 'realtime' && prevAosRef.current !== null && prevAosRef.current !== isAOS) {
      addSystemLog({ message: isAOS ? 'AOS: JAXA Tsukuba (Comm Link Established)' : 'LOS: JAXA Tsukuba (Comm Link Lost)', type: isAOS ? 'success' : 'warning' });
    }
    prevAosRef.current = isAOS;
  }, [isAOS, clock.mode, addSystemLog]);

  return { position, issState, orbit, isAOS, stationStatuses, stationEventLogs, clock, setClock };
}