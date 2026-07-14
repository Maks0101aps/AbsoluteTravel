import { useState } from 'react';
import App from './App';
import AuthPage from './AuthPage';
import HomePage from './HomePage';
import ProfileSetup from './ProfileSetup';
import { earnCoins, type AuthUser, type ProfileCustomization } from './api';

type View = 'landing' | 'auth' | 'setup' | 'home';

const STORAGE_KEY = 'absolute_travel_user';

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

function Root() {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [view, setView] = useState<View>(() => {
    const u = loadUser();
    if (!u) return 'landing';
    return u.profile ? 'home' : 'setup';
  });

  const handleAuth = (u: AuthUser) => {
    setUser(u);
    persist(u);
    // Freshly authenticated users go through profile setup first.
    setView(u.profile ? 'home' : 'setup');
  };

  const handleProfileComplete = (profile: ProfileCustomization) => {
    let userId: number | null = null;
    setUser((prev) => {
      if (!prev) return prev;
      userId = prev.id;
      const next = { ...prev, name: profile.displayName, profile };
      persist(next);
      return next;
    });
    setView('home');

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

  const handleLogout = () => {
    setUser(null);
    persist(null);
    setView('landing');
  };

  if (view === 'setup' && user) {
    return <ProfileSetup user={user} onComplete={handleProfileComplete} onSkip={() => setView('home')} />;
  }

  if (view === 'home' && user) {
    return <HomePage user={user} onLogout={handleLogout} onEditProfile={() => setView('setup')} />;
  }

  if (view === 'auth') {
    return <AuthPage onAuth={handleAuth} onBack={() => setView('landing')} />;
  }

  return <App onStart={() => setView('auth')} />;
}

export default Root;
