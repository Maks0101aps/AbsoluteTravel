import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchRoute, fetchNavigatorRoute, formatDuration } from './routing';

describe('formatDuration', () => {
  it('shows minutes only under an hour', () => {
    expect(formatDuration(42)).toMatch(/42/);
  });

  it('shows hours only when there are 0 leftover minutes', () => {
    expect(formatDuration(120)).toMatch(/2/);
  });

  it('shows hours and minutes together', () => {
    expect(formatDuration(80)).toMatch(/1/);
    expect(formatDuration(80)).toMatch(/20/);
  });

  it('rounds fractional minutes', () => {
    expect(formatDuration(41.6)).toMatch(/42/);
  });
});

describe('fetchRoute', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects fewer than two points', async () => {
    await expect(fetchRoute([{ lat: 1, lng: 1 }], 'driving')).rejects.toThrow();
  });

  it('rejects when the network request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(
      fetchRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving'),
    ).rejects.toThrow();
  });

  it('rejects on a non-OK HTTP response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    await expect(
      fetchRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving'),
    ).rejects.toThrow();
  });

  it('rejects when OSRM reports no route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) }),
    );
    await expect(
      fetchRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving'),
    ).rejects.toThrow();
  });

  it('resolves a route on a valid OSRM response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [
            {
              distance: 5000,
              duration: 600,
              geometry: { coordinates: [[30, 50], [31, 49]] },
            },
          ],
        }),
      }),
    );
    const result = await fetchRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving');
    expect(result.distanceKm).toBe(5);
    expect(result.durationMin).toBe(10);
    expect(result.points).toEqual([[50, 30], [49, 31]]);
    expect(result.profile).toBe('driving');
  });
});

describe('fetchNavigatorRoute', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okResponse = (endLat: number, endLng: number) => ({
    ok: true,
    json: async () => ({
      code: 'Ok',
      routes: [{ distance: 1000, duration: 120, geometry: { coordinates: [[30, 50], [endLng, endLat]] } }],
    }),
  });

  it('returns the plain route for a walking profile (no foot-gap logic)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(49, 31)));
    const result = await fetchNavigatorRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'walking');
    expect(result.footSegment).toBeUndefined();
  });

  it('returns the driving route unchanged when it already reaches the target', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okResponse(49, 31)));
    const result = await fetchNavigatorRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving');
    expect(result.footSegment).toBeUndefined();
  });

  it('fetches a walking footSegment when the driving route stops short', async () => {
    const fetchMock = vi
      .fn()
      // First call: driving route that ends far from the actual target.
      .mockResolvedValueOnce(okResponse(49.5, 31.5))
      // Second call: the bridging walking leg.
      .mockResolvedValueOnce(okResponse(49, 31));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchNavigatorRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving');
    expect(result.footSegment).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to the driving route if the walking bridge fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse(49.5, 31.5))
      .mockRejectedValueOnce(new Error('foot server down'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchNavigatorRoute([{ lat: 50, lng: 30 }, { lat: 49, lng: 31 }], 'driving');
    expect(result.footSegment).toBeUndefined();
  });
});
