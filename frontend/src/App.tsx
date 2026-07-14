import React, { useState, useEffect } from 'react';
import './App.css';

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

const DEFAULT_FRIENDS: User[] = [
  {
    id: 2,
    name: 'Марія',
    avatar: '/assets/avatar_mariya.avif',
    level: 18,
    xp: 1200,
    currentDestination: 'Синевир',
    achievements: [],
  },
  {
    id: 3,
    name: 'Дмитро',
    avatar: '/assets/avatar_dmytro.avif',
    level: 21,
    xp: 1850,
    currentDestination: 'Говерла',
    achievements: [],
  },
  {
    id: 4,
    name: 'Ірина',
    avatar: '/assets/avatar_iryna.avif',
    level: 15,
    xp: 950,
    currentDestination: 'Бакота',
    achievements: [],
  },
];

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

function App() {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [friends, setFriends] = useState<User[]>(DEFAULT_FRIENDS);
  const [destinations, setDestinations] = useState<Destination[]>(DEFAULT_DESTINATIONS);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);

  const [showToast, setShowToast] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/data')
      .then((res) => {
        if (!res.ok) throw new Error('API server unavailable');
        return res.json();
      })
      .then((data) => {
        if (data.currentUser) setCurrentUser(data.currentUser);
        if (data.friends && data.friends.length) setFriends(data.friends);
        if (data.destinations && data.destinations.length) setDestinations(data.destinations);
        if (data.achievements && data.achievements.length) setAchievements(data.achievements);
      })
      .catch((err) => {
        console.warn('API fetch failed, using local fallback:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#071F16', color: '#F4F1E8', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ============ NAVBAR ============ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '14px 40px', background: 'rgba(7,31,22,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
          <img src="/assets/logo.avif" alt="Absolute Travel" style={{ height: '42px', width: 'auto', display: 'block' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '13.5px', fontWeight: 500, color: 'rgba(244,241,232,0.85)' }}>
          <a href="#features" style={{ transition: 'color 0.2s' }}>Як це працює</a>
          <a href="#features" style={{ transition: 'color 0.2s' }}>Можливості</a>
          <a href="#map" style={{ transition: 'color 0.2s' }}>Карта</a>
          <a href="#progress" style={{ transition: 'color 0.2s' }}>Досягнення</a>
          <a href="#cta" style={{ transition: 'color 0.2s' }}>Контакти</a>
        </div>
        <a href="#cta" style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#9BD8B4', fontSize: '13.5px', fontWeight: 700, padding: '11px 22px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', transition: 'all 0.2s' }}>
          Почати дослідження
        </a>
      </nav>

      {/* ============ HERO ============ */}
      <header id="top" style={{ position: 'relative', padding: '90px 40px 110px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/forest_bg.avif')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18, mixBlendMode: 'color-dodge', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,31,22,0.2) 0%, rgba(7,31,22,0.85) 60%, #071F16 100%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 25% 35%, rgba(63,166,107,0.15), transparent 70%)', pointerEvents: 'none' }}></div>

        <div style={{ position: 'relative', maxWidth: '1240px', width: '100%', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '56px', alignItems: 'center' }}>
          {/* left copy */}
          <div style={{ flex: '1 1 420px', minWidth: '320px', animation: 'fadeUp 0.7s ease both' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: '#3FA66B', marginBottom: '22px' }}>EXPLORE UKRAINE</div>
            <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(38px, 4.6vw, 58px)', lineHeight: 1.14, margin: '0 0 26px', color: '#F4F1E8' }}>
              Відкрий Україну.<br />Разом із друзями.
            </h1>
            <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '440px', margin: '0 0 34px' }}>
              Absolute Travel — соціальна платформа для дослідження України. Знаходь цікаві місця, проходь маршрути, виконуй завдання та створюй свою карту відкриттів разом із друзями.
            </p>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '44px' }}>
              <a href="#map" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontSize: '14px', fontWeight: 700, padding: '15px 26px', borderRadius: '12px', transition: 'background 0.2s' }}>
                Почати дослідження
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
              </a>
              <a href="#features" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'transparent', color: '#F4F1E8', fontSize: '14px', fontWeight: 600, padding: '15px 26px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.18)', transition: 'border-color 0.2s' }}>
                Як це працює
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"></circle><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"></path></svg>
              </a>
            </div>
          </div>

          {/* right: app preview */}
          <div style={{ flex: '1 1 500px', minWidth: '340px', position: 'relative', perspective: '1200px', transformStyle: 'preserve-3d', animation: 'fadeUp 0.7s 0.15s ease both' }}>
            <div style={{ position: 'relative', background: 'rgba(8,26,18,0.92)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', boxShadow: '0 30px 60px -15px rgba(0,0,0,0.8), 0 0 50px rgba(63, 166, 107, 0.15)', overflow: 'visible', transform: 'rotateY(-15deg) rotateX(6deg) rotateZ(1deg)', transformStyle: 'preserve-3d' }}>
              {/* app top bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(244,241,232,0.8)" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16"></path><path d="M4 12h16"></path><path d="M4 18h16"></path></svg>
                <div style={{ display: 'flex', gap: '20px', fontSize: '11px', fontWeight: 600, flex: 1 }}>
                  <span style={{ color: '#3FA66B', borderBottom: '2px solid #3FA66B', paddingBottom: '4px' }}>Карта</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>Маршрути</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>Друзі</span>
                  <span style={{ color: 'rgba(244,241,232,0.55)' }}>Досягнення</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }} />
                  <div style={{ fontSize: '9.5px', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700 }}>{currentUser.name}</div>
                    <div style={{ color: 'rgba(244,241,232,0.5)' }}>Рівень {currentUser.level}</div>
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
                    </defs>
                    <path d="M60,95 L110,78 L150,70 L205,84 L250,68 L300,78 L345,60 L395,76 L440,58 L480,74 L530,80 L575,105 L640,128 L688,165 L695,205 L662,235 L618,255 L575,248 L548,270 L520,290 L508,312 L522,338 L552,356 L516,378 L472,352 L482,320 L458,300 L412,304 L352,314 L306,292 L268,326 L228,318 L192,302 L150,282 L112,252 L82,208 L58,155 Z" fill="rgba(63,166,107,0.03)" stroke="rgba(63,166,107,0.20)" strokeWidth="1.5"></path>
                    <path d="M60,95 L110,78 L150,70 L205,84 L215,160 L180,240 L150,282 L112,252 L82,208 L58,155 Z" fill="rgba(63,166,107,0.16)" stroke="rgba(63,166,107,0.35)" strokeWidth="1.2"></path>
                    <path d="M205,84 L250,68 L300,78 L345,60 L395,76 L410,150 L310,180 L215,160 Z" fill="rgba(63,166,107,0.10)" stroke="rgba(63,166,107,0.25)" strokeWidth="1.2"></path>
                    <rect x="0" y="0" width="720" height="480" fill="url(#heroGlowA)" style={{ pointerEvents: 'none' }}></rect>
                  </svg>
                  {/* dots */}
                  <div style={{ position: 'absolute', left: '22%', top: '30%', width: '8px', height: '8px', borderRadius: '50%', background: '#3FA66B', animation: 'pulseDot 2.5s infinite' }}></div>
                  <div style={{ position: 'absolute', left: '35%', top: '22%', width: '6px', height: '6px', borderRadius: '50%', background: '#3FA66B', opacity: 0.85 }}></div>
                  <div style={{ position: 'absolute', left: '48%', top: '34%', width: '7px', height: '7px', borderRadius: '50%', background: '#9BD8B4' }}></div>
                  <div style={{ position: 'absolute', left: '68%', top: '38%', width: '8px', height: '8px', borderRadius: '50%', background: '#3FA66B', animation: 'pulseDot 2.5s 0.8s infinite' }}></div>
                  
                  {/* friend avatar markers on map */}
                  {friends.map((friend, idx) => {
                    const positions = [
                      { left: '27%', top: '38%' }, // Mariya
                      { left: '62%', top: '42%' }, // Dmytro
                      { left: '42%', top: '74%' }, // Iryna
                    ];
                    const pos = positions[idx] || { left: '50%', top: '50%' };
                    return (
                      <img
                        key={friend.id}
                        src={friend.avatar}
                        alt={friend.name}
                        title={`${friend.name} - ${friend.currentDestination}`}
                        style={{ position: 'absolute', left: pos.left, top: pos.top, width: '30px', height: '30px', borderRadius: '50%', border: '2px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 4px 14px rgba(0,0,0,0.5)' }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* floating toast */}
              {showToast && (
                <div style={{ position: 'absolute', top: '54px', right: '-18px', width: '190px', background: 'rgba(11,43,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '12px 14px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'fadeIn 0.8s 0.5s both', transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <img src="/assets/carpathians_thumb.avif" alt="Карпати" style={{ width: '30px', height: '30px', borderRadius: '8px', objectFit: 'cover', flex: '0 0 auto', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <div style={{ fontSize: '10.5px', lineHeight: 1.4 }}>
                      <div style={{ color: 'rgba(244,241,232,0.55)' }}>Нове досягнення!</div>
                      <div style={{ fontWeight: 700 }}>Карпатський дослідник</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                    <button onClick={() => setShowToast(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '9px', padding: 0 }}>Закрити</button>
                    <div style={{ color: '#3FA66B', fontSize: '11px', fontWeight: 700 }}>+250 XP</div>
                  </div>
                </div>
              )}

              {/* floating place card */}
              <div style={{ position: 'absolute', bottom: '-26px', right: '-22px', width: '200px', background: 'rgba(11,43,32,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '13px', boxShadow: '0 24px 50px rgba(0,0,0,0.55)', animation: 'fadeIn 0.8s 0.8s both', transform: 'translateZ(32px)', transformStyle: 'preserve-3d' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 800 }}>Львів</div>
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(244,241,232,0.55)', marginBottom: '9px' }}>Історичний центр</div>
                <img src="/assets/lviv_thumb.avif" alt="Львів" style={{ width: '100%', height: '78px', borderRadius: '9px', marginBottom: '10px', objectFit: 'cover', display: 'block', border: '1px solid rgba(255,255,255,0.08)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(63,166,107,0.16)', color: '#3FA66B', fontSize: '9.5px', fontWeight: 700, padding: '4px 8px', borderRadius: '6px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5 11-11"></path></svg>
                    Підтверджено
                  </div>
                  <div style={{ color: '#3FA66B', fontSize: '11px', fontWeight: 700 }}>+100 XP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============ FEATURES ============ */}
      <section id="features" style={{ maxWidth: '1240px', margin: '0 auto', padding: '40px 40px 30px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: '#3FA66B', marginBottom: '14px' }}>МОЖЛИВОСТІ</div>
        <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(28px, 3.2vw, 40px)', margin: '0 0 40px', color: '#F4F1E8' }}>Україна, яку ти ще не бачив</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {/* Feature 01 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>01</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)' }}>DISCOVER</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>Знаходь цікаві місця</div>
              </div>
              <div style={{ width: '92px', height: '88px', flex: '0 0 auto', borderRadius: '10px', background: 'linear-gradient(180deg, #123326, #0B2B20)', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ position: 'absolute', left: '-10%', right: '-10%', bottom: 0, height: '60%', background: '#1A4030', clipPath: 'polygon(0 100%, 30% 20%, 55% 70%, 78% 10%, 100% 100%)' }}></div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.62)' }}>
              Знаходь тисячі дивовижних місць України — від замків та каньйонів до затишних куточків у Карпатах.
            </div>
          </div>

          {/* Feature 02 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>02</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)' }}>EXPLORE</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>Підтверджуй свої відкриття</div>
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
                  AI перевірка <span style={{ opacity: 0.65, margin: '0 2px' }}>•</span> +150 XP
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.62)' }}>
              Завантажуй фото, проходь перевірку штучним інтелектом та отримуй досвід за кожне відкриття.
            </div>
          </div>

          {/* Feature 03 */}
          <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', color: '#3FA66B', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>03</div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.18em', color: 'rgba(244,241,232,0.5)' }}>CONNECT</div>
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '21px', fontWeight: 500 }}>Досліджуй разом</div>
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
              Створюй маршрути, запрошуй друзів, ділись відкриттями та досліджуйте Україну разом.
            </div>
          </div>
        </div>
      </section>

      {/* ============ MAP ============ */}
      <section id="map" style={{ maxWidth: '1240px', margin: '0 auto', padding: '10px 40px' }}>
        <div style={{ background: '#081E15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '40px', display: 'flex', flexWrap: 'wrap', gap: '40px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 55% 65% at 60% 45%, rgba(63,166,107,0.08), transparent 70%)' }}></div>
          {/* text col */}
          <div style={{ position: 'relative', flex: '0 1 280px', minWidth: '240px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.22em', color: '#3FA66B', marginBottom: '18px' }}>ТВОЯ КАРТА</div>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(26px, 2.8vw, 36px)', lineHeight: 1.2, margin: '0 0 20px' }}>Твоя карта відкриттів</h2>
            <p style={{ fontSize: '14px', lineHeight: 1.7, color: 'rgba(244,241,232,0.62)', margin: '0 0 auto' }}>Кожне місце залишає слід. Заповнюй карту України своїми пригодами.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: 'rgba(244,241,232,0.72)', paddingTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3FA66B' }}></span>Відвідані регіони</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#9BD8B4' }}></span>Відкриті місця</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#D9B44A' }}></span>Друзі</div>
              {showRoutes && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '16px', height: '0', borderTop: '2px dashed rgba(244,241,232,0.5)' }}></span>Активні Маршрути</div>
              )}
            </div>
          </div>

          {/* big map */}
          <div style={{ position: 'relative', flex: '1 1 520px', minWidth: '320px', minHeight: '380px' }}>
            <svg viewBox="0 0 720 480" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="bigGlowA" cx="0.3" cy="0.35" r="0.35"><stop offset="0%" stopColor="rgba(63,166,107,0.30)"></stop><stop offset="100%" stopColor="rgba(63,166,107,0)"></stop></radialGradient>
                <radialGradient id="bigGlowB" cx="0.65" cy="0.5" r="0.3"><stop offset="0%" stopColor="rgba(63,166,107,0.22)"></stop><stop offset="100%" stopColor="rgba(63,166,107,0)"></stop></radialGradient>
                <radialGradient id="bigGlowC" cx="0.45" cy="0.7" r="0.25"><stop offset="0%" stopColor="rgba(155,216,180,0.14)"></stop><stop offset="100%" stopColor="rgba(155,216,180,0)"></stop></radialGradient>
              </defs>
              <path d="M60,95 L110,78 L150,70 L205,84 L250,68 L300,78 L345,60 L395,76 L440,58 L480,74 L530,80 L575,105 L640,128 L688,165 L695,205 L662,235 L618,255 L575,248 L548,270 L520,290 L508,312 L522,338 L552,356 L516,378 L472,352 L482,320 L458,300 L412,304 L352,314 L306,292 L268,326 L228,318 L192,302 L150,282 L112,252 L82,208 L58,155 Z" fill="rgba(63,166,107,0.03)" stroke="rgba(63,166,107,0.20)" strokeWidth="1.5"></path>
              <path d="M60,95 L110,78 L150,70 L205,84 L215,160 L180,240 L150,282 L112,252 L82,208 L58,155 Z" fill="rgba(63,166,107,0.18)" stroke="rgba(63,166,107,0.4)" strokeWidth="1.2"></path>
              <path d="M205,84 L250,68 L300,78 L345,60 L395,76 L410,150 L310,180 L215,160 Z" fill="rgba(63,166,107,0.12)" stroke="rgba(63,166,107,0.3)" strokeWidth="1.2"></path>
              <path d="M180,240 L310,180 L350,220 L306,292 L268,326 L228,318 L192,302 L150,282 Z" fill="rgba(63,166,107,0.08)" stroke="rgba(63,166,107,0.25)" strokeWidth="1.2"></path>
              <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowA)" style={{ pointerEvents: 'none' }}></rect>
              <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowB)" style={{ pointerEvents: 'none' }}></rect>
              <rect x="0" y="0" width="720" height="480" fill="url(#bigGlowC)" style={{ pointerEvents: 'none' }}></rect>
              
              {showRoutes && (
                <g fill="none" stroke="rgba(217,180,74,0.55)" strokeWidth="1.6" strokeDasharray="5 6">
                  <path d="M150,180 C220,140 320,150 390,180 C450,205 520,190 580,160"></path>
                  <path d="M200,260 C280,300 380,290 460,250"></path>
                  <path d="M390,180 C380,230 350,270 300,300"></path>
                </g>
              )}
            </svg>
            {/* dots */}
            <div style={{ position: 'absolute', left: '18%', top: '34%', width: '9px', height: '9px', borderRadius: '50%', background: '#3FA66B', animation: 'pulseDot 2.5s infinite' }}></div>
            <div style={{ position: 'absolute', left: '28%', top: '24%', width: '7px', height: '7px', borderRadius: '50%', background: '#3FA66B' }}></div>
            <div style={{ position: 'absolute', left: '40%', top: '30%', width: '7px', height: '7px', borderRadius: '50%', background: '#9BD8B4' }}></div>
            <div style={{ position: 'absolute', left: '52%', top: '22%', width: '8px', height: '8px', borderRadius: '50%', background: '#3FA66B' }}></div>
            <div style={{ position: 'absolute', left: '64%', top: '32%', width: '7px', height: '7px', borderRadius: '50%', background: '#D9B44A' }}></div>
            <div style={{ position: 'absolute', left: '76%', top: '40%', width: '8px', height: '8px', borderRadius: '50%', background: '#3FA66B', animation: 'pulseDot 2.5s 1.2s infinite' }}></div>
            <div style={{ position: 'absolute', left: '24%', top: '52%', width: '7px', height: '7px', borderRadius: '50%', background: '#D9B44A' }}></div>
            <div style={{ position: 'absolute', left: '36%', top: '60%', width: '8px', height: '8px', borderRadius: '50%', background: '#3FA66B' }}></div>

            {/* active user + friends avatar markers on map */}
            <img src={currentUser.avatar} title={`${currentUser.name} (Ви)`} style={{ position: 'absolute', left: '42%', top: '18%', width: '34px', height: '34px', borderRadius: '50%', border: '2px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,0.5)', zIndex: 10 }} />
            {friends.map((friend, idx) => {
              const positions = [
                { left: '56%', top: '40%' }, // Mariya
                { left: '32%', top: '64%' }, // Dmytro
              ];
              const pos = positions[idx] || { left: '50%', top: '50%' };
              return (
                <img
                  key={friend.id}
                  src={friend.avatar}
                  alt={friend.name}
                  title={`${friend.name} - ${friend.currentDestination}`}
                  style={{ position: 'absolute', left: pos.left, top: pos.top, width: '34px', height: '34px', borderRadius: '50%', border: '2px solid #F4F1E8', objectFit: 'cover', boxShadow: '0 6px 16px rgba(0,0,0,0.5)', zIndex: 5 }}
                />
              );
            })}

            {/* map control actions */}
            <div style={{ position: 'absolute', right: 0, top: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowRoutes(!showRoutes)}
                title="Перемкнути відображення маршрутів"
                style={{ width: '34px', height: '34px', borderRadius: '9px', background: 'rgba(11,43,32,0.9)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#F4F1E8' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PROGRESS ============ */}
      <section id="progress" style={{ maxWidth: '1240px', margin: '0 auto', padding: '20px 40px 10px' }}>
        <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '36px 40px', display: 'flex', flexWrap: 'wrap', gap: '36px', alignItems: 'center' }}>
          {/* text */}
          <div style={{ flex: '1 1 260px', minWidth: '240px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.22em', color: '#3FA66B', marginBottom: '16px' }}>ПРОГРЕС</div>
            <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 2.4vw, 32px)', lineHeight: 1.3, margin: '0' }}>Кожне відкриття наближає тебе до нового рівня.</h2>
          </div>
          {/* level card */}
          <div style={{ flex: '0 1 280px', minWidth: '250px', background: '#081E15', border: '1px solid rgba(255,255,255,0.10)', borderRadius: '16px', padding: '26px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(63,166,107,0.10), transparent 70%)' }}></div>
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(244,241,232,0.75)', marginBottom: '6px' }}>Explorer Level</div>
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
              <div style={{ fontSize: '14px', fontWeight: 700 }}>Досягнення</div>
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

      {/* ============ FRIENDS ============ */}
      <section style={{ maxWidth: '1240px', margin: '0 auto', padding: '20px 40px 40px' }}>
        <div style={{ background: '#0B2B20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '32px 36px', display: 'flex', flexWrap: 'wrap', gap: '28px', alignItems: 'stretch' }}>
          <div style={{ flex: '0 1 220px', minWidth: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px' }}>
            <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.22em', color: '#3FA66B' }}>ДРУЗІ</div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '23px', fontWeight: 500, lineHeight: 1.35 }}>Досліджуйте разом ще цікавіше</div>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {friends.map((friend) => (
              <div key={friend.id} style={{ background: '#081E15', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                  <img src={friend.avatar} alt={friend.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.15)', flex: '0 0 auto' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700 }}>{friend.name}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(244,241,232,0.5)', lineHeight: 1.4 }}>зараз досліджує<br />{friend.currentDestination || 'Україну'}</div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '11px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'rgba(244,241,232,0.75)', cursor: 'pointer' }}>Переглянути</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section id="cta" style={{ position: 'relative', padding: '110px 40px 130px', overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/assets/forest_bg.avif')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.18, mixBlendMode: 'color-dodge', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #071F16 0%, rgba(7,31,22,0.85) 60%, rgba(7,31,22,0.2) 100%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 60% at 50% 100%, rgba(63,166,107,0.15), transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative', maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
          <div style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.24em', color: '#3FA66B', textTransform: 'uppercase' }}>готовий до пригод!</div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(32px, 3.6vw, 46px)', lineHeight: 1.25, margin: 0, color: '#F4F1E8' }}>Твоя наступна пригода<br />вже поруч.</h2>
          <a href="#top" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontSize: '14px', fontWeight: 700, padding: '15px 30px', borderRadius: '12px', marginTop: '8px' }}>
            Почати подорож
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
          </a>
        </div>
      </section>

    </div>
  );
}

export default App;
