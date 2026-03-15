import React from 'react';
import { Entity, PointGraphics, PolylineGraphics, LabelGraphics } from 'resium';
import { Cartesian2, Cartesian3, Color, VerticalOrigin } from 'cesium';
import { TSUKUBA_STATION } from '../constants';

/** 地上局の型 */
type GroundStation = {
  id: string;
  name: string;
  agency: 'JAXA' | 'NASA' | 'ESA' | 'Other';
  lat: number;   // degrees
  lon: number;   // degrees
  heightM?: number; // meters
  color?: Color;
};

/** 主要局（概略座標）— 必要に応じて調整／追加 */
const STATIONS: GroundStation[] = [
  // --- JAXA ---
  { id: 'tsukuba', name: 'JAXA Tsukuba', agency: 'JAXA', lat: 36.103, lon: 140.085, color: Color.ORANGE },

  // --- NASA ---
  { id: 'wsc',  name: 'NASA White Sands Complex', agency: 'NASA', lat: 32.430, lon: -106.280, color: Color.fromCssColorString('#3b82f6') },
  { id: 'wff',  name: 'NASA Wallops Flight Facility', agency: 'NASA', lat: 37.940, lon:  -75.470, color: Color.fromCssColorString('#0ea5e9') },
  { id: 'ksc',  name: 'NASA Kennedy Space Center',    agency: 'NASA', lat: 28.573, lon:  -80.649, color: Color.fromCssColorString('#60a5fa') },

  // --- ESA ---
  { id: 'new-norcia', name: 'ESA New Norcia (DSA 1)', agency: 'ESA',  lat: -31.050, lon: 116.190, color: Color.fromCssColorString('#22c55e') },
  { id: 'esoc',       name: 'ESA ESOC (Darmstadt)',   agency: 'ESA',  lat:  49.870, lon:   8.660, color: Color.fromCssColorString('#16a34a') },
  { id: 'malargue',   name: 'ESA Malargüe (DSA 3)',   agency: 'ESA',  lat: -35.775, lon: -69.398, color: Color.fromCssColorString('#10b981') },
];

export const GroundStationLayer: React.FC<{ isAOS: boolean; issPos: Cartesian3 | null }> = ({ isAOS, issPos }) => {
  // 筑波の 3D 位置（TSUKUBA_STATION.height が km の想定なので m に変換）
  const tsukubaPos = Cartesian3.fromDegrees(
    TSUKUBA_STATION.lon,
    TSUKUBA_STATION.lat,
    (TSUKUBA_STATION.height ?? 0) * 1000
  );

  return (
    <>
      {/* 各地上局 */}
      {STATIONS.map((st) => {
        const pos = Cartesian3.fromDegrees(st.lon, st.lat, st.heightM ?? 0);
        // 筑波だけ AOS 時は色を LIME に切替
        const pointColor = st.id === 'tsukuba'
          ? (isAOS ? Color.LIME : (st.color ?? Color.fromCssColorString('#64748b')))
          : (st.color ?? Color.fromCssColorString('#64748b'));

        return (
          <Entity key={st.id} position={pos}>
            <PointGraphics pixelSize={8} color={pointColor} outlineColor={Color.BLACK} outlineWidth={2} />
            <LabelGraphics
              text={`${st.name}`}
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

      {/* 筑波が AOS のときだけ ISS までのラインを表示 */}
      {isAOS && issPos && (
        <Entity>
          <PolylineGraphics
            positions={[tsukubaPos, issPos]}
            width={2}
            material={Color.LIME.withAlpha(0.6)}
          />
        </Entity>
      )}
    </>
  );
};