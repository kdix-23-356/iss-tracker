import React from 'react';
import { Entity, PointGraphics, PolylineGraphics, LabelGraphics } from 'resium';
import { Cartesian3, Color, VerticalOrigin } from 'cesium';
import { TSUKUBA_STATION } from '../constants';

export const GroundStationLayer: React.FC<{ isAOS: boolean; issPos: Cartesian3 | null }> = ({ isAOS, issPos }) => {
  const tsukubaPos = Cartesian3.fromDegrees(TSUKUBA_STATION.lon, TSUKUBA_STATION.lat, TSUKUBA_STATION.height * 1000);
  return (
    <>
      <Entity position={tsukubaPos}>
        <PointGraphics pixelSize={8} color={Color.DEEPSKYBLUE} />
        <LabelGraphics text="JAXA Tsukuba" font="12px monospace" verticalOrigin={VerticalOrigin.BOTTOM} pixelOffset={{x:0, y:-10} as any} />
      </Entity>
      {isAOS && issPos && (
        <Entity><PolylineGraphics positions={[tsukubaPos, issPos]} width={2} material={Color.LIME.withAlpha(0.6)} /></Entity>
      )}
    </>
  );
};