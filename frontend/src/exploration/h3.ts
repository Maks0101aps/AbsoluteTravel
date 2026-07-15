// H3 helpers for the territory-exploration layer. The resolution here MUST
// match EXPLORE_RESOLUTION in backend/src/exploration/exploration.service.ts,
// otherwise the cell the client draws won't be the one the server unlocks.
import { latLngToCell, cellToBoundary } from 'h3-js';

export const EXPLORE_RESOLUTION = 9;

/** The H3 cell id containing a coordinate, at the exploration resolution. */
export function cellAt(lat: number, lng: number): string {
  return latLngToCell(lat, lng, EXPLORE_RESOLUTION);
}

/**
 * The polygon outline of a cell as [lat, lng] pairs — ready to hand straight
 * to Leaflet's L.polygon. `true` returns coordinates in [lat, lng] order.
 */
export function cellPolygon(cellId: string): [number, number][] {
  return cellToBoundary(cellId, true) as [number, number][];
}
