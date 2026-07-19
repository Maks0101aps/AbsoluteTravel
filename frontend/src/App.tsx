import { useState, useEffect } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import './App.css';
import { UA_PATH, UA_CITIES } from './data/ukraineMap';

interface Achievement {
  id: number;
  title: string;
  description: string;
  xpReward: number;
  icon: string;
}

interface User {
  id: number;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  currentDestination: string | null;
  achievements: { achievement: Achievement }[];
}

interface Destination {
  id: number;
  name: string;
  category: string;
  image: string;
  verified: boolean;
  xpReward: number;
}

function MapDot({ x, y, r = 6, color = '#3FA66B', pulse = false, delay = '0s' }: { x: number; y: number; r?: number; color?: string; pulse?: boolean; delay?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color}></circle>
      {pulse && (
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth="2">
          <animate attributeName="r" values={`${r};${r + 9}`} dur="2.5s" begin={delay} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0" dur="2.5s" begin={delay} repeatCount="indefinite" />
        </circle>
      )}
    </g>
  );
}

function MapAvatar({ clipId, src, title, x, y, r = 20 }: { clipId: string; src: string; title: string; x: number; y: number; r?: number }) {
  return (
    <g>
      <title>{title}</title>
      <clipPath id={clipId}><circle cx={x} cy={y} r={r}></circle></clipPath>
      <image href={src} x={x - r} y={y - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="#F4F1E8" strokeWidth="2.5"></circle>
    </g>
  );
}

const DEFAULT_USER: User = {
  id: 1,
  name: 'Олексій',
  avatar: '/assets/avatar_oleksiy.avif',
  level: 24,
  xp: 2450,
  currentDestination: 'Львів',
  achievements: [
    {
      achievement: {
        id: 1,
        title: 'Карпатський дослідник',
        description: 'Відкрий 25 місць у Карпатах',
        xpReward: 250,
        icon: 'mountain',
      },
    },
    {
      achievement: {
        id: 2,
        title: 'Історія України',
        description: 'Відвідай 20 історичних місць',
        xpReward: 200,
        icon: 'history',
      },
    },
  ],
};

const DEFAULT_FRIENDS: User[] = [];

const DEFAULT_DESTINATIONS: Destination[] = [
  {
    id: 1,
    name: 'Львів',
    category: 'Історичний центр',
    image: '/assets/lviv_thumb.avif',
    verified: true,
    xpReward: 100,
  },
  {
    id: 2,
    name: 'Карпати',
    category: 'Гірський хребет',
    image: '/assets/carpathians_thumb.avif',
    verified: true,
    xpReward: 250,
  },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 1,
    title: 'Карпатський дослідник',
    description: 'Відкрий 25 місць у Карпатах',
    xpReward: 250,
    icon: 'mountain',
  },
  {
    id: 2,
    title: 'Історія України',
    description: 'Відвідай 20 історичних місць',
    xpReward: 200,
    icon: 'history',
  },
  {
    id: 3,
    title: '50 природних місць',
    description: 'Відкрий 50 природних локацій',
    xpReward: 300,
    icon: 'nature',
  },
];

const LANGUAGES = [
  { code: 'uk', label: 'UA' },
  { code: 'en', label: 'EN' },
  { code: 'pl', label: 'PL' },
] as const;

