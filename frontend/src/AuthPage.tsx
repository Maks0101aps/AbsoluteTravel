import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UKRAINE_REGIONS } from './data/ukraine';
import { loginUser, registerUser, adminLogin, type AuthUser, type AdminSession } from './api';

const GREEN = '#3FA66B';
const LIGHT = '#9BD8B4';
const CREAM = '#F4F1E8';
const BG = '#071F16';

interface AuthPageProps {
  // `isNew` is true only for a fresh registration (drives the one-time onboarding).
  onAuth: (user: AuthUser, isNew: boolean) => void;
  // Called when the entered credentials match an admin account.
  onAdminAuth: (session: AdminSession) => void;
  onBack: () => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 15px',
  fontSize: '14px',
  fontFamily: "'Manrope', sans-serif",
  color: CREAM,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '11px',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.02em',
  color: 'rgba(244,241,232,0.7)',
  marginBottom: '7px',
};

const fieldWrap: React.CSSProperties = { marginBottom: '16px' };

function AuthPage({ onAuth, onAdminAuth, onBack }: AuthPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // shared
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // register-only
  const [username, setUsername] = useState('');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');

  const selectedRegion = useMemo(
    () => UKRAINE_REGIONS.find((r) => r.region === region),
    [region],
  );
  const cities = selectedRegion?.cities ?? [];
  // Localized city labels, paired by index with the canonical Ukrainian city
  // names in `cities` (the value actually submitted/stored).
  const localizedCities: string[] = selectedRegion
    ? (t(`regions.${selectedRegion.slug}.cities`, { returnObjects: true }) as string[])
    : [];
  const cityLabel = (ukCity: string, idx: number) => localizedCities[idx] ?? ukCity;

  const switchMode = (next: 'register' | 'login') => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (username.trim().length < 3) return setError(t('core.auth.errorUsernameLength'));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError(t('core.auth.errorEmailInvalid'));
      if (password.length < 8) return setError(t('core.auth.errorPasswordLength'));
      if (!region) return setError(t('core.auth.errorSelectRegion'));
      if (!city) return setError(t('core.auth.errorSelectCity'));
    } else {
      if (!email || !password) return setError(t('core.auth.errorEmailPasswordRequired'));
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const user = await registerUser({ username: username.trim(), email: email.trim(), password, region, city });
        onAuth(user, true);
        return;
      }

      // Login: the same form serves participants and admins. Try admin
      // credentials first — if they match, go straight to the admin menu.
      try {
        const session = await adminLogin(email.trim(), password);
        onAdminAuth(session);
        return;
      } catch {
        // Not an admin account (or wrong admin creds) — fall back to a normal
        // participant login below.
      }

      const user = await loginUser({ email: email.trim(), password });
      onAuth(user, false);
    } catch (err: any) {
      setError(err?.message || t('core.auth.errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Manrope', sans-serif",
        background: BG,
        color: CREAM,
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ambient backdrop */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/forest_bg.avif')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.12, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 55% at 50% 30%, rgba(63,166,107,0.16), transparent 70%)', pointerEvents: 'none' }} />

      <div
        className="at-auth-card"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(8,26,18,0.92)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '20px',
          padding: '38px 34px',
          boxShadow: '0 30px 70px -20px rgba(0,0,0,0.8), 0 0 60px rgba(63,166,107,0.10)',
          animation: 'fadeUp 0.5s ease both',
        }}
      >
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: 'rgba(244,241,232,0.55)', cursor: 'pointer', fontSize: '13px', padding: 0, marginBottom: '22px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></svg>
          {t('core.auth.backHome')}
        </button>

        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '40px', width: 'auto', display: 'block', marginBottom: '20px' }} />

        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '27px', margin: '0 0 6px' }}>
          {mode === 'register' ? t('core.auth.registerTitle') : t('core.auth.loginTitle')}
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(244,241,232,0.6)', margin: '0 0 24px' }}>
          {mode === 'register'
            ? t('core.auth.registerSubtitle')
            : t('core.auth.loginSubtitle')}
        </p>

        {/* mode toggle */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '5px', marginBottom: '26px' }}>
          {(['register', 'login'] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '13.5px',
                fontWeight: 700,
                fontFamily: "'Manrope', sans-serif",
                cursor: 'pointer',
                borderRadius: '9px',
                border: 'none',
                transition: 'all 0.2s',
                background: mode === m ? GREEN : 'transparent',
                color: mode === m ? BG : 'rgba(244,241,232,0.7)',
              }}
            >
              {m === 'register' ? t('core.auth.registerToggle') : t('core.auth.loginToggle')}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div style={fieldWrap}>
              <label style={labelStyle}>{t('core.auth.usernameLabel')}</label>
              <input
                style={inputStyle}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('core.auth.usernamePlaceholder')}
                autoComplete="username"
                onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
              />
            </div>
          )}

          <div style={fieldWrap}>
            <label style={labelStyle}>{mode === 'register' ? t('core.auth.emailLabel') : t('core.auth.emailOrLoginLabel')}</label>
            <input
              style={inputStyle}
              type={mode === 'register' ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'register' ? 'you@example.com' : t('core.auth.emailOrLoginPlaceholder')}
              autoComplete="username"
              onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            />
          </div>

          <div style={fieldWrap}>
            <label style={labelStyle}>{t('core.auth.passwordLabel')} {mode === 'register' && <span style={{ color: 'rgba(244,241,232,0.4)', fontWeight: 500 }}>{t('core.auth.passwordHint')}</span>}</label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
            />
          </div>

          {mode === 'register' && (
            <>
              <div style={fieldWrap}>
                <label style={labelStyle}>{t('core.auth.regionLabel')}</label>
                <select
                  style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setCity('');
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                >
                  <option value="" style={{ background: BG }}>{t('core.auth.regionPlaceholder')}</option>
                  {UKRAINE_REGIONS.map((r) => (
                    <option key={r.region} value={r.region} style={{ background: BG }}>
                      {t(`regions.${r.slug}.region`)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>{t('core.auth.cityLabel')}</label>
                <select
                  style={{ ...inputStyle, appearance: 'none', cursor: region ? 'pointer' : 'not-allowed', opacity: region ? 1 : 0.5 }}
                  value={city}
                  disabled={!region}
                  onChange={(e) => setCity(e.target.value)}
                  onFocus={(e) => (e.currentTarget.style.borderColor = GREEN)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
                >
                  <option value="" style={{ background: BG }}>
                    {region ? t('core.auth.cityPlaceholder') : t('core.auth.cityPlaceholderNoRegion')}
                  </option>
                  {cities.map((c, idx) => (
                    <option key={c} value={c} style={{ background: BG }}>
                      {cityLabel(c, idx)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {error && (
            <div style={{ background: 'rgba(220,80,80,0.12)', border: '1px solid rgba(220,80,80,0.35)', color: '#F3B4B4', fontSize: '13px', padding: '11px 14px', borderRadius: '10px', marginBottom: '18px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              fontSize: '14.5px',
              fontWeight: 700,
              fontFamily: "'Manrope', sans-serif",
              color: BG,
              background: GREEN,
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background 0.2s, opacity 0.2s',
              marginTop: '4px',
            }}
          >
            {loading ? t('core.auth.submitLoading') : mode === 'register' ? t('core.auth.submitRegister') : t('core.auth.submitLogin')}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(244,241,232,0.55)', marginTop: '22px', marginBottom: 0 }}>
          {mode === 'register' ? t('core.auth.hasAccount') : t('core.auth.noAccount')}
          <button
            onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}
            style={{ background: 'none', border: 'none', color: LIGHT, fontWeight: 700, cursor: 'pointer', fontSize: '13px', padding: 0 }}
          >
            {mode === 'register' ? t('core.auth.submitLogin') : t('core.auth.submitRegister')}
          </button>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
