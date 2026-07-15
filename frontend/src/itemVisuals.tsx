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
        node: (
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
            <Icon name="sparkle" size={size} strokeWidth={1.6} stroke="#F0C64B" />
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
