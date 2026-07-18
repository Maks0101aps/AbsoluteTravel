import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { getMyRank, getXpLeaderboard, type MyRank, type XpLeaderboardRow } from './api';
import { UserAvatar } from './UserCard';

const CREAM = '#F4F1E8';
const GOLD = '#F0C64B';
const SILVER = '#C9D4D0';
const BRONZE = '#D08A4E';

interface LeaderboardPageProps {
  userId: number;
  userRegion: string | null;
  accent?: string;
  // Open a traveler's profile (tapping a leaderboard row).
  onOpenProfile?: (userId: number) => void;
}

type Metric = 'xp' | 'cells' | 'places';

function buildMetrics(t: TFunction): { id: Metric; label: string; unit: string; noun: string }[] {
  return [
    { id: 'xp', label: t('social.leaderboard.metricXp.label'), unit: 'XP', noun: t('social.leaderboard.metricXp.noun') },
    { id: 'cells', label: t('social.leaderboard.metricCells.label'), unit: t('social.leaderboard.metricCells.unit'), noun: t('social.leaderboard.metricCells.noun') },
    { id: 'places', label: t('social.leaderboard.metricPlaces.label'), unit: t('social.leaderboard.metricPlaces.unit'), noun: t('social.leaderboard.metricPlaces.noun') },
  ];
}

const PODIUM_COLORS = [GOLD, SILVER, BRONZE];
/** Visual order on the podium: silver, gold, bronze. */
const PODIUM_ORDER = [1, 0, 2];

function valueOf(row: XpLeaderboardRow, metric: Metric) {
  return metric === 'xp' ? row.xp : metric === 'cells' ? row.cells : row.places;
}

/** Numbers roll up from 0 whenever the target changes — makes the board feel live. */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (target - from) * eased);
      setValue(current);
      fromRef.current = current;
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

/** Avatars shrink on narrow screens, and UserAvatar takes a pixel size, not CSS. */
function useViewport() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return { width, isMobile: width <= 560, isNarrow: width <= 860 };
}

function Sparks({ color }: { color: string }) {
  return (
    <div className="lb-sparks">
      {[12, 38, 64, 86].map((left, i) => (
        <span key={left} style={{ left: `${left}%`, background: color, animationDelay: `${i * 0.7}s` }} />
      ))}
    </div>
  );
}

