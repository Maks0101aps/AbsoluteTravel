import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  acceptFriendRequest,
  getUserProfile,
  removeFriend,
  sendFriendRequest,
  type PublicProfile,
} from './api';
import ProfileAvatar from './ProfileAvatar';
import ProfileWall from './ProfileWall';
import FriendMapView from './FriendMapView';
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
  const { t } = useTranslation();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Friend-action state, kept separate from `error` so a failed request
  // doesn't blank out the whole profile.
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getUserProfile(userId, viewerId)
      .then((p) => {
        if (!cancelled) setData(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || t('social.profile.loadError'));
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
      setActionError(e?.message || t('social.profile.actionFailed'));
    } finally {
      setActing(false);
    }
  };

  const handleAddFriend = () => runAction(() => sendFriendRequest(viewerId, { targetUserId: userId }));
  const handleAccept = () =>
    runAction(() => {
      if (data?.friendshipId == null) throw new Error(t('social.profile.requestNotFound'));
      return acceptFriendRequest(data.friendshipId, viewerId);
    });
  const handleCancel = () =>
    runAction(() => {
      if (data?.friendshipId == null) throw new Error(t('social.profile.requestNotFound'));
      return removeFriend(data.friendshipId, viewerId);
    });

  // Same endpoint as handleCancel, but this one drops an existing friendship —
  // confirm first, matching how FriendsPage guards unfriending.
  const handleUnfriend = () => {
    const who = data?.profile?.displayName ?? data?.name ?? '';
    if (!window.confirm(t('social.profile.confirmUnfriend', { name: who }))) return;
    return handleCancel();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('social.profile.dialogLabel')}
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
            {t('social.profile.back')}
          </button>

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(244,241,232,0.5)', fontSize: '14px' }}>
              {t('social.profile.loading')}
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
                        {t('social.profile.level', { level: data.level })}
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
                      @{data.username}{data.city ? ` · ${data.city}` : ''} · {presenceLabel(data, t)}
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
                    onUnfriend={handleUnfriend}
                  />
                </div>

                {actionError && (
                  <div style={{ fontSize: '12.5px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '10px', padding: '10px 14px' }}>
                    {actionError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <StatChip icon="map" label={t('social.profile.statCells')} value={data.stats.cells} accent={accent} />
                  <StatChip icon="check" label={t('social.profile.statPlaces')} value={data.stats.places} accent={accent} />
                  <StatChip icon="users" label={t('social.profile.statFriends')} value={data.stats.friends} accent={accent} />
                  <StatChip icon="star" label="XP" value={data.xp} accent={accent} />
                  {data.canSeeWall && (
                    <button
                      onClick={() => setShowMap(true)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: `${accent}18`,
                        color: accent,
                        border: `1px solid ${accent}55`,
                        borderRadius: '12px',
                        padding: '9px 16px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        fontFamily: "'Manrope', sans-serif",
                      }}
                    >
                      <Icon name="compass" size={15} strokeWidth={1.9} />
                      {t('social.profile.viewMap')}
                    </button>
                  )}
                </div>
              </div>

              {data.canSeeWall ? (
                <ProfileWall userId={data.id} viewerId={viewerId} accent={accent} />
              ) : (
                <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center', padding: '36px 20px', border: '1px dashed rgba(255,255,255,0.16)', borderRadius: '16px', color: 'rgba(244,241,232,0.55)', fontSize: '13.5px', lineHeight: 1.6 }}>
                  {t('social.profile.wallLocked', { name: p?.displayName ?? data.name })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showMap && data && (
        <FriendMapView
          userId={data.id}
          viewerId={viewerId}
          displayName={p?.displayName ?? data.name}
          accent={accent}
          onClose={() => setShowMap(false)}
        />
      )}
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
  onUnfriend,
}: {
  data: PublicProfile;
  accent: string;
  busy: boolean;
  onMessage: () => void;
  onAdd: () => void;
  onAccept: () => void;
  onCancel: () => void;
  onUnfriend: () => void;
}) {
  const { t } = useTranslation();
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

  // "Написати" appears only once the friendship is accepted — the server
  // rejects chat between non-friends (see ChatService.requireFriendship), so
  // showing it earlier would be a button that 403s. Every other state offers
  // the step that leads there instead.
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '0 0 auto' }}>
      {data.relation === 'friends' && (
        <>
          {primary(t('social.profile.message'), 'messageSquare', onMessage)}
          {secondary(t('social.profile.removeFriend'), onUnfriend)}
        </>
      )}
      {(data.relation === 'none' || data.relation === 'declined') &&
        primary(t('social.profile.addFriend'), 'plus', onAdd)}
      {data.relation === 'incoming' && (
        <>
          {primary(t('social.profile.acceptRequest'), 'check', onAccept)}
          {secondary(t('social.profile.declineRequest'), onCancel)}
        </>
      )}
      {data.relation === 'outgoing' && secondary(t('social.profile.cancelRequest'), onCancel)}
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

function presenceLabel(user: PublicProfile, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (user.online) return t('social.profile.presenceOnline');
  if (!user.lastSeenAt) return t('social.profile.presenceOffline');
  const minutes = Math.floor((Date.now() - Date.parse(user.lastSeenAt)) / 60000);
  if (minutes < 1) return t('social.profile.presenceJustNow');
  if (minutes < 60) return t('social.profile.presenceAgo', { time: t('social.timeAgo.minutes', { count: minutes }) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('social.profile.presenceAgo', { time: t('social.timeAgo.hours', { count: hours }) });
  return t('social.profile.presenceAgo', { time: t('social.timeAgo.days', { count: Math.floor(hours / 24) }) });
}

export default UserProfilePage;
