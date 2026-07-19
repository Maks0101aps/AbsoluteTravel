import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Exercises the port-scanning/error branches inside api.ts's internal call()
// helper — a fresh module instance per test (via resetModules) so each test
// controls the shared `cachedPort` state from a clean slate.
describe('api.ts call() port-scanning and error branches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the server-provided error message on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: 'Користувача не знайдено' }) }),
    );
    const api = await import('./api');
    await expect(api.getWallet(999)).rejects.toThrow('Користувача не знайдено');
  });

  it('falls back to a generic message when the server sends no message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));
    const api = await import('./api');
    await expect(api.getWallet(1)).rejects.toThrow();
  });

  it('scans subsequent ports when earlier ones refuse the connection', async () => {
    let call = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        call++;
        if (!url.includes(':3003')) throw new TypeError('Failed to fetch');
        return { ok: true, json: async () => ({ coins: 10, unlockedItems: '[]', transactions: [] }) };
      }),
    );
    const api = await import('./api');
    const wallet = await api.getWallet(1);
    expect(wallet).toBeTruthy();
    expect(call).toBeGreaterThanOrEqual(4); // 3000, 3001, 3002 failed before 3003 succeeded
  });

  it('throws the generic connection-failed error once every port refuses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = await import('./api');
    await expect(api.getWallet(1)).rejects.toThrow();
  });

  it('resolveApiBase falls back to localhost:3000 when no port answers', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const api = await import('./api');
    await expect(api.resolveApiBase()).resolves.toBe('http://localhost:3000');
  });
});
