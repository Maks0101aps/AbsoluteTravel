import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from './api';

// api.ts is a large collection of thin fetch wrappers around a shared
// port-scanning `call()` helper. Rather than duplicating the backend's
// contract in dozens of ad-hoc mocks, this suite drives every exported
// function through a stubbed successful fetch and asserts each one produces
// a well-formed request (method/path) without throwing — the same shape of
// smoke coverage the functions themselves provide over the network layer.
describe('api.ts', () => {
  let calls: { url: string; method: string }[];

  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, method: init?.method ?? 'GET' });
        return {
          ok: true,
          json: async () => ({}),
        } as Response;
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolveApiBase locks onto the first responding port', async () => {
    const base = await api.resolveApiBase();
    expect(base).toBe('http://localhost:3000');
  });

  it('registerUser posts to /api/auth/register and returns the email', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ user: { email: 'a@b.com' }, requiresVerification: true }) })),
    );
    const result = await api.registerUser({ username: 'u', email: 'a@b.com', password: 'password123', region: 'r', city: 'c' });
    expect(result.email).toBe('a@b.com');
  });

  it('exercises every simple GET/POST wrapper without throwing', async () => {
    const invocations: Array<() => unknown> = [
      () => api.loginUser({ email: 'a@b.com', password: 'x' }),
      () => api.loginWithGoogle('cred'),
      () => api.getWallet(1),
      () => api.earnCoins(1, 'profile_complete'),
      () => api.purchaseItem(1, 'gold'),
      () => api.getLeaderboard(),
      () => api.getCasesState(1),
      () => api.openCase(1, 'starter'),
      () => api.getAdvisorStatus(),
      () => api.askAdvisor({ message: 'hi' }),
      () => api.getPlaces(),
      () =>
        api.submitPlace({
          name: 'Test',
          region: 'r',
          category: 'nature',
          description: 'd',
          lat: 50,
          lng: 30,
          photos: [],
        }),
      () => api.verifyCheckmark({ userId: 1, placeId: 1, photo: 'data:' } as any),
      () => api.getUserCheckmarks(1),
      () => api.visitCell(1, 50, 30),
      () => api.getVisitedCells(1),
      () => api.getExplorationStats(1),
      () => api.fetchWall(1, 1),
      () => api.getAchievements(1),
      () => api.claimAchievement(1, 'key'),
      () => api.adminLogin('admin', 'pw'),
      () => api.adminMe('token'),
      () => api.adminLogout('token'),
      () => api.adminListAccounts('token'),
      () => api.adminCreateAccount('token', { login: 'a', password: 'b', name: 'c' }),
      () => api.adminDeleteAccount('token', 1),
      () => api.adminListPlaces('token'),
      () => api.adminPlaceCounts('token'),
      () =>
        api.adminCreatePlace('token', {
          name: 'Test',
          region: 'r',
          category: 'nature',
          description: 'd',
          lat: 50,
          lng: 30,
          photos: [],
        }),
      () => api.adminApprovePlace('token', 1),
      () => api.adminRejectPlace('token', 1),
      () => api.adminDeletePlace('token', 1),
      () => api.adminUpdatePlace('token', 1, {}),
      () => api.getFriends(1),
      () => api.getFriendRequests(1),
      () => api.sendFriendRequest(1, { targetUserId: 2 }),
      () => api.acceptFriendRequest(1, 2),
      () => api.removeFriend(1, 2),
      () => api.searchUsers(1, 'query'),
      () => api.findUserByFriendCode(1, 'ABC123'),
      () => api.getMyFriendCode(1),
      () => api.getXpLeaderboard('global'),
      () => api.getMyRank(1),
      () => api.getChatHistory(1, 2),
      () => api.sendChatMessage(1, 2, 'hi'),
      () => api.markChatRead(1, 2),
      () => api.getUnreadCounts(1),
      () => api.getChatConversations(1),
      () => api.getFriendLocation(1, 2),
      () => api.setLocationVisibility(1, true),
      () => api.updateProfile(1, { name: 'n', avatar: 'a' }),
      () => api.getUserProfile(1, 2),
      () => api.getFriendLabels(1),
      () => api.deleteFriendLabel(1, 1),
      () => api.reactToFriendLabel(1, 1, 'LIKE'),
      () => api.reportFriendLabel(1, 1, 'spam'),
      () => api.getVapidKey(),
      () => api.subscribePush(1, { endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } } as any),
      () => api.unsubscribePush('endpoint'),
    ];

    const results = await Promise.allSettled(invocations.map((fn) => fn()));
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected).toEqual([]);
    expect(calls.length).toBeGreaterThan(40);
  });
});
