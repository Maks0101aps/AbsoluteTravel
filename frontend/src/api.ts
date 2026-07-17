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
  // Profile customization (set via the profile wizard). Cached in localStorage
  // and persisted server-side, so other travelers can view it too.
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

// Base URL of the backend for non-fetch transports (socket.io). Scans the
// same candidate ports as call() and locks onto the first that answers.
export async function resolveApiBase(): Promise<string> {
  if (cachedPort) return `http://localhost:${cachedPort}`;
  for (const port of [3000, 3001, 3002, 3003, 3004, 3005]) {
    try {
      const res = await fetch(`http://localhost:${port}/api/places`, { method: 'GET' });
      if (res.ok) {
        cachedPort = port;
        return `http://localhost:${port}`;
      }
    } catch {
      // connection failed, try next port
    }
  }
  return 'http://localhost:3000';
}

// Core request that scans the candidate backend ports and returns the raw JSON body.
async function call<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
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

// --- Loot cases ------------------------------------------------------------

export interface OpenCaseResult {
  caseId: string;
  itemId: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  duplicate: boolean;
  compensation: number;
  coins: number;
  unlockedItems: string[];
}

/** One-time cases (e.g. the free starter) the user has already opened. */
export function getCasesState(userId: number) {
  return call<{ openedCaseIds: string[] }>('GET', `/api/economy/cases?userId=${userId}`);
}

/** Open a loot case; the server picks the reward and updates the wallet. */
export function openCase(userId: number, caseId: string) {
  return call<OpenCaseResult>('POST', '/api/economy/case/open', { userId, caseId });
}

// --- AI travel advisor -----------------------------------------------------

export interface AdvisorTurn {
  role: 'user' | 'model';
  text: string;
}

export function getAdvisorStatus() {
  return call<{ available: boolean; model: string }>('GET', '/api/ai/status');
}

export function askAdvisor(payload: {
  message: string;
  topic?: string;
  history?: AdvisorTurn[];
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
}) {
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
  difficulty?: number;
}

