import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHeading } from './useHeading';

describe('useHeading', () => {
  afterEach(() => {
    // @ts-expect-error - test cleanup of a global we may have defined
    delete window.DeviceOrientationEvent;
  });

  it('stays null while inactive', () => {
    const { result } = renderHook(() => useHeading(false));
    expect(result.current.heading).toBeNull();
    expect(result.current.needsPermission).toBe(false);
  });

  it('stays null when the browser has no DeviceOrientationEvent support', () => {
    const { result } = renderHook(() => useHeading(true));
    expect(result.current.heading).toBeNull();
  });

  it('updates heading from a deviceorientation event (alpha, no iOS compass field)', () => {
    // jsdom has no DeviceOrientationEvent at all by default, which the hook
    // treats as "unsupported" and exits before attaching a listener. Stub a
    // plain (non-iOS, no requestPermission) constructor so it takes the
    // normal addEventListener path instead.
    // @ts-expect-error - test-only global stub
    window.DeviceOrientationEvent = class extends Event {};
    const { result } = renderHook(() => useHeading(true));
    act(() => {
      const evt = new Event('deviceorientation') as Event & { alpha: number };
      Object.defineProperty(evt, 'alpha', { value: 90, configurable: true });
      window.dispatchEvent(evt);
    });
    // alpha=90 clockwise-from-north conversion: (360 - 90) % 360 = 270
    expect(result.current.heading).toBe(270);
  });

  it('prefers webkitCompassHeading over alpha when both are present', () => {
    // @ts-expect-error - test-only global stub
    window.DeviceOrientationEvent = class extends Event {};
    const { result } = renderHook(() => useHeading(true));
    act(() => {
      const evt = new Event('deviceorientation') as Event & { alpha: number; webkitCompassHeading: number };
      Object.defineProperty(evt, 'alpha', { value: 90, configurable: true });
      Object.defineProperty(evt, 'webkitCompassHeading', { value: 45, configurable: true });
      window.dispatchEvent(evt);
    });
    expect(result.current.heading).toBe(45);
  });

  it('flags needsPermission when the browser requires an explicit gesture (iOS 13+)', () => {
    class FakeDeviceOrientationEvent extends Event {
      static requestPermission = async () => 'granted' as const;
    }
    // @ts-expect-error - test-only global stub
    window.DeviceOrientationEvent = FakeDeviceOrientationEvent;

    const { result } = renderHook(() => useHeading(true));
    expect(result.current.needsPermission).toBe(true);
  });

  it('requestPermission() resolves without throwing when supported', async () => {
    class FakeDeviceOrientationEvent extends Event {
      static requestPermission = async () => 'granted' as const;
    }
    // @ts-expect-error - test-only global stub
    window.DeviceOrientationEvent = FakeDeviceOrientationEvent;

    const { result } = renderHook(() => useHeading(true));
    await act(async () => {
      await result.current.requestPermission();
    });
    expect(result.current.needsPermission).toBe(false);
  });
});
