import React, { useRef, useState } from 'react';
import type { AuthUser, ProfileCustomization } from './api';
import ProfileAvatar from './ProfileAvatar';
import Popover, { type AnchorRect } from './Popover';
import { Icon, type IconName } from './icons';
import {
  AVATARS,
  BACKGROUNDS,
  BADGES,
  COLORS,
  EFFECTS,
  FRAMES,
  lockLabel,
  type Lock,
} from './data/profileOptions';

const CREAM = '#F4F1E8';
const BG = '#071F16';

type EditorKey = 'avatar' | 'frame' | 'background' | 'name' | 'bio' | 'level' | 'color' | 'badges' | 'effects';

interface ProfileSetupProps {
  user: AuthUser;
  onComplete: (profile: ProfileCustomization) => void;
  onSkip: () => void;
}

const isFree = (lock: Lock) => lock.type === 'free';

// ---- shared bits ----------------------------------------------------------

function LockOverlay({ lock, radius = 12 }: { lock: Lock; radius?: number }) {
  const label = lockLabel(lock);
  if (!label) return null;
  const coin = lock.type === 'coins';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: radius,
        background: 'rgba(7,31,22,0.76)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '3px',
        textAlign: 'center',
        padding: '6px',
        color: coin ? '#F0C64B' : '#9BD8B4',
        cursor: 'not-allowed',
      }}
    >
      <Icon name={coin ? 'coin' : 'lock'} size={15} strokeWidth={1.9} />
      <span style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

