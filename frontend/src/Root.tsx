import { useState } from 'react';
import App from './App';
import AuthPage from './AuthPage';
import HomePage from './HomePage';
import type { AuthUser } from './api';

type View = 'landing' | 'auth' | 'home';

const STORAGE_KEY = 'absolute_travel_user';

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function Root() {
  const [user, setUser] = useState<AuthUser | null>(loadUser);
  const [view, setView] = useState<View>(() => (loadUser() ? 'home' : 'landing'));

  const handleAuth = (u: AuthUser) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      // ignore storage errors (e.g. private mode)
    }
    setView('home');
  };

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setView('landing');
  };

  if (view === 'home' && user) {
    return <HomePage user={user} onLogout={handleLogout} />;
  }

  if (view === 'auth') {
    return <AuthPage onAuth={handleAuth} onBack={() => setView('landing')} />;
  }

  return <App onStart={() => setView('auth')} />;
}

export default Root;
