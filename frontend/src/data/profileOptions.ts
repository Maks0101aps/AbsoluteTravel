// Customization options for the profile editor.
// Locked items carry a human-readable reason (level requirement or coin price).
import type { IconName } from '../icons';

export type Lock =
  | { type: 'free' }
  | { type: 'level'; level: number }
  | { type: 'coins'; price: number }
  | { type: 'case' }; // obtainable only from loot cases

export function lockLabel(lock: Lock): string | null {
  if (lock.type === 'free') return null;
  if (lock.type === 'level') return `Рівень ${lock.level}`;
  if (lock.type === 'case') return 'З кейсу';
  return `${lock.price} монет`;
}

// --- Avatars: a themed line icon on a tinted disc, no image files required ---
export interface AvatarOption {
  id: string;
  icon: IconName;
  gradient: string;
  lock: Lock;
}

export const AVATARS: AvatarOption[] = [
  { id: 'a1', icon: 'compass', gradient: 'linear-gradient(135deg,#3FA66B,#1E6B44)', lock: { type: 'free' } },
  { id: 'a2', icon: 'mountain', gradient: 'linear-gradient(135deg,#4B9FE1,#1E4E8C)', lock: { type: 'free' } },
  { id: 'a3', icon: 'pine', gradient: 'linear-gradient(135deg,#2FA35A,#0F4A2C)', lock: { type: 'free' } },
  { id: 'a4', icon: 'tent', gradient: 'linear-gradient(135deg,#C98A4B,#7A4E1E)', lock: { type: 'free' } },
  { id: 'a5', icon: 'map', gradient: 'linear-gradient(135deg,#E7B84B,#B07A16)', lock: { type: 'free' } },
  { id: 'a6', icon: 'backpack', gradient: 'linear-gradient(135deg,#5FB98C,#276B4C)', lock: { type: 'free' } },
  { id: 'a7', icon: 'signpost', gradient: 'linear-gradient(135deg,#8A7CD8,#463C8C)', lock: { type: 'free' } },
  { id: 'a8', icon: 'binoculars', gradient: 'linear-gradient(135deg,#E1734B,#8C381E)', lock: { type: 'free' } },
  { id: 'a9', icon: 'feather', gradient: 'linear-gradient(135deg,#6E7B8A,#2E3A46)', lock: { type: 'free' } },
  { id: 'a10', icon: 'flame', gradient: 'linear-gradient(135deg,#3FA6A0,#1E6B67)', lock: { type: 'free' } },
  { id: 'a11', icon: 'shield', gradient: 'linear-gradient(135deg,#9AA4B0,#4A5560)', lock: { type: 'level', level: 5 } },
  { id: 'a12', icon: 'moon', gradient: 'linear-gradient(135deg,#B07A4B,#5E3C1E)', lock: { type: 'level', level: 10 } },
  // --- premium avatars (coins) ---
  { id: 'a15', icon: 'star', gradient: 'linear-gradient(135deg,#F0C64B,#B07A16)', lock: { type: 'coins', price: 300 } },
  { id: 'a16', icon: 'flame', gradient: 'linear-gradient(135deg,#F0713F,#8C2E16)', lock: { type: 'coins', price: 400 } },
  { id: 'a17', icon: 'feather', gradient: 'linear-gradient(135deg,#7CC6E1,#2E6B8C)', lock: { type: 'coins', price: 450 } },
  { id: 'a13', icon: 'sun', gradient: 'linear-gradient(135deg,#F5A742,#B85C10)', lock: { type: 'coins', price: 500 } },
  { id: 'a18', icon: 'shield', gradient: 'linear-gradient(135deg,#8A7CDF,#3A2E8C)', lock: { type: 'coins', price: 650 } },
  { id: 'a19', icon: 'moon', gradient: 'linear-gradient(135deg,#5A6ED8,#241E6B)', lock: { type: 'coins', price: 800 } },
  { id: 'a20', icon: 'trophy', gradient: 'linear-gradient(135deg,#F0C64B,#8C6510)', lock: { type: 'coins', price: 1000 } },
  { id: 'a14', icon: 'crown', gradient: 'linear-gradient(135deg,#E7C34B,#B0851A)', lock: { type: 'coins', price: 1500 } },
  // --- case-exclusive avatars (only from loot cases) ---
  { id: 'a21', icon: 'sparkle', gradient: 'linear-gradient(135deg,#D32CE6,#6A1580)', lock: { type: 'case' } },
  { id: 'a22', icon: 'trophy', gradient: 'linear-gradient(135deg,#5BB8F5,#1E5A8C)', lock: { type: 'case' } },
  { id: 'a23', icon: 'crown', gradient: 'linear-gradient(135deg,#EB4B4B,#7A1818)', lock: { type: 'case' } },
];