function App({ onStart }: { onStart?: () => void } = {}) {
  const { t, i18n } = useTranslation();
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [friends, setFriends] = useState<User[]>(DEFAULT_FRIENDS);
  const [, setDestinations] = useState<Destination[]>(DEFAULT_DESTINATIONS);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);

  const [showToast, setShowToast] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, setLoading] = useState(true);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    if (!langOpen) return;
    const handleClose = () => setLangOpen(false);
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, [langOpen]);

  const navLinks = [
    { href: '#features', label: t('core.landing.navHowItWorks') },
    { href: '#map', label: t('core.landing.navMap') },
    { href: '#progress', label: t('core.landing.navAchievements') },
    { href: '#cta', label: t('core.landing.navContact') },
  ];

  useEffect(() => {
    const tryFetch = async (port: number) => {
      const res = await fetch(`http://localhost:${port}/api/data`);
      if (!res.ok) throw new Error();
      return res.json();
    };

    const scanPorts = async () => {
      for (let port = 3000; port <= 3005; port++) {
        try {
          const data = await tryFetch(port);
          if (data.currentUser) {
            setCurrentUser(data.currentUser);
            if (data.friends && data.friends.length) setFriends(data.friends);
            if (data.destinations && data.destinations.length) setDestinations(data.destinations);
            if (data.achievements && data.achievements.length) setAchievements(data.achievements);
            console.log(`Connected to backend on port ${port}`);
            setLoading(false);
            return;
          }
        } catch (e) {
          // Continue scanning next port
        }
      }
      console.warn('Could not connect to backend on scanned ports, using local fallback.');
      setLoading(false);
    };

    scanPorts();
  }, []);

  // overflowX is `clip`, not `hidden`: `hidden` would make this a scroll
  // container and stop the sticky navbar below from sticking.
  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#071F16', color: '#F4F1E8', minHeight: '100dvh', overflowX: 'clip' }}>
      
      {/* ============ NAVBAR ============ */}
      <nav className="at-nav" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '14px 40px', background: 'rgba(7,31,22,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: '1 0 0' }}>
          <a href="#top" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '42px', width: 'auto', display: 'block' }} />
          </a>
        </div>
        <div className="at-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '36px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '13.5px', fontWeight: 500, color: 'rgba(244,241,232,0.85)', flex: '0 0 auto' }}>
          {navLinks.map((l, i) => (
            <a key={i} href={l.href} style={{ transition: 'color 0.2s' }}>{l.label}</a>
          ))}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 0 0', justifyContent: 'flex-end' }} className="at-nav-right">
          {/* Language Dropdown Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLangOpen(!langOpen);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '9px 14px',
                color: 'rgba(244,241,232,0.85)',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
              <span>{LANGUAGES.find((lang) => lang.code === i18n.resolvedLanguage)?.label || 'UA'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: langOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {langOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '115%',
                  right: 0,
                  background: 'rgba(11,43,32,0.98)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  padding: '6px',
                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.6), 0 0 30px rgba(63,166,107,0.05)',
                  minWidth: '100px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  animation: 'fadeIn 0.15s ease both',
                }}
              >
                {LANGUAGES.map((lang) => {
                  const on = i18n.resolvedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        setLangOpen(false);
                      }}
                      style={{
                        background: on ? 'rgba(63,166,107,0.22)' : 'transparent',
                        color: on ? '#9BD8B4' : 'rgba(244,241,232,0.75)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontFamily: "'Manrope', sans-serif",
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        if (!on) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = '#F4F1E8';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!on) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(244,241,232,0.75)';
                        }
                      }}
                    >
                      <span>{lang.label}</span>
                      {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button className="at-nav-cta" onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#9BD8B4', fontFamily: "'Manrope', sans-serif", fontSize: '13.5px', fontWeight: 700, padding: '11px 22px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', cursor: 'pointer', transition: 'all 0.2s' }}>
            {t('core.landing.startExploring')}
          </button>
        </div>

        {/* mobile hamburger */}
        <button className="at-burger" aria-label={t('core.landing.menuAria')} aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6l-12 12" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
          )}
        </button>

        {/* mobile dropdown menu */}
        {menuOpen && (
          <div className="at-mobile-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, flexDirection: 'column', gap: '2px', padding: '10px 14px 18px', background: 'rgba(7,31,22,0.98)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 40px -12px rgba(0,0,0,0.6)' }}>
            {/* Language Switcher on mobile */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '4px', margin: '4px 12px 10px' }}>
              {LANGUAGES.map((lang) => {
                const on = i18n.resolvedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    style={{
                      flex: 1,
                      background: on ? '#3FA66B' : 'transparent',
                      color: on ? '#071F16' : 'rgba(244,241,232,0.7)',
                      border: 'none',
                      borderRadius: '7px',
                      padding: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      fontFamily: "'Manrope', sans-serif",
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
            {navLinks.map((l, i) => (
              <a key={i} href={l.href} onClick={() => setMenuOpen(false)} style={{ padding: '14px 12px', fontSize: '15px', fontWeight: 600, color: 'rgba(244,241,232,0.9)', borderRadius: '10px' }}>
                {l.label}
              </a>
            ))}
            <button onClick={() => { setMenuOpen(false); onStart?.(); }} style={{ marginTop: '8px', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#3FA66B', color: '#071F16', fontFamily: "'Manrope', sans-serif", fontSize: '15px', fontWeight: 700, padding: '15px 22px', borderRadius: '12px', border: 'none', cursor: 'pointer' }}>
              {t('core.landing.startExploring')}
            </button>
          </div>
        )}
      </nav>

      {/* ============ HERO ============ */}
      <header id="top" className="at-hero" style={{ position: 'relative', padding: '90px 40px 110px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100dvh - 70px)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/forest_bg.avif')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18, mixBlendMode: 'color-dodge', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,31,22,0.2) 0%, rgba(7,31,22,0.85) 60%, #071F16 100%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 25% 35%, rgba(63,166,107,0.15), transparent 70%)', pointerEvents: 'none' }}></div>

        <div className="at-hero-inner" style={{ position: 'relative', maxWidth: '1240px', width: '100%', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '56px', alignItems: 'center' }}>
          {/* left copy */}
          <div className="at-hero-copy" style={{ flex: '1 1 420px', minWidth: '320px', animation: 'fadeUp 0.7s ease both' }}>
            <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(38px, 4.6vw, 58px)', lineHeight: 1.14, margin: '0 0 26px', color: '#F4F1E8' }}>
              <Trans i18nKey="core.landing.heroTitle" components={{ 1: <br /> }} />
            </h1>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '440px', margin: '0 0 34px' }}>
              {t('core.landing.heroBody')}
            </p>
            <div className="at-hero-btns" style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '44px' }}>
              <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, padding: '15px 26px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                {t('core.landing.startExploring')}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
              </button>
              <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'transparent', color: '#F4F1E8', fontSize: '14px', fontWeight: 600, padding: '15px 26px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', transition: 'border-color 0.2s' }}>
                {t('core.landing.howItWorks')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"></circle><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"></path></svg>
              </a>
            </div>
          </div>

          {/* right: app preview */}
          <div className="at-preview-col" style={{ flex: '1 1 500px', minWidth: '340px', position: 'relative', perspective: '1200px', transformStyle: 'preserve-3d', animation: 'fadeUp 0.7s 0.15s ease both' }}>
            <div className="at-preview-card" style={{ position: 'relative', background: 'rgba(8,26,18,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8), 0 0 50px rgba(63, 166, 107, 0.15)', overflow: 'visible', transform: 'rotateY(-15deg) rotateX(6deg) rotateZ(1deg)', transformStyle: 'preserve-3d' }}>
              {/* app top bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(244,241,232,0.8)" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>
                <div style={{ display: 'flex', gap: '20px', fontSize: '11px', fontWeight: 600, flex: 1 }}>
                  <span style={{ color: '#3FA66B', borderBottom: '2px solid #3FA66B', paddingBottom: '4px' }}>{t('core.landing.previewMapTab')}</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>{t('core.landing.previewRoutesTab')}</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>{t('core.landing.previewFriendsTab')}</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>{t('core.landing.previewAchievementsTab')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }} />
                  <div style={{ fontSize: '9.5px', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
                    <div style={{ color: 'rgba(244,241,232,0.5)' }}>{t('core.nav.level', { level: currentUser.level })}</div>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex' }}>
                {/* icon rail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px 12px', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(63,166,107,0.18)', border: '1px solid rgba(63,166,107,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3FA66B" strokeWidth="1.8"><path d="M12 21c-4-4.2-7-7.5-7-10.8A7 7 0 0 1 19 10.2c0 3.3-3 6.6-7 10.8z"></path><circle cx="12" cy="10" r="2.4"></circle></svg></div>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(244,241,232,0.55)" strokeWidth="1.8"><path d="M3 11l18-7-7 18-2.5-8.5z"></path></svg></div>
                  <div style={{ width: '30px', height: '30px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(244,241,232,0.55)" strokeWidth="1.8"><rect x="4" y="6" width="16" height="13" rx="2.5"></rect><circle cx="12" cy="12.5" r="3.2"></circle><path d="M9 6l1.2-2h3.6L15 6"></path></svg></div>
                </div>
                {/* map area */}
                <div style={{ position: 'relative', flex: 1, minHeight: '320px', overflow: 'hidden', borderRadius: '0 0 18px 0' }}>
                  <svg viewBox="0 0 720 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <radialGradient id="heroGlowA" cx="0.35" cy="0.4" r="0.5"><stop offset="0%" stopColor="rgba(63,166,107,0.22)"></stop><stop offset="100%" stopColor="rgba(63,166,107,0)"></stop></radialGradient>
                      <clipPath id="uaClipHero"><path d={UA_PATH}></path></clipPath>
                    </defs>
                    <g clipPath="url(#uaClipHero)">
                      <rect x="0" y="0" width="720" height="480" fill="rgba(63,166,107,0.05)"></rect>
                      <rect x="0" y="0" width="720" height="480" fill="url(#heroGlowA)" style={{ pointerEvents: 'none' }}></rect>
                    </g>
                    <path d={UA_PATH} fill="none" stroke="rgba(63,166,107,0.4)" strokeWidth="1.5"></path>
                    {/* city dots */}
                    <MapDot x={UA_CITIES.kyiv.x} y={UA_CITIES.kyiv.y} r={6} pulse />
                    <MapDot x={UA_CITIES.dnipro.x} y={UA_CITIES.dnipro.y} r={5} />
                    <MapDot x={UA_CITIES.vinnytsia.x} y={UA_CITIES.vinnytsia.y} r={5} color="#9BD8B4" />
                    <MapDot x={UA_CITIES.lutsk.x} y={UA_CITIES.lutsk.y} r={6} pulse delay="0.8s" />
                    {/* friend avatar markers on map */}
                    {friends.map((friend, idx) => {
                      const positions = [UA_CITIES.lviv, UA_CITIES.kharkiv, UA_CITIES.odesa];
                      const pos = positions[idx] || UA_CITIES.kyiv;
                      return (
                        <MapAvatar
                          key={friend.id}
                          clipId={`avHero${friend.id}`}
                          src={friend.avatar}
                          title={`${friend.name} - ${friend.currentDestination}`}
                          x={pos.x}
                          y={pos.y}
                          r={20}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* floating toast */}
              {showToast && (
                <div className="at-toast" style={{ position: 'absolute', top: '54px', right: '-18px', width: '190px', background: 'rgba(11,43,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'fadeIn 0.8s 0.5s both', transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <img src="/assets/carpathians_thumb.avif" alt={t('core.landing.previewPlaceNameCarpathians')} style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', flex: '0 0 auto', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <div style={{ fontSize: '10.5px', lineHeight: 1.4 }}>
                      <div style={{ color: 'rgba(244,241,232,0.55)' }}>{t('core.landing.newAchievement')}</div>
                      <div style={{ fontWeight: 700 }}>{t('core.landing.previewAchievementTitle')}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <button onClick={() => setShowToast(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '9px', padding: 0 }}>{t('core.landing.closeToast')}</button>
                    <div style={{ color: '#3FA66B', fontSize: '11px', fontWeight: 700 }}>+250 XP</div>
                  </div>
                </div>
              )}

              {/* floating place card */}
              <div className="at-placecard" style={{ position: 'absolute', bottom: '-26px', right: '-22px', width: '200px', background: 'rgba(11,43,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '13px', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', animation: 'fadeIn 0.8s 0.8s both', transform: 'translateZ(32px)', transformStyle: 'preserve-3d' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>{t('core.landing.previewPlaceName')}</div>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(244,241,232,0.55)', marginBottom: '9px' }}>{t('core.landing.previewPlaceCategory')}</div>
                <img src="/assets/lviv_thumb.avif" alt={t('core.landing.previewPlaceName')} style={{ width: '100%', height: '78px', borderRadius: '9px', marginBottom: '10px', objectFit: 'cover', display: 'block', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(63,166,107,0.16)', color: '#3FA66B', fontSize: '9.5px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11"></path></svg>
                    {t('core.landing.verified')}
                  </div>
                  <div style={{ color: '#3FA66B', fontSize: '11px', fontWeight: 700 }}>+100 XP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ FEATURES ============ */}
      <section id="features" className="at-sec" style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 40px 30px' }}>
        <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(28px, 3.2vw, 40px)', margin: '0 0 40px', color: '#F4F1E8' }}>{t('core.landing.featuresTitle')}</h2>

        {/* min() keeps the track from forcing a 300px column — and a sideways
            scroll — once the viewport itself is narrower than that */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '20px' }}>
          {/* Feature 01 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>01</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>{t('core.landing.feature1Title')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flex: '0 0 auto' }}>
                <div style={{ width: '100px', height: '68px', position: 'relative' }}>
                  <img src="/assets/places/synevyr_1.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: 0, top: 0, zIndex: 1, border: '1.5px solid rgba(255,255,255,0.15)', opacity: 0.65, transform: 'rotate(8deg)' }} />
                  <img src="/assets/places/kamianets_1.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: '16px', top: '4px', zIndex: 2, border: '1.5px solid rgba(255,255,255,0.15)', opacity: 0.85, transform: 'rotate(-4deg)' }} />
                  <img src="/assets/carpathians_thumb.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: '32px', top: '8px', zIndex: 3, border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }} />
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#0B2B20', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: '12px', bottom: '-4px', zIndex: 4, border: '1.5px solid #F4F1E8', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#3FA66B' }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(63,166,107,0.16)', color: '#3FA66B', fontSize: '9.5px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', border: '1px solid rgba(63,166,107,0.25)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
                  {t('core.landing.feature1Badge')}
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.62)' }}>
              {t('core.landing.feature1Body')}
            </div>
          </div>

          {/* Feature 02 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>02</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>{t('core.landing.feature2Title')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', flex: '0 0 auto' }}>
                <div style={{ width: '100px', height: '68px', position: 'relative' }}>
                  <img src="/assets/scenic_gallery_3.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: 0, top: 0, zIndex: 1, border: '1.5px solid rgba(255,255,255,0.15)', opacity: 0.65, transform: 'rotate(8deg)' }} />
                  <img src="/assets/scenic_gallery_2.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: '16px', top: '4px', zIndex: 2, border: '1.5px solid rgba(255,255,255,0.15)', opacity: 0.85, transform: 'rotate(-4deg)' }} />
                  <img src="/assets/scenic_gallery_1.avif" style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover', position: 'absolute', right: '32px', top: '8px', zIndex: 3, border: '1.5px solid rgba(255,255,255,0.25)', boxShadow: '0 4px 10px rgba(0,0,0,0.4)' }} />
                  <img src={friends[0]?.avatar} style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', position: 'absolute', left: '12px', bottom: '-4px', zIndex: 4, border: '1.5px solid #F4F1E8', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(63,166,107,0.16)', color: '#3FA66B', fontSize: '9.5px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', whiteSpace: 'nowrap', border: '1px solid rgba(63,166,107,0.25)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11"></path></svg>
                  {t('core.landing.feature2AiCheck')} <span style={{ opacity: 0.65, margin: '0 2px' }}>•</span> +150 XP
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.62)' }}>
              {t('core.landing.feature2Body')}
            </div>
          </div>

          {/* Feature 03 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>03</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>{t('core.landing.feature3Title')}</div>
              </div>
              <div style={{ width: '92px', height: '88px', flex: '0 0 auto', position: 'relative' }}>
                <svg viewBox="0 0 92 88" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}><path d="M24 26 L64 22 L70 62 L30 66 Z" fill="none" stroke="rgba(63,166,107,0.5)" strokeWidth="1.2" strokeDasharray="3 4"></path></svg>
                <img src={currentUser.avatar} style={{ position: 'absolute', left: '14px', top: '16px', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                <img src={friends[0]?.avatar} style={{ position: 'absolute', right: '12px', top: '10px', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                <img src={friends[1]?.avatar} style={{ position: 'absolute', right: '8px', bottom: '12px', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
                <img src={friends[2]?.avatar} style={{ position: 'absolute', left: '18px', bottom: '8px', width: '22px', height: '22px', borderRadius: '50%', border: '1.5px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.62)' }}>
              {t('core.landing.feature3Body')}
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAP ============ */}
      <section id="map" className="at-sec" style={{ maxWidth: '1240px', margin: '0 auto', padding: '10px 40px' }}>
        <div className="at-panel" style={{ background: '#081E15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: '40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 65% at 60% 45%, rgba(63,166,107,0.08), transparent 70%)' }}></div>
          {/* text col */}
          <div style={{ position: 'relative', flex: '0 1 280px', minWidth: '240px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(26px, 2.8vw, 36px)', lineHeight: 1.2, margin: '0 0 20px' }}>{t('core.landing.mapSectionTitle')}</h2>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(244,241,232,0.62)', margin: '0 0 auto' }}>{t('core.landing.mapSectionBody')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: 'rgba(244,241,232,0.72)', paddingTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3FA66B' }}></span>{t('core.landing.legendVisitedRegions')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#9BD8B4' }}></span>{t('core.landing.legendOpenedPlaces')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#D9B44A' }}></span>{t('core.landing.legendFriends')}</div>
            </div>
          </div>

          {/* big map */}
          <div style={{ position: 'relative', flex: '1 1 520px', minWidth: '320px', minHeight: '380px' }}>
            <svg viewBox="0 0 720 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="bigGlowA" cx="0.3" cy="0.35" r="0.35"><stop offset="0%" stopColor="rgba(63,166,107,0.30)"></stop><stop offset="100%" stopColor="rgba(63,166,107,0)"></stop></radialGradient>
                <radialGradient id="bigGlowB" cx="0.65" cy="0.5" r="0.3"><stop offset="0%" stopColor="rgba(63,166,107,0.22)"></stop><stop offset="100%" stopColor="rgba(63,166,107,0)"></stop></radialGradient>
                <radialGradient id="bigGlowC" cx="0.45" cy="0.7" r="0.25"><stop offset="0%" stopColor="rgba(155,216,180,0.14)"></stop><stop offset="100%" stopColor="rgba(155,216,180,0)"></stop></radialGradient>
                <clipPath id="uaClipBig"><path d={UA_PATH}></path></clipPath>
              </defs>
              <g clipPath="url(#uaClipBig)">
                <rect x="0" y="0" width="720" height="480" fill="rgba(63,166,107,0.05)"></rect>
                <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowA)" style={{ pointerEvents: 'none' }}></rect>
                <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowB)" style={{ pointerEvents: 'none' }}></rect>
                <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowC)" style={{ pointerEvents: 'none' }}></rect>
              </g>
              <path d={UA_PATH} fill="none" stroke="rgba(63,166,107,0.4)" strokeWidth="1.5"></path>
              {/* city dots */}
              <MapDot x={UA_CITIES.dnipro.x} y={UA_CITIES.dnipro.y} r={6} pulse />
              <MapDot x={UA_CITIES.zaporizhzhia.x} y={UA_CITIES.zaporizhzhia.y} r={5} />
              <MapDot x={UA_CITIES.vinnytsia.x} y={UA_CITIES.vinnytsia.y} r={5} color="#9BD8B4" />
              <MapDot x={UA_CITIES.ivanofrankivsk.x} y={UA_CITIES.ivanofrankivsk.y} r={5} color="#D9B44A" />
              <MapDot x={UA_CITIES.poltava.x} y={UA_CITIES.poltava.y} r={5} />
              <MapDot x={UA_CITIES.cherkasy.x} y={UA_CITIES.cherkasy.y} r={5} />
              <MapDot x={UA_CITIES.lutsk.x} y={UA_CITIES.lutsk.y} r={5} color="#D9B44A" />
              <MapDot x={UA_CITIES.mykolaiv.x} y={UA_CITIES.mykolaiv.y} r={6} pulse delay="1.2s" />

              {/* active user + friends avatar markers on map */}
              <MapAvatar clipId="avBigUser" src={currentUser.avatar} title={`${currentUser.name} ${t('core.landing.mapUserSuffix')}`} x={UA_CITIES.kyiv.x} y={UA_CITIES.kyiv.y} r={22} />
              {friends.map((friend, idx) => {
                const positions = [UA_CITIES.lviv, UA_CITIES.kharkiv, UA_CITIES.odesa];
                const pos = positions[idx] || UA_CITIES.dnipro;
                return (
                  <MapAvatar
                    key={friend.id}
                    clipId={`avBig${friend.id}`}
                    src={friend.avatar}
                    title={`${friend.name} - ${friend.currentDestination}`}
                    x={pos.x}
                    y={pos.y}
                    r={22}
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* ============ PROGRESS ============ */}
      <section id="progress" className="at-sec" style={{ maxWidth: '1240px', margin: '0 auto', padding: '20px 40px 10px' }}>
        <div className="at-panel" style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px 40px', display: 'flex', flexWrap: 'wrap', gap: '36px', alignItems: 'center' }}>
          {/* text */}
          <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.3, margin: '0' }}>{t('core.landing.progressTitle')}</h2>
          </div>
          {/* level card */}
          <div style={{ flex: '0 1 280px', minWidth: '250px', background: '#081E15', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '26px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(63,166,107,0.10), transparent 70%)' }}></div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(244,241,232,0.75)', marginBottom: '6px' }}>{t('core.landing.explorerLevel')}</div>
              <div style={{ fontFamily: "'Lora', serif", fontSize: '76px', lineHeight: 1, color: '#9BD8B4', marginBottom: '18px' }}>{currentUser.level}</div>
              <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.10)', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ width: `${(currentUser.xp / 3000) * 100}%`, height: '100%', borderRadius: '3px', background: 'linear-gradient(90deg, #3FA66B, #9BD8B4)' }}></div>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.55)' }}>{currentUser.xp} / 3000 XP</div>
            </div>
          </div>
          {/* achievements list */}
          <div style={{ flex: '1 1 380px', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{t('core.landing.achievementsTitle')}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {achievements.map((ach) => (
                <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '13px 0', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(63,166,107,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3FA66B" strokeWidth="1.8"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"></path><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{ach.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)' }}>{ach.description}</div>
                  </div>
                  <div style={{ color: '#3FA66B', fontSize: '12.5px', fontWeight: 700, flex: '0 0 auto' }}>+{ach.xpReward} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROJECT DETAILS ============ */}
      <section className="at-sec" style={{ maxWidth: '1240px', margin: '0 auto', padding: '20px 40px 40px' }}>
        <div className="at-panel" style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px 36px', display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'center' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '24px', fontWeight: 500, lineHeight: 1.3 }}>{t('core.landing.friendsSectionTitle') || 'Дізнайтеся більше про Absolute Travel'}</div>
            <div style={{ fontSize: '14.5px', color: 'rgba(244,241,232,0.65)', lineHeight: 1.6 }}>
              Absolute Travel — це інтерактивна соціальна платформа для дослідження України. Ознайомтеся з можливостями проєкту, нашою метою та командою, що створила цей застосунок.
            </div>
          </div>
          <div style={{ flex: '0 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', minWidth: '220px' }}>
            <button
              onClick={() => setShowProjectModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                background: '#3FA66B',
                color: '#071F16',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '14px',
                fontWeight: 700,
                padding: '15px 30px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(63, 166, 107, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>Ознайомитися з проектом</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </button>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section id="cta" className="at-cta" style={{ position: 'relative', padding: '110px 40px 130px', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/forest_bg.avif')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18, mixBlendMode: 'color-dodge', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #071F16 0%, rgba(7,31,22,0.85) 60%, rgba(7,31,22,0.2) 100%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 60% at 50% 100%, rgba(63,166,107,0.15), transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(32px, 3.6vw, 46px)', lineHeight: 1.25, margin: 0, color: '#F4F1E8' }}><Trans i18nKey="core.landing.ctaTitle" components={{ 1: <br /> }} /></h2>
          <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
            {t('core.landing.ctaButton')}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
          </button>
        </div>
      </section>

      {/* ============ PROJECT MODAL ============ */}
      {showProjectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(7, 31, 22, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.25s ease both',
          }}
          onClick={() => setShowProjectModal(false)}
        >
          <div
            style={{
              background: '#0B2B20',
              border: '1px solid rgba(63, 166, 107, 0.25)',
              borderRadius: '20px',
              padding: '36px',
              width: '100%',
              maxWidth: '540px',
              maxHeight: '90dvh',
              overflowY: 'auto',
              boxShadow: '0 30px 60px rgba(0,0,0,0.8), 0 0 50px rgba(63, 166, 107, 0.15)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: 0, color: '#F4F1E8' }}>
                Про проєкт Absolute Travel
              </h2>
              <button
                onClick={() => setShowProjectModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(244, 241, 232, 0.5)',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontSize: '14px', lineHeight: 1.6, color: 'rgba(244, 241, 232, 0.8)' }}>
              <div>
                <strong style={{ color: '#3FA66B', display: 'block', marginBottom: '6px', fontSize: '15px' }}>Що це за проєкт?</strong>
                <p style={{ margin: 0 }}>
                  <strong>Absolute Travel</strong> — це гейміфікована соціальна платформа для дослідження України. Вона об'єднує інтерактивну мапу пам'яток, соціальні функції та ігрову механіку подорожей, щоб перетворити будь-яку поїздку на захоплюючий квест.
                </p>
              </div>

              <div>
                <strong style={{ color: '#3FA66B', display: 'block', marginBottom: '6px', fontSize: '15px' }}>Яку проблему ми вирішуємо?</strong>
                <p style={{ margin: 0, marginBottom: '8px' }}>
                  Багато людей хочуть подорожувати Україною та відкривати для себе нові куточки, але стикаються з трьома основними труднощами:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>🗺️ <strong>Брак ідей та одноманітність:</strong> Важко знайти цікаві, нетипові та перевірені локації за межами кількох найпопулярніших туристичних міст.</li>
                  <li>📉 <strong>Відсутність мотивації:</strong> Прості мандрівки без інтерактиву з часом набридають, мандрівникам не вистачає азарту та відчуття пригод.</li>
                  <li>🔒 <strong>Соціальна ізоляція:</strong> Складно ділитися досвідом і корисними нотатками у звичайних соціальних мережах, які перевантажені зайвим інформаційним шумом.</li>
                </ul>
              </div>

              <div>
                <strong style={{ color: '#3FA66B', display: 'block', marginBottom: '6px', fontSize: '15px' }}>Як проєкт вирішує ці проблеми?</strong>
                <p style={{ margin: 0, marginBottom: '8px' }}>
                  Absolute Travel перетворює вивчення країни на інтерактивну гру. Завдяки нашому додатку користувачі отримують:
                </p>
                <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <li>📍 <strong>Базу курованих локацій:</strong> Досліджуйте тисячі цікавих місць — від таємничих замків та каньйонів до затишних панорам у Карпатах.</li>
                  <li>📸 <strong>AI-верифікацію подорожей:</strong> Завантажуйте фотографії з подорожей — наш штучний інтелект перевірить фото, підтвердить ваше відвідання та нарахує бали досвіду (XP).</li>
                  <li>🏆 <strong>Рівні та досягнення:</strong> Отримуйте досвід, відкривайте нові рівні та збирайте унікальні нагороди і значки за виконання квестів.</li>
                  <li>💬 <strong>Спільноту мандрівників:</strong> Додавайте друзів, спілкуйтеся у чаті, діліться своїми досягненнями та стежте за активністю інших користувачів у реальному часі.</li>
                </ul>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '20px' }}>
                <strong style={{ color: '#3FA66B', display: 'block', marginBottom: '10px', fontSize: '15px' }}>Команда розробників:</strong>
                <p style={{ margin: 0, marginBottom: '10px', fontSize: '13.5px', color: 'rgba(244, 241, 232, 0.65)' }}>
                  Цей проєкт був спроєктований, розроблений та втілений у життя командою з 4 талановитих розробників:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#F4F1E8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>👨‍✈️ <strong>Лисак Максим</strong></span>
                    <span style={{ color: '#9BD8B4', fontSize: '12px', fontWeight: 600, background: 'rgba(63, 166, 107, 0.16)', padding: '2px 8px', borderRadius: '6px' }}>Капітан команди</span>
                  </div>
                  <div>👨‍💻 Ніколайчук Максим</div>
                  <div>👨‍💻 Осьмак Ярослав</div>
                  <div>👨‍💻 Пилипчук Дмитро</div>
                </div>
              </div>
            </div>

            {/* Footer button */}
            <button
              onClick={() => setShowProjectModal(false)}
              style={{
                width: '100%',
                padding: '13px',
                background: 'rgba(63, 166, 107, 0.14)',
                border: '1px solid rgba(63, 166, 107, 0.4)',
                color: '#9BD8B4',
                fontFamily: "'Manrope', sans-serif",
                fontSize: '13.5px',
                fontWeight: 700,
                borderRadius: '10px',
                cursor: 'pointer',
                marginTop: '28px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(63, 166, 107, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(63, 166, 107, 0.14)')}
            >
              Закрити
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
