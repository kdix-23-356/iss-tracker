// src/utils/orbitalLogic.ts
/**
 * 軌道・可視性（AOS/LOS）に関する計算ユーティリティ
 *
 * 設計方針
 *  - 入出力の「単位」を関数ごとに明記する（rad/deg, km/m 等）
 *  - 失敗ケース（propagate の null/boolean 返却）を早期に弾く
 *  - 純粋関数（副作用なし）を基本とし、呼び出し側で状態管理
 *  - 日付変更線跨ぎの描画切断を避けるための“中間点”挿入をユーティリティに内包
 */

import { Cartesian3 } from 'cesium';
import * as satellite from 'satellite.js';
import { TSUKUBA_STATION, AOS_ELEVATION_THRESHOLD_DEG } from '@/constants';
import type { GroundStation, GroundStationStatus } from '@/types';

/* =====================================================
 *  共通: 型・定義
 * ===================================================== */

/** `satellite.js` の ECI ベクトル（km 空間） */
export type EciVecKm = satellite.EciVec3<number>;

/** 地上局（度表記） */
export type GeodeticStationDeg = {
  /** 緯度 [deg], -90..+90 */
  lat: number;
  /** 経度 [deg], -180..+180（wrap あり） */
  lon: number;
  /** 高さ [km], 省略時 0 */
  heightKm?: number;
};

/* =====================================================
 *  1) 現在（任意時刻）のテレメトリ計算
 *     - 入: TLE 派生 satrec, 目標時刻
 *     - 出: 3D 座標（m）, テレメトリ（速度 km/s・高度 km・緯度/経度 deg）
 * ===================================================== */

/**
 * ISS テレメトリ計算（指定時刻）
 * @param satrec TLE から生成した `satellite.twoline2satrec(...)`
 * @param date 計算対象時刻（UTC/Local どちらでも可）
 * @returns 失敗時 null / 成功時 { cartesian[m], telemetry, pEci[km], gmst[rad] }
 */
export function calculateIssTelemetry(satrec: satellite.SatRec, date: Date) {
  const propResult = satellite.propagate(satrec, date);

  // propagate の失敗は null or boolean（ライブラリ仕様）
  if (
    !propResult ||
    typeof propResult.position === 'boolean' ||
    typeof propResult.velocity === 'boolean'
  ) {
    return null;
  }

  // 成功時のみ ECI を取り出す（単位: km）
  const { position: pEci, velocity: vEci } = propResult;

  // GMST（rad）→ 地理座標（rad, km）
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(pEci as EciVecKm, gmst);

  // 速度ベクトルの大きさ（km/s）
  const speedKmPerSec = Math.sqrt(vEci.x ** 2 + vEci.y ** 2 + vEci.z ** 2);

  return {
    // Cesium はメートル系
    cartesian: Cartesian3.fromRadians(gd.longitude, gd.latitude, gd.height * 1000),
    telemetry: {
      speed: speedKmPerSec,                       // km/s
      altitude: gd.height,                        // km
      latitude: satellite.degreesLat(gd.latitude),
      longitude: satellite.degreesLong(gd.longitude),
      timestamp: date,
    },
    pEci: pEci as EciVecKm,
    gmst, // rad
  };
}

/* =====================================================
 *  2) 視線方向/仰角の計算
 *     - 入: 地上局（deg）, 衛星位置（ECI km）, GMST（rad）
 *     - 出: 方位/仰角（deg）, 距離（km）
 * ===================================================== */

/**
 * 地上局から見た方位角/仰角/距離を度・kmで返す
 * @param station 地上局（lat/lon[deg], heightKm[km]）
 * @param pEci 衛星 ECI 位置ベクトル（km）
 * @param gmst グリニッジ恒星時（rad）
 */
