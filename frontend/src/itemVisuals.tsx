import React from 'react';
import ProfileAvatar from './ProfileAvatar';
import { Icon, type IconName } from './icons';
import { AVATARS, BACKGROUNDS, BADGES, COLORS, EFFECTS, FRAMES } from './data/profileOptions';
import type { EquipKey } from './ProfileShop';

// Human-readable names for icon-only avatars.
const AVATAR_NAMES: Partial<Record<IconName, string>> = {
  compass: 'Компас', mountain: 'Вершина', pine: 'Хвоя', tent: 'Намет', map: 'Мапа',
  signpost: 'Дороговказ', binoculars: 'Розвідник', flame: 'Вогонь', backpack: 'Рюкзак',
  feather: 'Перо', shield: 'Щит', moon: 'Місяць', sun: 'Сонце', crown: 'Корона',
  star: 'Зірка', trophy: 'Трофей', sparkle: 'Сяйво',
};

export interface ItemVisual {
  label: string;
  slotLabel: string;
  node: React.ReactNode; // fills its container
}

// Resolve a cosmetic (by equip slot + id) into a label and a preview node.
// `size` controls icon-based previews; backgrounds/colors fill their box.
export function itemVisual(slot: EquipKey, id: string, size = 40): ItemVisual {
  switch (slot) {
    case 'avatar': {
      const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0];
      return {
        label: AVATAR_NAMES[a.icon] ?? 'Аватар',
        slotLabel: 'Аватар',
        node: a.imageUrl ? (
          <img src={a.imageUrl} alt={a.id} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={a.icon} size={size} stroke="rgba(244,241,232,0.95)" strokeWidth={1.7} />
          </div>
        ),
      };
    }
    case 'background': {
      const b = BACKGROUNDS.find((x) => x.id === id) ?? BACKGROUNDS[0];
      return {
        label: b.label,
        slotLabel: 'Фон профілю',
        node: <div style={{ width: '100%', height: '100%', background: b.css }} />,
      };
    }
    case 'frame': {
      const f = FRAMES.find((x) => x.id === id) ?? FRAMES[0];
      return {
        label: f.label,
        slotLabel: 'Рамка',
        node: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
            <ProfileAvatar avatarId="a1" frameId={f.id} color="#3FA66B" size={Math.round(size * 1.35)} />
          </div>
        ),
      };
    }
    case 'color': {
      const c = COLORS.find((x) => x.id === id) ?? COLORS[0];
      return {
        label: 'Колір акценту',
        slotLabel: 'Колір',
        node: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
            <span style={{ width: size + 6, height: size + 6, borderRadius: '50%', background: c.value, boxShadow: `0 0 22px ${c.value}88` }} />
          </div>
        ),
      };
    }
    case 'badges': {
      const b = BADGES.find((x) => x.id === id) ?? BADGES[0];
      return {
        label: b.label,
        slotLabel: 'Значок',
        node: (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
            <Icon name={b.icon} size={size} strokeWidth={1.7} stroke="rgba(244,241,232,0.92)" />
          </div>
        ),
      };
    }
    case 'effect': {
      const ef = EFFECTS.find((x) => x.id === id);
      return {
        label: ef?.label ?? 'Ефект',
        slotLabel: 'Ефект',
        node: (
          <div style={{ position: 'relative', width: '100%', height: '100%', background: 'linear-gradient(135deg,#0B3B29,#071F16)', overflow: 'hidden' }}>
            <ProfileCardEffect effectId={id} color="#F0C64B" />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
              <Icon name="sparkle" size={size} strokeWidth={1.6} stroke="#F0C64B" />
            </div>
          </div>
        ),
      };
    }
  }
}

// The value passed to onEquip: colors equip by hex value, everything else by id.
export function equipValue(slot: EquipKey, id: string): string {
  if (slot === 'color') return COLORS.find((c) => c.id === id)?.value ?? id;
  return id;
}

