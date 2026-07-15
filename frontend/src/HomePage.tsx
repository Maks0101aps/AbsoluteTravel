import { useEffect, useState } from 'react';
import { getUnreadCounts, getUserCheckmarks, purchaseItem, updateProfile, type AuthUser, type ProfileCustomization, type VerifyCheckmarkResult } from './api';
import ProfileAvatar from './ProfileAvatar';
import ProfileShop, { type EquipKey } from './ProfileShop';
import XpBar from './XpBar';
import ExploreMap from './ExploreMap';
import FriendsPage from './FriendsPage';
import LeaderboardPage from './LeaderboardPage';
import ChatPage from './ChatPage';
import { getSocket, closeSocket } from './socket';
import { AVATARS, BACKGROUNDS, BADGES, COLORS, EFFECTS, FRAMES } from './data/profileOptions';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const DEFAULT_ACCENT = '#3FA66B';

type Tab = 'map' | 'friends' | 'leaderboard' | 'chat' | 'advisor' | 'profile';

// The profile view is opened by clicking the avatar (top-right), not a tab.
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'map', label: 'Мапа мандрівок', icon: 'map' },
  { id: 'friends', label: 'Друзі', icon: 'backpack' },
  { id: 'leaderboard', label: 'Рейтинг', icon: 'trophy' },
  { id: 'chat', label: 'Чат', icon: 'messageSquare' },
  { id: 'advisor', label: 'ШІ-порадник', icon: 'compass' },
];

interface HomePageProps {
  user: AuthUser;
  onLogout: () => void;
  onEditProfile: () => void;
  // Persist updated user fields (xp/coins/level/profile) after a shop purchase or verified visit.
  onUserUpdate?: (patch: Partial<AuthUser>) => void;
}

