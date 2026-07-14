import { useState, useEffect } from 'react';
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

// Simplified real-world outline of Ukraine (incl. Crimea), viewBox 0 0 720 480
const UA_PATH = "M357.5,61.1 L369.4,63.0 L377.4,52.2 L387.0,54.6 L419.9,50.0 L440.1,77.0 L432.2,86.6 L434.9,101.4 L460.1,103.7 L471.4,124.4 L470.7,133.8 L511.0,150.5 L535.3,143.0 L554.9,165.3 L573.4,164.8 L620.1,180.3 L620.5,194.3 L607.6,219.2 L614.6,245.5 L609.6,261.4 L579.0,264.9 L562.6,278.2 L561.6,299.4 L536.3,303.2 L515.2,318.6 L485.5,321.1 L458.2,338.9 L460.1,368.5 L475.6,380.0 L507.9,377.2 L501.7,394.2 L467.0,402.4 L424.0,430.0 L406.4,420.3 L413.4,397.9 L378.7,384.0 L384.3,374.8 L414.7,359.0 L405.5,348.1 L356.2,336.0 L354.0,318.3 L324.6,324.1 L312.9,350.4 L288.3,385.6 L274.0,377.4 L259.1,385.1 L244.9,376.3 L252.9,371.1 L258.4,354.8 L267.1,339.6 L264.9,331.0 L271.5,327.2 L274.6,333.8 L293.3,335.2 L301.7,331.7 L295.8,326.9 L298.0,319.8 L287.0,307.7 L282.4,287.7 L270.8,279.9 L273.1,263.8 L258.8,251.0 L245.7,249.2 L222.4,234.3 L201.3,239.0 L193.7,246.1 L180.4,246.1 L172.4,257.2 L149.0,261.8 L138.2,269.1 L123.4,257.5 L103.1,257.3 L83.5,252.0 L69.8,262.2 L67.6,249.4 L50.0,236.5 L56.2,217.3 L65.0,204.9 L71.9,207.6 L63.7,186.2 L92.5,146.6 L108.2,141.0 L111.6,127.7 L95.7,86.1 L110.9,84.2 L128.2,71.3 L152.8,70.2 L184.8,74.0 L220.2,85.4 L245.2,86.4 L257.1,93.2 L269.0,84.9 L277.3,96.1 L305.9,93.8 L318.5,98.4 L320.5,74.4 L330.3,64.0 Z";

// Nested inset "elevation contour" outlines derived from UA_PATH for map texture
const UA_CONTOURS = [
  "M353.9,78.6 L364.6,80.3 L371.8,70.6 L380.4,72.8 L410.0,68.6 L428.2,92.9 L421.1,101.6 L423.5,114.9 L446.2,117.0 L456.4,135.6 L455.7,144.0 L492.0,159.1 L513.9,152.3 L531.5,172.4 L548.2,171.9 L590.2,185.9 L590.6,198.5 L579.0,220.9 L585.3,244.6 L580.8,258.9 L553.2,262.0 L538.5,274.0 L537.6,293.1 L514.8,296.5 L495.8,310.4 L469.1,312.6 L444.5,328.6 L446.2,355.3 L460.2,365.6 L489.2,363.1 L483.6,378.4 L452.4,385.8 L413.7,410.6 L397.9,401.9 L404.2,381.7 L372.9,369.2 L378.0,360.9 L405.3,346.7 L397.1,336.9 L352.7,326.0 L350.7,310.1 L324.3,315.3 L313.7,339.0 L291.6,370.7 L278.7,363.3 L265.3,370.2 L252.5,362.3 L259.7,357.6 L264.7,342.9 L272.5,329.3 L270.5,321.5 L276.5,318.1 L279.3,324.0 L296.1,325.3 L303.6,322.2 L298.3,317.8 L300.3,311.4 L290.4,300.6 L286.3,282.6 L275.8,275.5 L277.9,261.0 L265.0,249.5 L253.2,247.9 L232.3,234.5 L213.3,238.7 L206.4,245.1 L194.5,245.1 L187.3,255.1 L166.2,259.2 L156.5,265.8 L143.2,255.4 L124.9,255.2 L107.3,250.4 L94.9,259.6 L93.0,248.1 L77.1,236.5 L82.7,219.2 L90.6,208.0 L96.8,210.5 L89.4,191.2 L115.4,155.6 L129.5,150.5 L132.6,138.6 L118.2,101.1 L131.9,99.4 L147.5,87.8 L169.6,86.8 L198.4,90.2 L230.3,100.5 L252.8,101.4 L263.5,107.5 L274.2,100.0 L281.7,110.1 L307.4,108.0 L318.8,112.2 L320.6,90.6 L329.4,81.2 Z",
  "M344.8,122.4 L352.5,123.6 L357.7,116.6 L364.0,118.2 L385.4,115.2 L398.5,132.7 L393.3,139.0 L395.1,148.6 L411.5,150.1 L418.8,163.6 L418.4,169.7 L444.6,180.5 L460.4,175.6 L473.1,190.1 L485.1,189.8 L515.5,199.9 L515.7,209.0 L507.4,225.2 L511.9,242.3 L508.7,252.6 L488.8,254.9 L478.1,263.5 L477.5,277.3 L461.0,279.8 L447.3,289.8 L428.0,291.4 L410.2,303.0 L411.5,322.2 L421.6,329.7 L442.6,327.9 L438.5,338.9 L416.0,344.3 L388.0,362.2 L376.6,355.9 L381.1,341.3 L358.6,332.3 L362.2,326.3 L382.0,316.0 L376.0,309.0 L343.9,301.1 L342.5,289.6 L323.4,293.4 L315.8,310.5 L299.8,333.3 L290.5,328.0 L280.8,333.0 L271.6,327.3 L276.8,323.9 L280.4,313.3 L286.0,303.4 L284.6,297.8 L288.9,295.4 L290.9,299.7 L303.1,300.6 L308.5,298.3 L304.7,295.2 L306.1,290.6 L299.0,282.7 L296.0,269.7 L288.4,264.6 L289.9,254.2 L280.6,245.8 L272.1,244.7 L257.0,235.0 L243.3,238.0 L238.3,242.7 L229.7,242.7 L224.5,249.9 L209.3,252.9 L202.2,257.6 L192.6,250.1 L179.4,249.9 L166.7,246.5 L157.8,253.1 L156.4,244.8 L144.9,236.4 L148.9,223.9 L154.7,215.9 L159.2,217.6 L153.8,203.7 L172.5,178.0 L182.7,174.3 L185.0,165.7 L174.6,138.7 L184.5,137.4 L195.7,129.0 L211.7,128.3 L232.5,130.8 L255.5,138.2 L271.8,138.9 L279.5,143.3 L287.3,137.9 L292.7,145.2 L311.3,143.7 L319.4,146.7 L320.7,131.1 L327.1,124.3 Z",
];