export interface PlaceUpdate {
  name?: string;
  region?: string;
  category?: PlaceCategory;
  description?: string;
  bestSeason?: string;
  lat?: number;
  lng?: number;
  difficulty?: number;
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

// --- Visit verification (checkmarks) ---------------------------------------

export interface VerifyCheckmarkPayload {
  userId: number;
  placeId: number;
  lat: number;
  lng: number;
  photo: string;
  // Opt-in: publish this visit (with its photo) to the wall feed.
  shareToWall?: boolean;
}

export interface VerifyCheckmarkResult {
  verified: boolean;
  xpAwarded: number;
  coinsAwarded: number;
  newLevel: number;
  leveledUp: boolean;
  reason: string;
}

export interface Checkmark {
  id: number;
  placeId: number;
  distanceMeters: number;
  aiVerified: boolean;
  aiReason: string | null;
  xpAwarded: number;
  createdAt: string;
  place: {
    id: number;
    name: string;
    region: string;
    category: PlaceCategory;
    difficulty: number;
    lat: number;
    lng: number;
  };
}

/** Verify a claimed visit; awards XP/coins on success. */
export function verifyCheckmark(payload: VerifyCheckmarkPayload) {
  return call<VerifyCheckmarkResult>('POST', '/api/checkmarks/verify', payload);
}

/** Places the user has already verified. */
export function getUserCheckmarks(userId: number) {
  return call<Checkmark[]>('GET', `/api/checkmarks/user/${userId}`);
}

// --- Territory exploration (H3 cells) --------------------------------------

export interface VisitCellResult {
  isNew: boolean;
  cellId: string;
  newRegion: boolean;
  xpAwarded: number;
  totalCells: number;
  totalRegions: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  unlockedCellIds?: string[];
}

export interface ExplorationStats {
  totalCells: number;
  totalRegions: number;
}

/** Unlock the H3 cell the user currently stands in; awards XP when it's new. */
export function visitCell(userId: number, lat: number, lng: number) {
  return call<VisitCellResult>('POST', '/api/exploration/visit', { userId, lat, lng });
}

/** All cell ids the user has already unlocked (to paint the map on load). */
export function getVisitedCells(userId: number) {
  return call<{ cells: string[] }>('GET', `/api/exploration/cells/${userId}`);
}

export function getExplorationStats(userId: number) {
  return call<ExplorationStats>('GET', `/api/exploration/stats/${userId}`);
}

// --- Wall (travel activity feed) --------------------------------------------

export interface WallPost {
  id: number;
  type: 'visit' | 'new_cell' | 'new_region';
  placeId: number | null;
  placeName: string | null;
  cellId: string | null;
  photo: string | null;
  xpAwarded: number;
  createdAt: string;
}

export interface WallPage {
  posts: WallPost[];
  nextCursor: number | null;
}

/** A user's own travel-activity wall, newest first, cursor-paginated. */
export function fetchWall(userId: number, requesterId: number, cursor?: number) {
  const q = new URLSearchParams({ requesterId: String(requesterId) });
  if (cursor) q.set('cursor', String(cursor));
  return call<WallPage>('GET', `/api/wall/${userId}?${q.toString()}`);
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

export function adminUpdatePlace(token: string, id: number, payload: PlaceUpdate) {
  return call<AdminPlace>('POST', `/api/places/admin/${id}/update`, payload, adminHeaders(token));
}

// --- Friends -----------------------------------------------------------------

export interface FriendUser {
  id: number;
  username: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  region: string | null;
  city: string | null;
  online: boolean;
  lastSeenAt: string | null;
}

export interface FriendEntry extends FriendUser {
  friendshipId: number;
  since: string;
}

export interface FriendRequest {
  id: number;
  createdAt: string;
  sender: FriendUser;
}

export type FriendRelation = 'none' | 'friends' | 'outgoing' | 'incoming' | 'declined';

export interface UserSearchResult extends FriendUser {
  relation: FriendRelation;
  friendshipId: number | null;
}

export function getFriends(userId: number) {
  return call<FriendEntry[]>('GET', `/api/friends?userId=${userId}`);
}

export function getFriendRequests(userId: number) {
  return call<FriendRequest[]>('GET', `/api/friends/requests?userId=${userId}`);
}

export function sendFriendRequest(userId: number, target: { targetUserId?: number; username?: string }) {
  return call<{ id: number; status: string }>('POST', '/api/friends/request', { userId, ...target });
}

export function acceptFriendRequest(requestId: number, userId: number) {
  return call<{ id: number; status: string; friend: FriendUser }>('POST', `/api/friends/accept/${requestId}`, { userId });
}

/** Remove a friend, cancel an outgoing request, or decline an incoming one. */
export function removeFriend(friendshipId: number, userId: number) {
  return call<{ ok: boolean; id: number }>('DELETE', `/api/friends/${friendshipId}?userId=${userId}`);
}

export function searchUsers(userId: number, query: string) {
  return call<UserSearchResult[]>('GET', `/api/friends/search?userId=${userId}&q=${encodeURIComponent(query)}`);
}

// --- XP leaderboard ----------------------------------------------------------

export interface XpLeaderboardRow {
  rank: number;
  userId: number;
  username: string;
  name: string;
  avatarUrl: string;
  level: number;
  xp: number;
  region: string | null;
  /** H3 cells unlocked by walking — the exploration equivalent of step count. */
  cells: number;
  /** Places verified with a photo checkmark. */
  places: number;
}

export interface MyRank {
  user: XpLeaderboardRow;
  global: { rank: number; total: number };
  regional: { region: string; rank: number; total: number } | null;
}

export function getXpLeaderboard(type: 'global' | 'regional', region?: string, limit = 100) {
  const params = new URLSearchParams({ type, limit: String(limit) });
  if (region) params.set('region', region);
  return call<XpLeaderboardRow[]>('GET', `/api/leaderboard?${params.toString()}`);
}

export function getMyRank(userId: number) {
  return call<MyRank>('GET', `/api/leaderboard/me?userId=${userId}`);
}

// --- Friend chat ---------------------------------------------------------------

export interface ChatMessage {
  id: number;
  senderId: number;
  receiverId: number;
  text: string;
  createdAt: string;
  readAt: string | null;
}

export function getChatHistory(userId: number, friendId: number, limit = 50, before?: number) {
  const params = new URLSearchParams({ userId: String(userId), limit: String(limit) });
  if (before) params.set('before', String(before));
  return call<{ messages: ChatMessage[]; hasMore: boolean }>('GET', `/api/chat/${friendId}?${params.toString()}`);
}

/** REST fallback when the WebSocket is disconnected. */
export function sendChatMessage(userId: number, friendId: number, text: string) {
  return call<ChatMessage>('POST', `/api/chat/${friendId}`, { userId, text });
}

export function markChatRead(userId: number, friendId: number) {
  return call<{ ok: boolean; read: number }>('POST', `/api/chat/${friendId}/read`, { userId });
}

/** Unread message counts keyed by sender id. */
export function getUnreadCounts(userId: number) {
  return call<Record<string, number>>('GET', `/api/chat/unread?userId=${userId}`);
}

// --- Live GPS ------------------------------------------------------------------

export interface LiveLocation {
  userId: number;
  lat: number;
  lng: number;
  updatedAt: string;
}

/** A friend's last known location; the server enforces friends-only access. */
export function getFriendLocation(viewerId: number, targetId: number) {
  return call<LiveLocation>('GET', `/api/users/${targetId}/location?viewerId=${viewerId}`);
}

export function setLocationVisibility(userId: number, visible: boolean) {
  return call<{ userId: number; visible: boolean }>('PUT', '/api/users/me/location-visible', { userId, visible });
}

export function updateProfile(
  userId: number,
  payload: { name: string; avatar: string; profile?: ProfileCustomization },
) {
  return call<{ ok: boolean; userId: number }>('POST', '/api/users/profile', { userId, ...payload });
}

// --- Public profiles -----------------------------------------------------------

/** Another traveler's profile as seen by the viewer. */
export interface PublicProfile {
  id: number;
  username: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  rank: string;
  city: string | null;
  region: string | null;
  createdAt: string;
  online: boolean;
  lastSeenAt: string | null;
  profile: ProfileCustomization | null;
  stats: { cells: number; places: number; friends: number };
  relation: 'self' | FriendRelation;
  friendshipId: number | null;
  /** Wall posts carry visit photos, so the feed is friends-only. */
  canSeeWall: boolean;
}

export function getUserProfile(userId: number, viewerId: number) {
  return call<PublicProfile>('GET', `/api/users/${userId}/profile?viewerId=${viewerId}`);
}

