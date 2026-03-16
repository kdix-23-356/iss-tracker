// src/utils/orbitalAngles.property.test.ts
import { describe, test, expect } from 'vitest';
import { wrapLon, shortestLonDelta, lerpLon, lerpLat, lerpAltM } from './orbitalLogic';

/**
 * 角度ユーティリティの“性質”を検証するテスト
 * - wrapLon: 正規化範囲 [-180, 180)
 * - shortestLonDelta: 反対称性 d(a,b) = -d(b,a) ・連結性 wrapLon(a + d(a,b)) == wrapLon(b)
 * - lerpLon: 端点一致・最短回転・連続性
 * - lerpLat/lerpAltM: 単純線形補間の端点一致
 */

// 再現性のある簡易 LCG（線形合同法）
function* lcg(seed = 123456789) {
  let x = seed >>> 0;
  while (true) {
    x = (1664525 * x + 1013904223) >>> 0;
    yield x / 0xffffffff;
  }
}

describe('wrapLon()', () => {
  test('[-180, 180) に正規化される', () => {
    const cases = [0, 180, 181, 190, -181, 540, -540, 1080, -1080];
    for (const v of cases) {
      const w = wrapLon(v);
      expect(w).toBeGreaterThanOrEqual(-180);
      expect(w).toBeLessThan(180);
    }
  });
});

describe('shortestLonDelta()', () => {
  test('反対称性 d(a,b) = -d(b,a)', () => {
    const rnd = lcg();
    for (let i = 0; i < 200; i++) {
      const a = (rnd.next().value! * 720) - 360; // -360..360
      const b = (rnd.next().value! * 720) - 360;
      const dab = shortestLonDelta(a, b);
      const dba = shortestLonDelta(b, a);
      expect(dab).toBeCloseTo(-dba, 12);
    }
  });

  test('連結性 wrapLon(a + d(a,b)) == wrapLon(b)', () => {
    const rnd = lcg(42);
    for (let i = 0; i < 200; i++) {
      const a = (rnd.next().value! * 720) - 360;
      const b = (rnd.next().value! * 720) - 360;
      const d = shortestLonDelta(a, b);
      expect(wrapLon(a + d)).toBeCloseTo(wrapLon(b), 12);
    }
  });
});

describe('lerpLon()', () => {
  test('端点一致（t=0,1）', () => {
    const rnd = lcg(7);
    for (let i = 0; i < 100; i++) {
      const a = (rnd.next().value! * 720) - 360;
      const b = (rnd.next().value! * 720) - 360;
      expect(lerpLon(a, b, 0)).toBeCloseTo(wrapLon(a), 12);
      expect(lerpLon(a, b, 1)).toBeCloseTo(wrapLon(b), 12);
    }
  });

  test('中点は from→to の最短回転の中間角（特に 179→-179 で ±180 近傍）', () => {
    const mid = lerpLon(179, -179, 0.5);
    expect(Math.abs(Math.abs(mid) - 180)).toBeLessThan(1e-9);
  });
});

describe('lerpLat()/lerpAltM()', () => {
  test('線形補間の端点一致', () => {
    expect(lerpLat(10, 20, 0)).toBe(10);
    expect(lerpLat(10, 20, 1)).toBe(20);
    expect(lerpAltM(1000, 2000, 0)).toBe(1000);
    expect(lerpAltM(1000, 2000, 1)).toBe(2000);
  });

  test('線形補間の中点', () => {
    expect(lerpLat(10, 20, 0.5)).toBeCloseTo(15, 12);
    expect(lerpAltM(1000, 2000, 0.5)).toBeCloseTo(1500, 12);
  });
});