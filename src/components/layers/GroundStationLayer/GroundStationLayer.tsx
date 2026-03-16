/**
 * GroundStationLayer
 *
 * 目的:
 *  - 地上局の現在状態（AOS/LOS など）を 3D 上に描画する薄いレイヤ。
 *  - AOS 中の局から ISS までのリンク線も表示する。
 *
 * 単位:
 *  - STATIONS の緯度/経度は [deg]、高さは [m]（heightM）。
 *  - GroundStationStatus の rangeKm は [km]、elevationDeg は [deg]。
 *  - Cesium の Cartesian3 は [m] で扱う。
 *
 * 設計メモ:
 *  - 色やマテリアルは useMemo で固定化して再生成を避ける。
 *  - 局の位置（Cartesian3）は STATIONS から一度だけ作り Map で参照。
 *  - React.memo の簡易等価比較で props 参照が不変のときに再描画を抑制。
 *    （stationStatuses を毎回新インスタンスにする設計なら効果は限定的だが害はない）
 */

import React, { useMemo } from 'react';
import { Entity, PointGraphics, PolylineGraphics, LabelGraphics } from 'resium';
import { Cartesian2, Cartesian3, Color, VerticalOrigin } from 'cesium';
import { STATIONS } from '@/constants';
import type { GroundStationStatus } from '@/types';

type Props = {
  /** 局ID → 判定結果（現在値） */
  stationStatuses: Record<string, GroundStationStatus>;
  /** 現在の ISS 位置（Cartesian3, m）。null の場合はリンク線を描かない */
  issPos: Cartesian3 | null;
};

export const GroundStationLayer: React.FC<Props> = React.memo(
  function GroundStationLayer({ stationStatuses, issPos }) {
    // ---- マテリアル・色（固定） ----
    const aosPointColor = useMemo(() => Color.LIME.withAlpha(1.0), []);
    const outlineColor = useMemo(() => Color.BLACK, []);

    // 地上局ごとの色（固定）：AOS でなければこちらを使う
    const agencyColorMap = useMemo(
      () => ({
        JAXA: Color.ORANGE,                        // JAXA
        NASA: Color.fromCssColorString('#3b82f6'), // 青
        ESA:  Color.fromCssColorString('#22c55e'), // 緑
        default: Color.fromCssColorString('#64748b'),
      }),
      []
    );
    const getAgencyColor = (agency: string) =>
      (agencyColorMap as Record<string, Color>)[agency] ?? agencyColorMap.default;

    // ---- 局の Cartesian3（m）を一度だけ生成（STATIONS は定数想定）----
    const stationPosMap = useMemo(() => {
      const m = new Map<string, Cartesian3>();
      for (const st of STATIONS) {
        const altM = st.heightM ?? 0; // ground marker: 地表の高さそのまま
        m.set(st.id, Cartesian3.fromDegrees(st.lon, st.lat, altM));
      }
      return m;
    }, []);

    return (
      <>
        {/* 各地上局（マーカー + ラベル） */}
        {STATIONS.map((st) => {
          const s = stationStatuses[st.id];
          const pos = stationPosMap.get(st.id)!; // STATIONS と 1:1 のため存在前提

          // AOS時は黄緑、それ以外は agency ごとの色
          const pointColor = s?.isAOS ? aosPointColor : getAgencyColor(st.agency);

          // ラベル文言（AOS時は仰角を併記）
          const labelText = s?.isAOS
            ? `${st.name}  (${s.elevationDeg.toFixed(1)}°)`
            : st.name;

          return (
            <Entity key={st.id} position={pos} name={st.name}>
              <PointGraphics
                pixelSize={8}
                color={pointColor}
                outlineColor={outlineColor}
                outlineWidth={2}
              />
              <LabelGraphics
                text={labelText}
                font="12px monospace"
                verticalOrigin={VerticalOrigin.BOTTOM}
                pixelOffset={new Cartesian2(0, -10)}
                showBackground
                backgroundColor={Color.BLACK.withAlpha(0.35)}
                scale={0.9}
                // 深度テスト無効距離を∞に（地表に埋もれさせない）
                disableDepthTestDistance={Number.POSITIVE_INFINITY}
              />
            </Entity>
          );
        })}

        {/* AOS中の地上局 → ISS のリンク線（視覚補助） */}
        {issPos &&
          STATIONS.map((st) => {
            const s = stationStatuses[st.id];
            if (!s?.isAOS) return null;
            const pos = stationPosMap.get(st.id)!;
            return (
              <Entity key={`${st.id}-link`}>
                <PolylineGraphics
                  positions={[pos, issPos]}
                  width={2}
                  material={Color.LIME.withAlpha(0.6)}
                />
              </Entity>
            );
          })}
      </>
    );
  },
  // ---- 簡易等価比較：参照が不変なら再描画をスキップ ----
  (prev, next) =>
    prev.issPos === next.issPos &&
    prev.stationStatuses === next.stationStatuses
);