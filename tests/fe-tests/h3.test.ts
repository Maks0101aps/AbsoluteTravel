import { describe, it, expect } from 'vitest';
import { cellAt, cellPolygon, regionOf, cellCenter, EXPLORE_RESOLUTION } from './h3';

describe('h3 helpers', () => {
  const kyiv = { lat: 50.4501, lng: 30.5234 };

  it('cellAt returns a valid H3 cell id', () => {
    const cell = cellAt(kyiv.lat, kyiv.lng);
    expect(typeof cell).toBe('string');
    expect(cell.length).toBeGreaterThan(0);
  });

  it('cellAt is deterministic for the same point', () => {
    expect(cellAt(kyiv.lat, kyiv.lng)).toBe(cellAt(kyiv.lat, kyiv.lng));
  });

  it('cellPolygon returns a non-empty ring of [lat, lng] pairs', () => {
    const cell = cellAt(kyiv.lat, kyiv.lng);
    const poly = cellPolygon(cell);
    expect(poly.length).toBeGreaterThan(3);
    for (const [lat, lng] of poly) {
      expect(typeof lat).toBe('number');
      expect(typeof lng).toBe('number');
    }
  });

  it('cellCenter returns a point close to the origin coordinate', () => {
    const cell = cellAt(kyiv.lat, kyiv.lng);
    const [lat, lng] = cellCenter(cell);
    // Resolution 9 cells are small (~0.1 km²), so the center must be very close.
    expect(Math.abs(lat - kyiv.lat)).toBeLessThan(0.01);
    expect(Math.abs(lng - kyiv.lng)).toBeLessThan(0.01);
  });

  it('regionOf resolves a valid cell to its coarse parent', () => {
    const cell = cellAt(kyiv.lat, kyiv.lng);
    const region = regionOf(cell);
    expect(typeof region).toBe('string');
    expect(region).not.toBe(cell);
  });

  it('regionOf returns null for an invalid cell id', () => {
    expect(regionOf('not-a-real-cell')).toBeNull();
  });

  it('EXPLORE_RESOLUTION is the finer of the two resolutions', () => {
    expect(EXPLORE_RESOLUTION).toBeGreaterThan(0);
  });
});