// --- Profile accent colors ---
export interface ColorOption {
  id: string;
  value: string;
  lock: Lock;
}

export const COLORS: ColorOption[] = [
  { id: 'green', value: '#3FA66B', lock: { type: 'free' } },
  { id: 'teal', value: '#3FA6A0', lock: { type: 'free' } },
  { id: 'blue', value: '#4B9FE1', lock: { type: 'free' } },
  { id: 'violet', value: '#8A7CDF', lock: { type: 'free' } },
  { id: 'amber', value: '#E7B84B', lock: { type: 'free' } },
  { id: 'coral', value: '#E1734B', lock: { type: 'free' } },
  { id: 'gold', value: '#F0C64B', lock: { type: 'coins', price: 500 } },
  { id: 'crimson', value: '#D14B6A', lock: { type: 'level', level: 5 } },
];

// --- Profile backgrounds (free ones use existing assets or gradients) ---
export interface BackgroundOption {
  id: string;
  label: string;
  css: string; // value for `background`
  lock: Lock;
}

export const BACKGROUNDS: BackgroundOption[] = [
  { id: 'forest', label: 'Ліс', css: "linear-gradient(180deg,rgba(7,31,22,0.55),rgba(7,31,22,0.9)),url('/assets/forest_bg.avif') center/cover", lock: { type: 'free' } },
  { id: 'scenic1', label: 'Гори', css: "linear-gradient(180deg,rgba(7,31,22,0.5),rgba(7,31,22,0.9)),url('/assets/scenic_gallery_1.avif') center/cover", lock: { type: 'free' } },
  { id: 'scenic2', label: 'Долина', css: "linear-gradient(180deg,rgba(7,31,22,0.5),rgba(7,31,22,0.9)),url('/assets/scenic_gallery_2.avif') center/cover", lock: { type: 'free' } },
  { id: 'emerald', label: 'Смарагд', css: 'linear-gradient(135deg,#0B3B29,#071F16)', lock: { type: 'free' } },
  { id: 'scenic3', label: 'Захід сонця', css: "linear-gradient(180deg,rgba(7,31,22,0.45),rgba(7,31,22,0.9)),url('/assets/scenic_gallery_3.avif') center/cover", lock: { type: 'level', level: 5 } },
  // --- premium backgrounds (coins) ---
  { id: 'ocean', label: 'Океан', css: 'linear-gradient(135deg,#0B3B4A,#071F2E)', lock: { type: 'coins', price: 350 } },
  { id: 'ember', label: 'Багаття', css: 'linear-gradient(135deg,#3B1A0B,#2E0F07)', lock: { type: 'coins', price: 450 } },
  { id: 'midnight', label: 'Опівніч', css: 'linear-gradient(135deg,#141B3B,#07091F)', lock: { type: 'coins', price: 600 } },
  { id: 'aurora', label: 'Аврора', css: 'linear-gradient(135deg,#12324a,#3a1a5e)', lock: { type: 'coins', price: 800 } },
  { id: 'sakura', label: 'Сакура', css: 'linear-gradient(135deg,#4A1B34,#2E0F22)', lock: { type: 'coins', price: 1000 } },
  { id: 'cosmos', label: 'Космос', css: 'radial-gradient(circle at 30% 20%,#3a1a5e,#0b1030 60%,#050616)', lock: { type: 'coins', price: 1300 } },
  // --- case-exclusive backgrounds (only from loot cases) ---
  { id: 'glacier', label: 'Льодовик', css: 'linear-gradient(135deg,#2E5A6E,#0B2430)', lock: { type: 'case' } },
  { id: 'volcano', label: 'Вулкан', css: 'linear-gradient(135deg,#5E1A12,#2A0A06)', lock: { type: 'case' } },
  { id: 'nebula', label: 'Туманність', css: 'radial-gradient(circle at 35% 25%,#5A2A8C,#231152 55%,#0A0620)', lock: { type: 'case' } },
  { id: 'mirage', label: 'Міраж', css: 'linear-gradient(135deg,#C9922E,#5E3A0F)', lock: { type: 'case' } },
];

