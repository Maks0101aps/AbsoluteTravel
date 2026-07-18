import { useEffect, useState } from 'react';
import {
  getAchievements,
  claimAchievement,
  type Achievement,
  type AchievementsList,
  type AchievementTier,
} from './api';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';

const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: '#C88E4B',
  silver: '#B8C0C9',
  gold: '#F0C64B',
};

const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: 'Бронза',
  silver: 'Срібло',
  gold: 'Золото',
};

interface AchievementsPageProps {
  userId: number;
  accent: string;
  // Fold the reward into the stored user (coins/xp/level) after a successful claim.
  onReward: (patch: { coins: number; xp: number; level: number }) => void;
}

function AchievementsPage({ userId, accent, onReward }: AchievementsPageProps) {
  const [data, setData] = useState<AchievementsList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ xp: number; coins: number } | null>(null);

  const load = () => {
    getAchievements(userId)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e?.message ?? 'Не вдалося завантажити досягнення'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const claim = async (a: Achievement) => {
    if (claiming) return;
    setClaiming(a.key);
    try {
      const res = await claimAchievement(userId, a.key);
      if (res.awarded) {
        onReward({ coins: res.coins, xp: res.xp, level: res.level });
        setToast({ xp: res.xpAwarded, coins: res.coinsAwarded });
        window.setTimeout(() => setToast(null), 2600);
      }
      load();
    } catch (e: any) {
      setError(e?.message ?? 'Не вдалося отримати нагороду');
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      <style>{`
        @keyframes atAchIn { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes atAchGlow {
          0%, 100% { box-shadow: 0 0 0 0 var(--ac, #3FA66B)00; border-color: var(--ac); }
          50% { box-shadow: 0 0 22px -4px var(--ac); }
        }
        @keyframes atAchToast { 0% { opacity: 0; transform: translate(-50%, 12px); } 12%, 88% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, -8px); } }
        @keyframes atAchShine { 0% { transform: translateX(-120%) skewX(-18deg); } 60%, 100% { transform: translateX(320%) skewX(-18deg); } }
        .at-ach-claim { position: relative; overflow: hidden; }
      `}</style>

      {/* header */}
      <div style={{ marginBottom: '26px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.2em', color: accent, marginBottom: '10px' }}>
          ДОСЯГНЕННЯ
        </div>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(26px, 3.4vw, 36px)', margin: '0 0 8px' }}>
          Твої нагороди
        </h1>
        <p style={{ fontSize: '14.5px', color: 'rgba(244,241,232,0.6)', margin: 0, maxWidth: '560px', lineHeight: 1.55 }}>
          Виконуй завдання, щоб отримувати XP та монети. Тижневі досягнення оновлюються щопонеділка —
          не пропусти свіжу порцію нагород.
          {data && data.claimableCount > 0 && (
            <>
              {' '}
              <span style={{ color: accent, fontWeight: 700 }}>
                Готово до отримання: {data.claimableCount}.
              </span>
            </>
          )}
        </p>
      </div>

      {loading && (
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'rgba(244,241,232,0.5)' }}>Завантаження…</div>
      )}
      {error && !loading && (
        <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(228,99,95,0.12)', border: '1px solid rgba(228,99,95,0.4)', color: '#E4635F', fontSize: '13.5px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* weekly */}
          <SectionTitle icon="flame" accent={accent} title="Тижневі" subtitle={`Оновлюються щотижня · ${data.weekKey}`} />
          <div style={grid}>
            {data.weekly.map((a, i) => (
              <AchievementCard key={a.key} a={a} accent={accent} index={i} claiming={claiming === a.key} onClaim={() => claim(a)} />
            ))}
          </div>

          {/* regular — grouped into chains; only the current step of each chain is
              shown, the next one reveals once the current is claimed. */}
          {(() => {
            const chains = buildChains(data.regular);
            const claimedTotal = data.regular.filter((a) => a.claimed).length;
            return (
              <>
                <div style={{ marginTop: '34px' }}>
                  <SectionTitle icon="medal" accent={accent} title="Постійні" subtitle={`${claimedTotal} / ${data.regular.length} отримано · відкривай крок за кроком`} />
                </div>
                <div style={grid}>
                  {chains.map((chain, i) => {
                    const active = activeStep(chain);
                    const step = chain.indexOf(active) + 1;
                    return (
                      <AchievementCard
                        key={active.metric}
                        a={active}
                        accent={accent}
                        index={i}
                        claiming={claiming === active.key}
                        onClaim={() => claim(active)}
                        chain={chain.length > 1 ? { step, total: chain.length, allDone: chain.every((c) => c.claimed) } : undefined}
                      />
                    );
                  })}
                </div>
              </>
            );
          })()}
        </>
      )}

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 6000,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '13px 22px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0d3324, #0a251b)',
            border: `1px solid ${accent}66`,
            boxShadow: '0 20px 50px -18px rgba(0,0,0,0.8)',
            fontSize: '14px',
            fontWeight: 700,
            animation: 'atAchToast 2.6s ease both',
          }}
        >
          <span style={{ color: accent }}>Нагороду отримано!</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#7FC4A0' }}>
            +{toast.xp} XP
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#F0C64B' }}>
            <Icon name="coin" size={15} strokeWidth={1.9} />+{toast.coins}
          </span>
        </div>
      )}
    </div>
  );
}

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
  gap: '14px',
};

