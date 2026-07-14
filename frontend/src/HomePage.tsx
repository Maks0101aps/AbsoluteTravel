import type { AuthUser } from './api';
import ProfileAvatar from './ProfileAvatar';
import { BACKGROUNDS, BADGES } from './data/profileOptions';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const DEFAULT_ACCENT = '#3FA66B';

interface HomePageProps {
  user: AuthUser;
  onLogout: () => void;
  onEditProfile: () => void;
}

function HomePage({ user, onLogout, onEditProfile }: HomePageProps) {
  const p = user.profile;
  const accent = p?.color ?? DEFAULT_ACCENT;
  const background = BACKGROUNDS.find((b) => b.id === p?.backgroundId);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: BG, color: CREAM, minHeight: '100vh' }}>
      {/* navbar */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '14px 40px', background: 'rgba(7,31,22,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '40px', width: 'auto', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div title="Монети" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#F0C64B', background: 'rgba(240,198,75,0.12)', border: '1px solid rgba(240,198,75,0.3)', borderRadius: '999px', padding: '6px 12px', fontSize: '13px', fontWeight: 700 }}>
            <Icon name="coin" size={16} strokeWidth={1.9} />
            {user.coins ?? 0}
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(244,241,232,0.5)' }}>Рівень {user.level}</div>
          </div>
          {p ? (
            <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={38} />
          ) : (
            <img src={user.avatar} alt={user.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${accent}` }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          )}
          <button onClick={onLogout} style={{ background: 'transparent', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Вийти
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {p ? (
          <>
            {/* profile banner */}
            <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', marginBottom: '30px', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)' }}>
              <div style={{ position: 'absolute', inset: 0, background: background?.css ?? 'linear-gradient(135deg,#0B3B29,#071F16)' }} />
              {p.effectId === 'glow' && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ['--glow-color' as any]: `${accent}80`, animation: 'softGlow 3.5s ease-in-out infinite' }} />
              )}
              <div style={{ position: 'relative', padding: '34px 30px', display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
                <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={104} />
                <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: BG, background: accent, padding: '4px 10px', borderRadius: '999px' }}>
                      РІВЕНЬ {user.level}
                    </span>
                    {BADGES.filter((b) => p.badges?.includes(b.id)).map((b) => (
                      <span key={b.id} title={b.label} style={{ display: 'inline-flex', color: 'rgba(244,241,232,0.85)' }}>
                        <Icon name={b.icon} size={17} strokeWidth={1.8} />
                      </span>
                    ))}
                  </div>
                  <div style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, marginBottom: '4px' }}>{p.displayName}</div>
                  <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.7)', marginBottom: '8px' }}>
                    @{user.username}{user.city ? ` · ${user.city}` : ''}
                  </div>
                  {p.bio && <div style={{ fontSize: '13.5px', color: 'rgba(244,241,232,0.78)', lineHeight: 1.5, maxWidth: '440px' }}>{p.bio}</div>}
                </div>
                <button onClick={onEditProfile} style={{ background: 'rgba(255,255,255,0.12)', color: CREAM, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
                  Редагувати
                </button>
              </div>
            </div>

            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: '0 0 12px' }}>Готово, {p.displayName}!</h2>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(244,241,232,0.65)', maxWidth: '520px', margin: 0 }}>
              Профіль створено. Далі — карта, маршрути та дослідження України разом із друзями (у розробці).
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '16px' }}>ЛАСКАВО ПРОСИМО</div>
            <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(30px, 4vw, 42px)', margin: '0 0 14px' }}>Вітаємо, {user.name}!</h1>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '520px', margin: '0 0 32px' }}>
              Ти пропустив налаштування профілю. Персоналізуй його будь-коли.
            </p>
            <button onClick={onEditProfile} style={{ background: accent, color: BG, fontFamily: "'Manrope', sans-serif", fontSize: '14.5px', fontWeight: 700, border: 'none', borderRadius: '12px', padding: '15px 30px', cursor: 'pointer' }}>
              Налаштувати профіль
            </button>
          </>
        )}
      </main>
    </div>
  );
}

export default HomePage;