// --- Avatar frames ---
export interface FrameOption {
  id: string;
  label: string;
  // ring is applied as border/box-shadow around the avatar
  ring: string;
  lock: Lock;
}

export const FRAMES: FrameOption[] = [
  { id: 'none', label: 'Без рамки', ring: 'none', lock: { type: 'free' } },
  { id: 'solid', label: 'Класична', ring: 'accent', lock: { type: 'free' } },
  { id: 'glow', label: 'Сяйво', ring: 'glow', lock: { type: 'free' } },
  { id: 'gold', label: 'Золота', ring: 'gold', lock: { type: 'level', level: 10 } },
  { id: 'gem', label: 'Самоцвіт', ring: 'gem', lock: { type: 'coins', price: 1200 } },
  // --- case-exclusive frames (only from loot cases) ---
  { id: 'frost', label: 'Іній', ring: 'frost', lock: { type: 'case' } },
  { id: 'magma', label: 'Магма', ring: 'magma', lock: { type: 'case' } },
  { id: 'prism', label: 'Призма', ring: 'prism', lock: { type: 'case' } },
];

// --- Profile badges (small emblems shown next to the level pill) ---
export interface BadgeOption {
  id: string;
  icon: IconName;
  label: string;
  lock: Lock;
}

export const BADGES: BadgeOption[] = [
  { id: 'newcomer', icon: 'leaf', label: 'Новачок', lock: { type: 'free' } },
  { id: 'hiker', icon: 'boot', label: 'Турист', lock: { type: 'free' } },
  { id: 'photographer', icon: 'camera', label: 'Фотограф', lock: { type: 'free' } },
  { id: 'explorer', icon: 'flag', label: 'Дослідник', lock: { type: 'level', level: 5 } },
  { id: 'mountaineer', icon: 'mountain', label: 'Підкорювач вершин', lock: { type: 'level', level: 10 } },
  { id: 'legend', icon: 'trophy', label: 'Легенда', lock: { type: 'coins', price: 1000 } },
  // --- case-exclusive badges (only from loot cases) ---
  { id: 'voyager', icon: 'compass', label: 'Вояжер', lock: { type: 'case' } },
  { id: 'pathfinder', icon: 'signpost', label: 'Шукач шляхів', lock: { type: 'case' } },
];

// --- Card effects (visual flourish over the whole card) ---
export interface EffectOption {
  id: string;
  label: string;
  lock: Lock;
}

export const EFFECTS: EffectOption[] = [
  { id: 'none', label: 'Без ефекту', lock: { type: 'free' } },
  { id: 'glow', label: 'Мʼяке сяйво', lock: { type: 'free' } },
  { id: 'aurora', label: 'Аврора', lock: { type: 'level', level: 5 } },
  { id: 'sparkle', label: 'Іскри', lock: { type: 'coins', price: 900 } },
];