export function computeLookAnglesDeg(
  station: GeodeticStationDeg,
  pEci: EciVecKm,
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

/* =====================================================
 *  3) 全地上局の AOS 判定（純粋関数）
 * ===================================================== */

/**
 * 任意の地上局配列に対して、仰角・距離・AOS を一括計算
 * @param stations GroundStation[]
 * @param pEci ECI（km）
 * @param gmst GMST（rad）
 * @param thresholdDeg AOS 判定の閾値（deg）— 既定は `AOS_ELEVATION_THRESHOLD_DEG`
 * @returns GroundStationStatus[]
 */
export function computeStationsStatus(
  stations: GroundStation[],
  pEci: EciVecKm,
  gmst: number,
  thresholdDeg: number = AOS_ELEVATION_THRESHOLD_DEG,
): GroundStationStatus[] {
  return stations.map((st) => {
    const { elevationDeg, rangeKm } = computeLookAnglesDeg(
      { lat: st.lat, lon: st.lon, heightKm: (st.heightM ?? 0) / 1000 },
      pEci,
      gmst
    );
    return {
      id: st.id,
      elevationDeg,
      rangeKm,
      isAOS: elevationDeg >= thresholdDeg,
    };
  });
}

/* =====================================================
 *  4) 筑波のみの AOS 判定（互換用途）
 * ===================================================== */

/**
 * 筑波（TSUKUBA_STATION）の AOS 判定
 * @param pEci ECI（km）
 * @param gmst GMST（rad）
 * @param thresholdDeg AOS 閾値（deg）
 */
export function checkAosStatus(
  pEci: EciVecKm,
  gmst: number,
  thresholdDeg: number = AOS_ELEVATION_THRESHOLD_DEG,
) {
  const { elevationDeg } = computeLookAnglesDeg(
    { lat: TSUKUBA_STATION.lat, lon: TSUKUBA_STATION.lon, heightKm: TSUKUBA_STATION.height },
    pEci,
    gmst,
  );
  return elevationDeg >= thresholdDeg;
}

/* =====================================================
 *  5) 軌道の可視化点列生成（±duration を step 分解）
 *     - 日付変更線跨ぎを検出し、ライン途切れ防止の中間点を挿入
 *     - Cesium 用に Cartesian3（m）配列で返す
 * ===================================================== */

/**
 * 軌道（過去/未来）の可視化用点列を生成
 * @param satrec TLE 由来の satrec
 * @param startTime 中心時刻
 * @param durationMin 何分前後を描画するか（例: 90）
 * @param stepMin 何分刻みか（例: 2）
 * @returns Cartesian3[]（単調に時刻が増加/減少する順で並ぶ）
 */
export function calculateOrbitPoints(
  satrec: satellite.SatRec,
  startTime: Date,
  durationMin: number,
  stepMin: number
) {
  const points: Cartesian3[] = [];

  // 直前の地理座標（度・km）を保持し、±180°跨ぎを検出
  let prevLonDeg: number | null = null;
  let prevLatDeg: number | null = null;
  let prevAltKm: number | null = null;

  const startMs = startTime.getTime();

  // i: -duration..+duration を stepMin ごとに走査（端を含む）
  for (let i = -durationMin; i <= durationMin; i += stepMin) {
    const time = new Date(startMs + i * 60_000);
    const propResult = satellite.propagate(satrec, time);

    if (!propResult || typeof propResult.position === 'boolean') {
      // propagate 失敗時は点を打たない（スパースでも描画は維持される）
      continue;
    }

    const { position: pEci } = propResult;
    const gmst = satellite.gstime(time);
    const gd = satellite.eciToGeodetic(pEci as EciVecKm, gmst);

    // 現在の地理座標（度・km）
    const lonDeg = satellite.degreesLong(gd.longitude);  // [-180, 180)
    const latDeg = satellite.degreesLat(gd.latitude);    // [-90, 90]
    const altKm  = gd.height;                            // km

    // 直前点があれば、±180°跨ぎを検出して中間点を挿入
    if (prevLonDeg !== null && prevLatDeg !== null && prevAltKm !== null) {
      // “最短回転”の差分角（-180..+180）
      const delta = shortestLonDelta(prevLonDeg, lonDeg);

      // |差分| が 180° 近辺（= 跨ぎ）なら t=0.5 の中間点を一つ挟む
      if (Math.abs(delta) > 180 - 1e-9) {
        const midLonDeg = lerpLon(prevLonDeg, lonDeg, 0.5);                 // 度
        const midLatDeg = lerpLat(prevLatDeg, latDeg, 0.5);                 // 度
        const midAltM   = lerpAltM(prevAltKm * 1000, altKm * 1000, 0.5);    // m

        points.push(
          Cartesian3.fromRadians(
            satellite.radiansLong(satellite.degreesToRadians(midLonDeg)),
            satellite.degreesToRadians(midLatDeg),
            midAltM
          )
        );
      }
    }

    // 現在の点を push（m に換算）
    points.push(
      Cartesian3.fromRadians(
        gd.longitude,      // rad
        gd.latitude,       // rad
        altKm * 1000       // m
      )
    );

    // 前回値を更新（度・km）
    prevLonDeg = lonDeg;
    prevLatDeg = latDeg;
    prevAltKm  = altKm;
  }

  return points;
}

/* =====================================================
 *  6) 経度の補助関数（wrap/差分/補間）
 * ===================================================== */

/** 経度を [-180, +180) に正規化 */
export function wrapLon(lon: number): number {
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

/** 経度差（“最短回転”の差分角）を -180..+180 の範囲で返す */
export function shortestLonDelta(from: number, to: number): number {
  const a = wrapLon(from);
  const b = wrapLon(to);
  let d = b - a;
  if (d > 180)  d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** 経度の補間（最短回転で補間した結果を [-180, +180) に wrap） */
export function lerpLon(from: number, to: number, t: number): number {
  const d = shortestLonDelta(from, to);
  return wrapLon(from + d * t);
}

/** 緯度の補間（線形） */
export function lerpLat(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 高さ[m]の補間（線形） */
export function lerpAltM(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}