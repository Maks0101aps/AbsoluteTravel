// Simple API helper that scans the backend ports (3000-3005) the NestJS server may bind to.
import type { Place, PlaceCategory } from './data/places';

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
async function call<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<T> {
  const ports = cachedPort ? [cachedPort] : [3000, 3001, 3002, 3003, 3004, 3005];
  let lastError = 'Не вдалося з’єднатися із сервером';

  for (const port of ports) {
    try {
      const headers: Record<string, string> = { ...(extraHeaders ?? {}) };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await fetch(`http://localhost:${port}${path}`, {
        method,
        headers: Object.keys(headers).length ? headers : undefined,
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

// --- AI travel advisor -----------------------------------------------------

export interface AdvisorTurn {
  role: 'user' | 'model';
  text: string;
}

export function getAdvisorStatus() {
  return call<{ available: boolean; model: string }>('GET', '/api/ai/status');
}

export function askAdvisor(payload: { message: string; topic?: string; history?: AdvisorTurn[] }) {
  return call<{ reply: string }>('POST', '/api/ai/chat', payload);
}

// --- Explore-map places ----------------------------------------------------

export interface PlaceSubmission {
  name: string;
  region: string;
  category: PlaceCategory;
  description: string;
  bestSeason?: string;
  lat: number;
  lng: number;
  photos: string[];
  submittedBy?: string;
}

export interface SubmitPlaceResult {
  status: 'approved' | 'pending' | 'rejected';
  decision: 'approve' | 'reject' | 'review';
  reason: string;
  moderatedByAi: boolean;
  place: Place;
}

export interface AdminPlace extends Place {
  id: number;
  status: 'approved' | 'pending' | 'rejected';
  aiDecision: string | null;
  aiReason: string | null;
  aiScore: number | null;
  createdAt: string;
  reviewedAt: string | null;
}

/** Approved places for the public explore map. */
export function getPlaces() {
  return call<Place[]>('GET', '/api/places');
}

/** Submit a place for AI moderation. */
export function submitPlace(payload: PlaceSubmission) {
  return call<SubmitPlaceResult>('POST', '/api/places/submit', payload);
}

// --- Admin accounts & auth -------------------------------------------------

export interface AdminAccount {
  id: number;
  login: string;
  name: string;
  isSuper: boolean;
}

export interface AdminSession {
  token: string;
  admin: AdminAccount;
}

// The session token goes in this header on every authenticated admin request.
function adminHeaders(token: string) {
  return { 'x-admin-token': token };
}

export function adminLogin(login: string, password: string) {
  return call<{ token: string; admin: AdminAccount }>('POST', '/api/admin/login', { login, password });
}

export function adminMe(token: string) {
  return call<AdminAccount>('GET', '/api/admin/me', undefined, adminHeaders(token));
}

export function adminLogout(token: string) {
  return call<{ ok: boolean }>('POST', '/api/admin/logout', {}, adminHeaders(token));
}

export function adminListAccounts(token: string) {
  return call<AdminAccount[]>('GET', '/api/admin/admins', undefined, adminHeaders(token));
}

export function adminCreateAccount(token: string, payload: { login: string; password: string; name: string }) {
  return call<AdminAccount>('POST', '/api/admin/admins', payload, adminHeaders(token));
}

export function adminDeleteAccount(token: string, id: number) {
  return call<{ ok: boolean; id: number }>('DELETE', `/api/admin/admins/${id}`, undefined, adminHeaders(token));
}

// --- Admin: place moderation (token-authenticated) -------------------------

export function adminListPlaces(token: string, status: 'all' | 'pending' | 'approved' | 'rejected' = 'all') {
  return call<AdminPlace[]>('GET', `/api/places/admin/list?status=${status}`, undefined, adminHeaders(token));
}

export function adminPlaceCounts(token: string) {
  return call<{ pending: number; approved: number; rejected: number }>(
    'GET',
    '/api/places/admin/counts',
    undefined,
    adminHeaders(token),
  );
}

export function adminCreatePlace(token: string, payload: PlaceSubmission) {
  return call<AdminPlace>('POST', '/api/places/admin/create', payload, adminHeaders(token));
}

export function adminApprovePlace(token: string, id: number) {
  return call<AdminPlace>('POST', `/api/places/admin/${id}/approve`, {}, adminHeaders(token));
}

export function adminRejectPlace(token: string, id: number) {
  return call<AdminPlace>('POST', `/api/places/admin/${id}/reject`, {}, adminHeaders(token));
}

export function adminDeletePlace(token: string, id: number) {
  return call<{ ok: boolean; id: number }>('DELETE', `/api/places/admin/${id}`, undefined, adminHeaders(token));
}
