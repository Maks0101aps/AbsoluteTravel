import { xpForLevel, levelFromXp, levelProgress, MAX_LEVEL } from './leveling';

describe('leveling', () => {
  describe('xpForLevel', () => {
    it('level 1 requires 0 cumulative XP', () => {
      expect(xpForLevel(1)).toBe(0);
    });

    it('is monotonically increasing', () => {
      let prev = xpForLevel(1);
      for (let l = 2; l <= MAX_LEVEL; l++) {
        const cur = xpForLevel(l);
        expect(cur).toBeGreaterThan(prev);
        prev = cur;
      }
    });

    it('clamps below level 1 up to level 1', () => {
      expect(xpForLevel(0)).toBe(xpForLevel(1));
      expect(xpForLevel(-5)).toBe(xpForLevel(1));
    });

    it('clamps above MAX_LEVEL down to MAX_LEVEL', () => {
      expect(xpForLevel(MAX_LEVEL + 10)).toBe(xpForLevel(MAX_LEVEL));
    });
  });

  describe('levelFromXp', () => {
    it('starts at level 1 with 0 XP', () => {
      expect(levelFromXp(0)).toBe(1);
    });

    it('negative XP is treated as 0', () => {
      expect(levelFromXp(-100)).toBe(1);
    });

    it('advances to level 2 exactly at the level-1 threshold', () => {
      const threshold = xpForLevel(2);
      expect(levelFromXp(threshold - 1)).toBe(1);
      expect(levelFromXp(threshold)).toBe(2);
    });

    it('caps at MAX_LEVEL no matter how much XP is given', () => {
      expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
    });

    it('is the inverse of xpForLevel at every level boundary', () => {
      for (let l = 1; l <= MAX_LEVEL; l++) {
        expect(levelFromXp(xpForLevel(l))).toBe(l);
      }
    });
  });

  describe('levelProgress', () => {
    it('reports 0 progress at the start of a level', () => {
      const p = levelProgress(0);
      expect(p).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50, progress: 0, maxed: false });
    });

    it('reports partial progress mid-level', () => {
      const p = levelProgress(25);
      expect(p.level).toBe(1);
      expect(p.xpIntoLevel).toBe(25);
      expect(p.progress).toBeCloseTo(0.5);
      expect(p.maxed).toBe(false);
    });

    it('reports maxed once MAX_LEVEL is reached', () => {
      const p = levelProgress(xpForLevel(MAX_LEVEL) + 99999);
      expect(p).toEqual({ level: MAX_LEVEL, xpIntoLevel: 0, xpForNextLevel: 0, progress: 1, maxed: true });
    });

    it('progress never exceeds 1', () => {
      for (let xp = 0; xp <= xpForLevel(MAX_LEVEL); xp += 137) {
        expect(levelProgress(xp).progress).toBeLessThanOrEqual(1);
      }
    });
  });
});
