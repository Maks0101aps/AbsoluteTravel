import { useEffect, useMemo, useState } from 'react';
import { getMyRank, getXpLeaderboard, type MyRank, type XpLeaderboardRow } from './api';
import { UserAvatar } from './UserCard';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';
const GOLD = '#F0C64B';

interface LeaderboardPageProps {
  userId: number;
  userRegion: string | null;
  accent?: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

function xpForLevel(level: number) {
  // Matches the backend's simple levelling curve closely enough for a visual bar.
  return level * 100;
}

function LeaderboardPage({ userId, userRegion, accent = '#3FA66B' }: LeaderboardPageProps) {
  const [tab, setTab] = useState<'global' | 'regional'>('global');
  const [rows, setRows] = useState<XpLeaderboardRow[]>([]);
  const [me, setMe] = useState<MyRank | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const maxXp = useMemo(() => Math.max(1, ...rows.map((r) => r.xp)), [rows]);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM, maxWidth: '760px' }}>
      <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
        Таблиця лідерів за XP
      </h2>
      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: '0 0 22px', maxWidth: '560px' }}>
        Досліджуй місця, заробляй досвід і піднімайся вгору. Рейтинг оновлюється кожні 5 хвилин.
      </p>

      {/* your rank widget — always visible, even if you're #847 */}
      {me && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            background: `linear-gradient(120deg, ${accent}26, rgba(11,43,32,0.9))`,
            border: `1px solid ${accent}55`,
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '22px',
          }}
        >
          <UserAvatar user={{ avatar: me.user.avatarUrl, name: me.user.name, online: true }} size={52} />
          <div style={{ flex: '1 1 180px' }}>
            <div style={{ fontSize: '15px', fontWeight: 800 }}>{me.user.name}</div>
            <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.6)' }}>
              Рівень {me.user.level} · {me.user.xp} XP
            </div>
          </div>
          <div style={{ display: 'flex', gap: '22px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(244,241,232,0.5)' }}>ГЛОБАЛЬНО</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: GOLD }}>
                #{me.global.rank}
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(244,241,232,0.45)' }}> / {me.global.total}</span>
              </div>
            </div>
            {me.regional && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(244,241,232,0.5)' }}>
                  {me.regional.region.toUpperCase()}
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, color: accent }}>
                  #{me.regional.rank}
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(244,241,232,0.45)' }}> / {me.regional.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* tab switcher */}
      <div style={{ display: 'inline-flex', gap: '4px', background: PANEL, borderRadius: '12px', padding: '4px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
        {(
          [
            { id: 'global', label: 'Глобальний' },
            { id: 'regional', label: userRegion ? `Регіон: ${userRegion}` : 'Регіональний' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? accent : 'transparent',
              color: tab === t.id ? '#071F16' : 'rgba(244,241,232,0.65)',
              border: 'none',
              borderRadius: '9px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '10px', fontSize: '13px', background: 'rgba(217,83,79,0.15)', border: '1px solid rgba(217,83,79,0.5)', color: '#E58784' }}>
          {error}
        </div>
      )}
      {tab === 'regional' && !userRegion && (
        <div style={{ padding: '18px', background: PANEL, borderRadius: '14px', fontSize: '13.5px', color: 'rgba(244,241,232,0.6)' }}>
          У твоєму профілі не вказано область — регіональний рейтинг недоступний.
        </div>
      )}

      {/* the list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {loading && <div style={{ fontSize: '13.5px', color: 'rgba(244,241,232,0.5)', padding: '12px 4px' }}>Завантаження…</div>}
        {!loading &&
          rows.map((row) => {
            const isMe = row.userId === userId;
            const barPct = Math.max(4, Math.round((row.xp / maxXp) * 100));
            const nextLevelXp = xpForLevel(row.level + 1);
            return (
              <div
                key={row.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: isMe ? `${accent}1E` : PANEL,
                  border: `1px solid ${isMe ? `${accent}88` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '14px',
                  padding: '11px 16px',
                }}
              >
                <div style={{ width: '40px', textAlign: 'center', fontSize: row.rank <= 3 ? '20px' : '14px', fontWeight: 800, color: row.rank <= 3 ? GOLD : 'rgba(244,241,232,0.55)', flex: '0 0 auto' }}>
                  {MEDALS[row.rank - 1] ?? `#${row.rank}`}
                </div>
                <UserAvatar user={{ avatar: row.avatarUrl, name: row.name, online: false }} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700 }}>
                      {row.name}
                      {isMe && <span style={{ color: accent, fontWeight: 800 }}> (ти)</span>}
                    </span>
                    <span style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.45)' }}>@{row.username}</span>
                    {row.region && <span style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.35)' }}>· {row.region}</span>}
                  </div>
                  {/* XP bar */}
                  <div style={{ marginTop: '6px', height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${barPct}%`,
                        height: '100%',
                        borderRadius: '999px',
                        background: isMe ? accent : `linear-gradient(90deg, ${accent}AA, ${GOLD}AA)`,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: GOLD }}>{row.xp} XP</div>
                  <div style={{ fontSize: '11px', color: 'rgba(244,241,232,0.45)' }} title={`До наступного рівня: ${Math.max(0, nextLevelXp - row.xp)} XP`}>
                    Рівень {row.level}
                  </div>
                </div>
              </div>
            );
          })}
        {!loading && rows.length === 0 && tab === 'regional' && userRegion && (
          <div style={{ padding: '18px', background: PANEL, borderRadius: '14px', fontSize: '13.5px', color: 'rgba(244,241,232,0.6)' }}>
            У цьому регіоні поки немає мандрівників.
          </div>
        )}
      </div>
    </div>
  );
}

export default LeaderboardPage;
