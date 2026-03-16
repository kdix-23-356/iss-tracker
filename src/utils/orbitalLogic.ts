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

export const checkAosStatus = (
  pEci: satellite.EciVec3<number>,
  gmst: number,
  thresholdDeg: number = AOS_ELEVATION_THRESHOLD_DEG,
) => {
  const { elevationDeg } = computeLookAnglesDeg(
    { lat: TSUKUBA_STATION.lat, lon: TSUKUBA_STATION.lon, heightKm: TSUKUBA_STATION.height },
    pEci,
    gmst,
  );
  return elevationDeg >= thresholdDeg;
};


// 地上局（度表記）から見た方位角・仰角・距離を計算（度/ km）
export type GeodeticStationDeg = {
  lat: number;
  lon: number;
  heightKm?: number;
};

export function computeLookAnglesDeg(
  station: GeodeticStationDeg,
  pEci: satellite.EciVec3<number>,
  gmst: number,
) {
  const stationGd = {
    latitude: satellite.degreesToRadians(station.lat),
    longitude: satellite.degreesToRadians(station.lon),
    height: station.heightKm ?? 0,
  };
  const ecf = satellite.eciToEcf(pEci, gmst);
  const angles = satellite.ecfToLookAngles(stationGd, ecf);
  return {
    azimuthDeg: satellite.radiansToDegrees(angles.azimuth),
    elevationDeg: satellite.radiansToDegrees(angles.elevation),
    rangeKm: angles.rangeSat, // km
  };
}


export const calculateOrbitPoints = (
  satrec: satellite.SatRec,
  startTime: Date,
  durationMin: number,
  stepMin: number
) => {
  const points: Cartesian3[] = [];

  // 直前の地理座標（度・km）を保持して、日付変更線跨ぎを検出
  let prevLonDeg: number | null = null;
  let prevLatDeg: number | null = null;
  let prevAltKm: number | null = null;

  for (let i = -durationMin; i <= durationMin; i += stepMin) {
    const time = new Date(startTime.getTime() + i * 60 * 1000);
    const propResult = satellite.propagate(satrec, time);

    if (propResult && typeof propResult.position !== 'boolean') {
      const { position: pEci } = propResult;
      const gmst = satellite.gstime(time);
      const gd = satellite.eciToGeodetic(pEci as satellite.EciVec3<number>, gmst);

      // 現在の地理座標（度・km）を取得
      const lonDeg = satellite.degreesLong(gd.longitude);  // [-180, 180)
      const latDeg = satellite.degreesLat(gd.latitude);    // [-90, 90]
      const altKm  = gd.height;                            // km

      // 直前の点があれば、±180°跨ぎを検出して中間点を挿入
      if (prevLonDeg !== null && prevLatDeg !== null && prevAltKm !== null) {
        // “最短回転”の差分角（-180..+180）
        const delta = shortestLonDelta(prevLonDeg, lonDeg);

        // |差分| が 180° 近辺（= 跨ぎ）なら、t=0.5 の中間点を一つ挟む
        if (Math.abs(delta) > 180 - 1e-9) {
          const midLon = lerpLon(prevLonDeg, lonDeg, 0.5);           // 最短回転の中間経度（度）
          const midLat = lerpLat(prevLatDeg,   latDeg,   0.5);       // 線形補間（度）
          const midAlt = lerpAltM(prevAltKm*1000, altKm*1000, 0.5);  // m に揃えて補間 → m

          points.push(
            Cartesian3.fromRadians(
              satellite.radiansLong(satellite.degreesToRadians(midLon)),
              satellite.degreesToRadians(midLat),
              midAlt
            )
          );
        }
      }

      // 現在の点を push（m に換算）
      points.push(
        Cartesian3.fromRadians(
          gd.longitude,         // ラジアン
          gd.latitude,          // ラジアン
          altKm * 1000          // m
        )
      );

      // 前回値を更新（度・km）
      prevLonDeg = lonDeg;
      prevLatDeg = latDeg;
      prevAltKm  = altKm;
    }
  }

  return points;
};

export function wrapLon(lon: number): number {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

export function shortestLonDelta(from: number, to: number): number {
  const a = wrapLon(from);
  const b = wrapLon(to);
  let d = b - a;
  if (d > 180)  d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function lerpLon(from: number, to: number, t: number): number {
  const d = shortestLonDelta(from, to);
  return wrapLon(from + d * t);
}

export function lerpLat(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function lerpAltM(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}