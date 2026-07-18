// Hand-drawn animated SVG artwork for the loot cases. Each case is a small
// themed landscape with a treasure chest as the hero:
//   starter   — earth & a road winding to the horizon
//   wanderer  — layered forest of pines
//   legendary — snow-capped mountain range
// Everything is drawn inline (no external assets) and gently animated:
// floating chest, pulsing sun, drifting parallax layers, twinkling particles.

type CaseArtId = 'starter' | 'wanderer' | 'legendary' | string;

interface Palette {
  sky1: string; // horizon (lighter)
  sky2: string; // zenith (darker)
  glow: string; // sun / aura
  ground: string;
  groundDark: string;
  layerA: string; // far scenery
  layerB: string; // mid scenery
  layerC: string; // near scenery
  accentSoft: string; // roads / snow / highlights
  chestBody: string;
  chestLid: string;
  metal: string;
  metalLight: string;
  dark: string;
  emblem: 'sprout' | 'compass' | 'crown';
  particle: string;
}

const PALETTES: Record<string, Palette> = {
  starter: {
    sky1: '#155C3C', sky2: '#071A12', glow: '#5FD08C',
    ground: '#12492F', groundDark: '#0A2C1C',
    layerA: '#1B6B45', layerB: '#145335', layerC: '#0E3A26',
    accentSoft: '#D8B978',
    chestBody: '#0F5136', chestLid: '#3FA66B', metal: '#8FE3B4', metalLight: '#CFF3DE',
    dark: '#071A12', emblem: 'sprout', particle: '#CFF3DE',
  },
  wanderer: {
    sky1: '#1B4E8C', sky2: '#06122A', glow: '#5E9BEE',
    ground: '#0C2547', groundDark: '#07162E',
    layerA: '#1E5296', layerB: '#123A6E', layerC: '#0B294F',
    accentSoft: '#CFE0FB',
    chestBody: '#123A6E', chestLid: '#4B84E0', metal: '#9FC0F7', metalLight: '#DCE9FE',
    dark: '#06122A', emblem: 'compass', particle: '#BFE0A0',
  },
  legendary: {
    sky1: '#6E5216', sky2: '#160F03', glow: '#FFCB4A',
    ground: '#3A2A08', groundDark: '#1E1604',
    layerA: '#8A6516', layerB: '#5E4410', layerC: '#3A2A08',
    accentSoft: '#FFF0C2',
    chestBody: '#5E4410', chestLid: '#F0C64B', metal: '#FFDB7A', metalLight: '#FFF0C2',
    dark: '#160F03', emblem: 'crown', particle: '#FFF0C2',
  },
};

const FALLBACK: Palette = PALETTES.starter;

// Build a zig-zag silhouette (treeline / hills) spanning the 200-wide canvas.
function teeth(baseY: number, peakY: number, count: number, jitter = 0): string {
  const step = 200 / count;
  let pts = `0,${baseY}`;
  for (let i = 0; i < count; i++) {
    const px = i * step + step / 2;
    const py = peakY + Math.sin(i * 1.7) * jitter;
    pts += ` ${(i * step).toFixed(1)},${baseY} ${px.toFixed(1)},${py.toFixed(1)}`;
  }
  pts += ` 200,${baseY} 200,150 0,150`;
  return pts;
}

function star(x: number, y: number, r: number): string {
  const s = r * 0.32;
  return `M${x},${y - r} L${x + s},${y - s} L${x + r},${y} L${x + s},${y + s} L${x},${y + r} L${x - s},${y + s} L${x - r},${y} L${x - s},${y - s} Z`;
}

// ---- themed background scenes -------------------------------------------------

function StarterScene({ p }: { p: Palette }) {
  return (
    <>
      {/* rolling hills on the horizon */}
      <g className="at-caseart-drift-a">
        <ellipse cx="42" cy="118" rx="62" ry="26" fill={p.layerA} opacity="0.85" />
        <ellipse cx="168" cy="120" rx="66" ry="24" fill={p.layerB} opacity="0.9" />
      </g>
      {/* ground */}
      <rect x="0" y="104" width="200" height="46" fill={p.ground} />
      <rect x="0" y="104" width="200" height="46" fill={p.groundDark} opacity="0.5" style={{ mixBlendMode: 'multiply' }} />
      {/* road winding to the horizon */}
      <polygon points="94,104 106,104 138,150 62,150" fill={p.accentSoft} opacity="0.9" />
      <polygon points="97,104 103,104 118,150 82,150" fill="#000" opacity="0.08" />
      <line x1="100" y1="108" x2="100" y2="150" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" strokeDasharray="5 8" />
    </>
  );
}