// Wraps a card element: hover glow + pencil affordance, click opens its editor.
function Editable({
  accent,
  active,
  radius = 12,
  style,
  pencil = true,
  onOpen,
  children,
}: {
  accent: string;
  active: boolean;
  radius?: number;
  style?: React.CSSProperties;
  pencil?: boolean;
  onOpen: (el: HTMLElement) => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const show = hover || active;
  return (
    <div
      data-editable
      onClick={(e) => {
        e.stopPropagation();
        onOpen(e.currentTarget);
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        cursor: 'pointer',
        borderRadius: radius,
        outline: active ? `2px solid ${accent}` : hover ? `2px solid ${accent}88` : '2px solid transparent',
        outlineOffset: '3px',
        transition: 'outline-color 0.18s ease, transform 0.18s ease',
        animation: active ? 'highlightPulse 0.55s ease' : undefined,
        ...style,
      }}
    >
      {children}
      {pencil && show && (
        <div
          style={{
            position: 'absolute',
            top: '-9px',
            right: '-9px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            zIndex: 3,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={BG} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ---- main -----------------------------------------------------------------

function ProfileSetup({ user, onComplete, onSkip }: ProfileSetupProps) {
  const init = user.profile;
  const [avatarId, setAvatarId] = useState(init?.avatarId ?? AVATARS[0].id);
  const [customAvatar, setCustomAvatar] = useState<string | undefined>(init?.customAvatar);
  const [color, setColor] = useState(init?.color ?? COLORS[0].value);
  const [displayName, setDisplayName] = useState(init?.displayName ?? user.name ?? user.username);
  const [bio, setBio] = useState(init?.bio ?? '');
  const [backgroundId, setBackgroundId] = useState(init?.backgroundId ?? BACKGROUNDS[0].id);
  const [frameId, setFrameId] = useState(init?.frameId ?? FRAMES[1].id);
  const [badges, setBadges] = useState<string[]>(init?.badges ?? ['newcomer']);
  const [effectId, setEffectId] = useState(init?.effectId ?? 'none');

  const [active, setActive] = useState<EditorKey | null>(null);
  const [anchor, setAnchor] = useState<AnchorRect | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  const background = BACKGROUNDS.find((b) => b.id === backgroundId) ?? BACKGROUNDS[0];
  const selectedBadges = BADGES.filter((b) => badges.includes(b.id));

  const openAt = (key: EditorKey, el: HTMLElement | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setAnchor({ top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width });
    setActive(key);
  };

  const close = () => setActive(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCustomAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const finish = () =>
    onComplete({
      avatarId,
      customAvatar,
      color,
      displayName: displayName.trim() || user.username,
      bio: bio.trim(),
      backgroundId,
      frameId,
      badges,
      effectId,
    });

  // rail category → element to anchor & editor to open
  const rail: { key: EditorKey; icon: IconName; label: string; ref: React.RefObject<HTMLDivElement | null> }[] = [
    { key: 'background', icon: 'image', label: 'Фон', ref: cardRef },
    { key: 'avatar', icon: 'user', label: 'Аватар', ref: avatarRef },
    { key: 'frame', icon: 'target', label: 'Рамка', ref: avatarRef },
    { key: 'badges', icon: 'star', label: 'Значки', ref: badgesRef },
    { key: 'effects', icon: 'sparkle', label: 'Ефекти', ref: cardRef },
  ];

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: BG, color: CREAM, minHeight: '100vh', padding: '48px 20px 72px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color, marginBottom: '12px', transition: 'color 0.2s' }}>
          РЕДАКТОР ПРОФІЛЮ
        </div>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(26px,3.4vw,38px)', margin: '0 0 6px' }}>
          {init ? 'Твій профіль' : 'Створи свій профіль'}
        </h1>
        <p style={{ fontSize: '14.5px', color: 'rgba(244,241,232,0.55)', margin: '0 0 30px', maxWidth: '540px' }}>
          Натисни на будь-який елемент картки, щоб змінити його. Категорії праворуч підсвічують потрібну частину.
        </p>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* ============ CARD ============ */}
          <div
            ref={cardRef}
            data-editable
            onClick={(e) => openAt('background', e.currentTarget)}
            style={{
              position: 'relative',
              flex: '1 1 460px',
              minWidth: '300px',
              borderRadius: '22px',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 26px 64px -20px rgba(0,0,0,0.75)',
              cursor: 'pointer',
              outline: active === 'background' ? `2px solid ${color}` : '2px solid transparent',
              outlineOffset: '-2px',
              transition: 'outline-color 0.18s ease',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: background.css, transition: 'background 0.25s ease' }} />
            {effectId === 'glow' && (
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ['--glow-color' as any]: `${color}80`, animation: 'softGlow 3.5s ease-in-out infinite' }} />
            )}

            <div style={{ position: 'relative', padding: '34px 30px', display: 'flex', alignItems: 'flex-start', gap: '22px', flexWrap: 'wrap' }}>
              {/* avatar + frame edit dot */}
              <div ref={avatarRef} style={{ position: 'relative', flex: '0 0 auto' }}>
                <Editable accent={color} active={active === 'avatar'} radius={999} onOpen={(el) => openAt('avatar', el)}>
                  <ProfileAvatar avatarId={avatarId} customAvatar={customAvatar} frameId={frameId} color={color} size={104} />
                </Editable>
                {/* dedicated frame trigger */}
                <button
                  data-editable
                  title="Змінити рамку"
                  onClick={(e) => {
                    e.stopPropagation();
                    openAt('frame', avatarRef.current);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(9,28,20,0.95)',
                    border: `2px solid ${active === 'frame' ? color : 'rgba(255,255,255,0.25)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.18s ease',
                    zIndex: 4,
                    color: active === 'frame' ? color : 'rgba(244,241,232,0.8)',
                  }}
                >
                  <Icon name="target" size={15} strokeWidth={1.9} />
                </button>
              </div>

              {/* right column */}
              <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                {/* level + badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <Editable accent={color} active={active === 'level'} radius={999} pencil={false} onOpen={(el) => openAt('level', el)}>
                    <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: BG, background: color, padding: '5px 11px', borderRadius: '999px', transition: 'background 0.25s ease' }}>
                      РІВЕНЬ {user.level}
                    </span>
                  </Editable>
                  <Editable accent={color} active={active === 'badges'} radius={999} onOpen={(el) => openAt('badges', el)}>
                    <div ref={badgesRef} style={{ display: 'flex', alignItems: 'center', gap: '7px', minHeight: '26px', padding: '2px 6px' }}>
                      {selectedBadges.length ? (
                        selectedBadges.map((b) => (
                          <span key={b.id} title={b.label} style={{ display: 'inline-flex', color: 'rgba(244,241,232,0.85)' }}>
                            <Icon name={b.icon} size={17} strokeWidth={1.8} />
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)' }}>Значки</span>
                      )}
                    </div>
                  </Editable>
                </div>

                {/* display name */}
                <Editable accent={color} active={active === 'name'} radius={8} onOpen={(el) => openAt('name', el)} style={{ display: 'inline-block', marginBottom: '4px' }}>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, padding: '2px 4px' }}>
                    {displayName.trim() || user.username}
                  </div>
                </Editable>

                {/* handle + city + color dot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(244,241,232,0.7)' }}>
                    @{user.username}{user.city ? ` · ${user.city}` : ''}
                  </span>
                  <Editable accent={color} active={active === 'color'} radius={999} pencil={false} onOpen={(el) => openAt('color', el)}>
                    <span style={{ display: 'block', width: '18px', height: '18px', borderRadius: '50%', background: color, border: '2px solid rgba(255,255,255,0.6)', transition: 'background 0.25s ease' }} />
                  </Editable>
                </div>

                {/* bio */}
                <Editable accent={color} active={active === 'bio'} radius={8} onOpen={(el) => openAt('bio', el)} style={{ display: 'block' }}>
                  <div style={{ fontSize: '13.5px', color: bio.trim() ? 'rgba(244,241,232,0.8)' : 'rgba(244,241,232,0.45)', lineHeight: 1.5, padding: '4px', maxWidth: '440px', minHeight: '20px' }}>
                    {bio.trim() || 'Додай короткий опис про себе…'}
                  </div>
                </Editable>
              </div>
            </div>
          </div>

          {/* ============ RAIL ============ */}
          <div
            style={{
              flex: '0 0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px 10px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {rail.map((r) => {
              const on = active === r.key;
              return (
                <button
                  key={r.key + r.label}
                  data-editable
                  onClick={(e) => {
                    e.stopPropagation();
                    openAt(r.key, r.ref.current);
                  }}
                  title={r.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    width: '128px',
                    padding: '11px 12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    border: `1px solid ${on ? color : 'rgba(255,255,255,0.08)'}`,
                    background: on ? `${color}22` : 'transparent',
                    color: on ? CREAM : 'rgba(244,241,232,0.75)',
                    fontFamily: "'Manrope', sans-serif",
                    fontSize: '13px',
                    fontWeight: 600,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Icon name={r.icon} size={17} strokeWidth={1.8} stroke={on ? color : 'rgba(244,241,232,0.75)'} />
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ============ ACTIONS ============ */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', marginTop: '32px' }}>
          <button onClick={finish} style={{ background: color, color: BG, fontFamily: "'Manrope', sans-serif", fontSize: '14.5px', fontWeight: 700, border: 'none', borderRadius: '12px', padding: '15px 32px', cursor: 'pointer', transition: 'background 0.2s' }}>
            Зберегти профіль
          </button>
          <button onClick={onSkip} style={{ background: 'transparent', color: 'rgba(244,241,232,0.6)', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 600, border: '1px solid rgba(255,255,255,0.14)', borderRadius: '12px', padding: '15px 24px', cursor: 'pointer' }}>
            {init ? 'Скасувати' : 'Пропустити поки що'}
          </button>
        </div>
      </div>

      {/* hidden upload input */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />

      {/* ============ POPOVERS ============ */}
      {active && anchor && (
        <Popover
          anchor={anchor}
          accent={color}
          onClose={close}
          width={active === 'name' || active === 'bio' || active === 'level' ? 300 : 320}
          title={
            {
              avatar: 'Аватар',
              frame: 'Рамка',
              background: 'Фон картки',
              name: 'Відображуване імʼя',
              bio: 'Короткий опис',
              level: 'Твій рівень',
              color: 'Колір акценту',
              badges: 'Значки',
              effects: 'Ефекти картки',
            }[active]
          }
        >
          {active === 'avatar' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div
                onClick={() => fileRef.current?.click()}
                style={{ aspectRatio: '1', borderRadius: '11px', border: `2px solid ${customAvatar ? color : 'rgba(255,255,255,0.14)'}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', cursor: 'pointer' }}
              >
                {customAvatar ? (
                  <img src={customAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '9px' }} />
                ) : (
                  <>
                    <Icon name="plus" size={18} stroke={color} strokeWidth={2} />
                    <span style={{ fontSize: '8.5px', color: 'rgba(244,241,232,0.6)' }}>Свій</span>
                  </>
                )}
              </div>
              {AVATARS.map((a) => {
                const locked = !isFree(a.lock);
                const sel = !customAvatar && avatarId === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => { if (!locked) { setAvatarId(a.id); setCustomAvatar(undefined); } }}
                    title={lockLabel(a.lock) ?? ''}
                    style={{ position: 'relative', aspectRatio: '1', borderRadius: '11px', border: sel ? `2px solid ${color}` : '2px solid transparent', cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{ width: '100%', height: '100%', borderRadius: '9px', background: a.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={a.icon} size={22} stroke="rgba(244,241,232,0.95)" strokeWidth={1.7} />
                    </div>
                    <LockOverlay lock={a.lock} radius={9} />
                  </div>
                );
              })}
            </div>
          )}

          {active === 'frame' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {FRAMES.map((f) => {
                const locked = !isFree(f.lock);
                const sel = frameId === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => { if (!locked) setFrameId(f.id); }}
                    title={lockLabel(f.lock) ?? ''}
                    style={{ position: 'relative', borderRadius: '12px', padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', border: sel ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.08)', cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    <ProfileAvatar avatarId={avatarId} customAvatar={customAvatar} frameId={f.id} color={color} size={46} />
                    <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'rgba(244,241,232,0.75)' }}>{f.label}</span>
                    <LockOverlay lock={f.lock} />
                  </div>
                );
              })}
            </div>
          )}

          {active === 'background' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '9px' }}>
              {BACKGROUNDS.map((b) => {
                const locked = !isFree(b.lock);
                const sel = backgroundId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => { if (!locked) setBackgroundId(b.id); }}
                    title={lockLabel(b.lock) ?? ''}
                    style={{ position: 'relative', height: '66px', borderRadius: '12px', overflow: 'hidden', border: sel ? `2px solid ${color}` : '2px solid transparent', cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    <div style={{ position: 'absolute', inset: 0, background: b.css }} />
                    <div style={{ position: 'absolute', left: '8px', bottom: '6px', fontSize: '11px', fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{b.label}</div>
                    <LockOverlay lock={b.lock} />
                  </div>
                );
              })}
            </div>
          )}

          {active === 'color' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {COLORS.map((c) => {
                const locked = !isFree(c.lock);
                const sel = color === c.value;
                return (
                  <div
                    key={c.id}
                    onClick={() => { if (!locked) setColor(c.value); }}
                    title={lockLabel(c.lock) ?? ''}
                    style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '11px', background: c.value, cursor: locked ? 'not-allowed' : 'pointer', border: sel ? '3px solid #F4F1E8' : '3px solid transparent' }}
                  >
                    {locked && (
                      <div style={{ position: 'absolute', inset: 0, borderRadius: '8px', background: 'rgba(7,31,22,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.lock.type === 'coins' ? '#F0C64B' : '#9BD8B4' }}>
                        <Icon name={c.lock.type === 'coins' ? 'coin' : 'lock'} size={15} strokeWidth={1.9} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {active === 'name' && (
            <input
              autoFocus
              value={displayName}
              maxLength={32}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') close(); }}
              placeholder="Твоє імʼя"
              style={{ width: '100%', padding: '11px 13px', fontSize: '14px', fontFamily: "'Manrope', sans-serif", color: CREAM, background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}`, borderRadius: '10px', outline: 'none' }}
            />
          )}

          {active === 'bio' && (
            <>
              <textarea
                autoFocus
                value={bio}
                maxLength={160}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Люблю гори, каву та несподівані маршрути…"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical', padding: '11px 13px', fontSize: '13.5px', fontFamily: "'Manrope', sans-serif", color: CREAM, background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}`, borderRadius: '10px', outline: 'none' }}
              />
              <div style={{ textAlign: 'right', fontSize: '11px', color: 'rgba(244,241,232,0.45)', marginTop: '5px' }}>{bio.length}/160</div>
            </>
          )}

          {active === 'level' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Lora', serif", fontSize: '20px' }}>Рівень {user.level}</span>
                <span style={{ fontSize: '12px', color: 'rgba(244,241,232,0.6)' }}>{user.xp} XP</span>
              </div>
              <div style={{ height: '8px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ width: `${Math.min(100, (user.xp % 1000) / 10)}%`, height: '100%', background: color, transition: 'width 0.3s ease' }} />
              </div>
              <p style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.6)', lineHeight: 1.5, margin: 0 }}>
                Досліджуй місця, проходь маршрути та виконуй завдання, щоб отримувати XP і відкривати нові аватари, рамки й ефекти.
              </p>
            </div>
          )}

          {active === 'badges' && (
            <>
              <p style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)', margin: '0 0 10px' }}>Обери значки, які показувати на картці.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '9px' }}>
                {BADGES.map((b) => {
                  const locked = !isFree(b.lock);
                  const sel = badges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => {
                        if (locked) return;
                        setBadges((prev) => (prev.includes(b.id) ? prev.filter((x) => x !== b.id) : [...prev, b.id]));
                      }}
                      title={lockLabel(b.lock) ?? ''}
                      style={{ position: 'relative', borderRadius: '12px', padding: '12px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px', border: sel ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.08)', background: sel ? `${color}18` : 'transparent', cursor: locked ? 'not-allowed' : 'pointer' }}
                    >
                      <Icon name={b.icon} size={22} strokeWidth={1.7} stroke={sel ? color : 'rgba(244,241,232,0.85)'} />
                      <span style={{ fontSize: '9.5px', fontWeight: 600, color: 'rgba(244,241,232,0.7)', textAlign: 'center' }}>{b.label}</span>
                      <LockOverlay lock={b.lock} />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {active === 'effects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {EFFECTS.map((ef) => {
                const locked = !isFree(ef.lock);
                const sel = effectId === ef.id;
                const label = lockLabel(ef.lock);
                return (
                  <div
                    key={ef.id}
                    onClick={() => { if (!locked) setEffectId(ef.id); }}
                    title={label ?? ''}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px', borderRadius: '11px', border: sel ? `2px solid ${color}` : '2px solid rgba(255,255,255,0.08)', background: sel ? `${color}18` : 'transparent', cursor: locked ? 'not-allowed' : 'pointer' }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 600, color: locked ? 'rgba(244,241,232,0.45)' : CREAM }}>{ef.label}</span>
                    {locked ? (
                      <span style={{ fontSize: '10px', fontWeight: 700, color: ef.lock.type === 'coins' ? '#F0C64B' : '#9BD8B4' }}>{label}</span>
                    ) : sel ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </Popover>
      )}
    </div>
  );
}

export default ProfileSetup;
