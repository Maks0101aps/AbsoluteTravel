import React, { useEffect, useState } from 'react';
import ProfileAvatar from './ProfileAvatar';
import CaseOpener from './CaseOpener';
import { Icon, type IconName } from './icons';
import type { OpenCaseResult } from './api';
import {
  AVATARS,
  BACKGROUNDS,
  BADGES,
  COLORS,
  EFFECTS,
  FRAMES,
  type Lock,
} from './data/profileOptions';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const GOLD = '#F0C64B';

export type EquipKey = 'avatar' | 'background' | 'frame' | 'color' | 'badges' | 'effect';

export interface ShopSelections {
  avatarId: string;
  customAvatar?: string;
  backgroundId: string;
  frameId: string;
  color: string;
  badges: string[];
  effectId: string;
}

interface ProfileShopProps {
  coins: number;
  level: number;
  owned: string[];
  buying: string | null;
  error: string | null;
  selections: ShopSelections;
  openedCaseIds: string[];
  onBuy: (itemId: string) => void;
  onEquip: (key: EquipKey, id: string) => void;
  onOpenCase: (caseId: string) => Promise<OpenCaseResult>;
  onClose: () => void;
}

type CategoryKey = 'avatars' | 'backgrounds' | 'frames' | 'colors' | 'badges' | 'effects';

const CATEGORIES: { key: CategoryKey; label: string; icon: IconName; equipKey: EquipKey }[] = [
  { key: 'avatars', label: 'Аватари', icon: 'user', equipKey: 'avatar' },
  { key: 'backgrounds', label: 'Фони', icon: 'image', equipKey: 'background' },
  { key: 'frames', label: 'Рамки', icon: 'target', equipKey: 'frame' },
  { key: 'colors', label: 'Кольори', icon: 'sparkle', equipKey: 'color' },
  { key: 'badges', label: 'Значки', icon: 'star', equipKey: 'badges' },
  { key: 'effects', label: 'Ефекти', icon: 'flame', equipKey: 'effect' },
];

const AVATAR_NAMES: Partial<Record<IconName, string>> = {
  compass: 'Компас', mountain: 'Вершина', pine: 'Хвоя', tent: 'Намет', map: 'Мапа',
  signpost: 'Дороговказ', binoculars: 'Розвідник', flame: 'Вогонь', backpack: 'Рюкзак',
  feather: 'Перо', shield: 'Щит', moon: 'Місяць', sun: 'Сонце', crown: 'Корона',
  star: 'Зірка', trophy: 'Трофей',
};

interface ShopItem {
  id: string;
  label: string;
  lock: Lock;
  equipId: string; // value used when equipping (color uses hex, others use id)
  preview: React.ReactNode;
  equipped: boolean;
}

