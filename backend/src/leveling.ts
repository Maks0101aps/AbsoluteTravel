// User level curve. Level 1 starts at 0 XP; each level requires progressively more
// XP than the last (linear-growing increments), capped at MAX_LEVEL — once a user
// hits the cap their XP keeps counting but the level stops climbing.
// Mirrored on the frontend in frontend/src/data/leveling.ts — keep both in sync.
export const MAX_LEVEL = 50;

const BASE_XP = 50; // XP needed to go from level 1 to level 2
const STEP_XP = 20; // how much more XP each subsequent level requires

/** XP required to advance from `level` to `level + 1`. */
function xpToNextLevel(level: number): number {
  return BASE_XP + STEP_XP * (level - 1);
}

/** Cumulative XP required to *reach* `level` (level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  const target = Math.min(Math.max(level, 1), MAX_LEVEL);
  let total = 0;
  for (let l = 1; l < target; l++) total += xpToNextLevel(l);
  return total;
}

/** Level reached at a given total XP, capped at MAX_LEVEL. */
export function levelFromXp(xp: number): number {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (level < MAX_LEVEL) {
    const need = xpToNextLevel(level);
    if (remaining < need) break;
    remaining -= need;
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number; // 0 when maxed
  progress: number; // 0..1, always 1 when maxed
  maxed: boolean;
}

/** Progress toward the next level, for rendering an XP bar. */
export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, xpIntoLevel: 0, xpForNextLevel: 0, progress: 1, maxed: true };
  }
  const floorXp = xpForLevel(level);
  const need = xpToNextLevel(level);
  const xpIntoLevel = Math.max(0, xp - floorXp);
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: need,
    progress: Math.min(1, xpIntoLevel / need),
    maxed: false,
  };
}