// Marker coordinates of major cities inside UA_PATH (viewBox 720x480), mapped from real lat/lon
const UA_CITIES = {
  kyiv: { x: 314, y: 142 },
  lviv: { x: 110, y: 171 },
  odesa: { x: 333, y: 296 },
  kharkiv: { x: 488, y: 172 },
  dnipro: { x: 457, y: 237 },
  zaporizhzhia: { x: 460, y: 266 },
  vinnytsia: { x: 250, y: 200 },
  ivanofrankivsk: { x: 131, y: 210 },
  poltava: { x: 442, y: 183 },
  cherkasy: { x: 363, y: 190 },
  lutsk: { x: 150, y: 128 },
  mykolaiv: { x: 361, y: 305 },
};

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

function App({ onStart }: { onStart?: () => void } = {}) {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_USER);
  const [friends, setFriends] = useState<User[]>(DEFAULT_FRIENDS);
  const [, setDestinations] = useState<Destination[]>(DEFAULT_DESTINATIONS);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);

  const [showToast, setShowToast] = useState(true);
  const [, setLoading] = useState(true);

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

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", background: '#071F16', color: '#F4F1E8', minHeight: '100vh', overflowX: 'hidden' }}>
      
      {/* ============ NAVBAR ============ */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px', padding: '14px 40px', background: 'rgba(7,31,22,0.8)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', flex: '0 0 auto' }}>
          <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '42px', width: 'auto', display: 'block' }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '36px', flexWrap: 'wrap', justifyContent: 'center', fontSize: '13.5px', fontWeight: 500, color: 'rgba(244,241,232,0.85)' }}>
          <a href="#features" style={{ transition: 'color 0.2s' }}>Як це працює</a>
          <a href="#features" style={{ transition: 'color 0.2s' }}>Можливості</a>
          <a href="#map" style={{ transition: 'color 0.2s' }}>Карта</a>
          <a href="#progress" style={{ transition: 'color 0.2s' }}>Досягнення</a>
          <a href="#cta" style={{ transition: 'color 0.2s' }}>Контакти</a>
        </div>
        <button onClick={onStart} style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', color: '#9BD8B4', fontFamily: "'Manrope', sans-serif", fontSize: '13.5px', fontWeight: 700, padding: '11px 22px', borderRadius: '10px', border: '1px solid rgba(63,166,107,0.45)', cursor: 'pointer', transition: 'all 0.2s' }}>
          Почати дослідження
        </button>
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
              <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, padding: '15px 26px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}>
                Почати дослідження
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
              </button>
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
                      <clipPath id="uaClipHero"><path d={UA_PATH}></path></clipPath>
                    </defs>
                    <g clipPath="url(#uaClipHero)">
                      <rect x="0" y="0" width="720" height="480" fill="rgba(63,166,107,0.05)"></rect>
                      <rect x="0" y="0" width="720" height="480" fill="url(#heroGlowA)" style={{ pointerEvents: 'none' }}></rect>
                      {UA_CONTOURS.map((d, i) => (
                        <path key={i} d={d} fill="none" stroke="rgba(155,216,180,0.16)" strokeWidth="1"></path>
                      ))}
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
                {UA_CONTOURS.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="rgba(155,216,180,0.18)" strokeWidth="1"></path>
                ))}
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
              <MapAvatar clipId="avBigUser" src={currentUser.avatar} title={`${currentUser.name} (Ви)`} x={UA_CITIES.kyiv.x} y={UA_CITIES.kyiv.y} r={22} />
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
          <button onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: '#3FA66B', color: '#071F16', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, padding: '15px 30px', borderRadius: '12px', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
            Почати подорож
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>
          </button>
        </div>
      </section>

    </div>
  );
}

export default App;
