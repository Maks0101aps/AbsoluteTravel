import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getFriendRequests,
  getUnreadCounts,
  getUserCheckmarks,
  purchaseItem,
  updateProfile,
  openCase,
  getCasesState,
  type AuthUser,
  type ProfileCustomization,
  type VerifyCheckmarkResult,
  type VisitCellResult,
} from './api';
import ProfileAvatar from './ProfileAvatar';
import ProfileShop, { type EquipKey } from './ProfileShop';
import CaseOpener from './CaseOpener';
import XpBar from './XpBar';
import ExploreMap from './ExploreMap';
import FriendsPage from './FriendsPage';
import LeaderboardPage from './LeaderboardPage';
import ChatPage from './ChatPage';
import { getSocket, closeSocket } from './socket';
import { AVATARS, BACKGROUNDS, BADGES, COLORS, EFFECTS, FRAMES } from './data/profileOptions';
import { Icon, type IconName } from './icons';
import { ProfileCardEffect, ProfileCosmosFlourish, ProfileSakuraFlourish } from './itemVisuals';
import ProfileWall from './ProfileWall';
import UserProfilePage from './UserProfilePage';
import WalkIntro from './WalkIntro';
import LanguageSwitcher from './LanguageSwitcher';
import AchievementsPage from './AchievementsPage';

const CREAM = '#F4F1E8';
const BG = '#071F16';
const DEFAULT_ACCENT = '#3FA66B';

type Tab = 'map' | 'friends' | 'leaderboard' | 'achievements' | 'chat' | 'profile' | 'cases';

// The profile view is opened by clicking the avatar (top-right), not a tab.
// `short` is what the phone tab bar shows — the full labels don't fit six-across.
function buildTabs(t: (key: string) => string): { id: Tab; label: string; short: string; icon: IconName }[] {
  return [
    { id: 'map', label: t('core.nav.mapTab'), short: t('core.nav.mapTabShort'), icon: 'map' },
    { id: 'friends', label: t('core.nav.friendsTab'), short: t('core.nav.friendsTab'), icon: 'users' },
    { id: 'leaderboard', label: t('core.nav.leaderboardTab'), short: t('core.nav.leaderboardTab'), icon: 'trophy' },
    { id: 'achievements', label: t('core.nav.achievementsTab'), short: t('core.nav.achievementsTabShort'), icon: 'medal' },
    { id: 'chat', label: t('core.nav.chatTab'), short: t('core.nav.chatTab'), icon: 'messageSquare' },
  ];
}

interface HomePageProps {
  user: AuthUser;
  onLogout: () => void;
  onEditProfile: () => void;
  // Persist updated user fields (xp/coins/level/profile) after a shop purchase or verified visit.
  onUserUpdate?: (patch: Partial<AuthUser>) => void;
  // One-time onboarding "top-3 places to walk" overlay (armed by Root on register).
  showWalkIntro?: boolean;
  onCloseWalkIntro?: () => void;
}

