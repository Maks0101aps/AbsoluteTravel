// Server-authoritative economy catalog.
// Prices mirror the coin-locked cosmetics in frontend/src/data/profileOptions.ts.
// The client never sends a price — it only sends an itemId — so the server is the
// single source of truth for what a cosmetic costs.

export const PRICES: Record<string, number> = {
  // avatars
  a13: 500,
  a14: 1500,
  // accent colors
  gold: 500,
  // backgrounds
  aurora: 800,
  // frames
  gem: 1200,
  // badges
  legend: 1000,
  // card effects
  sparkle: 900,
};

// Coin rewards for one-off / repeatable actions. `earn` looks the reason up here.
// Prefix-based reasons (e.g. `achievement:3`) resolve via reasonReward().
export const REWARDS: Record<string, number> = {
  profile_complete: 200,
  first_login: 50,
};

// Reward for a reason string. Supports plain keys (REWARDS) and prefixed reasons
// like `achievement:<id>` which all pay a flat rate.
export function reasonReward(reason: string): number {
  if (reason in REWARDS) return REWARDS[reason];
  if (reason.startsWith('achievement:')) return 100;
  return 0;
}

export function priceOf(itemId: string): number | null {
  return itemId in PRICES ? PRICES[itemId] : null;
}
