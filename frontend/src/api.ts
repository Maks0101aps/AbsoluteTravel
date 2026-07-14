// Simple API helper that scans the backend ports (3000-3005) the NestJS server may bind to.
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  city: string | null;
  region: string | null;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  unlockedItems: string[];
  rank?: string;
  currentDestination: string | null;
  // Client-side profile customization (set via the profile wizard, stored locally).
  profile?: ProfileCustomization;
}

export interface CoinTransaction {
  id: number;
  userId: number;
  amount: number;
  reason: string;
  createdAt: string;
}

export interface Wallet {
  coins: number;
  unlockedItems: string[];
  transactions: CoinTransaction[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  avatar: string;
  level: number;
  coins: number;
  rank: string;
  region: string | null;
}

export interface ProfileCustomization {
  avatarId: string;
  customAvatar?: string; // data URL when the user uploads their own
  color: string;
  displayName: string;
  bio: string;
  backgroundId: string;
  frameId: string;
  badges: string[];
  effectId: string;
}

let cachedPort: number | null = null;

// Core request that scans the candidate backend ports and returns the raw JSON body.
async function call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const ports = cachedPort ? [cachedPort] : [3000, 3001, 3002, 3003, 3004, 3005];
  let lastError = 'Не вдалося з’єднатися із сервером';

  for (const port of ports) {
    try {
      const res = await fetch(`http://localhost:${port}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      cachedPort = port;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Помилка запиту');
      }
      return data as T;
    } catch (e: any) {
      // A thrown Error with a message means the server responded with an error — surface it.
      if (e instanceof Error && e.message && e.message !== 'Failed to fetch') {
        lastError = e.message;
        if (cachedPort === port) throw new Error(lastError);
      }
      // otherwise: connection failed, try next port
    }
  }
  throw new Error(lastError);
}

async function auth(path: string, body: unknown): Promise<AuthUser> {
  const data = await call<{ user: AuthUser }>('POST', path, body);
  return data.user;
}

export function registerUser(payload: {
  username: string;
  email: string;
  password: string;
  region: string;
  city: string;
}) {
  return auth('/api/auth/register', payload);
}

export function loginUser(payload: { email: string; password: string }) {
  return auth('/api/auth/login', payload);
}

// --- Economy ---------------------------------------------------------------

export function getWallet(userId: number) {
  return call<Wallet>('GET', `/api/economy/wallet?userId=${userId}`);
}

export function earnCoins(userId: number, reason: string) {
  return call<{ coins: number; awarded: number }>('POST', '/api/economy/earn', { userId, reason });
}

export function purchaseItem(userId: number, itemId: string) {
  return call<{ coins: number; unlockedItems: string[] }>('POST', '/api/economy/purchase', {
    userId,
    itemId,
  });
}

export function getLeaderboard() {
  return call<LeaderboardEntry[]>('GET', '/api/economy/leaderboard');
}
