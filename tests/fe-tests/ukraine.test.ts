import { describe, it, expect } from 'vitest';
import { UKRAINE_REGIONS } from './ukraine';

describe('UKRAINE_REGIONS', () => {
  it('has a reasonable number of regions (24 oblasts + Kyiv + Crimea + Sevastopol)', () => {
    expect(UKRAINE_REGIONS.length).toBeGreaterThanOrEqual(24);
  });

  it('every region has a unique slug', () => {
    const slugs = UKRAINE_REGIONS.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every region has a non-empty name and at least one city', () => {
    for (const region of UKRAINE_REGIONS) {
      expect(region.region.length).toBeGreaterThan(0);
      expect(region.cities.length).toBeGreaterThan(0);
    }
  });
});
