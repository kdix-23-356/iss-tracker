// src/utils/orbitalLogic.test.ts
import { expect, test, describe } from 'vitest';
import * as satellite from 'satellite.js';
import {
  calculateIssTelemetry,
  calculateOrbitPoints,
  wrapLon,
  shortestLonDelta,
  lerpLon,
} from './orbitalLogic';

/**
 * テスト方針
 * - 外部APIに依存せず、固定TLEと固定時刻を用いて“再現性のある”結果を検証する
 * - 値の絶対一致ではなく、合理的な範囲（レンジ・不変条件）を確認する
 * - 単位の取り扱い（ECF/ECI, rad/deg, km/m）に注意する
 */

// 固定TLE（ISS）と固定時刻（UTC）
//  *TLEは近傍時間での精度が高いが、テストでは“形・単位・レンジ”の検証を主目的とする*
const mockTleLine1 =
  '1 25544U 98067A   24074.55041435  .00015442  00000-0  27521-3 0  9993';
const mockTleLine2 =
  '2 25544  51.6416  15.0135 0004245  40.9168  60.7788 15.49503463443715';
const mockSatrec = satellite.twoline2satrec(mockTleLine1, mockTleLine2);

// 2026-03-15 12:00:00Z（固定）
const mockDate = new Date('2026-03-15T12:00:00Z');

describe('Orbital Logic（ビジネスロジック層）単体テスト', () => {
  describe('calculateIssTelemetry()', () => {
    test('正常なTLEと時刻で、速度・高度・緯度・経度・Cartesianが返る', () => {
      const result = calculateIssTelemetry(mockSatrec, mockDate);

      // 1) 結果存在
      expect(result).not.toBeNull();

      // 2) 代表的な数値が number
      expect(typeof result?.telemetry.speed).toBe('number');
      expect(typeof result?.telemetry.altitude).toBe('number');
      expect(typeof result?.telemetry.latitude).toBe('number');
      expect(typeof result?.telemetry.longitude).toBe('number');

      // 3) 高度レンジ（ざっくり）: LEO の典型として 300–500 km
      expect(result?.telemetry.altitude).toBeGreaterThan(300);
      expect(result?.telemetry.altitude).toBeLessThan(500);

      // 4) Cartesian3（m単位の配列）であること
      expect(result?.cartesian).toBeDefined();
      // Cartesian3 はオブジェクト。数値プロパティが存在することを軽く確認
      // （厳密な同一性は不要）
      expect(typeof result?.cartesian.x).toBe('number');
      expect(typeof result?.cartesian.y).toBe('number');
      expect(typeof result?.cartesian.z).toBe('number');
    });
  });

  describe('calculateOrbitPoints()', () => {
    test('±90分・2分刻みの基本点数（91点）を最低限満たす（跨ぎ補間で増える場合あり）', () => {
      // 基本点数: from -90 to +90 inclusive by 2min → (90 - (-90))/2 + 1 = 91
      const baseExpected = 91;

      const points = calculateOrbitPoints(mockSatrec, mockDate, 90, 2);

      // 日付変更線跨ぎで中間点を挿入するため、91“以上”であることを検証
      expect(points.length).toBeGreaterThanOrEqual(baseExpected);
    });
  });

  // --- 経度補助関数のテスト（wrap/差分/補間） ---
  describe('wrapLon()', () => {
    test('[-180, 180) に正規化される', () => {
      expect(wrapLon(0)).toBe(0);
      expect(wrapLon(180)).toBe(-180); // 180 は -180 扱い
      expect(wrapLon(190)).toBe(-170);
      expect(wrapLon(-181)).toBe(179);
      expect(wrapLon(540)).toBe(-180);
      expect(wrapLon(-540)).toBe(-180);
    });
  });

  describe('shortestLonDelta() / lerpLon()', () => {
    test('±180°跨ぎでも“最短回転”差分を返す', () => {
      // 179 → -179 は +2（東回り）
      expect(shortestLonDelta(179, -179)).toBe(2);
      // -179 → 179 は -2（西回り）
      expect(shortestLonDelta(-179, 179)).toBe(-2);
    });

    test('小さな差は符号を保ったまま', () => {
      expect(shortestLonDelta(10, 12)).toBe(2);
      expect(shortestLonDelta(12, 10)).toBe(-2);
    });

    test('境界外の角度でも [-180,180) に収まる', () => {
      expect(shortestLonDelta(0, 181)).toBe(-179);
      expect(shortestLonDelta(0, -181)).toBe(179);
    });

    test('lerpLon は最短回転の中間角を返す（中点は ±180 近傍）', () => {
      const mid = lerpLon(179, -179, 0.5);
      expect(Math.abs(Math.abs(mid) - 180)).toBeLessThan(1e-9);
    });

    test('日付変更線を跨がない単純補間', () => {
      expect(lerpLon(10, 20, 0.5)).toBe(15);
    });
  });
});