import type { AuthUser } from './api';

const GREEN = '#3FA66B';
const LIGHT = '#9BD8B4';
const CREAM = '#F4F1E8';
const BG = '#071F16';

interface HomePageProps {
  user: AuthUser;
  onLogout: () => void;
}

function HomePage({ user, onLogout }: HomePageProps) {
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: BG, color: CREAM, minHeight: '100vh' }}>
      {/* navbar */}
      <nav className="at-home-nav" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '14px 40px', background: 'rgba(7,31,22,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '40px', width: 'auto', display: 'block' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="at-home-userinfo" style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 700 }}>{user.name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(244,241,232,0.5)' }}>Рівень {user.level}</div>
          </div>
          <img src={user.avatar} alt={user.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${GREEN}` }} onError={(e) => (e.currentTarget.style.display = 'none')} />
          <button onClick={onLogout} style={{ background: 'transparent', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Вийти
          </button>
        </div>
      </nav>

      <main className="at-home-main" style={{ maxWidth: '760px', margin: '0 auto', padding: '60px 24px 80px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: GREEN, marginBottom: '16px' }}>
          ЛАСКАВО ПРОСИМО
        </div>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(30px, 4vw, 42px)', margin: '0 0 14px' }}>
          Вітаємо, {user.name}!
        </h1>
        <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '520px', margin: '0 0 40px' }}>
          Твій акаунт створено{user.city ? `, ${user.city}` : ''}. Перш ніж вирушити в подорож, налаштуй свій профіль.
        </p>

        {/* Profile setup placeholder */}
        <div
          style={{
            position: 'relative',
            background: 'rgba(8,26,18,0.9)',
            border: `1px dashed ${GREEN}`,
            borderRadius: '18px',
            padding: '44px 34px',
            textAlign: 'center',
            boxShadow: '0 20px 50px -20px rgba(0,0,0,0.6)',
          }}
        >
          <div style={{ width: '64px', height: '64px', margin: '0 auto 20px', borderRadius: '16px', background: 'rgba(63,166,107,0.15)', border: `1px solid rgba(63,166,107,0.4)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={LIGHT} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
            </svg>
          </div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: '0 0 10px' }}>
            Налаштування профілю
          </h2>
          <p style={{ fontSize: '14px', color: 'rgba(244,241,232,0.6)', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Тут ти зможеш додати аватар, інтереси та вподобання для подорожей. Цей розділ ще в розробці.
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(63,166,107,0.14)', color: GREEN, fontSize: '12.5px', fontWeight: 700, padding: '9px 16px', borderRadius: '999px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
            Скоро буде доступно
          </span>
        </div>
      </main>
    </div>
  );
}

export default HomePage;
