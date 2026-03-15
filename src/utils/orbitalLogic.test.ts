import { expect, test, describe } from 'vitest';
import * as satellite from 'satellite.js';
import { calculateIssTelemetry, checkAosStatus, calculateOrbitPoints } from './orbitalLogic';
import { TSUKUBA_STATION } from '../constants';

// テストが常に同じ結果になるよう、過去の固定されたTLE（軌道データ）と時刻をモック（ダミーデータ）として用意
const mockTleLine1 = '1 25544U 98067A   24074.55041435  .00015442  00000-0  27521-3 0  9993';
const mockTleLine2 = '2 25544  51.6416  15.0135 0004245  40.9168  60.7788 15.49503463443715';
const mockSatrec = satellite.twoline2satrec(mockTleLine1, mockTleLine2);
const mockDate = new Date('2026-03-15T12:00:00Z');

describe('Orbital Logic (ビジネスロジック層) の単体テスト', () => {

  describe('calculateIssTelemetry()', () => {
    test('正常なTLEと時刻を渡すと、速度・高度を含むテレメトリデータが返却される', () => {
      const result = calculateIssTelemetry(mockSatrec, mockDate);

      // 結果がnullでないことを確認
      expect(result).not.toBeNull();

      // 計算された値が数値型(number)として正しく生成されているか確認
      expect(typeof result?.telemetry.speed).toBe('number');
      expect(typeof result?.telemetry.altitude).toBe('number');

      // 高度が異常な値（マイナスや極端に大きい値）になっていないか、およその範囲をテスト
      expect(result?.telemetry.altitude).toBeGreaterThan(300); // 300km以上
      expect(result?.telemetry.altitude).toBeLessThan(500);  // 500km以下
    });
  });

  describe('checkAosStatus()', () => {
    test('衛星が地球の裏側にある場合、AOS(通信可能状態)は false となるべき', () => {
      const gmst = satellite.gstime(mockDate);

      // 筑波宇宙センターの「地球の真裏」の座標を計算
      const farGd = {
        latitude: -satellite.degreesToRadians(TSUKUBA_STATION.lat),
        longitude: satellite.degreesToRadians(TSUKUBA_STATION.lon) + Math.PI,
        height: 400
      };

      // その座標のECF（地球固定座標）をECI（慣性座標）ベクトルとみなしてテスト
      const farEci = satellite.geodeticToEcf(farGd); // 簡易的なモックとして代用

      const isAos = checkAosStatus(farEci, gmst);
      expect(isAos).toBe(false);
    });
  });

  describe('calculateOrbitPoints()', () => {
    test('前後90分を2分刻みで計算すると、配列の長さは 91個 になるべき', () => {
      const points = calculateOrbitPoints(mockSatrec, mockDate, 90, 2);
      expect(points.length).toBe(91);
    });
  });

});