function ForestScene({ p }: { p: Palette }) {
  return (
    <>
      {/* far treeline */}
      <g className="at-caseart-drift-a">
        <polygon points={teeth(108, 74, 11, 5)} fill={p.layerC} opacity="0.7" />
      </g>
      {/* mid treeline */}
      <g className="at-caseart-drift-b">
        <polygon points={teeth(112, 82, 8, 6)} fill={p.layerB} opacity="0.9" />
      </g>
      {/* ground */}
      <rect x="0" y="112" width="200" height="38" fill={p.ground} />
      {/* near framing pines */}
      <polygon points="-6,150 20,150 7,58" fill={p.layerA} />
      <polygon points="-14,150 30,150 8,72" fill={p.dark} opacity="0.85" />
      <polygon points="180,150 214,150 193,54" fill={p.layerA} />
      <polygon points="172,150 220,150 196,70" fill={p.dark} opacity="0.85" />
    </>
  );
}

function MountainScene({ p }: { p: Palette }) {
  const frontPeaks: [number, number][] = [[46, 58], [100, 44], [154, 62]];
  return (
    <>
      {/* stars */}
      {[[36, 34], [150, 28], [176, 46], [64, 24], [116, 20]].map(([x, y], i) => (
        <path key={i} className="at-caseart-twinkle" d={star(x, y, 1.7)} fill={p.metalLight}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${i * 0.6}s` }} />
      ))}
      {/* far range */}
      <g className="at-caseart-drift-a">
        <polygon points="0,150 0,104 34,72 60,86 92,58 120,80 150,62 182,84 200,94 200,150" fill={p.layerB} opacity="0.85" />
      </g>
      {/* front range */}
      <polygon points="0,150 0,116 26,88 46,58 68,92 100,44 128,86 154,62 178,92 200,106 200,150" fill={p.layerC} />
      {/* snow caps */}
      {frontPeaks.map(([px, py], i) => (
        <polygon key={i} points={`${px - 7},${py + 11} ${px},${py} ${px + 7},${py + 11}`} fill={p.accentSoft} opacity="0.95" />
      ))}
      {/* foreground plateau */}
      <rect x="0" y="116" width="200" height="34" fill={p.ground} />
      <rect x="0" y="116" width="200" height="34" fill={p.groundDark} opacity="0.4" style={{ mixBlendMode: 'multiply' }} />
    </>
  );
}

// ---- chest emblem (small, sits on the lock plate around 100,93) ---------------

function Emblem({ kind, metal, light }: { kind: Palette['emblem']; metal: string; light: string }) {
  if (kind === 'sprout') {
    return (
      <g>
        <path d="M100,101 L100,90" stroke={metal} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M100,94 C93,94 90,89 91,84 C97,84 101,88 100,94 Z" fill={metal} />
        <path d="M100,94 C107,94 110,89 109,84 C103,84 99,88 100,94 Z" fill={metal} />
        <circle cx="100" cy="83" r="1.8" fill={light} />
      </g>
    );
  }
  if (kind === 'compass') {
    return (
      <g>
        <circle cx="100" cy="93" r="7.5" fill="none" stroke={metal} strokeWidth="1.6" />
        <g className="at-caseart-spin" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
          <path d="M100,87 L102.6,93 L100,99 L97.4,93 Z" fill={light} />
          <path d="M100,99 L97.4,93 L100,93 Z" fill={metal} />
          <path d="M100,87 L102.6,93 L100,93 Z" fill={metal} />
        </g>
        <circle cx="100" cy="93" r="1.4" fill={metal} />
      </g>
    );
  }
  return (
    <g fill={metal}>
      <path d="M91,100 L88.5,86 L94,91 L100,83 L106,91 L111.5,86 L109,100 Z" />
      <circle cx="100" cy="88" r="1.8" fill={light} />
      <circle cx="90" cy="87" r="1.3" fill={light} />
      <circle cx="110" cy="87" r="1.3" fill={light} />
    </g>
  );
}

// ---- the chest ----------------------------------------------------------------

function Chest({ p, uid }: { p: Palette; uid: string }) {
  return (
    <g className="at-caseart-float" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {/* shadow */}
      <ellipse cx="100" cy="126" rx="42" ry="6" fill={p.dark} opacity="0.45" />
      {/* body */}
      <rect x="64" y="90" width="72" height="34" rx="5" fill={`url(#${uid}-body)`} stroke={p.dark} strokeWidth="1.4" />
      <path d="M82,94 L82,124 M100,94 L100,124 M118,94 L118,124" stroke={p.dark} strokeWidth="1" opacity="0.45" />
      {/* lid */}
      <path d="M62,92 L62,80 Q62,58 100,58 Q138,58 138,80 L138,92 Z" fill={`url(#${uid}-lid)`} stroke={p.dark} strokeWidth="1.4" />
      {/* lid shimmer */}
      <g clipPath={`url(#${uid}-lidclip)`}>
        <rect className="at-caseart-shine" x="-30" y="56" width="26" height="38" fill={`url(#${uid}-shine)`} style={{ transformBox: 'view-box' }} />
      </g>
      {/* band + straps */}
      <rect x="60" y="88" width="80" height="6" rx="2" fill={`url(#${uid}-metal)`} stroke={p.dark} strokeWidth="0.7" />
      <rect x="79" y="62" width="5" height="62" rx="1.6" fill={`url(#${uid}-metal)`} opacity="0.92" />
      <rect x="116" y="62" width="5" height="62" rx="1.6" fill={`url(#${uid}-metal)`} opacity="0.92" />
      {/* rivets */}
      {[[70, 94], [130, 94], [70, 120], [130, 120]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="1.6" fill={p.metalLight} opacity="0.9" />
      ))}
      {/* lock plate + emblem */}
      <rect x="90" y="84" width="20" height="22" rx="4" fill={`url(#${uid}-metal)`} stroke={p.dark} strokeWidth="0.9" />
      <Emblem kind={p.emblem} metal={p.dark} light={p.chestLid} />
    </g>
  );
}

// ---- shared gradient / clip / mask defs ---------------------------------------

function Defs({ p, uid }: { p: Palette; uid: string }) {
  return (
    <defs>
      <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.sky2} />
        <stop offset="0.62" stopColor={p.sky2} />
        <stop offset="1" stopColor={p.sky1} />
      </linearGradient>
      <linearGradient id={`${uid}-lid`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.chestLid} />
        <stop offset="1" stopColor={p.chestBody} />
      </linearGradient>
      <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.chestBody} />
        <stop offset="1" stopColor={p.dark} />
      </linearGradient>
      <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={p.metalLight} />
        <stop offset="1" stopColor={p.metal} />
      </linearGradient>
      <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor={p.glow} stopOpacity="0.9" />
        <stop offset="0.5" stopColor={p.glow} stopOpacity="0.3" />
        <stop offset="1" stopColor={p.glow} stopOpacity="0" />
      </radialGradient>
      <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.6" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <clipPath id={`${uid}-lidclip`}>
        <path d="M62,92 L62,80 Q62,58 100,58 Q138,58 138,80 L138,92 Z" />
      </clipPath>
    </defs>
  );
}

// The themed backdrop (sky + aura + scenery), no chest.
function Backdrop({ id, p, uid }: { id: CaseArtId; p: Palette; uid: string }) {
  return (
    <>
      <rect x="0" y="0" width="200" height="150" fill={`url(#${uid}-sky)`} />
      <ellipse className="at-caseart-glow" cx="100" cy="104" rx="70" ry="46" fill={`url(#${uid}-glow)`}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      {id === 'wanderer' ? <ForestScene p={p} /> : id === 'legendary' ? <MountainScene p={p} /> : <StarterScene p={p} />}
    </>
  );
}

function Particles({ p }: { p: Palette }) {
  return (
    <>
      {[[44, 70, 0], [156, 78, 0.8], [40, 110, 1.5], [162, 112, 2.2]].map(([x, y, d], i) => (
        <path key={i} className="at-caseart-twinkle" d={star(x, y, 3)} fill={p.particle}
          style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${d}s` }} />
      ))}
    </>
  );
}

// ---- root ---------------------------------------------------------------------

export default function CaseArt({ id, mode = 'stage' }: { id: CaseArtId; mode?: 'tab' | 'stage' }) {
  const p = PALETTES[id] ?? FALLBACK;

  // Tab card: one square-ish SVG, cropped to fill the card.
  if (mode === 'tab') {
    const uid = `ca-${id}-tab`;
    return (
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"
        style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden="true">
        <Defs p={p} uid={uid} />
        <Backdrop id={id} p={p} uid={uid} />
        <Chest p={p} uid={uid} />
        <Particles p={p} />
      </svg>
    );
  }

  // Stage: the backdrop stretches edge-to-edge across the whole strip while the
  // chest keeps its aspect ratio, centred and enlarged on top.
  const bgUid = `ca-${id}-bg`;
  const fgUid = `ca-${id}-fg`;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} aria-hidden="true">
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMax slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <Defs p={p} uid={bgUid} />
        <Backdrop id={id} p={p} uid={bgUid} />
      </svg>
      <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid meet"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <Defs p={p} uid={fgUid} />
        <g transform="translate(-30,-22) scale(1.3)">
          <Chest p={p} uid={fgUid} />
          <Particles p={p} />
        </g>
      </svg>
    </div>
  );
}
