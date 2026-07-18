// Code-defined achievement catalog. Progress is computed from the user's real
// activity (checkmarks, explored cells, friends, level, coins) — see
// achievements.service.ts. Rewards are paid once per achievement; weekly ones
// reset every ISO week. Keep this in sync with the frontend copy that renders
// them (frontend consumes the /api/achievements payload, so titles/desc live
// here only).

// Metrics the service knows how to compute for a user. Weekly metrics are
// windowed to the current ISO week; the rest are lifetime totals.
export type Metric =
  | 'placesVisited'
  | 'cellsUnlocked'
  | 'regionsVisited'
  | 'categoriesVisited'
  | 'friends'
  | 'level'
  | 'coinsEarned'
  | 'hardVisits'
  | 'extremeVisits'
  // weekly (reset each ISO week)
  | 'placesThisWeek'
  | 'cellsThisWeek'
  | 'regionsThisWeek'
  | 'coinsThisWeek'
  | 'friendsThisWeek';

export type Tier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  icon: string; // frontend Icon name
  metric: Metric;
  threshold: number;
  xp: number;
  coins: number;
  weekly?: boolean;
  tier: Tier;
}

// --- permanent achievements (26) ------------------------------------------
export const REGULAR: AchievementDef[] = [
  // places visited (verified with a photo checkmark)
  { key: 'first_steps', title: 'Перші кроки', description: 'Познач свій перший візит до місця', icon: 'boot', metric: 'placesVisited', threshold: 1, xp: 100, coins: 60, tier: 'bronze' },
  { key: 'weekender', title: 'Мандрівник вихідного дня', description: 'Відвідай 3 різні місця', icon: 'signpost', metric: 'placesVisited', threshold: 3, xp: 150, coins: 90, tier: 'bronze' },
  { key: 'explorer_5', title: 'Дослідник', description: 'Відвідай 5 місць', icon: 'binoculars', metric: 'placesVisited', threshold: 5, xp: 220, coins: 130, tier: 'silver' },
  { key: 'explorer_10', title: 'Досвідчений турист', description: 'Відвідай 10 місць', icon: 'backpack', metric: 'placesVisited', threshold: 10, xp: 350, coins: 200, tier: 'silver' },
  { key: 'explorer_20', title: 'Бувалий мандрівник', description: 'Відвідай 20 місць', icon: 'tent', metric: 'placesVisited', threshold: 20, xp: 550, coins: 300, tier: 'gold' },
  { key: 'explorer_40', title: 'Легенда доріг', description: 'Відвідай 40 місць', icon: 'crown', metric: 'placesVisited', threshold: 40, xp: 900, coins: 500, tier: 'gold' },

  // territory (H3 cells unlocked by walking)
  { key: 'pathfinder', title: 'Слідопит', description: 'Розблокуй 5 клітинок території', icon: 'hexagon', metric: 'cellsUnlocked', threshold: 5, xp: 120, coins: 70, tier: 'bronze' },
  { key: 'cartographer', title: 'Картограф', description: 'Розблокуй 25 клітинок території', icon: 'map', metric: 'cellsUnlocked', threshold: 25, xp: 260, coins: 150, tier: 'silver' },
  { key: 'surveyor', title: 'Землемір', description: 'Розблокуй 100 клітинок території', icon: 'compass', metric: 'cellsUnlocked', threshold: 100, xp: 500, coins: 280, tier: 'gold' },
  { key: 'conqueror', title: 'Підкорювач простору', description: 'Розблокуй 300 клітинок території', icon: 'flag', metric: 'cellsUnlocked', threshold: 300, xp: 850, coins: 460, tier: 'gold' },

  // regions
  { key: 'region_1', title: 'Місцевий', description: 'Відвідай місце у своєму регіоні', icon: 'pine', metric: 'regionsVisited', threshold: 1, xp: 100, coins: 60, tier: 'bronze' },
  { key: 'region_3', title: 'Мандрівник областями', description: 'Відвідай місця у 3 областях', icon: 'signpost', metric: 'regionsVisited', threshold: 3, xp: 260, coins: 150, tier: 'silver' },
  { key: 'region_6', title: 'Півкраїни', description: 'Відвідай місця у 6 областях', icon: 'map', metric: 'regionsVisited', threshold: 6, xp: 450, coins: 260, tier: 'gold' },
  { key: 'region_12', title: 'Вся Україна', description: 'Відвідай місця у 12 областях', icon: 'crown', metric: 'regionsVisited', threshold: 12, xp: 800, coins: 440, tier: 'gold' },

  // categories (nature / mountains / history / city / coast)
  { key: 'sampler', title: 'Смакота різного', description: 'Відвідай місця 3 різних категорій', icon: 'star', metric: 'categoriesVisited', threshold: 3, xp: 200, coins: 120, tier: 'silver' },
  { key: 'collector', title: 'Колекціонер вражень', description: 'Відвідай місця усіх 5 категорій', icon: 'sparkle', metric: 'categoriesVisited', threshold: 5, xp: 480, coins: 270, tier: 'gold' },

  // friends
  { key: 'friend_1', title: 'Не сам', description: 'Додай першого друга', icon: 'users', metric: 'friends', threshold: 1, xp: 80, coins: 50, tier: 'bronze' },
  { key: 'friend_5', title: 'Компанія', description: 'Додай 5 друзів', icon: 'users', metric: 'friends', threshold: 5, xp: 200, coins: 120, tier: 'silver' },
  { key: 'friend_10', title: 'Душа гурту', description: 'Додай 10 друзів', icon: 'crown', metric: 'friends', threshold: 10, xp: 380, coins: 210, tier: 'gold' },

  // level milestones
  { key: 'level_5', title: 'Новачок позаду', description: 'Досягни 5 рівня', icon: 'feather', metric: 'level', threshold: 5, xp: 150, coins: 90, tier: 'bronze' },
  { key: 'level_10', title: 'Впевнений хід', description: 'Досягни 10 рівня', icon: 'shield', metric: 'level', threshold: 10, xp: 320, coins: 190, tier: 'silver' },
  { key: 'level_25', title: 'Ветеран', description: 'Досягни 25 рівня', icon: 'crown', metric: 'level', threshold: 25, xp: 700, coins: 400, tier: 'gold' },

  // difficulty
  { key: 'daredevil', title: 'Сміливець', description: 'Відвідай складне місце (складність 3+)', icon: 'mountain', metric: 'hardVisits', threshold: 1, xp: 200, coins: 120, tier: 'silver' },
  { key: 'hardcore', title: 'Загартований', description: 'Відвідай 5 складних місць', icon: 'flame', metric: 'hardVisits', threshold: 5, xp: 520, coins: 290, tier: 'gold' },
  { key: 'to_the_limit', title: 'На межі', description: 'Відвідай екстремальне місце (складність 4)', icon: 'flame', metric: 'extremeVisits', threshold: 1, xp: 400, coins: 230, tier: 'gold' },

  // economy
  { key: 'saver', title: 'Скарбничка', description: 'Зароби 1000 монет за весь час', icon: 'gift', metric: 'coinsEarned', threshold: 1000, xp: 300, coins: 180, tier: 'silver' },
];