function PodiumCard({
  row,
  place,
  metric,
  metrics,
  max,
  isMe,
  accent,
  onOpenProfile,
}: {
  row: XpLeaderboardRow;
  place: number;
  metric: Metric;
  metrics: { id: Metric; label: string; unit: string; noun: string }[];
  max: number;
  isMe: boolean;
  accent: string;
  onOpenProfile?: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const { isMobile } = useViewport();
  const color = PODIUM_COLORS[place];
  const value = valueOf(row, metric);
  const shown = useCountUp(value);
  const unit = metrics.find((m) => m.id === metric)!.unit;
  const barPct = Math.max(6, Math.round((value / max) * 100));
  const avatarSize = isMobile ? (place === 0 ? 50 : 40) : place === 0 ? 72 : 56;

  return (
    <div
      className={`lb-podium-card lb-podium-p${place}`}
      onClick={onOpenProfile ? () => onOpenProfile(row.userId) : undefined}
      style={{
        animationDelay: `${place * 0.09}s`,
        cursor: onOpenProfile ? 'pointer' : 'default',
      }}
    >
      {place === 0 && <div className="lb-crown">👑</div>}

      <div className="lb-podium-avatar">
        <div className="lb-glow" style={{ background: `radial-gradient(circle, ${color}55, transparent 68%)` }} />
        <div className="lb-ring" style={{ background: `conic-gradient(from 180deg, ${color}, ${color}22, ${color})` }}>
          <div className="lb-ring-inner">
            <UserAvatar user={{ avatar: row.avatarUrl, name: row.name, online: false }} size={avatarSize} />
          </div>
        </div>
        <div className="lb-podium-badge" style={{ background: color }}>
          {place + 1}
        </div>
      </div>

      <div className="lb-podium-name">
        {row.name}
        {isMe && <span style={{ color: accent }}> ({t('social.leaderboard.you')})</span>}
      </div>
      <div className="lb-podium-level">{t('social.leaderboard.level', { level: row.level })}</div>

      {/* the plinth — its height ranks, the fill inside shows the metric */}
      <div
        className="lb-plinth"
        style={{
          background: `linear-gradient(180deg, ${color}30, rgba(7,31,22,0.25))`,
          border: `1px solid ${color}4D`,
          borderBottom: `2px solid ${color}`,
        }}
      >
        <div className="lb-plinth-fill" style={{ height: `${barPct}%`, background: `linear-gradient(180deg, ${color}33, ${color}14)` }} />
        <Sparks color={color} />
        <div className="lb-plinth-value" style={{ color }}>
          {shown.toLocaleString('uk-UA')}
        </div>
        <div className="lb-plinth-unit">{unit.toUpperCase()}</div>
      </div>
    </div>
  );
}

function Row({
  row,
  metric,
  metrics,
  max,
  isMe,
  accent,
  index,
  onOpenProfile,
}: {
  row: XpLeaderboardRow;
  metric: Metric;
  metrics: { id: Metric; label: string; unit: string; noun: string }[];
  max: number;
  isMe: boolean;
  accent: string;
  index: number;
  onOpenProfile?: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const { isMobile } = useViewport();
  const value = valueOf(row, metric);
  const shown = useCountUp(value);
  const unit = metrics.find((m) => m.id === metric)!.unit;
  const barPct = Math.max(3, Math.round((value / max) * 100));

  return (
    <div
      className={`lb-row${isMe ? ' lb-row-me' : ''}`}
      onClick={onOpenProfile ? () => onOpenProfile(row.userId) : undefined}
      role={onOpenProfile ? 'button' : undefined}
      tabIndex={onOpenProfile ? 0 : undefined}
      onKeyDown={
        onOpenProfile
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenProfile(row.userId);
              }
            }
          : undefined
      }
      style={{
        background: isMe ? `linear-gradient(100deg, ${accent}26, rgba(11,43,32,0.85))` : undefined,
        borderColor: isMe ? `${accent}80` : undefined,
        animationDelay: `${Math.min(index, 8) * 0.05}s`,
        cursor: onOpenProfile ? 'pointer' : undefined,
      }}
    >
      {/* the metric bar lives behind the row content, not under it */}
      <div
        className="lb-row-bar"
        style={{
          width: `${barPct}%`,
          background: isMe
            ? `linear-gradient(90deg, ${accent}3D, transparent)`
            : 'linear-gradient(90deg, rgba(244,241,232,0.09), transparent)',
        }}
      />

      <div className="lb-row-rank" style={{ color: isMe ? accent : undefined }}>
        {row.rank}
      </div>

      <div className="lb-row-avatar">
        <UserAvatar user={{ avatar: row.avatarUrl, name: row.name, online: false }} size={isMobile ? 34 : 42} />
      </div>

      <div className="lb-row-main">
        <div className="lb-row-title">
          <span className="lb-row-name">
            {row.name}
            {isMe && <span style={{ color: accent, fontWeight: 900 }}> ({t('social.leaderboard.you')})</span>}
          </span>
          <span className="lb-row-handle">@{row.username}</span>
        </div>
        <div className="lb-row-meta">
          <span>{t('social.leaderboard.level', { level: row.level })}</span>
          <span>🧭 {row.cells}</span>
          <span>📍 {row.places}</span>
          {row.region && <span className="lb-row-region">{row.region}</span>}
        </div>
      </div>

      <div className="lb-row-value">
        <div className="lb-row-num" style={{ color: isMe ? accent : CREAM }}>
          {shown.toLocaleString('uk-UA')}
        </div>
        <div className="lb-row-unit">{unit.toUpperCase()}</div>
      </div>
    </div>
  );
}