function HomePage({ user, onLogout, onEditProfile, onUserUpdate }: HomePageProps) {
  const p = user.profile;
  const accent = p?.color ?? DEFAULT_ACCENT;
  const background = BACKGROUNDS.find((b) => b.id === p?.backgroundId);
  const [tab, setTab] = useState<Tab>('map');
  const [openedPlaceIds, setOpenedPlaceIds] = useState<Set<string | number>>(new Set());
  // Preselected friend when jumping into chat from "Написати" buttons.
  const [chatFriendId, setChatFriendId] = useState<number | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  // --- shop (self-contained overlay: opening/closing is a local toggle, no
  // navigation and no profile editor involved) ---
  const [shopOpen, setShopOpen] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);

  // Apply a cosmetic to the profile and persist it (localStorage via onUserUpdate,
  // plus name/avatar to the backend).
  const equip = (key: EquipKey, id: string) => {
    if (!p) return;
    const next: ProfileCustomization = { ...p };
    switch (key) {
      case 'avatar': next.avatarId = id; next.customAvatar = undefined; break;
      case 'background': next.backgroundId = id; break;
      case 'frame': next.frameId = id; break;
      case 'color': next.color = id; break;
      case 'effect': next.effectId = id; break;
      case 'badges':
        next.badges = p.badges.includes(id) ? p.badges.filter((x) => x !== id) : [...p.badges, id];
        break;
    }
    const avatar = next.customAvatar || next.avatarId;
    onUserUpdate?.({ profile: next, name: next.displayName, avatar });
    updateProfile(user.id, { name: next.displayName, avatar }).catch(() => {});
  };

  const equipKeyOf = (itemId: string): EquipKey | null => {
    if (AVATARS.some((a) => a.id === itemId)) return 'avatar';
    if (BACKGROUNDS.some((b) => b.id === itemId)) return 'background';
    if (FRAMES.some((f) => f.id === itemId)) return 'frame';
    if (BADGES.some((b) => b.id === itemId)) return 'badges';
    if (EFFECTS.some((e) => e.id === itemId)) return 'effect';
    if (COLORS.some((c) => c.id === itemId)) return 'color';
    return null;
  };

  const handleBuy = async (itemId: string) => {
    setBuying(itemId);
    setShopError(null);
    try {
      const res = await purchaseItem(user.id, itemId);
      onUserUpdate?.({ coins: res.coins, unlockedItems: res.unlockedItems });
      // auto-equip the freshly purchased item so buying feels immediate
      const key = equipKeyOf(itemId);
      if (key) {
        const colorOpt = COLORS.find((c) => c.id === itemId);
        equip(key, colorOpt ? colorOpt.value : itemId);
      }
    } catch (e: any) {
      setShopError(e?.message ?? 'Не вдалося придбати товар');
    } finally {
      setBuying(null);
    }
  };

  const openChatWith = (friendId: number) => {
    setChatFriendId(friendId);
    setTab('chat');
  };

  // Connect the realtime socket for the session; keep the chat unread badge fresh.
  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    const refreshUnread = () => {
      getUnreadCounts(user.id)
        .then((counts) => {
          if (!disposed) setTotalUnread(Object.values(counts).reduce((s, n) => s + n, 0));
        })
        .catch(() => {});
    };
    refreshUnread();
    getSocket(user.id).then((socket) => {
      if (disposed) return;
      const onMessage = () => refreshUnread();
      socket.on('chat:message', onMessage);
      cleanup = () => socket.off('chat:message', onMessage);
    });
    return () => {
      disposed = true;
      cleanup();
      closeSocket();
    };
  }, [user.id]);

  // Opening the chat tab clears the badge (threads mark themselves read).
  useEffect(() => {
    if (tab === 'chat') setTotalUnread(0);
  }, [tab]);

  // Load the places this user has already verified, to show "opened" badges.
  useEffect(() => {
    let cancelled = false;
    getUserCheckmarks(user.id)
      .then((marks) => {
        if (!cancelled) setOpenedPlaceIds(new Set(marks.map((m) => m.placeId)));
      })
      .catch(() => {
        // non-blocking: no badges if the call fails
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const handleVerified = (placeId: string | number, result: VerifyCheckmarkResult) => {
    setOpenedPlaceIds((prev) => new Set(prev).add(placeId));
    onUserUpdate?.({
      xp: user.xp + result.xpAwarded,
      coins: (user.coins ?? 0) + result.coinsAwarded,
      level: result.newLevel,
    });
  };

  const maxWidth = tab === 'profile' ? '860px' : '1140px';

  return (
    <div style={{ 
      fontFamily: "'Manrope', sans-serif", 
      background: BG, 
      color: CREAM, 
      height: (tab === 'chat' || tab === 'advisor') ? '100dvh' : 'auto',
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: (tab === 'chat' || tab === 'advisor') ? 'hidden' : 'visible'
    }}>
      {/* navbar */}
      <nav className="at-home-nav" style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '12px 24px', background: BG, borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'nowrap' }}>
        <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '36px', width: 'auto', display: 'block', flexShrink: 0 }} />

        {/* navigation tabs — tightened padding/gaps so everything fits on one line */}
        <div className="at-home-nav-tabs" style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'nowrap', flex: '1 1 auto', minWidth: 0, justifyContent: 'center' }}>
          {TABS.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                  background: isActive ? `${accent}1F` : 'transparent',
                  border: `1px solid ${isActive ? `${accent}66` : 'transparent'}`,
                  color: isActive ? accent : 'rgba(244,241,232,0.65)',
                  borderRadius: '9px',
                  padding: '7px 9px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon name={t.icon} size={14} strokeWidth={1.9} />
                {t.label}
                {t.id === 'chat' && totalUnread > 0 && (
                  <span style={{ background: accent, color: BG, fontSize: '10px', fontWeight: 800, borderRadius: '999px', padding: '1px 6px', marginLeft: '1px' }}>
                    {totalUnread}
                  </span>
                )}
              </button>
            );
          })}
          {p && (
            <button
              onClick={() => { setShopError(null); setShopOpen(true); }}
              title="Магазин"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
                whiteSpace: 'nowrap',
                background: 'rgba(240,198,75,0.12)',
                border: '1px solid rgba(240,198,75,0.35)',
                color: '#F0C64B',
                borderRadius: '9px',
                padding: '7px 9px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
                transition: 'all 0.2s ease',
              }}
            >
              <Icon name="coin" size={14} strokeWidth={1.9} stroke="#F0C64B" />
              Магазин
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div title="Монети" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#F0C64B', background: 'rgba(240,198,75,0.12)', border: '1px solid rgba(240,198,75,0.3)', borderRadius: '999px', padding: '6px 10px', fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            <Icon name="coin" size={15} strokeWidth={1.9} />
            {user.coins ?? 0}
          </div>
          <div className="at-home-userinfo" style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: '10.5px', color: 'rgba(244,241,232,0.5)', whiteSpace: 'nowrap' }}>Рівень {user.level}</div>
          </div>
          <button
            onClick={() => setTab('profile')}
            title="Мій профіль"
            style={{ background: 'transparent', border: 'none', padding: 0, lineHeight: 0, cursor: 'pointer', flexShrink: 0, borderRadius: '50%', outline: tab === 'profile' ? `2px solid ${accent}` : '2px solid transparent', outlineOffset: '2px', transition: 'outline-color 0.2s ease' }}
          >
            {p ? (
              <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={36} />
            ) : (
              <img src={user.avatar} alt={user.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${accent}` }} onError={(e) => (e.currentTarget.style.display = 'none')} />
            )}
          </button>
          <button onClick={onLogout} style={{ background: 'transparent', color: 'rgba(244,241,232,0.7)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '10px', padding: '8px 13px', fontSize: '12.5px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Вийти
          </button>
        </div>
      </nav>

      <main className={`at-home-main ${(tab === 'chat' || tab === 'advisor') ? 'at-chat-main-tab' : ''}`} style={{ maxWidth, margin: '0 auto', padding: '40px 24px 80px' }}>
        {tab === 'profile' && <ProfileTab user={user} onEditProfile={onEditProfile} accent={accent} background={background} />}
        {tab === 'map' && (
          <ExploreMap
            accent={accent}
            submitterName={p?.displayName ?? user.name}
            userId={user.id}
            openedPlaceIds={openedPlaceIds}
            onVerified={handleVerified}
            onMessageFriend={openChatWith}
          />
        )}
        {tab === 'friends' && <FriendsPage userId={user.id} accent={accent} onMessage={openChatWith} />}
        {tab === 'leaderboard' && <LeaderboardPage userId={user.id} userRegion={user.region} accent={accent} />}
        {tab === 'chat' && <ChatPage userId={user.id} user={user} accent={accent} initialFriendId={chatFriendId} />}
        {tab === 'advisor' && <ChatPage userId={user.id} user={user} accent={accent} initialFriendId="advisor" hideSidebar={true} />}
      </main>

      {shopOpen && p && (
        <ProfileShop
          coins={user.coins ?? 0}
          level={user.level}
          owned={user.unlockedItems ?? []}
          buying={buying}
          error={shopError}
          selections={{
            avatarId: p.avatarId,
            customAvatar: p.customAvatar,
            backgroundId: p.backgroundId,
            frameId: p.frameId,
            color: p.color,
            badges: p.badges,
            effectId: p.effectId,
          }}
          onBuy={handleBuy}
          onEquip={equip}
          onClose={() => setShopOpen(false)}
        />
      )}
    </div>
  );
}

// The original profile view, now the first tab.
function ProfileTab({
  user,
  onEditProfile,
  accent,
  background,
}: {
  user: AuthUser;
  onEditProfile: () => void;
  accent: string;
  background: (typeof BACKGROUNDS)[number] | undefined;
}) {
  const p = user.profile;
  if (!p) {
    return (
      <>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '16px' }}>ЛАСКАВО ПРОСИМО</div>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(30px, 4vw, 42px)', margin: '0 0 14px' }}>Вітаємо, {user.name}!</h1>
        <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '520px', margin: '0 0 32px' }}>
          Ти пропустив налаштування профілю. Персоналізуй його будь-коли.
        </p>
        <button onClick={onEditProfile} style={{ background: accent, color: BG, fontFamily: "'Manrope', sans-serif", fontSize: '14.5px', fontWeight: 700, border: 'none', borderRadius: '12px', padding: '15px 30px', cursor: 'pointer' }}>
          Налаштувати профіль
        </button>
      </>
    );
  }

  return (
    <>
      {/* profile banner */}
      <div style={{ position: 'relative', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', marginBottom: '30px', boxShadow: '0 24px 60px -20px rgba(0,0,0,0.7)' }}>
        <div style={{ position: 'absolute', inset: 0, background: background?.css ?? 'linear-gradient(135deg,#0B3B29,#071F16)' }} />
        {p.effectId === 'glow' && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ['--glow-color' as any]: `${accent}80`, animation: 'softGlow 3.5s ease-in-out infinite' }} />
        )}
        <div style={{ position: 'relative', padding: '24px 30px 30px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <XpBar xp={user.xp} accent={accent} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={104} />
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: BG, background: accent, padding: '4px 10px', borderRadius: '999px' }}>
                РІВЕНЬ {user.level}
              </span>
              {BADGES.filter((b) => p.badges?.includes(b.id)).map((b) => (
                <span key={b.id} title={b.label} style={{ display: 'inline-flex', color: 'rgba(244,241,232,0.85)' }}>
                  <Icon name={b.icon} size={17} strokeWidth={1.8} />
                </span>
              ))}
            </div>
            <div style={{ fontFamily: "'Lora', serif", fontSize: '26px', fontWeight: 500, marginBottom: '4px' }}>{p.displayName}</div>
            <div style={{ fontSize: '13px', color: 'rgba(244,241,232,0.7)', marginBottom: '8px' }}>
              @{user.username}{user.city ? ` · ${user.city}` : ''}
            </div>
            {p.bio && <div style={{ fontSize: '13.5px', color: 'rgba(244,241,232,0.78)', lineHeight: 1.5, maxWidth: '440px' }}>{p.bio}</div>}
          </div>
          <button onClick={onEditProfile} style={{ background: 'rgba(255,255,255,0.12)', color: CREAM, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
            Редагувати
          </button>
          </div>
        </div>
      </div>

      <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: '0 0 12px' }}>Готово, {p.displayName}!</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(244,241,232,0.65)', maxWidth: '520px', margin: 0 }}>
        Відкрий вкладку «Мапа мандрівок», щоб дослідити цікаві місця України, або запитай поради у «ШІ-порадника».
      </p>
    </>
  );
}

export default HomePage;