export function ProfileCardEffect({ effectId, color }: { effectId: string | undefined; color: string }) {
  if (!effectId || effectId === 'none') return null;
  switch (effectId) {
    case 'glow':
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: `inset 0 0 80px -10px ${color}bf`,
            animation: 'softGlowOpacity 3.5s ease-in-out infinite',
            zIndex: 1,
          }}
        />
      );
    case 'aurora':
      return <div className="effect-aurora" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'screen', zIndex: 1 }} />;
    case 'sparkle':
      return <div className="effect-sparkle" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
    case 'fireflies':
      return <div className="effect-fireflies" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
    case 'matrix':
      return <div className="effect-matrix" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
    case 'vortex':
      return <div className="effect-vortex" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }} />;
    default:
      return null;
  }
}

// Hand-placed star field for the "Космос" background — position (top%, left%),
// size in px and animation-delay in seconds, so the twinkle never looks synced.
const COSMOS_STARS: { top: number; left: number; size: number; delay: number }[] = [
  { top: 8, left: 12, size: 2, delay: 0 },
  { top: 14, left: 68, size: 1.5, delay: 0.4 },
  { top: 22, left: 34, size: 2, delay: 1.1 },
  { top: 6, left: 82, size: 1.5, delay: 1.8 },
  { top: 30, left: 8, size: 1.5, delay: 2.4 },
  { top: 18, left: 52, size: 2.5, delay: 0.9 },
  { top: 40, left: 90, size: 1.5, delay: 3.1 },
  { top: 4, left: 45, size: 1.5, delay: 1.4 },
  { top: 26, left: 76, size: 2, delay: 2.7 },
  { top: 12, left: 25, size: 1.5, delay: 0.2 },
  { top: 35, left: 60, size: 1.5, delay: 3.6 },
  { top: 46, left: 15, size: 2, delay: 1.6 },
  { top: 10, left: 95, size: 1.5, delay: 2.1 },
  { top: 42, left: 40, size: 1.5, delay: 4 },
  { top: 2, left: 65, size: 2, delay: 0.7 },
  { top: 33, left: 4, size: 1.5, delay: 3.3 },
];

// Extra flourish layered over the "Космос" (cosmos) profile background: a
// twinkling star field and an occasional comet streak. Screen-blended so it
// glows through the background's own dark gradient instead of being hidden
// under it. CSS-only, transform/opacity.
export function ProfileCosmosFlourish({ backgroundId }: { backgroundId: string | undefined }) {
  if (backgroundId !== 'cosmos') return null;
  return (
    <div className="bg-cosmos-flourish" aria-hidden="true">
      {COSMOS_STARS.map((s, i) => (
        <span
          key={i}
          className="bg-cosmos-star"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      <div className="bg-cosmos-comet" />
    </div>
  );
}

// Hand-placed falling petals for the "Сакура" background — horizontal start
// position (left%), size in px, and independent delay/duration so the drift
// never looks synced or mechanical.
const SAKURA_PETALS: { left: number; size: number; delay: number; duration: number }[] = [
  { left: 4, size: 7, delay: 0, duration: 9 },
  { left: 14, size: 6, delay: -2.4, duration: 11 },
  { left: 24, size: 8, delay: -5.1, duration: 8 },
  { left: 33, size: 6, delay: -1.2, duration: 12 },
  { left: 42, size: 7, delay: -7.6, duration: 10 },
  { left: 50, size: 6, delay: -3.8, duration: 9 },
  { left: 58, size: 8, delay: -6.4, duration: 13 },
  { left: 66, size: 6, delay: -0.6, duration: 10 },
  { left: 74, size: 7, delay: -4.5, duration: 8 },
  { left: 82, size: 6, delay: -8.2, duration: 12 },
  { left: 90, size: 8, delay: -2.9, duration: 9 },
  { left: 96, size: 6, delay: -5.9, duration: 11 },
];

// Extra flourish layered over the "Сакура" (cherry blossom) profile
// background: faint pink petals, cut to an actual petal silhouette (not a
// blob), drifting down across the whole card. The background photo itself
// gets its wind-sway animation separately, via the .bg-wind-sway class
// applied where the background is rendered (HomePage/ProfileSetup) — no
// extra branch elements here. CSS-only, transform/opacity.
export function ProfileSakuraFlourish({ backgroundId }: { backgroundId: string | undefined }) {
  if (backgroundId !== 'sakura') return null;
  return (
    <div className="bg-sakura-flourish" aria-hidden="true">
      {SAKURA_PETALS.map((p, i) => (
        <span
          key={i}
          className="sakura-petal"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
