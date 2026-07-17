import { useEffect, useState } from 'react';
import App from './App';
import AuthPage from './AuthPage';
import HomePage from './HomePage';
import ProfileSetup from './ProfileSetup';
import AdminMenu from './AdminPanel';
import {
  earnCoins,
  adminMe,
  adminLogout,
  updateProfile,
  type AuthUser,
  type ProfileCustomization,
  type AdminSession,
} from './api';

type View = 'landing' | 'auth' | 'setup' | 'home' | 'admin';

const STORAGE_KEY = 'absolute_travel_user';
const ADMIN_KEY = 'absolute_travel_admin_session';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function persist(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

function loadAdmin(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as AdminSession) : null;
  } catch {
    return null;
  }
}

function persistAdmin(session: AdminSession | null) {
  try {
    if (session) localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
}

function Root() {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [admin, setAdmin] = useState<AdminSession | null>(loadAdmin);
  const [view, setView] = useState<View>(() => {
    // An active admin session takes precedence (validated in the effect below).
    if (loadAdmin()) return 'admin';
    const u = loadUser();
    if (!u) return 'landing';
    return u.profile ? 'home' : 'setup';
  });

  // Re-validate a stored admin session on mount; drop it if the server rejects.
  useEffect(() => {
    const s = loadAdmin();
    if (!s) return;
    adminMe(s.token)
      .then((account) => {
        const next = { token: s.token, admin: account };
        persistAdmin(next);
        setAdmin(next);
      })
      .catch(() => {
        persistAdmin(null);
        setAdmin(null);
        setView((cur) => (cur === 'admin' ? 'landing' : cur));
      });
  }, []);

  const handleAuth = (u: AuthUser) => {
    setUser(u);
    persist(u);
    // Freshly authenticated users go through profile setup first.
    setView(u.profile ? 'home' : 'setup');
  };

  const handleAdminAuth = (session: AdminSession) => {
    setAdmin(session);
    persistAdmin(session);
    setView('admin');
  };

  const handleProfileComplete = (profile: ProfileCustomization) => {
    let userId: number | null = null;
    const avatar = profile.customAvatar || profile.avatarId;
    setUser((prev) => {
      if (!prev) return prev;
      userId = prev.id;
      const next = { ...prev, name: profile.displayName, avatar, profile };
      persist(next);
      return next;
    });
    setView('home');

    if (userId !== null) {
      updateProfile(userId, { name: profile.displayName, avatar, profile }).catch((err) => {
        console.error('Failed to save profile changes to backend:', err);
      });
    }

    // Reward the one-time onboarding bonus (server is idempotent per reason).
    if (userId !== null) {
      earnCoins(userId, 'profile_complete')
        .then(({ coins }) => {
          setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, coins };
            persist(next);
            return next;
          });
        })
        .catch(() => {
          // non-blocking: keep the user in the app even if the reward call fails
        });
    }
  };

  // Merge server-side changes (coins/unlockedItems from the shop, or
  // xp/coins/level from a verified visit) into the stored user, same
  // persistence path as the onboarding reward above.
  const handleUserUpdate = (patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  };

  const handleLogout = () => {
    setUser(null);
    persist(null);
    setView('landing');
  };

  const handleAdminLogout = () => {
    if (admin) adminLogout(admin.token).catch(() => {});
    setAdmin(null);
    persistAdmin(null);
    setView('landing');
  };

  if (view === 'admin' && admin) {
    return <AdminMenu session={admin} onLogout={handleAdminLogout} />;
  }

  if (view === 'setup' && user) {
    return (
      <ProfileSetup
        user={user}
        onComplete={handleProfileComplete}
        onSkip={() => setView('home')}
      />
    );
  }

  if (view === 'home' && user) {
    return (
      <HomePage
        user={user}
        onLogout={handleLogout}
        onEditProfile={() => setView('setup')}
        onUserUpdate={handleUserUpdate}
      />
    );
  }

  if (view === 'auth') {
    return <AuthPage onAuth={handleAuth} onAdminAuth={handleAdminAuth} onBack={() => setView('landing')} />;
  }

  return <App onStart={() => setView('auth')} />;
}

export default Root;
