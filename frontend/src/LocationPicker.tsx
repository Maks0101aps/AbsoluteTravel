import React, { useRef } from 'react';
import { UA_PATH, UA_CONTOURS } from './data/ukraineMap';
import { projectToMap, mapToLatLng, isInUkraine } from './data/geo';

interface LocationPickerProps {
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
  accent?: string;
}

// Small interactive Ukraine silhouette: click anywhere on the country to drop a
// pin. The click point (in the 720x480 viewBox) is converted back to lat/lng.
function LocationPicker({ lat, lng, onPick, accent = '#3FA66B' }: LocationPickerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // width:100% + height:auto keeps the element's aspect ratio equal to the
    // viewBox (720/480), so this linear mapping needs no letterbox correction.
    const x = ((e.clientX - rect.left) / rect.width) * 720;
    const y = ((e.clientY - rect.top) / rect.height) * 480;
    const { lat: pLat, lng: pLng } = mapToLatLng(x, y);
    onPick(Number(pLat.toFixed(5)), Number(pLng.toFixed(5)));
  };

  const hasPin = lat != null && lng != null && isInUkraine(lat, lng);
  const pin = hasPin ? projectToMap(lat!, lng!) : null;

  return (
    <div
      style={{
        position: 'relative',
        background: '#081E15',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '14px',
        padding: '10px',
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 720 480"
        onClick={handleClick}
        style={{ width: '100%', height: 'auto', display: 'block', cursor: 'crosshair' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <clipPath id="pickClip">
            <path d={UA_PATH} />
          </clipPath>
        </defs>
        <g clipPath="url(#pickClip)">
          <rect x="0" y="0" width="720" height="480" fill="rgba(63,166,107,0.06)" />
          {UA_CONTOURS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="rgba(155,216,180,0.16)" strokeWidth="1" />
          ))}
        </g>
        <path d={UA_PATH} fill="none" stroke="rgba(63,166,107,0.45)" strokeWidth="1.5" />

        {pin && (
          <g style={{ pointerEvents: 'none' }}>
            <circle cx={pin.x} cy={pin.y} r={11} fill="none" stroke={accent} strokeWidth="2">
              <animate attributeName="r" values="9;18" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={pin.x} cy={pin.y} r={6.5} fill={accent} stroke="#F4F1E8" strokeWidth="2" />
          </g>
        )}
      </svg>
      <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)', marginTop: '6px', textAlign: 'center' }}>
        {hasPin
          ? `Обрано: ${lat!.toFixed(4)}, ${lng!.toFixed(4)}`
          : 'Клікни по карті, щоб позначити місце'}
      </div>
    </div>
  );
}

export default LocationPicker;