function ProfileShop({ coins, level, owned, buying, error, selections, openedCaseIds, onBuy, onEquip, onOpenCase, onClose }: ProfileShopProps) {
  const [tab, setTab] = useState<CategoryKey>('avatars');
  const [view, setView] = useState<'shop' | 'cases'>('shop');

  // lock the page scroll while the shop is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  // whether the user already has access to an item (owned / free / level reached)
  const unlocked = (lock: Lock, id: string): boolean => {
    if (lock.type === 'free') return true;
    if (lock.type === 'level') return level >= lock.level;
    return owned.includes(id);
  };

  const buildItems = (cat: CategoryKey): ShopItem[] => {
    switch (cat) {
      case 'avatars':
        return AVATARS.map((a) => ({
          id: a.id,
          label: AVATAR_NAMES[a.icon] ?? 'Аватар',
          lock: a.lock,
          equipId: a.id,
          equipped: selections.avatarId === a.id && !selections.customAvatar,
          preview: (
            <div style={{ width: '100%', height: '100%', background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={a.icon} size={34} stroke="rgba(244,241,232,0.95)" strokeWidth={1.7} />
            </div>
          ),
        }));
      case 'backgrounds':
        return BACKGROUNDS.map((b) => ({
          id: b.id,
          label: b.label,
          lock: b.lock,
          equipId: b.id,
          equipped: selections.backgroundId === b.id,
          preview: <div style={{ width: '100%', height: '100%', background: b.css }} />,
        }));
      case 'frames':
        return FRAMES.map((f) => ({
          id: f.id,
          label: f.label,
          lock: f.lock,
          equipId: f.id,
          equipped: selections.frameId === f.id,
          preview: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <ProfileAvatar avatarId={selections.avatarId} customAvatar={selections.customAvatar} frameId={f.id} color={selections.color} size={52} />
            </div>
          ),
        }));
      case 'colors':
        return COLORS.map((c) => ({
          id: c.id,
          label: '',
          lock: c.lock,
          equipId: c.value,
          equipped: selections.color === c.value,
          preview: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <span style={{ width: '46px', height: '46px', borderRadius: '50%', background: c.value, boxShadow: `0 0 22px ${c.value}66` }} />
            </div>
          ),
        }));
      case 'badges':
        return BADGES.map((b) => ({
          id: b.id,
          label: b.label,
          lock: b.lock,
          equipId: b.id,
          equipped: selections.badges.includes(b.id),
          preview: (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <Icon name={b.icon} size={32} strokeWidth={1.7} stroke="rgba(244,241,232,0.9)" />
            </div>
          ),
        }));
      case 'effects':
        return EFFECTS.map((ef) => ({
          id: ef.id,
          label: ef.label,
          lock: ef.lock,
          equipId: ef.id,
          equipped: selections.effectId === ef.id,
          preview: (
            <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
              <div style={{ position: 'absolute', inset: 0, ['--glow-color' as any]: `${selections.color}88`, animation: ef.id === 'none' ? undefined : 'softGlow 3.5s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: selections.color }}>
                <Icon name="sparkle" size={30} stroke={selections.color} strokeWidth={1.6} />
              </div>
            </div>
          ),
        }));
    }
  };

  const items = buildItems(tab);
  const equipKey = CATEGORIES.find((c) => c.key === tab)!.equipKey;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(4,14,10,0.74)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '960px', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          borderRadius: '24px', overflow: 'hidden',
          background: 'linear-gradient(180deg,#0B2A1D,#081E15)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.85)',
          fontFamily: "'Manrope', sans-serif", color: CREAM,
        }}
      >
        {view === 'cases' ? (
          <CaseOpener
            coins={coins}
            owned={owned}
            openedCaseIds={openedCaseIds}
            onOpen={onOpenCase}
            onEquip={onEquip}
            onBack={() => setView('shop')}
          />
        ) : (
        <>
        {/* ---- header ---- */}
        <div style={{ position: 'relative', padding: '24px 26px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flex: '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.22em', color: GOLD, marginBottom: '6px' }}>МАГАЗИН</div>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(22px,3vw,30px)', margin: 0 }}>Крамниця мандрівника</h2>
              <p style={{ fontSize: '13px', color: 'rgba(244,241,232,0.55)', margin: '6px 0 0', maxWidth: '440px' }}>
                Обмінюй зароблені монети на аватари, фони та інші прикраси профілю.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '15px', fontWeight: 800, color: GOLD, background: 'rgba(240,198,75,0.12)', border: '1px solid rgba(240,198,75,0.35)', padding: '9px 15px', borderRadius: '999px', boxShadow: '0 0 24px rgba(240,198,75,0.14)' }}>
                <Icon name="coin" size={18} strokeWidth={1.9} />
                {coins}
              </span>
              <button
                onClick={onClose}
                aria-label="Закрити"
                style={{ width: '38px', height: '38px', borderRadius: '11px', border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.04)', color: CREAM, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Icon name="close" size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ---- category tabs ---- */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '18px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => {
              const on = tab === c.key;
              return (
                <button
                  key={c.key}
                  onClick={() => setTab(c.key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '9px 14px', borderRadius: '11px', cursor: 'pointer',
                    border: `1px solid ${on ? GOLD : 'rgba(255,255,255,0.09)'}`,
                    background: on ? 'rgba(240,198,75,0.14)' : 'transparent',
                    color: on ? CREAM : 'rgba(244,241,232,0.7)',
                    fontFamily: "'Manrope', sans-serif", fontSize: '13px', fontWeight: 600,
                    transition: 'all 0.16s ease',
                  }}
                >
                  <Icon name={c.icon} size={16} strokeWidth={1.8} stroke={on ? GOLD : 'rgba(244,241,232,0.7)'} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div style={{ marginTop: '14px', fontSize: '12.5px', fontWeight: 600, color: '#E88A8A', background: 'rgba(232,138,138,0.1)', border: '1px solid rgba(232,138,138,0.28)', borderRadius: '10px', padding: '9px 12px' }}>
              {error}
            </div>
          )}
        </div>

        {/* ---- items grid ---- */}
        <div style={{ padding: '20px 26px 26px', overflowY: 'auto' }}>
          {/* prominent cases entry — bigger and flashier than the item cards */}
          <button
            onClick={() => setView('cases')}
            className="at-cases-banner"
            style={{
              position: 'relative', overflow: 'hidden', width: '100%',
              display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left',
              padding: '18px 22px', marginBottom: '20px', borderRadius: '18px', cursor: 'pointer',
              border: '1.5px solid rgba(240,198,75,0.5)',
              background: 'linear-gradient(120deg, rgba(240,198,75,0.18), rgba(211,44,230,0.14) 55%, rgba(75,132,224,0.14))',
              color: CREAM, fontFamily: "'Manrope', sans-serif",
              boxShadow: '0 16px 40px -18px rgba(240,198,75,0.5)',
            }}
          >
            <span className="at-case-banner-shine" />
            <span style={{ flex: '0 0 auto', width: '54px', height: '54px', borderRadius: '14px', background: 'linear-gradient(135deg,#F0C64B,#B07A16)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px -6px rgba(240,198,75,0.7)' }}>
              <Icon name="gift" size={28} strokeWidth={1.7} stroke={BG} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontFamily: "'Lora', serif", fontSize: '19px', fontWeight: 600 }}>Кейси мандрівника</span>
              <span style={{ display: 'block', fontSize: '12.5px', color: 'rgba(244,241,232,0.72)', marginTop: '2px' }}>
                Випробуй удачу · рідкісні фони, аватари, рамки та значки
              </span>
            </span>
            <span style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#F0C64B', color: BG, borderRadius: '11px', padding: '10px 16px', fontSize: '13px', fontWeight: 800 }}>
              Відкрити <Icon name="arrowRight" size={15} strokeWidth={2.2} stroke={BG} />
            </span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(158px,1fr))', gap: '16px' }}>
            {items.map((item) => (
              <ShopCard
                key={item.id}
                item={item}
                unlocked={unlocked(item.lock, item.id)}
                coins={coins}
                buying={buying === item.id}
                onBuy={() => onBuy(item.id)}
                onEquip={() => onEquip(equipKey, item.equipId)}
              />
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function ShopCard({
  item, unlocked, coins, buying, onBuy, onEquip,
}: {
  item: ShopItem;
  unlocked: boolean;
  coins: number;
  buying: boolean;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const [hover, setHover] = useState(false);
  const { lock, equipped } = item;
  const coinLock = lock.type === 'coins';
  const affordable = coinLock && coins >= (lock as any).price;

  const accent = equipped ? '#3FA66B' : GOLD;
  const borderColor = equipped ? '#3FA66B' : hover && unlocked ? 'rgba(240,198,75,0.5)' : 'rgba(255,255,255,0.08)';

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { if (unlocked && !equipped) onEquip(); }}
      style={{
        borderRadius: '16px', overflow: 'hidden',
        border: `1.5px solid ${borderColor}`,
        background: 'rgba(255,255,255,0.025)',
        boxShadow: hover && unlocked && !equipped
          ? '0 14px 28px -12px rgba(0,0,0,0.55)'
          : '0 6px 16px -10px rgba(0,0,0,0.4)',
        cursor: unlocked && !equipped ? 'pointer' : 'default',
        transition: 'border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
        transform: hover && unlocked && !equipped ? 'translateY(-3px)' : 'none',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* preview */}
      <div style={{ position: 'relative', height: '92px', overflow: 'hidden' }}>
        {item.preview}
        {/* soft vignette for depth + a seam so the preview blends into the footer */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 30% 15%, rgba(255,255,255,0.16), transparent 55%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 -18px 22px -14px rgba(4,14,10,0.65)', pointerEvents: 'none' }} />
        {equipped && (
          <div style={{ position: 'absolute', top: '8px', right: '8px', width: '24px', height: '24px', borderRadius: '50%', background: '#3FA66B', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
            <Icon name="check" size={14} stroke={BG} strokeWidth={3} />
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {item.label && (
          <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'rgba(244,241,232,0.9)' }}>{item.label}</div>
        )}
        <div style={{ marginTop: 'auto' }}>
          {equipped ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#7BD6A2' }}>
              <Icon name="check" size={14} strokeWidth={2.4} stroke="#7BD6A2" /> Обрано
            </div>
          ) : unlocked ? (
            <button
              onClick={(e) => { e.stopPropagation(); onEquip(); }}
              style={{ width: '100%', padding: '8px', borderRadius: '9px', border: `1px solid ${accent}55`, background: `${accent}18`, color: CREAM, fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            >
              Обрати
            </button>
          ) : lock.type === 'level' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#9BD8B4' }}>
              <Icon name="lock" size={13} strokeWidth={1.9} stroke="#9BD8B4" /> Рівень {lock.level}
            </div>
          ) : lock.type === 'case' ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontWeight: 700, color: '#D9A6E8' }}>
              <Icon name="gift" size={13} strokeWidth={1.9} stroke="#D9A6E8" /> З кейсу
            </div>
          ) : (
            <button
              disabled={!affordable || buying}
              title={affordable ? undefined : `Не вистачає ${(lock as any).price - coins} монет`}
              onClick={(e) => { e.stopPropagation(); if (affordable && !buying) onBuy(); }}
              style={{
                width: '100%', padding: '8px', borderRadius: '9px',
                border: `1px solid ${affordable ? 'rgba(240,198,75,0.55)' : 'rgba(255,255,255,0.09)'}`,
                background: affordable ? GOLD : 'rgba(255,255,255,0.035)',
                color: affordable ? BG : 'rgba(244,241,232,0.5)',
                fontFamily: "'Manrope', sans-serif", fontSize: '12px', fontWeight: 800,
                cursor: affordable && !buying ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}
            >
              {buying ? (
                'Купуємо…'
              ) : (
                <>
                  <Icon name="coin" size={14} strokeWidth={2} stroke={affordable ? BG : 'rgba(244,241,232,0.45)'} />
                  {(lock as any).price}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileShop;