// --- weekly achievements (6) — reset every ISO week -----------------------
export const WEEKLY: AchievementDef[] = [
  { key: 'w_warmup', title: 'Розминка тижня', description: 'Відвідай 1 місце цього тижня', icon: 'boot', metric: 'placesThisWeek', threshold: 1, xp: 120, coins: 80, weekly: true, tier: 'bronze' },
  { key: 'w_wanderer', title: 'Тижневий мандрівник', description: 'Відвідай 3 місця цього тижня', icon: 'signpost', metric: 'placesThisWeek', threshold: 3, xp: 260, coins: 160, weekly: true, tier: 'silver' },
  { key: 'w_cartographer', title: 'Картограф тижня', description: 'Розблокуй 15 клітинок цього тижня', icon: 'hexagon', metric: 'cellsThisWeek', threshold: 15, xp: 240, coins: 150, weekly: true, tier: 'silver' },
  { key: 'w_crossregion', title: 'Міжобласний тиждень', description: 'Відвідай місця у 2 областях цього тижня', icon: 'map', metric: 'regionsThisWeek', threshold: 2, xp: 300, coins: 180, weekly: true, tier: 'gold' },
  { key: 'w_earner', title: 'Заробіток тижня', description: 'Зароби 150 монет цього тижня', icon: 'gift', metric: 'coinsThisWeek', threshold: 150, xp: 180, coins: 110, weekly: true, tier: 'bronze' },
  { key: 'w_social', title: 'Товариський тиждень', description: 'Додай друга цього тижня', icon: 'users', metric: 'friendsThisWeek', threshold: 1, xp: 160, coins: 100, weekly: true, tier: 'bronze' },
];

export const ALL_ACHIEVEMENTS: AchievementDef[] = [...WEEKLY, ...REGULAR];

export function findAchievement(key: string): AchievementDef | undefined {
  return ALL_ACHIEVEMENTS.find((a) => a.key === key);
}

// ISO-week stamp like "2026-W29". Used as the periodKey for weekly claims so a
// weekly achievement can be claimed once per calendar week.
export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Monday 00:00 UTC of the current ISO week — the lower bound for weekly metrics.
export function startOfIsoWeek(d = new Date()): Date {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
  date.setUTCDate(date.getUTCDate() - dayNum);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}
