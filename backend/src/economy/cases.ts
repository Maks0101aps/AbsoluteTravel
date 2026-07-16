// Server-authoritative loot-case catalog.
//
// Each case has a drop table of { itemId, rarity }. The server is the single
// source of truth for what a case can drop and how likely each rarity is — the
// client only sends a caseId. Item ids mirror the cosmetics defined in
// frontend/src/data/profileOptions.ts (and the reward metadata in
// frontend/src/data/cases.ts). Keep the two reward lists in sync.

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// Drop weight (relative, normalised per-case) and duplicate coin compensation.
export const RARITY: Record<Rarity, { weight: number; comp: number }> = {
  common: { weight: 55, comp: 20 },
  uncommon: { weight: 28, comp: 45 },
  rare: { weight: 12, comp: 100 },
  epic: { weight: 4, comp: 220 },
  legendary: { weight: 1, comp: 500 },
};

export interface CaseReward {
  itemId: string;
  rarity: Rarity;
}

export interface CaseDef {
  id: string;
  cost: number; // 0 = free
  oneTime: boolean; // can only be opened once per user (the free starter case)
  rewards: CaseReward[];
}

export const CASES: Record<string, CaseDef> = {
  starter: {
    id: 'starter',
    cost: 50,
    oneTime: false,
    rewards: [
      { itemId: 'ocean', rarity: 'common' },
      { itemId: 'a15', rarity: 'common' },
      { itemId: 'gold', rarity: 'common' },
      { itemId: 'ember', rarity: 'uncommon' },
      { itemId: 'a16', rarity: 'uncommon' },
      { itemId: 'glacier', rarity: 'uncommon' },
      { itemId: 'frost', rarity: 'uncommon' },
      { itemId: 'aurora', rarity: 'rare' },
      { itemId: 'a19', rarity: 'rare' },
      { itemId: 'magma', rarity: 'rare' },
      { itemId: 'fireflies', rarity: 'rare' },
      { itemId: 'nebula', rarity: 'epic' },
      { itemId: 'a21', rarity: 'epic' },
      { itemId: 'mirage', rarity: 'legendary' },
      { itemId: 'a14', rarity: 'legendary' },
    ],
  },
  wanderer: {
    id: 'wanderer',
    cost: 150,
    oneTime: false,
    rewards: [
      { itemId: 'ocean', rarity: 'common' },
      { itemId: 'a15', rarity: 'common' },
      { itemId: 'a17', rarity: 'common' },
      { itemId: 'voyager', rarity: 'common' },
      { itemId: 'ember', rarity: 'uncommon' },
      { itemId: 'a16', rarity: 'uncommon' },
      { itemId: 'glacier', rarity: 'uncommon' },
      { itemId: 'a22', rarity: 'uncommon' },
      { itemId: 'midnight', rarity: 'rare' },
      { itemId: 'a19', rarity: 'rare' },
      { itemId: 'frost', rarity: 'rare' },
      { itemId: 'volcano', rarity: 'epic' },
      { itemId: 'a21', rarity: 'epic' },
      { itemId: 'nebula', rarity: 'epic' },
      { itemId: 'matrix', rarity: 'epic' },
      { itemId: 'mirage', rarity: 'legendary' },
      { itemId: 'a23', rarity: 'legendary' },
    ],
  },
  legendary: {
    id: 'legendary',
    cost: 0, // TODO: temporarily free for testing the new blackhole frame — restore to 500
    oneTime: false,
    rewards: [
      { itemId: 'midnight', rarity: 'common' },
      { itemId: 'pathfinder', rarity: 'common' },
      { itemId: 'aurora', rarity: 'uncommon' },
      { itemId: 'a19', rarity: 'uncommon' },
      { itemId: 'magma', rarity: 'uncommon' },
      { itemId: 'sakura', rarity: 'rare' },
      { itemId: 'a20', rarity: 'rare' },
      { itemId: 'cosmos', rarity: 'rare' },
      { itemId: 'volcano', rarity: 'epic' },
      { itemId: 'a21', rarity: 'epic' },
      { itemId: 'prism', rarity: 'epic' },
      { itemId: 'mirage', rarity: 'legendary' },
      { itemId: 'a23', rarity: 'legendary' },
      { itemId: 'a14', rarity: 'legendary' },
      { itemId: 'vortex', rarity: 'legendary' },
      { itemId: 'blackhole', rarity: 'legendary' },
    ],
  },
};

/** Weighted-random pick of a reward from a case, by rarity weight. */
export function pickReward(caseDef: CaseDef): CaseReward {
  const total = caseDef.rewards.reduce((s, r) => s + RARITY[r.rarity].weight, 0);
  let roll = Math.random() * total;
  for (const r of caseDef.rewards) {
    roll -= RARITY[r.rarity].weight;
    if (roll <= 0) return r;
  }
  return caseDef.rewards[caseDef.rewards.length - 1];
}
