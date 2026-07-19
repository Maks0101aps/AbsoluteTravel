import { PRICES, REWARDS, reasonReward, priceOf } from './catalog';

describe('economy catalog', () => {
  describe('priceOf', () => {
    it('returns the price for a known cosmetic', () => {
      expect(priceOf('gold')).toBe(PRICES.gold);
      expect(priceOf('a15')).toBe(300);
    });

    it('returns null for an unknown item id', () => {
      expect(priceOf('does-not-exist')).toBeNull();
    });
  });

  describe('reasonReward', () => {
    it('returns the flat reward for a known reason', () => {
      expect(reasonReward('profile_complete')).toBe(REWARDS.profile_complete);
      expect(reasonReward('first_login')).toBe(50);
    });

    it('returns 100 for any achievement:<id> reason', () => {
      expect(reasonReward('achievement:1')).toBe(100);
      expect(reasonReward('achievement:42')).toBe(100);
    });

    it('returns 0 for an unrecognised reason', () => {
      expect(reasonReward('made_up_reason')).toBe(0);
    });
  });
});