function HomePage({ user, onLogout, onEditProfile, onUserUpdate, showWalkIntro, onCloseWalkIntro }: HomePageProps) {
  const { t } = useTranslation();
  const TABS = buildTabs(t);
  const p = user.profile;
  const accent = p?.color ?? DEFAULT_ACCENT;
  const background = BACKGROUNDS.find((b) => b.id === p?.backgroundId);
  const [tab, setTab] = useState<Tab>('map');
  const [openedPlaceIds, setOpenedPlaceIds] = useState<Set<string | number>>(new Set());
  // A place asked to be opened on the map from outside (welcome recommendation).
  const [mapFocus, setMapFocus] = useState<{ id: string | number; nonce: number } | null>(null);
  // "Are you sure?" gate before actually logging out (asked from the profile tab).
  const [confirmLogout, setConfirmLogout] = useState(false);
  // Preselected friend when jumping into chat from "Написати" buttons.
  const [chatFriendId, setChatFriendId] = useState<number | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  // Pending incoming friend requests. Counted here rather than in FriendsPage
  // because that page is only mounted while its tab is open — the badge has to
  // show up no matter where the user is.
  const [pendingRequests, setPendingRequests] = useState(0);
  // Another traveler's profile, shown as an overlay above the current tab.
  // Tapping yourself lands on your own profile tab instead of the overlay,
  // which is the editable view.
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  // --- shop (self-contained overlay: opening/closing is a local toggle, no
  // navigation and no profile editor involved) ---
  const [shopOpen, setShopOpen] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [openedCaseIds, setOpenedCaseIds] = useState<string[]>([]);

  // Which one-time cases (the free starter) the user has already opened.
  useEffect(() => {
    if (!shopOpen && tab !== 'cases') return;
    getCasesState(user.id)
      .then((s) => setOpenedCaseIds(s.openedCaseIds))
      .catch(() => {
        // non-blocking: cases still openable, server enforces the once-only rule
      });
  }, [shopOpen, tab, user.id]);

  const handleOpenCase = async (caseId: string) => {
    const res = await openCase(user.id, caseId);
    onUserUpdate?.({ coins: res.coins, unlockedItems: res.unlockedItems });
    // The free starter case can only be opened once — remember it locally.
    setOpenedCaseIds((prev) => (prev.includes(caseId) ? prev : [...prev, caseId]));
    return res;
  };

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
    updateProfile(user.id, { name: next.displayName, avatar, profile: next }).catch(() => {});
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
      setShopError(e?.message ?? t('core.errors.purchaseFailed'));
    } finally {
      setBuying(null);
    }
  };

  const openChatWith = (friendId: number) => {
    setChatFriendId(friendId);
    setViewingUserId(null);
    setTab('chat');
  };

  const openProfileOf = (targetId: number) => {
    if (targetId === user.id) {
      setTab('profile');
      return;
    }
    setViewingUserId(targetId);
  };

  // Connect the realtime socket for the session; keep the chat unread and
  // friend-request badges fresh.
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
    // Refetched rather than incremented on the socket event: `friends:request`
    // is only delivered while online (PresenceService drops it otherwise), so
    // the count on mount is what covers requests that arrived while away.
    const refreshRequests = () => {
      getFriendRequests(user.id)
        .then((reqs) => {
          if (!disposed) setPendingRequests(reqs.length);
        })
        .catch(() => {});
    };
    refreshUnread();
    refreshRequests();
    getSocket(user.id).then((socket) => {
      if (disposed) return;
      const onMessage = () => refreshUnread();
      const onFriendChange = () => refreshRequests();
      socket.on('chat:message', onMessage);
      // A request arriving, or being accepted/withdrawn elsewhere, all move the count.
      socket.on('friends:request', onFriendChange);
      socket.on('friends:accepted', onFriendChange);
      socket.on('friends:removed', onFriendChange);
      cleanup = () => {
        socket.off('chat:message', onMessage);
        socket.off('friends:request', onFriendChange);
        socket.off('friends:accepted', onFriendChange);
        socket.off('friends:removed', onFriendChange);
      };
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

  // A new territory cell was unlocked. The server returns the authoritative new
  // totals, so apply them directly rather than incrementing (avoids drift when
  // several cells unlock in quick succession).
  const handleExplored = (result: VisitCellResult) => {
    onUserUpdate?.({ xp: result.newXp, level: result.newLevel });
  };

  // Unread messages and pending friend requests both surface as a tab count.
  const badgeOf = (id: Tab) => {
    if (id === 'chat') return totalUnread;
    if (id === 'friends') return pendingRequests;
    return 0;
  };
  const maxWidth = tab === 'profile' ? '1400px' : '1140px';

  return (
    <div className={`at-home-root${tab === 'chat' ? ' at-home-root-chat' : ''}`} style={{
      fontFamily: "'Manrope', sans-serif",
      background: BG,
      color: CREAM,
      height: tab === 'chat' ? '100dvh' : 'auto',
      minHeight: '100dvh', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: tab === 'chat' ? 'hidden' : 'visible'
    }}>
      {/* Fixed, full-viewport backdrop for the profile tab: acts as the
          page's own background rather than a bounded card — it sits behind
          the (floating) nav, the hero content, and everything scrolled below
          it (welcome copy + wall), and never scrolls away. */}
      {tab === 'profile' && p && (
        <div className={p.backgroundId === 'sakura' ? 'bg-wind-sway' : undefined}>
          <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: background?.css ?? 'linear-gradient(135deg,#0B3B29,#071F16)' }}>
            <ProfileCardEffect effectId={p.effectId} color={accent} />
            <ProfileCosmosFlourish backgroundId={p.backgroundId} />
            <ProfileSakuraFlourish backgroundId={p.backgroundId} />
          </div>
        </div>
      )}

      {/* navbar — four separate rounded pill groups floating on the page
          background, no shared header strip/bar behind them. */}
      <nav
        className="at-home-nav"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '14px 24px',
          background: 'rgba(7,31,22,0.86)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          flexWrap: 'nowrap',
        }}
      >
        {/* group 1: logo */}
        <button
          onClick={() => {
            setTab('map');
            setViewingUserId(null);
            setShopOpen(false);
          }}
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            background: 'transparent',
            border: 'none',
            padding: '9px 18px',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <img src="/assets/logo.svg" alt="Absolute Travel" style={{ height: '32px', width: 'auto', display: 'block' }} />
        </button>

        {/* group 2: nav tabs + shop — absolutely centered on the nav itself,
            so it sits dead-center regardless of how wide the logo vs. the
            coins+profile cluster on either side end up being (a flex
            justify-content:center child would only center within its own
            leftover flex space, which shifts off-center whenever the two
            sides aren't equal width). */}
        <div
          className="at-home-nav-tabs"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            flexWrap: 'nowrap',
            background: 'transparent',
            border: 'none',
            borderRadius: '18px',
            padding: '7px 10px',
          }}
        >
          {TABS.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                title={item.label}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  width: '38px',
                  height: '38px',
                  background: isActive ? `${accent}1F` : 'transparent',
                  border: `1px solid ${isActive ? `${accent}66` : 'transparent'}`,
                  color: isActive ? accent : 'rgba(244,241,232,0.65)',
                  borderRadius: '50%',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon name={item.icon} size={17} strokeWidth={1.9} />
                {badgeOf(item.id) > 0 && (
                  <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: accent, color: BG, fontSize: '9.5px', fontWeight: 800, borderRadius: '999px', padding: '1px 5px', lineHeight: 1.4 }}>
                    {badgeOf(item.id)}
                  </span>
                )}
              </button>
            );
          })}
          {p && (
            <button
              onClick={() => setTab('cases')}
              title={t('core.nav.casesTab')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '38px',
                height: '38px',
                background: tab === 'cases' ? 'rgba(240,198,75,0.12)' : 'transparent',
                border: `1px solid ${tab === 'cases' ? 'rgba(240,198,75,0.35)' : 'transparent'}`,
                color: '#F0C64B',
                borderRadius: '50%',
                padding: 0,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon name="gift" size={17} strokeWidth={1.9} stroke="#F0C64B" />
            </button>
          )}
        </div>

        {/* right cluster: coins (group 3) + profile/logout (group 4) — kept as
            a single flex child so the nav's flex row only ever has two items
            (logo, this cluster) and justify-content:space-between pins them
            to the edges cleanly, independent of the absolutely-centered tabs. */}
        <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* group 3: coins — opens the shop */}
          {p && (
            <button
              onClick={() => { setShopError(null); setShopOpen(true); }}
              title={t('core.nav.shopTitle')}
              style={{
                flex: '0 0 auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#F0C64B',
                background: 'linear-gradient(135deg, rgba(240,198,75,0.16), rgba(240,198,75,0.06))',
                border: '1.5px solid rgba(240,198,75,0.55)',
                borderRadius: '999px',
                padding: '9px 17px',
                fontSize: '12.5px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                boxShadow: '0 0 0 1px rgba(240,198,75,0.12), 0 6px 18px -8px rgba(240,198,75,0.55)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(240,198,75,0.85)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(240,198,75,0.2), 0 8px 22px -8px rgba(240,198,75,0.7)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(240,198,75,0.55)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(240,198,75,0.12), 0 6px 18px -8px rgba(240,198,75,0.55)'; }}
            >
              <Icon name="coin" size={15} strokeWidth={1.9} />
              {user.coins ?? 0}
            </button>
          )}

          {/* group 4: profile + logout */}
          <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', borderRadius: '18px', padding: '8px 12px' }}>
            <div className="at-home-userinfo" style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: '10.5px', color: 'rgba(244,241,232,0.5)', whiteSpace: 'nowrap' }}>{t('core.nav.level', { level: user.level })}</div>
            </div>
            <button
              onClick={() => setTab('profile')}
              title={t('core.nav.myProfile')}
              style={{ background: 'transparent', border: 'none', padding: 0, lineHeight: 0, cursor: 'pointer', flexShrink: 0, borderRadius: '50%', outline: tab === 'profile' ? `2px solid ${accent}` : '2px solid transparent', outlineOffset: '2px', transition: 'outline-color 0.2s ease' }}
            >
              {p ? (
                <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={36} />
              ) : (
                <img src={user.avatar} alt={user.name} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${accent}` }} onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Now that the nav above is position:fixed (pinned, doesn't scroll away),
          it's out of normal flow — this spacer reserves the same height so
          the fixed backdrop / hero / main content don't start underneath it. */}
      <div className="at-home-nav-spacer" aria-hidden="true" />

      {/* phone tab bar — CSS decides whether it shows, so the nav stays one source of truth */}
      <nav className="at-tabbar" aria-label={t('core.nav.mainNavAria')}>
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`at-tabbar-btn${isActive ? ' at-tabbar-btn-on' : ''}`}
              style={{ color: isActive ? accent : 'rgba(244,241,232,0.5)' }}
            >
              <span className="at-tabbar-icon">
                <Icon name={item.icon} size={19} strokeWidth={1.9} />
                {badgeOf(item.id) > 0 && (
                  <span className="at-tabbar-badge" style={{ background: accent, color: BG }}>
                    {badgeOf(item.id) > 9 ? '9+' : badgeOf(item.id)}
                  </span>
                )}
              </span>
              {item.short}
            </button>
          );
        })}
        {p && (
          <button
            onClick={() => setTab('cases')}
            className={`at-tabbar-btn${tab === 'cases' ? ' at-tabbar-btn-on' : ''}`}
            style={{ color: tab === 'cases' ? '#F0C64B' : 'rgba(240,198,75,0.6)' }}
          >
            <span className="at-tabbar-icon">
              <Icon name="gift" size={19} strokeWidth={1.9} />
            </span>
            {t('core.nav.casesTab')}
          </button>
        )}
      </nav>

      {tab === 'profile' && p && (
        <ProfileHero user={user} accent={accent} onEditProfile={onEditProfile} onRequestLogout={() => setConfirmLogout(true)} />
      )}

      {/* position+z-index here are only needed on the profile tab, to sit above
          the fixed full-bleed backdrop above — anywhere else they'd trap any
          modal rendered inside <main> (AddPlaceForm, VerifyVisitModal, ...) in
          a stacking context capped below the nav's z-index:50, so the header
          area would paint on top and swallow scroll/click meant for the modal. */}
      <main
        key={tab}
        className={`at-home-main at-page-enter ${tab === 'chat' ? 'at-chat-main-tab' : ''}`}
        style={{
          ...(tab === 'profile' ? { position: 'relative' as const, zIndex: 1 } : {}),
          maxWidth,
          margin: '0 auto',
          padding: '40px 24px 80px',
        }}
      >
        {tab === 'profile' && <ProfileTab user={user} onEditProfile={onEditProfile} accent={accent} onRequestLogout={() => setConfirmLogout(true)} />}
        {tab === 'map' && (
          <ExploreMap
            accent={accent}
            submitterName={p?.displayName ?? user.name}
            userId={user.id}
            profile={p}
            openedPlaceIds={openedPlaceIds}
            onVerified={handleVerified}
            onExplored={handleExplored}
            onMessageFriend={openChatWith}
            onOpenProfile={openProfileOf}
            focusPlace={mapFocus}
          />
        )}
        {/* onRequestsChange must be a stable reference: it feeds FriendsPage's
            reload callback, and a fresh lambda each render would re-trigger it
            in a loop. The useState setter is stable by definition. */}
        {tab === 'friends' && (
          <FriendsPage
            userId={user.id}
            accent={accent}
            onMessage={openChatWith}
            onOpenProfile={openProfileOf}
            onRequestsChange={setPendingRequests}
          />
        )}
        {tab === 'leaderboard' && <LeaderboardPage userId={user.id} userRegion={user.region} accent={accent} onOpenProfile={openProfileOf} />}
        {tab === 'achievements' && (
          <AchievementsPage
            userId={user.id}
            accent={accent}
            onReward={({ coins, xp, level }) => onUserUpdate?.({ coins, xp, level })}
          />
        )}
        {tab === 'chat' && <ChatPage userId={user.id} user={user} accent={accent} initialFriendId={chatFriendId} onOpenProfile={openProfileOf} />}
        {tab === 'cases' && p && (
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '70vh', borderRadius: '24px', overflow: 'hidden', background: 'linear-gradient(180deg,#0B2A1D,#081E15)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <CaseOpener
              coins={user.coins ?? 0}
              owned={user.unlockedItems ?? []}
              openedCaseIds={openedCaseIds}
              onOpen={handleOpenCase}
              onEquip={equip}
              onBack={() => setTab('map')}
            />
          </div>
        )}
      </main>

      {viewingUserId !== null && (
        <UserProfilePage
          userId={viewingUserId}
          viewerId={user.id}
          onClose={() => setViewingUserId(null)}
          onMessage={openChatWith}
        />
      )}

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

      {showWalkIntro && (
        <WalkIntro
          user={user}
          accent={accent}
          onOpenPlace={(id) => {
            setTab('map');
            setMapFocus({ id, nonce: Date.now() });
            onCloseWalkIntro?.();
          }}
          onClose={() => onCloseWalkIntro?.()}
        />
      )}

      {confirmLogout && (
        <LogoutConfirm
          accent={accent}
          onCancel={() => setConfirmLogout(false)}
          onConfirm={() => {
            setConfirmLogout(false);
            onLogout();
          }}
        />
      )}
    </div>
  );
}

// "Are you sure you want to log out?" gate — two explicit buttons so a stray
// click near the old always-visible logout button in the nav can't sign
// someone out by accident.
function LogoutConfirm({
  accent,
  onCancel,
  onConfirm,
}: {
  accent: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '22px',
        background: 'rgba(4,16,11,0.72)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        animation: 'fadeIn 0.2s ease both',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(360px, 100%)',
          borderRadius: '20px',
          background: 'linear-gradient(180deg, #0b2a1e 0%, #071c14 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 30px 70px -24px rgba(0,0,0,0.8)',
          padding: '26px 24px',
          color: CREAM,
          animation: 'popIn 0.22s ease both',
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: `${accent}1f`,
            border: `1px solid ${accent}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: accent,
          }}
        >
          <Icon name="signpost" size={20} strokeWidth={1.9} stroke={accent} />
        </div>
        <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '19px', margin: '0 0 8px' }}>
          {t('core.logout.title')}
        </h3>
        <p style={{ fontSize: '13.5px', lineHeight: 1.5, color: 'rgba(244,241,232,0.62)', margin: '0 0 22px' }}>
          {t('core.logout.message')}
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'rgba(244,241,232,0.75)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: '11px',
              padding: '12px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {t('core.logout.cancel')}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: '#E4635F',
              color: '#2A0E0C',
              border: 'none',
              borderRadius: '11px',
              padding: '12px',
              fontSize: '13.5px',
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {t('core.logout.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Profile header content, sitting directly on top of the fixed full-page
// backdrop rendered by HomePage (see `tab === 'profile' && p` block above the
// <nav>) — this component only supplies the avatar/name/XP row, not the
// background art itself, so the same backdrop keeps showing through as the
// page scrolls (welcome copy + wall below) instead of being boxed into a
// single card. Only rendered once a profile exists.
function ProfileHero({
  user,
  accent,
  onEditProfile,
  onRequestLogout,
}: {
  user: AuthUser;
  accent: string;
  onEditProfile: () => void;
  onRequestLogout: () => void;
}) {
  const { t } = useTranslation();
  const p = user.profile!;
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 24px 34px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <XpBar xp={user.xp} accent={accent} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
          <ProfileAvatar avatarId={p.avatarId} customAvatar={p.customAvatar} frameId={p.frameId} color={accent} size={104} />
          <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <span style={{ display: 'inline-block', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.12em', color: BG, background: accent, padding: '4px 10px', borderRadius: '999px' }}>
                {t('core.profileSetup.levelBadge', { level: user.level }).toUpperCase()}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'flex-start' }}>
            <button onClick={onEditProfile} style={{ background: 'rgba(255,255,255,0.12)', color: CREAM, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>
              {t('core.profile.editProfile')}
            </button>
            <button onClick={onRequestLogout} style={{ background: 'rgba(228,99,95,0.14)', color: '#E4635F', border: '1px solid rgba(228,99,95,0.4)', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('core.profile.logoutButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Below the full-bleed ProfileHero: the welcome copy + wall, still living in
// the padded <main> column. When there's no profile yet, this is the only
// thing rendered (ProfileHero is skipped entirely in that case).
function ProfileTab({
  user,
  onEditProfile,
  accent,
  onRequestLogout,
}: {
  user: AuthUser;
  onEditProfile: () => void;
  accent: string;
  onRequestLogout: () => void;
}) {
  const { t } = useTranslation();
  const p = user.profile;
  if (!p) {
    return (
      <>
        <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '16px' }}>{t('core.profile.welcomeTitle')}</div>
        <h1 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(30px, 4vw, 42px)', margin: '0 0 14px' }}>{t('core.profile.welcomeGreeting', { name: user.name })}</h1>
        <p style={{ fontSize: '15.5px', lineHeight: 1.7, color: 'rgba(244,241,232,0.68)', maxWidth: '520px', margin: '0 0 32px' }}>
          {t('core.profile.welcomeBody')}
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={onEditProfile} style={{ background: accent, color: BG, fontFamily: "'Manrope', sans-serif", fontSize: '14.5px', fontWeight: 700, border: 'none', borderRadius: '12px', padding: '15px 30px', cursor: 'pointer' }}>
            {t('core.profile.setupProfile')}
          </button>
          <button onClick={onRequestLogout} style={{ background: 'rgba(228,99,95,0.14)', color: '#E4635F', fontFamily: "'Manrope', sans-serif", fontSize: '14px', fontWeight: 700, border: '1px solid rgba(228,99,95,0.4)', borderRadius: '12px', padding: '15px 24px', cursor: 'pointer' }}>
            {t('core.profile.logoutButton')}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '24px', margin: '0 0 12px' }}>{t('core.profile.readyGreeting', { displayName: p.displayName })}</h2>
      <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(244,241,232,0.65)', maxWidth: '520px', margin: '0 0 32px' }}>
        {t('core.profile.readyBody')}
      </p>

      <LanguageSwitcher accent={accent} />

      <ProfileWall userId={user.id} accent={accent} />
    </>
  );
}

export default HomePage;