// Group achievements that track the same metric into ordered chains (the list
// arrives already sorted by threshold within a metric). First-seen order of the
// metric decides where the chain sits in the grid.
function buildChains(list: Achievement[]): Achievement[][] {
  const byMetric = new Map<string, Achievement[]>();
  for (const a of list) {
    const arr = byMetric.get(a.metric);
    if (arr) arr.push(a);
    else byMetric.set(a.metric, [a]);
  }
  return [...byMetric.values()];
}

// The step currently shown for a chain: the first not-yet-claimed one, or the
// final step if every tier is already claimed.
function activeStep(chain: Achievement[]): Achievement {
  return chain.find((a) => !a.claimed) ?? chain[chain.length - 1];
}

function SectionTitle({ icon, title, subtitle, accent }: { icon: IconName; title: string; subtitle: string; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '14px' }}>
      <span
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: `${accent}1f`,
          border: `1px solid ${accent}44`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
        }}
      >
        <Icon name={icon} size={18} strokeWidth={1.9} stroke={accent} />
      </span>
      <div>
        <div style={{ fontFamily: "'Lora', serif", fontSize: '19px', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.5)' }}>{subtitle}</div>
      </div>
    </div>
  );
}

function AchievementCard({
  a,
  accent,
  index,
  claiming,
  onClaim,
  chain,
}: {
  a: Achievement;
  accent: string;
  index: number;
  claiming: boolean;
  onClaim: () => void;
  // When this card represents one step of a multi-tier chain.
  chain?: { step: number; total: number; allDone: boolean };
}) {
  const tier = TIER_COLOR[a.tier];
  const pct = Math.min(100, Math.round((a.progress / a.threshold) * 100));
  const done = a.completed;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        borderRadius: '16px',
        background: a.claimable ? `linear-gradient(160deg, ${accent}1a, rgba(255,255,255,0.03))` : 'rgba(255,255,255,0.035)',
        border: `1px solid ${a.claimable ? `${accent}66` : done ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        opacity: a.claimed ? 0.72 : 1,
        animation: `atAchIn 0.45s ease ${Math.min(index * 0.04, 0.4)}s both`,
        ['--ac' as string]: accent,
        ...(a.claimable ? { animationName: 'atAchIn, atAchGlow', animationDuration: '0.45s, 2.2s', animationIterationCount: '1, infinite', animationTimingFunction: 'ease, ease-in-out' } : {}),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px' }}>
        <div
          style={{
            flex: '0 0 auto',
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: `${tier}22`,
            border: `1px solid ${tier}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tier,
            filter: done ? 'none' : 'grayscale(0.4)',
            opacity: done ? 1 : 0.85,
          }}
        >
          <Icon name={a.icon as IconName} size={23} strokeWidth={1.7} stroke={tier} />
        </div>
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>{a.title}</span>
            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: tier, background: `${tier}1f`, border: `1px solid ${tier}55`, borderRadius: '999px', padding: '1px 7px' }}>
              {TIER_LABEL[a.tier]}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', lineHeight: 1.4, color: 'rgba(244,241,232,0.6)' }}>{a.description}</p>
          {chain && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: chain.total }).map((_, k) => {
                  const reached = k < chain.step - 1 || (k === chain.step - 1 && a.claimed);
                  const current = k === chain.step - 1 && !a.claimed;
                  return (
                    <span
                      key={k}
                      style={{
                        width: current ? '16px' : '6px',
                        height: '6px',
                        borderRadius: '999px',
                        background: reached ? accent : current ? `${accent}cc` : 'rgba(255,255,255,0.16)',
                        transition: 'all 0.3s ease',
                      }}
                    />
                  );
                })}
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'rgba(244,241,232,0.5)' }}>
                {chain.allDone ? 'Завершено' : `Крок ${chain.step}/${chain.total}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'rgba(244,241,232,0.55)', marginBottom: '5px' }}>
          <span>{done ? 'Виконано' : 'Прогрес'}</span>
          <span>{a.value} / {a.threshold}</span>
        </div>
        <div style={{ height: '7px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', borderRadius: '999px', background: done ? accent : `${accent}99`, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* rewards + action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 700 }}>
          <span style={{ color: '#7FC4A0' }}>+{a.xp} XP</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#F0C64B' }}>
            <Icon name="coin" size={14} strokeWidth={1.9} />{a.coins}
          </span>
        </div>

        {a.claimed ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: 'rgba(244,241,232,0.55)' }}>
            <Icon name="check" size={15} strokeWidth={2.4} stroke="rgba(244,241,232,0.55)" /> Отримано
          </span>
        ) : a.claimable ? (
          <button
            className="at-ach-claim"
            onClick={onClaim}
            disabled={claiming}
            style={{
              background: accent,
              color: BG,
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: claiming ? 'default' : 'pointer',
              opacity: claiming ? 0.7 : 1,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <span style={{ position: 'absolute', top: 0, left: 0, width: '40px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', animation: 'atAchShine 2.6s ease-in-out infinite' }} />
            <span style={{ position: 'relative' }}>{claiming ? '…' : 'Отримати'}</span>
          </button>
        ) : (
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'rgba(244,241,232,0.4)' }}>{pct}%</span>
        )}
      </div>
    </div>
  );
}

export default AchievementsPage;
