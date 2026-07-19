import { ALL_ACHIEVEMENTS, REGULAR, WEEKLY, findAchievement, isoWeekKey, startOfIsoWeek } from './achievements.catalog';

describe('achievements catalog', () => {
  it('ALL_ACHIEVEMENTS concatenates weekly + regular', () => {
    expect(ALL_ACHIEVEMENTS.length).toBe(WEEKLY.length + REGULAR.length);
  });

  it('every achievement key is unique', () => {
    const keys = ALL_ACHIEVEMENTS.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every achievement has positive xp and coin rewards', () => {
    for (const a of ALL_ACHIEVEMENTS) {
      expect(a.xp).toBeGreaterThan(0);
      expect(a.coins).toBeGreaterThanOrEqual(0);
      expect(a.threshold).toBeGreaterThan(0);
    }
  });

  describe('findAchievement', () => {
    it('finds an existing achievement by key', () => {
      const first = ALL_ACHIEVEMENTS[0];
      expect(findAchievement(first.key)).toEqual(first);
    });

    it('returns undefined for an unknown key', () => {
      expect(findAchievement('nonexistent_key')).toBeUndefined();
    });
  });

  describe('isoWeekKey', () => {
    it('formats as YYYY-W## for a known Thursday', () => {
      // 2026-01-01 is a Thursday, so it belongs to ISO week 1 of 2026.
      expect(isoWeekKey(new Date(Date.UTC(2026, 0, 1)))).toBe('2026-W01');
    });

    it('a Monday and the following Sunday share the same week key', () => {
      const monday = new Date(Date.UTC(2026, 6, 20)); // 2026-07-20 is a Monday
      const sunday = new Date(Date.UTC(2026, 6, 26));
      expect(isoWeekKey(monday)).toBe(isoWeekKey(sunday));
    });

    it('adjacent weeks produce different keys', () => {
      const week1 = new Date(Date.UTC(2026, 6, 20));
      const week2 = new Date(Date.UTC(2026, 6, 27));
      expect(isoWeekKey(week1)).not.toBe(isoWeekKey(week2));
    });
  });

  describe('startOfIsoWeek', () => {
    it('returns Monday 00:00 UTC for a mid-week date', () => {
      const wednesday = new Date(Date.UTC(2026, 6, 22, 15, 30));
      const monday = startOfIsoWeek(wednesday);
      expect(monday.getUTCDay()).toBe(1); // Monday
      expect(monday.getUTCHours()).toBe(0);
      expect(monday.getUTCMinutes()).toBe(0);
    });

    it('is idempotent for a date already at Monday 00:00', () => {
      const monday = startOfIsoWeek(new Date(Date.UTC(2026, 6, 20)));
      expect(startOfIsoWeek(monday).getTime()).toBe(monday.getTime());
    });
  });
});
