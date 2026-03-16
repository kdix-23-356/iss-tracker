// src/components/GroundStationLayer.tsx
import React from 'react';
import { Entity, PointGraphics, PolylineGraphics, LabelGraphics } from 'resium';
import { Cartesian2, Cartesian3, Color, VerticalOrigin } from 'cesium';
import { STATIONS } from '../constants';
import type { GroundStationStatus } from '../types';

export const GroundStationLayer: React.FC<{
  stationStatuses: Record<string, GroundStationStatus>;
  issPos: Cartesian3 | null;
}> = ({ stationStatuses, issPos }) => {

  const agencyColor = (agency: string) => {
    switch (agency) {
      case 'JAXA': return Color.ORANGE;
      case 'NASA': return Color.fromCssColorString('#3b82f6');
      case 'ESA':  return Color.fromCssColorString('#22c55e');
      default:     return Color.fromCssColorString('#64748b');
    }
  };

  return (
    <>
      {/* 各地上局 */}
      {STATIONS.map((st) => {
        const pos = Cartesian3.fromDegrees(st.lon, st.lat, st.heightM ?? 0);
        const s = stationStatuses[st.id];
        const pointColor = s?.isAOS ? Color.LIME : agencyColor(st.agency);

        return (
          <Entity key={st.id} position={pos}>
            <PointGraphics pixelSize={8} color={pointColor} outlineColor={Color.BLACK} outlineWidth={2} />
            <LabelGraphics
              text={s?.isAOS ? `${st.name}  (${s.elevationDeg.toFixed(1)}°)` : `${st.name}`}
              font="12px monospace"
              verticalOrigin={VerticalOrigin.BOTTOM}
              pixelOffset={new Cartesian2(0, -10)}
              showBackground
              backgroundColor={Color.BLACK.withAlpha(0.35)}
              scale={0.9}
              disableDepthTestDistance={Number.POSITIVE_INFINITY}
            />
          </Entity>
        );
      })}

      {/* AOS 中の地上局 → ISS までラインを表示 */}
      {issPos && STATIONS.map((st) => {
        const s = stationStatuses[st.id];
        if (!s?.isAOS) return null;
        const pos = Cartesian3.fromDegrees(st.lon, st.lat, st.heightM ?? 0);
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
};
``