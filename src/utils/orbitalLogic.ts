import { Cartesian3 } from 'cesium';
import * as satellite from 'satellite.js';
import { TSUKUBA_STATION } from '../constants';

export const calculateIssTelemetry = (satrec: satellite.SatRec, date: Date) => {
  // 計算結果を受け取る
  const propResult = satellite.propagate(satrec, date);

  // 結果が null または boolean (計算失敗) の場合は弾く
  if (!propResult || typeof propResult.position === 'boolean' || typeof propResult.velocity === 'boolean') {
    return null;
  }

  // 安全が保証された状態でのみ値を取り出す
  const { position: pEci, velocity: vEci } = propResult;

  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pEci as satellite.EciVec3<number>, gmst);

  return {
    cartesian: Cartesian3.fromRadians(gd.longitude, gd.latitude, gd.height * 1000),
    telemetry: {
      speed: Math.sqrt(vEci.x ** 2 + vEci.y ** 2 + vEci.z ** 2),
      altitude: gd.height,
      latitude: satellite.degreesLat(gd.latitude),
      longitude: satellite.degreesLong(gd.longitude),
      timestamp: date
    },
    pEci: pEci as satellite.EciVec3<number>,
    gmst
  };
};

export const checkAosStatus = (pEci: satellite.EciVec3<number>, gmst: number) => {
  const stationGd = {
    latitude: satellite.degreesToRadians(TSUKUBA_STATION.lat),
    longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon),
    height: TSUKUBA_STATION.height
  };
  // 第1引数には変換前の stationGd (GeodeticLocation) をそのまま渡す
  const lookAngles = satellite.ecfToLookAngles(stationGd, satellite.eciToEcf(pEci, gmst));
  return satellite.radiansToDegrees(lookAngles.elevation) >= 10;
};

export const calculateOrbitPoints = (satrec: satellite.SatRec, startTime: Date, durationMin: number, stepMin: number) => {
  const points: Cartesian3[] = [];
  for (let i = -durationMin; i <= durationMin; i += stepMin) {
    const time = new Date(startTime.getTime() + i * 60 * 1000);
    const propResult = satellite.propagate(satrec, time);

    // null チェック
    if (propResult && typeof propResult.position !== 'boolean') {
      const { position: pEci } = propResult;
      const gmst = satellite.gstime(time);
      const gd = satellite.eciToGeodetic(pEci as satellite.EciVec3<number>, gmst);
      points.push(Cartesian3.fromRadians(gd.longitude, gd.latitude, gd.height * 1000));
    }
  }
  return points;
};