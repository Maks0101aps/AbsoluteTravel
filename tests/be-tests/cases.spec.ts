import { CASES, RARITY, pickReward } from './cases';

describe('economy cases', () => {
  it('every case has at least one reward', () => {
    for (const def of Object.values(CASES)) {
      expect(def.rewards.length).toBeGreaterThan(0);
    }
  });

  it('every reward references a valid rarity weight', () => {
    for (const def of Object.values(CASES)) {
      for (const reward of def.rewards) {
        expect(RARITY[reward.rarity]).toBeDefined();
      }
    }
  });

  describe('pickReward', () => {
    it('always returns one of the case rewards', () => {
      const def = CASES.starter;
      for (let i = 0; i < 50; i++) {
        const picked = pickReward(def);
        expect(def.rewards).toContainEqual(picked);
      }
    });

    it('a single-reward case always returns that reward', () => {
      const solo = { id: 'solo', cost: 0, oneTime: false, rewards: [{ itemId: 'x', rarity: 'common' as const }] };
      expect(pickReward(solo)).toEqual(solo.rewards[0]);
    });

    it('respects rarity weighting on average (common drops far more than legendary)', () => {
      const def = CASES.starter;
      const counts: Record<string, number> = {};
      const trials = 4000;
      for (let i = 0; i < trials; i++) {
        const r = pickReward(def);
        counts[r.rarity] = (counts[r.rarity] ?? 0) + 1;
      }
      expect(counts.common ?? 0).toBeGreaterThan(counts.legendary ?? 0);
    });
  });
});
