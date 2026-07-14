// Projection between real WGS84 coordinates (lat/lng) and the stylised Ukraine
// silhouette used on the explore map (720 x 480 viewBox, see data/ukraineMap.ts).
//
// It's a simple affine fit, calibrated against known city markers (Kyiv, Lviv,
// Kharkiv, Odesa) so real coordinates land close to their spot on the drawing.
// The silhouette isn't a true cartographic projection, so treat this as an
// approximation that's good enough for placing points — not for navigation.

const SX = 30.98; // x scale per degree of longitude
const BX = -634.4; // x offset
const SY = -38.79; // y scale per degree of latitude (inverted: north is up)
const BY = 2099; // y offset

export interface MapPoint {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** Real coordinates → map viewBox coordinates. */
export function projectToMap(lat: number, lng: number): MapPoint {
  return { x: SX * lng + BX, y: SY * lat + BY };
}

/** Map viewBox coordinates → real coordinates (for the click-to-pick picker). */
export function mapToLatLng(x: number, y: number): LatLng {
  return { lat: (y - BY) / SY, lng: (x - BX) / SX };
}

// Bounding box of Ukraine — mirrors the server-side validation.
export const UA_BOUNDS = { minLat: 44.0, maxLat: 52.6, minLng: 21.9, maxLng: 40.5 };

export function isInUkraine(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= UA_BOUNDS.minLat &&
    lat <= UA_BOUNDS.maxLat &&
    lng >= UA_BOUNDS.minLng &&
    lng <= UA_BOUNDS.maxLng
  );
}
