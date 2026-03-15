// src/utils/orbitalLogic.ts
import { Cartesian3 } from 'cesium';
import * as satellite from 'satellite.js';
import { TSUKUBA_STATION } from '../constants'; // さっき作った定数を読み込む

// ISSの現在の数値を計算
export const calculateIssTelemetry = (satrec: satellite.Satrec, date: Date) => {
  const { position: pEci, velocity: vEci } = satellite.propagate(satrec, date);
  if (typeof pEci === 'boolean' || typeof vEci === 'boolean') return null;

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pEci, gmst);

  return {
    cartesian: Cartesian3.fromRadians(gd.longitude, gd.latitude, gd.height * 1000),
    telemetry: {
      speed: Math.sqrt(vEci.x ** 2 + vEci.y ** 2 + vEci.z ** 2),
      altitude: gd.height,
      latitude: satellite.degreesLat(gd.latitude),
      longitude: satellite.degreesLong(gd.longitude),
      timestamp: date
    },
    pEci, gmst
  };
};

// AOS（通信圏内）判定
export const checkAosStatus = (pEci: satellite.EciVec3<number>, gmst: number) => {
  const stationGd = {
    latitude: satellite.degreesToRadians(TSUKUBA_STATION.lat),
    longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon),
    height: TSUKUBA_STATION.height
  };
  const lookAngles = satellite.ecfToLookAngles(satellite.geodeticToEcf(stationGd), satellite.eciToEcf(pEci, gmst));
  return satellite.radiansToDegrees(lookAngles.elevation) >= 10;
};

// 軌道の配列計算
export const calculateOrbitPoints = (satrec: satellite.Satrec, startTime: Date, durationMin: number, stepMin: number) => {
  const points: Cartesian3[] = [];
  for (let i = -durationMin; i <= durationMin; i += stepMin) {
    const time = new Date(startTime.getTime() + i * 60 * 1000);
    const { position: pEci } = satellite.propagate(satrec, time);
    if (typeof pEci !== 'boolean') {
      const gmst = satellite.gstime(time);
      const gd = satellite.eciToGeodetic(pEci, gmst);
      points.push(Cartesian3.fromRadians(gd.longitude, gd.latitude, gd.height * 1000));
    }
  }
  return points;
};