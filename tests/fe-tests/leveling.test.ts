import { describe, it, expect } from 'vitest';
import { xpForLevel, levelFromXp, levelProgress, MAX_LEVEL } from './leveling';

describe('leveling', () => {
  it('level 1 requires 0 cumulative XP', () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it('xpForLevel is monotonically increasing', () => {
    let prev = xpForLevel(1);
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const cur = xpForLevel(l);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('levelFromXp starts at 1 and never goes negative', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-100)).toBe(1);
  });

  it('levelFromXp caps at MAX_LEVEL', () => {
    expect(levelFromXp(Number.MAX_SAFE_INTEGER)).toBe(MAX_LEVEL);
  });

  it('levelFromXp is the inverse of xpForLevel at every boundary', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(levelFromXp(xpForLevel(l))).toBe(l);
    }
  });

  it('levelProgress reports 0 progress at the start of a level', () => {
    expect(levelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 50, progress: 0, maxed: false });
  });

  it('levelProgress reports maxed at MAX_LEVEL', () => {
    const p = levelProgress(xpForLevel(MAX_LEVEL) + 99999);
    expect(p).toEqual({ level: MAX_LEVEL, xpIntoLevel: 0, xpForNextLevel: 0, progress: 1, maxed: true });
  });

  it('levelProgress progress is always within [0, 1]', () => {
    for (let xp = 0; xp <= xpForLevel(MAX_LEVEL); xp += 211) {
      const p = levelProgress(xp);
      expect(p.progress).toBeGreaterThanOrEqual(0);
      expect(p.progress).toBeLessThanOrEqual(1);
    }
  });
});
