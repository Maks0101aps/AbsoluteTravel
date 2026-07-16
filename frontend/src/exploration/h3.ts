// H3 helpers for the territory-exploration layer. The resolutions here MUST
// match EXPLORE_RESOLUTION / REGION_RESOLUTION in
// backend/src/exploration/exploration.service.ts, otherwise the cell the client
// draws won't be the one the server unlocks.
import { latLngToCell, cellToBoundary, cellToParent, cellToLatLng, isValidCell } from 'h3-js';

export const EXPLORE_RESOLUTION = 9;

// The coarse "region" resolution (~12 000 km², roughly oblast-sized — Ukraine
// is about 50 of them). The server already treats a res-3 parent as a region
// for the new-region XP bonus; the fog reuses the same unit so the "Новий
// регіон!" popup and the patch of fog that lifts are always the same thing.
export const REGION_RESOLUTION = 3;

/** The H3 cell id containing a coordinate, at the exploration resolution. */
export function cellAt(lat: number, lng: number): string {
  return latLngToCell(lat, lng, EXPLORE_RESOLUTION);
}

/**
 * The polygon outline of a cell as [lat, lng] pairs — ready to hand straight
 * to Leaflet's L.polygon.
 *
 * Do NOT pass h3-js's `formatAsGeoJson` flag here: it returns [lng, lat] (the
 * GeoJSON order), which Leaflet reads as [lat, lng] and silently plots on the
 * far side of the planet. Omitting it gives H3's native [lat, lng].
 */
export function cellPolygon(cellId: string): [number, number][] {
  return cellToBoundary(cellId) as [number, number][];
}

/**
 * The region (res-3 parent) a fine cell belongs to. Derived on the client, so
 * the fog's coarse layer needs no extra API call or column: the visited-cell
 * list we already fetch carries the region layer inside it.
 */
export function regionOf(cellId: string): string | null {
  if (!isValidCell(cellId)) return null;
  try {
    return cellToParent(cellId, REGION_RESOLUTION);
  } catch {
    return null;
  }
}

/** Centre of a cell as [lat, lng] — used to cull cells outside the viewport. */
export function cellCenter(cellId: string): [number, number] {
  return cellToLatLng(cellId) as [number, number];
}
