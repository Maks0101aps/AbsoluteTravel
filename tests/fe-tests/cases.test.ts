import { describe, it, expect } from 'vitest';
import { CASES, caseById, caseOdds } from './cases';

describe('caseById', () => {
  it('finds an existing case by id', () => {
    const def = CASES[0];
    expect(caseById(def.id)).toEqual(def);
  });

  it('returns undefined for an unknown id', () => {
    expect(caseById('does-not-exist')).toBeUndefined();
  });
});

describe('caseOdds', () => {
  it('percentages roughly sum to 100 for every case', () => {
    for (const def of CASES) {
      const odds = caseOdds(def);
      const total = odds.reduce((s, o) => s + o.pct, 0);
      expect(total).toBeGreaterThanOrEqual(95);
      expect(total).toBeLessThanOrEqual(105);
    }
  });

  it('only lists rarities actually present in the case', () => {
    const def = CASES[0];
    const odds = caseOdds(def);
    const presentRarities = new Set(def.rewards.map((r) => r.rarity));
    for (const o of odds) {
      expect(presentRarities.has(o.rarity)).toBe(true);
    }
  });
});
