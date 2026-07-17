import { useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  getUserProfile,
  removeFriend,
  sendFriendRequest,
  type PublicProfile,
} from './api';
import ProfileAvatar from './ProfileAvatar';
import ProfileWall from './ProfileWall';
import XpBar from './XpBar';
import { BACKGROUNDS, BADGES } from './data/profileOptions';
import { Icon } from './icons';
import { ProfileCardEffect, ProfileCosmosFlourish, ProfileSakuraFlourish } from './itemVisuals';
import { OnlineDot } from './UserCard';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const DEFAULT_ACCENT = '#3FA66B';

interface UserProfilePageProps {
  /** Whose profile to show. */
  userId: number;
  /** Who is looking — drives the relation-dependent action button. */
  viewerId: number;
  onClose: () => void;
  /** Open a chat thread with this user (friends only). */
  onMessage: (userId: number) => void;
}

// Another traveler's profile, opened as a full-screen overlay by tapping them
// anywhere in the app (friends list, leaderboard, chat sidebar, map).
//
// The profile itself is public; the wall is friends-only, so it renders only
// when the server says `canSeeWall`. The overlay owns no user state beyond the
// fetched profile — closing it returns to whatever tab was underneath.
function UserProfilePage({ userId, viewerId, onClose, onMessage }: UserProfilePageProps) {
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Friend-action state, kept separate from `error` so a failed request
  // doesn't blank out the whole profile.
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getUserProfile(userId, viewerId)
      .then((p) => {
        if (!cancelled) setData(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Не вдалося завантажити профіль');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, viewerId]);

  // Esc closes, matching the app's other overlays.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = data?.profile ?? null;
  const accent = p?.color ?? DEFAULT_ACCENT;
  const background = BACKGROUNDS.find((b) => b.id === p?.backgroundId);

  // Re-fetch after a friend action so relation, friendshipId and canSeeWall
  // all come from one authoritative source rather than being patched locally.
  const refresh = async () => {
    const fresh = await getUserProfile(userId, viewerId);
    setData(fresh);
  };

  const runAction = async (fn: () => Promise<unknown>) => {
    setActing(true);
    setActionError('');
    try {
      await fn();
      await refresh();
    } catch (e: any) {
      setActionError(e?.message || 'Не вдалося виконати дію');
    } finally {
      setActing(false);
    }
  };

  const handleAddFriend = () => runAction(() => sendFriendRequest(viewerId, { targetUserId: userId }));
  const handleAccept = () =>
    runAction(() => {
      if (data?.friendshipId == null) throw new Error('Запит не знайдено');
      return acceptFriendRequest(data.friendshipId, viewerId);
    });
  const handleCancel = () =>
    runAction(() => {
      if (data?.friendshipId == null) throw new Error('Запит не знайдено');
      return removeFriend(data.friendshipId, viewerId);
    });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Профіль мандрівника"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: BG,
        color: CREAM,
        fontFamily: "'Manrope', sans-serif",
        overflowY: 'auto',
      }}
    >
      {/* The viewed traveler's own backdrop — their background, effect and
          flourishes, same treatment as the self-view profile tab. */}
      {p && (
        <div
          className={p.backgroundId === 'sakura' ? 'bg-wind-sway' : undefined}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            background: background?.css ?? 'linear-gradient(135deg,#0B3B29,#071F16)',
          }}
        >
          <ProfileCosmosFlourish backgroundId={p.backgroundId} />
          <ProfileSakuraFlourish backgroundId={p.backgroundId} />
          <ProfileCardEffect effectId={p.effectId} color={accent} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '20px 24px 80px' }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: CREAM,
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
              backdropFilter: 'blur(6px)',
              marginBottom: '26px',
            }}
          >
            <Icon name="arrowLeft" size={15} strokeWidth={2} />
            Назад
          </button>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(244,241,232,0.5)', fontSize: '14px' }}>
              Завантаження профілю…
            </div>
          )}

          {!loading && error && (
            <div style={{ fontSize: '13.5px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '34px' }}>
                <XpBar xp={data.xp} accent={accent} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: '0 0 auto' }}>
                    {p ? (
                      <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={104} />
                    ) : (
                      <img
                        src={data.avatar}
                        alt={data.name}
                        style={{ width: '104px', height: '104px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${accent}` }}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/avatar_default.svg';
                          e.currentTarget.onerror = null;
                        }}
                      />
                    )}
                    <span style={{ position: 'absolute', right: '4px', bottom: '4px', display: 'inline-flex' }}>
                      <OnlineDot online={data.online} size={16} />
                    </span>
                  </div>

                  <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: BG, background: accent, padding: '4px 10px', borderRadius: '999px' }}>
                        РІВЕНЬ {data.level}
                      </span>
                      {p && BADGES.filter((b) => p.badges?.includes(b.id)).map((b) => (
                        <span key={b.id} title={b.label} style={{ display: 'inline-flex', color: 'rgba(244,241,232,0.85)' }}>
                          <Icon name={b.icon} size={17} strokeWidth={1.8} />
                        </span>
                      ))}
                    </div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, marginBottom: '4px' }}>
                      {p?.displayName ?? data.name}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.7)', marginBottom: '8px' }}>
                      @{data.username}{data.city ? ` · ${data.city}` : ''} · {presenceLabel(data)}
                    </div>
                    {p?.bio && (
                      <div style={{ fontSize: '13.5px', color: 'rgba(244,241,232,0.78)', lineHeight: 1.5, maxWidth: '440px' }}>
                        {p.bio}
                      </div>
                    )}
                  </div>

                  <ProfileAction
                    data={data}
                    accent={accent}
                    busy={acting}
                    onMessage={() => onMessage(data.id)}
                    onAdd={handleAddFriend}
                    onAccept={handleAccept}
                    onCancel={handleCancel}
                  />
                </div>

                {actionError && (
                  <div style={{ fontSize: '12.5px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                    {actionError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <StatChip icon="map" label="клітинок" value={data.stats.cells} accent={accent} />
                  <StatChip icon="check" label="місць" value={data.stats.places} accent={accent} />
                  <StatChip icon="users" label="друзів" value={data.stats.friends} accent={accent} />
                  <StatChip icon="star" label="XP" value={data.xp} accent={accent} />
                </div>
              </div>

              {data.canSeeWall ? (
                <ProfileWall userId={data.id} viewerId={viewerId} accent={accent} />
              ) : (
                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', padding: '36px 20px', border: '1px dashed rgba(255,255,255,0.16)', borderRadius: '16px', color: 'rgba(244,241,232,0.55)', fontSize: '13.5px', lineHeight: 1.6 }}>
                  Стіна мандрівника відкрита лише друзям. Додай {p?.displayName ?? data.name} у друзі, щоб побачити подорожі.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// The one action button, driven entirely by the server-reported relation:
// chat is friends-only (see ChatService), so anyone else gets a friend-request
// path instead of a dead "Написати".
function ProfileAction({
  data,
  accent,
  busy,
  onMessage,
  onAdd,
  onAccept,
  onCancel,
}: {
  data: PublicProfile;
  accent: string;
  busy: boolean;
  onMessage: () => void;
  onAdd: () => void;
  onAccept: () => void;
  onCancel: () => void;
}) {
  const primary = (label: string, icon: Parameters<typeof Icon>[0]['name'], onClick: () => void) => (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: accent,
        color: BG,
        border: 'none',
        borderRadius: '10px',
        padding: '11px 20px',
        fontSize: '13.5px',
        fontWeight: 700,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <Icon name={icon} size={15} strokeWidth={2} stroke={BG} />
      {label}
    </button>
  );

  const secondary = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        background: 'rgba(255,255,255,0.12)',
        color: CREAM,
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '10px',
        padding: '11px 18px',
        fontSize: '13px',
        fontWeight: 700,
        cursor: busy ? 'wait' : 'pointer',
        opacity: busy ? 0.6 : 1,
        fontFamily: "'Manrope', sans-serif",
        backdropFilter: 'blur(6px)',
      }}
    >
      {label}
    </button>
  );

  if (data.relation === 'self') return null;

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '0 0 auto' }}>
      {data.relation === 'friends' && primary('Написати', 'messageSquare', onMessage)}
      {(data.relation === 'none' || data.relation === 'declined') &&
        primary('Додати в друзі', 'plus', onAdd)}
      {data.relation === 'incoming' && (
        <>
          {primary('Прийняти', 'check', onAccept)}
          {secondary('Відхилити', onCancel)}
        </>
      )}
      {data.relation === 'outgoing' && secondary('Запит надіслано · Скасувати', onCancel)}
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  accent,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        padding: '9px 14px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <Icon name={icon} size={15} strokeWidth={1.9} stroke={accent} />
      <span style={{ fontSize: '14px', fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'rgba(244,241,232,0.55)' }}>{label}</span>
    </div>
  );
}

function presenceLabel(user: PublicProfile): string {
  if (user.online) return 'онлайн';
  if (!user.lastSeenAt) return 'офлайн';
  const minutes = Math.floor((Date.now() - Date.parse(user.lastSeenAt)) / 60000);
  if (minutes < 1) return 'щойно був онлайн';
  if (minutes < 60) return `був ${minutes} хв тому`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `був ${hours} год тому`;
  return `був ${Math.floor(hours / 24)} дн тому`;
}

export default UserProfilePage;