const STYLES = `
.lb-page { font-family: 'Manrope', sans-serif; color: ${CREAM}; width: 100%; }

/* hero -------------------------------------------------------------------- */
.lb-hero {
  position: relative; overflow: hidden; border-radius: 24px;
  padding: 30px 30px 26px; margin-bottom: 20px;
  background: linear-gradient(140deg, rgba(11,43,32,0.95), rgba(7,31,22,0.9));
  border: 1px solid rgba(255,255,255,0.08);
}
.lb-blob { position: absolute; border-radius: 50%; pointer-events: none; }
.lb-blob-a { top: -40%; right: -6%; width: 420px; height: 420px; animation: lbAurora 12s ease-in-out infinite; }
.lb-blob-b { bottom: -55%; left: -4%; width: 360px; height: 360px; animation: lbAurora 15s 2s ease-in-out infinite reverse; }
.lb-hero-inner { position: relative; }
.lb-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.24em; color: var(--lb-accent); margin-bottom: 8px; }
.lb-title { font-family: 'Lora', serif; font-weight: 500; font-size: clamp(26px, 3.4vw, 40px); margin: 0 0 8px; }
.lb-sub { font-size: 14px; line-height: 1.6; color: rgba(244,241,232,0.58); margin: 0; max-width: 520px; }

.lb-me {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-top: 22px; padding: 14px 18px; border-radius: 16px;
  background: rgba(7,31,22,0.55); border: 1px solid var(--lb-accent-40);
  backdrop-filter: blur(6px);
}
.lb-me-id { flex: 1 1 160px; min-width: 0; }
.lb-me-name { font-size: 14.5px; font-weight: 800; }
.lb-me-meta { font-size: 11.5px; color: rgba(244,241,232,0.5); }
.lb-me-ranks { display: flex; gap: 22px; }
.lb-me-label { font-size: 10px; font-weight: 800; letter-spacing: 0.12em; color: rgba(244,241,232,0.42); }
.lb-me-rank { font-size: 21px; font-weight: 900; }
.lb-me-total { font-size: 11px; font-weight: 600; color: rgba(244,241,232,0.4); }

/* controls ---------------------------------------------------------------- */
.lb-controls { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
.lb-tabs {
  display: inline-flex; gap: 3px; background: rgba(11,43,32,0.7);
  border-radius: 12px; padding: 4px; border: 1px solid rgba(255,255,255,0.07);
}
.lb-tab {
  background: transparent; color: rgba(244,241,232,0.6); border: none; border-radius: 9px;
  padding: 9px 16px; font-size: 12.5px; font-weight: 800; cursor: pointer;
  font-family: 'Manrope', sans-serif; transition: background 0.2s ease, color 0.2s ease;
}
.lb-tab-on { background: var(--lb-accent); color: #071F16; }
.lb-metrics { display: inline-flex; gap: 4px; margin-left: auto; }
.lb-metric {
  background: transparent; color: rgba(244,241,232,0.45); border: 1px solid rgba(255,255,255,0.07);
  border-radius: 999px; padding: 8px 15px; font-size: 12px; font-weight: 800; cursor: pointer;
  font-family: 'Manrope', sans-serif; transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.lb-metric-on { background: var(--lb-accent-14); color: var(--lb-accent); border-color: var(--lb-accent-60); }

/* podium ------------------------------------------------------------------ */
.lb-podium { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 24px; }
.lb-podium-card {
  flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center;
  animation: lbRise 0.7s cubic-bezier(0.2, 0.9, 0.3, 1) backwards;
}
.lb-crown { font-size: 22px; margin-bottom: 2px; animation: lbFloat 2.8s ease-in-out infinite; }
.lb-podium-avatar { position: relative; margin-bottom: 10px; }
.lb-glow { position: absolute; inset: -10px; border-radius: 50%; animation: lbPulse 3s ease-in-out infinite; }
.lb-podium-p0 .lb-glow { inset: -14px; }
.lb-ring { position: relative; padding: 3px; border-radius: 50%; }
.lb-ring-inner { border-radius: 50%; padding: 2px; background: #071F16; }
.lb-podium-badge {
  position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
  color: #071F16; font-size: 11px; font-weight: 900; width: 22px; height: 22px;
  border-radius: 50%; display: grid; place-items: center; border: 2px solid #071F16;
}
.lb-podium-name {
  font-size: 14px; font-weight: 800; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.lb-podium-p0 .lb-podium-name { font-size: 15.5px; }
.lb-podium-level { font-size: 11px; color: rgba(244,241,232,0.42); margin-bottom: 8px; }

.lb-plinth {
  position: relative; width: 100%; height: 84px; border-radius: 14px 14px 4px 4px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; overflow: hidden;
}
.lb-podium-p0 .lb-plinth { height: 116px; }
.lb-podium-p2 .lb-plinth { height: 64px; }
.lb-plinth-fill {
  position: absolute; left: 0; right: 0; bottom: 0;
  transition: height 0.8s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.lb-plinth-value { position: relative; font-size: 16.5px; font-weight: 900; }
.lb-podium-p0 .lb-plinth-value { font-size: 20px; }
.lb-plinth-unit {
  position: relative; font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  color: rgba(244,241,232,0.5); max-width: 100%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; padding: 0 4px;
}
.lb-sparks { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
.lb-sparks span {
  position: absolute; bottom: -6px; width: 3px; height: 3px; border-radius: 50%;
  opacity: 0; animation: lbSpark 3.4s ease-in-out infinite;
}

/* rows -------------------------------------------------------------------- */
.lb-list { display: flex; flex-direction: column; gap: 8px; }
.lb-row {
  position: relative; display: flex; align-items: center; gap: 14px;
  padding: 12px 18px; border-radius: 16px; overflow: hidden;
  background: rgba(11,43,32,0.62); border: 1px solid rgba(255,255,255,0.07);
  transition: transform 0.25s ease, border-color 0.25s ease;
  animation: lbSlide 0.5s ease backwards;
}
@media (hover: hover) {
  .lb-row:hover { transform: translateX(4px); border-color: rgba(255,255,255,0.18); }
}
.lb-row-bar {
  position: absolute; left: 0; top: 0; bottom: 0; pointer-events: none;
  transition: width 0.8s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.lb-row-rank {
  position: relative; width: 30px; text-align: center; font-size: 14px;
  font-weight: 800; color: rgba(244,241,232,0.4); flex: 0 0 auto;
}
.lb-row-avatar { position: relative; flex: 0 0 auto; }
.lb-row-main { position: relative; flex: 1; min-width: 0; }
.lb-row-title { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.lb-row-name { font-size: 14px; font-weight: 700; }
.lb-row-handle { font-size: 11.5px; color: rgba(244,241,232,0.4); }
.lb-row-meta {
  display: flex; gap: 10px; flex-wrap: wrap; margin-top: 3px;
  font-size: 11px; color: rgba(244,241,232,0.4);
}
.lb-row-region { opacity: 0.75; }
.lb-row-value { position: relative; text-align: right; flex: 0 0 auto; }
.lb-row-num { font-size: 15px; font-weight: 900; }
.lb-row-unit { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: rgba(244,241,232,0.35); }

.lb-note { margin-top: 16px; font-size: 11.5px; color: rgba(244,241,232,0.3); text-align: center; }
.lb-panel {
  padding: 18px; background: rgba(11,43,32,0.7); border-radius: 14px;
  font-size: 13.5px; color: rgba(244,241,232,0.6);
}
.lb-error {
  margin-bottom: 14px; padding: 10px 14px; border-radius: 10px; font-size: 13px;
  background: rgba(217,83,79,0.15); border: 1px solid rgba(217,83,79,0.5); color: #E58784;
}

/* tablet ------------------------------------------------------------------ */
@media (max-width: 860px) {
  .lb-hero { padding: 24px 22px 20px; border-radius: 20px; }
  .lb-metrics { margin-left: 0; }
  .lb-podium { gap: 10px; }
}

/* phone ------------------------------------------------------------------- */
@media (max-width: 560px) {
  .lb-hero { padding: 20px 16px 18px; border-radius: 18px; }
  .lb-blob-a, .lb-blob-b { width: 240px; height: 240px; }
  .lb-sub { font-size: 13px; }
  .lb-me { gap: 10px; padding: 12px 14px; margin-top: 18px; }
  .lb-me-ranks { gap: 16px; width: 100%; }
  .lb-me-rank { font-size: 18px; }

  /* both switchers go full width and split their pills evenly */
  .lb-controls { gap: 8px; }
  .lb-tabs, .lb-metrics { width: 100%; }
  .lb-tab, .lb-metric { flex: 1 1 0; padding: 9px 6px; font-size: 11.5px; }
  .lb-metrics { gap: 6px; }

  .lb-podium { gap: 6px; margin-bottom: 18px; }
  .lb-crown { font-size: 17px; }
  .lb-podium-name { font-size: 12px; }
  .lb-podium-p0 .lb-podium-name { font-size: 13px; }
  .lb-podium-level { font-size: 10px; }
  .lb-plinth { height: 62px; border-radius: 10px 10px 3px 3px; }
  .lb-podium-p0 .lb-plinth { height: 86px; }
  .lb-podium-p2 .lb-plinth { height: 48px; }
  .lb-plinth-value { font-size: 13.5px; }
  .lb-podium-p0 .lb-plinth-value { font-size: 16px; }
  .lb-plinth-unit { font-size: 8px; letter-spacing: 0.04em; }

  .lb-row { gap: 10px; padding: 10px 12px; border-radius: 13px; }
  .lb-row-rank { width: 18px; font-size: 12.5px; }
  .lb-row-name { font-size: 13px; }
  /* the handle is the first thing worth losing when space runs out */
  .lb-row-handle { display: none; }
  .lb-row-meta { gap: 7px; font-size: 10px; }
  .lb-row-region { display: none; }
  .lb-row-num { font-size: 13.5px; }
  .lb-row-unit { font-size: 8.5px; }
}

@media (max-width: 380px) {
  .lb-podium { gap: 4px; }
  .lb-podium-name { font-size: 11px; }
  .lb-plinth-unit { display: none; }
  .lb-row-meta span:first-child { display: none; }
}

/* motion ------------------------------------------------------------------ */
@keyframes lbRise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
@keyframes lbSlide { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: none; } }
@keyframes lbFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes lbPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes lbSpark { 0% { opacity: 0; transform: translateY(0); } 30% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-52px); } }
@keyframes lbAurora { 0%, 100% { transform: translate(-8%, -4%) scale(1); } 50% { transform: translate(8%, 4%) scale(1.15); } }

@media (prefers-reduced-motion: reduce) {
  .lb-page *, .lb-page *::before, .lb-page *::after {
    animation: none !important;
    transition: none !important;
  }
}
`;

