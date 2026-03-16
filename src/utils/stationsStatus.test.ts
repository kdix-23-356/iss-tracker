// src/utils/stationsStatus.test.ts
import { describe, test, expect } from 'vitest';
import * as satellite from 'satellite.js';
import {
  computeStationsStatus,
  computeLookAnglesDeg,
  checkAosStatus,
  wrapLon,
} from './orbitalLogic';
import { TSUKUBA_STATION } from '@/constants';
import type { GroundStation } from '@/types';

/**
 * ステーション AOS/LOS 判定の一貫性検証
 * - 直上近傍なら Elevation は大きく AOS=true
 * - 反対側なら Elevation は負で AOS=false
 * - 閾値の“ほんの少しの上下”で切り替わる
 */

const date = new Date('2026-03-15T12:00:00Z');
const gmst = satellite.gstime(date);

describe('ステーション判定（AOS/LOS）', () => {
  test('checkAosStatus: 直上は true / 反対側は false', () => {
    // 直上：筑波と同じ緯度経度・高度400km を ECI に
    const overGd = {
      latitude: satellite.degreesToRadians(TSUKUBA_STATION.lat),
      longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon),
      height: 400,
    };
    const overEci = satellite.ecfToEci(satellite.geodeticToEcf(overGd), gmst);
    expect(checkAosStatus(overEci, gmst)).toBe(true);

    // 反対側：緯度反転・経度+180°
    const antiGd = {
      latitude: -satellite.degreesToRadians(TSUKUBA_STATION.lat),
      longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon) + Math.PI,
      height: 400,
    };
    const antiEci = satellite.ecfToEci(satellite.geodeticToEcf(antiGd), gmst);
    expect(checkAosStatus(antiEci, gmst)).toBe(false);
  });

  test('computeStationsStatus: ID/件数の保存と AOS 切り替え（閾値の微調整）', () => {
    // 2局：筑波 と その反対点
    const stations = [
      { id: 'tsukuba', name: 'Tsukuba', agency: 'JAXA', lat: TSUKUBA_STATION.lat, lon: TSUKUBA_STATION.lon },
      { id: 'anti', name: 'Antipode', agency: 'Other', lat: -TSUKUBA_STATION.lat, lon: wrapLon(TSUKUBA_STATION.lon + 180) },
    ] as unknown as GroundStation[];

    // 筑波直上の ECI
    const overGd = {
      latitude: satellite.degreesToRadians(TSUKUBA_STATION.lat),
      longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon),
      height: 400,
    };
    const overEci = satellite.ecfToEci(satellite.geodeticToEcf(overGd), gmst);

    // Elevation の実測（threshold の基準にする）
    const look = computeLookAnglesDeg({ lat: TSUKUBA_STATION.lat, lon: TSUKUBA_STATION.lon }, overEci, gmst);
    const el = look.elevationDeg;

    const lowTh = el - 0.1;  // これ以下なら AOS
    const hiTh  = el + 0.1;  // これ以上なら LOS

    const resLow = computeStationsStatus(stations, overEci, gmst, lowTh);
    const resHi  = computeStationsStatus(stations, overEci, gmst, hiTh);

    // ID/件数の保存
    expect(resLow.map(s => s.id)).toEqual(stations.map(s => s.id));
    expect(resLow).toHaveLength(stations.length);
    expect(resHi).toHaveLength(stations.length);

    // tsukuba は threshold によって切り替わるが、anti は常に false（直上の反対側）
    const mapLow = new Map(resLow.map(s => [s.id, s]));
    const mapHi  = new Map(resHi.map(s  => [s.id, s]));
    expect(mapLow.get('tsukuba')?.isAOS).toBe(true);
    expect(mapHi.get('tsukuba')?.isAOS).toBe(false);
    expect(mapLow.get('anti')?.isAOS).toBe(false);
    expect(mapHi.get('anti')?.isAOS).toBe(false);
  });
});