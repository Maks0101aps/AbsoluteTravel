import { useCallback, useEffect, useRef, useState } from 'react';
import {
  acceptFriendRequest,
  getFriendRequests,
  getFriends,
  removeFriend,
  searchUsers,
  sendFriendRequest,
  type FriendEntry,
  type FriendRequest,
  type UserSearchResult,
} from './api';
import { getSocket } from './socket';
import UserCard from './UserCard';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';

interface FriendsPageProps {
  userId: number;
  accent?: string;
  // Jump to the chat tab with this friend's thread open.
  onMessage?: (friendId: number) => void;
  // Open a traveler's profile (tapping any user card).
  onOpenProfile?: (userId: number) => void;
}

function SmallButton({
  label,
  onClick,
  color = '#3FA66B',
  outline,
  disabled,
}: {
  label: string;
  onClick: () => void;
  color?: string;
  outline?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: outline ? 'transparent' : color,
        color: outline ? color : '#071F16',
        border: `1px solid ${color}${outline ? '88' : ''}`,
        borderRadius: '9px',
        padding: '7px 13px',
        fontSize: '12px',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Manrope', sans-serif",
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function FriendsPage({ userId, accent = '#3FA66B', onMessage, onOpenProfile }: FriendsPageProps) {
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(() => {
    getFriends(userId).then(setFriends).catch(() => {});
    getFriendRequests(userId).then(setRequests).catch(() => {});
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live updates: presence changes and incoming friend events.
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    getSocket(userId).then((socket) => {
      if (disposed) return;
      const onPresence = ({ userId: uid }: { userId: number }) => {
        setFriends((prev) => prev.map((f) => (f.id === uid ? { ...f, online: !f.online ? true : f.online } : f)));
        // Presence events fire for both online and offline; just refetch cheaply.
        getFriends(userId).then(setFriends).catch(() => {});
      };
      const onRequest = () => reload();
      const onAccepted = () => reload();
      const onRemoved = () => reload();
      socket.on('presence:online', onPresence);
      socket.on('presence:offline', onPresence);
      socket.on('friends:request', onRequest);
      socket.on('friends:accepted', onAccepted);
      socket.on('friends:removed', onRemoved);
      cleanup = () => {
        socket.off('presence:online', onPresence);
        socket.off('presence:offline', onPresence);
        socket.off('friends:request', onRequest);
        socket.off('friends:accepted', onAccepted);
        socket.off('friends:removed', onRemoved);
      };
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [userId, reload]);

  // Debounced username search.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      searchUsers(userId, q)
        .then((r) => setResults(r))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, userId]);

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSend = async (target: UserSearchResult) => {
    setError(null);
    try {
      await sendFriendRequest(userId, { targetUserId: target.id });
      flash(`Запит надіслано користувачу ${target.name}`);
      setResults((prev) => prev.map((r) => (r.id === target.id ? { ...r, relation: 'outgoing' } : r)));
      reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleAccept = async (req: FriendRequest) => {
    setError(null);
    try {
      await acceptFriendRequest(req.id, userId);
      flash(`Тепер ви друзі з ${req.sender.name}!`);
      reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDecline = async (req: FriendRequest) => {
    setError(null);
    try {
      await removeFriend(req.id, userId);
      reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUnfriend = async (friend: FriendEntry) => {
    if (!window.confirm(`Видалити ${friend.name} з друзів?`)) return;
    setError(null);
    try {
      await removeFriend(friend.friendshipId, userId);
      reload();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", color: CREAM }}>
      <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
        Твоє коло мандрівників
      </h2>
      <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: '0 0 24px', maxWidth: '560px' }}>
        Додавай друзів, слідкуй за їхніми рівнями та спілкуйся в чаті. Онлайн зараз: {onlineCount} із {friends.length}.
      </p>

      {(error || notice) && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            background: error ? 'rgba(217,83,79,0.15)' : `${accent}22`,
            border: `1px solid ${error ? 'rgba(217,83,79,0.5)' : `${accent}55`}`,
            color: error ? '#E58784' : accent,
          }}
        >
          {error ?? notice}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* left: friends list */}
        <div className="at-col" style={{ flex: '1 1 380px', minWidth: '300px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>
            Мої друзі <span style={{ color: 'rgba(244,241,232,0.4)' }}>({friends.length})</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {friends.length === 0 && (
              <div style={{ background: PANEL, borderRadius: '14px', border: '1px dashed rgba(255,255,255,0.15)', padding: '24px', fontSize: '13.5px', color: 'rgba(244,241,232,0.55)' }}>
                Поки що порожньо. Знайди друзів через пошук праворуч!
              </div>
            )}
            {friends.map((f) => (
              <UserCard
                key={f.id}
                user={f}
                accent={accent}
                onClick={onOpenProfile ? () => onOpenProfile(f.id) : undefined}
                actions={
                  <>
                    <SmallButton label="Написати" color={accent} onClick={() => onMessage?.(f.id)} />
                    <SmallButton label="Видалити" color="#D9534F" outline onClick={() => handleUnfriend(f)} />
                  </>
                }
              />
            ))}
          </div>
        </div>

        {/* right: requests + search */}
        <div className="at-col" style={{ flex: '1 1 320px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {requests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>
                Вхідні запити{' '}
                <span style={{ color: '#071F16', background: accent, borderRadius: '999px', padding: '1px 8px', fontSize: '12px', fontWeight: 800 }}>
                  {requests.length}
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {requests.map((req) => (
                  <UserCard
                    key={req.id}
                    user={req.sender}
                    accent={accent}
                    compact
                    onClick={onOpenProfile ? () => onOpenProfile(req.sender.id) : undefined}
                    actions={
                      <>
                        <SmallButton label="Прийняти" color={accent} onClick={() => handleAccept(req)} />
                        <SmallButton label="Відхилити" color="#D9534F" outline onClick={() => handleDecline(req)} />
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 12px' }}>Знайти мандрівників</h3>
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <span style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(244,241,232,0.4)', display: 'inline-flex' }}>
                <Icon name="target" size={15} strokeWidth={1.9} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ім’я користувача…"
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: PANEL,
                  border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: '12px',
                  padding: '12px 14px 12px 38px',
                  color: CREAM,
                  fontSize: '14px',
                  fontFamily: "'Manrope', sans-serif",
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {searching && <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)' }}>Пошук…</div>}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.5)' }}>Нікого не знайдено.</div>
              )}
              {results.map((r) => (
                <UserCard
                  key={r.id}
                  user={r}
                  accent={accent}
                  compact
                  onClick={onOpenProfile ? () => onOpenProfile(r.id) : undefined}
                  actions={
                    r.relation === 'friends' ? (
                      <SmallButton label="Написати" color={accent} onClick={() => onMessage?.(r.id)} />
                    ) : r.relation === 'outgoing' ? (
                      <SmallButton label="Запит надіслано" color={accent} outline disabled onClick={() => {}} />
                    ) : r.relation === 'incoming' ? (
                      <SmallButton
                        label="Прийняти запит"
                        color={accent}
                        onClick={() => handleAccept({ id: r.friendshipId!, createdAt: '', sender: r })}
                      />
                    ) : (
                      <SmallButton label="Додати" color={accent} onClick={() => handleSend(r)} />
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FriendsPage;