function LeaderboardPage({ userId, userRegion, accent = '#3FA66B', onOpenProfile }: LeaderboardPageProps) {
  const { t } = useTranslation();
  const METRICS = useMemo(() => buildMetrics(t), [t]);
  const [tab, setTab] = useState<'global' | 'regional'>('global');
  const [metric, setMetric] = useState<Metric>('xp');
  const [rows, setRows] = useState<XpLeaderboardRow[]>([]);
  const [me, setMe] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useViewport();

  useEffect(() => {
    getMyRank(userId).then(setMe).catch(() => {});
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const req =
      tab === 'regional'
        ? userRegion
          ? getXpLeaderboard('regional', userRegion)
          : Promise.resolve([] as XpLeaderboardRow[])
        : getXpLeaderboard('global');
    req
      .then(setRows)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tab, userRegion]);

  // The board arrives sorted by XP; any other metric has to be re-ranked here.
  const sorted = useMemo(() => {
    if (metric === 'xp') return rows;
    return [...rows]
      .sort((a, b) => valueOf(b, metric) - valueOf(a, metric) || a.userId - b.userId)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  }, [rows, metric]);

  const max = useMemo(() => Math.max(1, ...sorted.map((r) => valueOf(r, metric))), [sorted, metric]);
  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const activeMetric = METRICS.find((m) => m.id === metric)!;
  const totalCells = useMemo(() => rows.reduce((s, r) => s + r.cells, 0), [rows]);

  const cssVars = {
    '--lb-accent': accent,
    '--lb-accent-14': `${accent}22`,
    '--lb-accent-40': `${accent}66`,
    '--lb-accent-60': `${accent}99`,
  } as React.CSSProperties;

  return (
    <div className="lb-page" style={cssVars}>
      <style>{STYLES}</style>

      <div className="lb-hero">
        <div className="lb-blob lb-blob-a" style={{ background: `radial-gradient(circle, ${accent}33, transparent 66%)` }} />
        <div className="lb-blob lb-blob-b" style={{ background: `radial-gradient(circle, ${GOLD}22, transparent 66%)` }} />

        <div className="lb-hero-inner">
          <div className="lb-eyebrow">{t('social.leaderboard.eyebrow')}</div>
          <h2 className="lb-title">{t('social.leaderboard.title')}</h2>
          <p className="lb-sub">
            {t('social.leaderboard.subtitlePrefix')}{' '}
            <strong style={{ color: GOLD }}>{totalCells.toLocaleString('uk-UA')}</strong> {t('social.leaderboard.subtitleSuffix')}
          </p>

          {me && (
            <div className="lb-me">
              <UserAvatar user={{ avatar: me.user.avatarUrl, name: me.user.name, online: true }} size={isMobile ? 38 : 46} />
              <div className="lb-me-id">
                <div className="lb-me-name">{me.user.name}</div>
                <div className="lb-me-meta">
                  {t('social.leaderboard.level', { level: me.user.level })} · 🧭 {me.user.cells} · 📍 {me.user.places}
                </div>
              </div>
              <div className="lb-me-ranks">
                <div>
                  <div className="lb-me-label">{t('social.leaderboard.global')}</div>
                  <div className="lb-me-rank" style={{ color: GOLD }}>
                    #{me.global.rank}
                    <span className="lb-me-total"> / {me.global.total}</span>
                  </div>
                </div>
                {me.regional && (
                  <div>
                    <div className="lb-me-label">{me.regional.region.toUpperCase()}</div>
                    <div className="lb-me-rank" style={{ color: accent }}>
                      #{me.regional.rank}
                      <span className="lb-me-total"> / {me.regional.total}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lb-controls">
        <div className="lb-tabs">
          {(
            [
              { id: 'global', label: t('social.leaderboard.globalTab') },
              {
                id: 'regional',
                label: userRegion
                  ? isMobile
                    ? t('social.leaderboard.myRegionTab')
                    : t('social.leaderboard.regionTabWithName', { region: userRegion })
                  : t('social.leaderboard.regionTab'),
              },
            ] as const
          ).map((tabItem) => (
            <button key={tabItem.id} onClick={() => setTab(tabItem.id)} className={`lb-tab${tab === tabItem.id ? ' lb-tab-on' : ''}`}>
              {tabItem.label}
            </button>
          ))}
        </div>

        <div className="lb-metrics">
          {METRICS.map((m) => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              title={t('social.leaderboard.sortByMetric', { noun: m.noun })}
              className={`lb-metric${metric === m.id ? ' lb-metric-on' : ''}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="lb-error">{error}</div>}
      {tab === 'regional' && !userRegion && (
        <div className="lb-panel">{t('social.leaderboard.noRegionInProfile')}</div>
      )}

      {loading && <div style={{ fontSize: '13.5px', color: 'rgba(244,241,232,0.5)', padding: '12px 4px' }}>{t('social.leaderboard.loading')}</div>}

      {!loading && podium.length > 0 && (
        <div className="lb-podium">
          {PODIUM_ORDER.filter((p) => p < podium.length).map((place) => (
            <PodiumCard
              key={podium[place].userId}
              row={podium[place]}
              place={place}
              metric={metric}
              metrics={METRICS}
              max={max}
              isMe={podium[place].userId === userId}
              accent={accent}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      )}

      <div className="lb-list">
        {!loading &&
          rest.map((row, i) => (
            <Row
              key={row.userId}
              row={row}
              metric={metric}
              metrics={METRICS}
              max={max}
              isMe={row.userId === userId}
              accent={accent}
              index={i}
              onOpenProfile={onOpenProfile}
            />
          ))}
        {!loading && sorted.length === 0 && tab === 'regional' && userRegion && (
          <div className="lb-panel">{t('social.leaderboard.noRegionalTravelers')}</div>
        )}
      </div>

      {!loading && sorted.length > 0 && (
        <div className="lb-note">
          {t('social.leaderboard.sortedBy', { metric: activeMetric.label.toLowerCase() })}
        </div>
      )}
    </div>
  );
}

export default LeaderboardPage;
