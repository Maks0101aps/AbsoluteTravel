// Loot-case catalog (client mirror of backend/src/economy/cases.ts).
// Rarities, drop tables and costs must match the server, which is authoritative
// for what actually drops — this file only drives the UI (drop previews, colors,
// odds display). Each reward maps an equip slot + cosmetic id to a rarity.
import type { EquipKey } from '../ProfileShop';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_META: Record<Rarity, { label: string; color: string; glow: string; weight: number }> = {
  common: { label: 'Звичайний', color: '#8CA3B8', glow: 'rgba(140,163,184,0.55)', weight: 55 },
  uncommon: { label: 'Незвичайний', color: '#4B84E0', glow: 'rgba(75,132,224,0.6)', weight: 28 },
  rare: { label: 'Рідкісний', color: '#8847FF', glow: 'rgba(136,71,255,0.65)', weight: 12 },
  epic: { label: 'Епічний', color: '#D32CE6', glow: 'rgba(211,44,230,0.7)', weight: 4 },
  legendary: { label: 'Легендарний', color: '#F0C64B', glow: 'rgba(240,198,75,0.75)', weight: 1 },
};

export interface CaseReward {
  slot: EquipKey;
  id: string;
  rarity: Rarity;
}

export interface CaseDef {
  id: string;
  name: string;
  tagline: string;
  cost: number; // 0 = free
  oneTime: boolean;
  accent: string; // themed color for the case card / lid
  gradient: string; // case artwork background
  rewards: CaseReward[];
}

export const CASES: CaseDef[] = [
  {
    id: 'starter',
    name: 'Кейс початківця',
    tagline: 'Недорогий кейс для перших прикрас профілю.',
    cost: 50,
    oneTime: false,
    accent: '#3FA66B',
    gradient: 'linear-gradient(145deg,#0F5136,#0A3325 55%,#071F16)',
    rewards: [
      { slot: 'background', id: 'ocean', rarity: 'common' },
      { slot: 'avatar', id: 'a15', rarity: 'common' },
      { slot: 'color', id: 'gold', rarity: 'common' },
      { slot: 'background', id: 'ember', rarity: 'uncommon' },
      { slot: 'avatar', id: 'a16', rarity: 'uncommon' },
      { slot: 'background', id: 'glacier', rarity: 'uncommon' },
      { slot: 'frame', id: 'frost', rarity: 'uncommon' },
      { slot: 'background', id: 'aurora', rarity: 'rare' },
      { slot: 'avatar', id: 'a19', rarity: 'rare' },
      { slot: 'frame', id: 'magma', rarity: 'rare' },
      { slot: 'background', id: 'nebula', rarity: 'epic' },
      { slot: 'avatar', id: 'a21', rarity: 'epic' },
      { slot: 'background', id: 'mirage', rarity: 'legendary' },
      { slot: 'avatar', id: 'a14', rarity: 'legendary' },
    ],
  },
  {
    id: 'wanderer',
    name: 'Кейс мандрівника',
    tagline: 'Фони, аватари й рамки з усіх куточків світу.',
    cost: 150,
    oneTime: false,
    accent: '#4B84E0',
    gradient: 'linear-gradient(145deg,#123A6E,#0C2547 55%,#07162E)',
    rewards: [
      { slot: 'background', id: 'ocean', rarity: 'common' },
      { slot: 'avatar', id: 'a15', rarity: 'common' },
      { slot: 'avatar', id: 'a17', rarity: 'common' },
      { slot: 'badges', id: 'voyager', rarity: 'common' },
      { slot: 'background', id: 'ember', rarity: 'uncommon' },
      { slot: 'avatar', id: 'a16', rarity: 'uncommon' },
      { slot: 'background', id: 'glacier', rarity: 'uncommon' },
      { slot: 'avatar', id: 'a22', rarity: 'uncommon' },
      { slot: 'background', id: 'midnight', rarity: 'rare' },
      { slot: 'avatar', id: 'a19', rarity: 'rare' },
      { slot: 'frame', id: 'frost', rarity: 'rare' },
      { slot: 'background', id: 'volcano', rarity: 'epic' },
      { slot: 'avatar', id: 'a21', rarity: 'epic' },
      { slot: 'background', id: 'nebula', rarity: 'epic' },
      { slot: 'background', id: 'mirage', rarity: 'legendary' },
      { slot: 'avatar', id: 'a23', rarity: 'legendary' },
    ],
  },
  {
    id: 'legendary',
    name: 'Легендарний кейс',
    tagline: 'Найрідкісніші прикраси. Високий ризик — висока нагорода.',
    cost: 500,
    oneTime: false,
    accent: '#F0C64B',
    gradient: 'linear-gradient(145deg,#5E4410,#3A2A08 55%,#1E1604)',
    rewards: [
      { slot: 'background', id: 'midnight', rarity: 'common' },
      { slot: 'avatar', id: 'a18', rarity: 'common' },
      { slot: 'badges', id: 'pathfinder', rarity: 'common' },
      { slot: 'background', id: 'aurora', rarity: 'uncommon' },
      { slot: 'avatar', id: 'a19', rarity: 'uncommon' },
      { slot: 'frame', id: 'magma', rarity: 'uncommon' },
      { slot: 'background', id: 'sakura', rarity: 'rare' },
      { slot: 'avatar', id: 'a20', rarity: 'rare' },
      { slot: 'background', id: 'cosmos', rarity: 'rare' },
      { slot: 'background', id: 'volcano', rarity: 'epic' },
      { slot: 'avatar', id: 'a21', rarity: 'epic' },
      { slot: 'frame', id: 'prism', rarity: 'epic' },
      { slot: 'background', id: 'mirage', rarity: 'legendary' },
      { slot: 'avatar', id: 'a23', rarity: 'legendary' },
      { slot: 'avatar', id: 'a14', rarity: 'legendary' },
    ],
  },
];

export function caseById(id: string): CaseDef | undefined {
  return CASES.find((c) => c.id === id);
}

// Odds (%) per rarity within a case, from the normalised rarity weights.
export function caseOdds(def: CaseDef): { rarity: Rarity; pct: number }[] {
  const present = RARITY_ORDER.filter((r) => def.rewards.some((rw) => rw.rarity === r));
  const total = def.rewards.reduce((s, rw) => s + RARITY_META[rw.rarity].weight, 0);
  return present.map((rarity) => {
    const w = def.rewards
      .filter((rw) => rw.rarity === rarity)
      .reduce((s, rw) => s + RARITY_META[rw.rarity].weight, 0);
    return { rarity, pct: Math.round((w / total) * 100) };
  });
}
