import { describe, it, expect } from 'vitest';
import { projectToMap, mapToLatLng, isInUkraine, UA_BOUNDS } from './geo';

describe('geo projection', () => {
  it('mapToLatLng inverts projectToMap', () => {
    const original = { lat: 49.0, lng: 31.0 }; // roughly central Ukraine
    const projected = projectToMap(original.lat, original.lng);
    const back = mapToLatLng(projected.x, projected.y);
    expect(back.lat).toBeCloseTo(original.lat, 6);
    expect(back.lng).toBeCloseTo(original.lng, 6);
  });

  it('projectToMap returns finite coordinates', () => {
    const p = projectToMap(50.45, 30.52); // Kyiv
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });
});

describe('isInUkraine', () => {
  it('accepts a point well inside the bounding box', () => {
    expect(isInUkraine(49.0, 31.0)).toBe(true);
  });

  it('accepts points exactly on the boundary', () => {
    expect(isInUkraine(UA_BOUNDS.minLat, UA_BOUNDS.minLng)).toBe(true);
    expect(isInUkraine(UA_BOUNDS.maxLat, UA_BOUNDS.maxLng)).toBe(true);
  });

  it('rejects a point outside the box', () => {
    expect(isInUkraine(60, 30)).toBe(false); // too far north
    expect(isInUkraine(48, 10)).toBe(false); // too far west
  });

  it('rejects non-finite input', () => {
    expect(isInUkraine(NaN, 30)).toBe(false);
    expect(isInUkraine(48, Infinity)).toBe(false);
  });
});
