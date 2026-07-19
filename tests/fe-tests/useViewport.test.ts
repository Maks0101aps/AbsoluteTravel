import { describe, it, expect, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useViewport } from './useViewport';

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

describe('useViewport', () => {
  afterEach(() => {
    setWidth(1024);
  });

  it('reports the current window width', () => {
    setWidth(1024);
    const { result } = renderHook(() => useViewport());
    expect(result.current.width).toBe(1024);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isNarrow).toBe(false);
  });

  it('flags isMobile at or below 560px', () => {
    setWidth(390);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isNarrow).toBe(true);
  });

  it('flags isNarrow but not isMobile between 561 and 860px', () => {
    setWidth(700);
    const { result } = renderHook(() => useViewport());
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isNarrow).toBe(true);
  });

  it('updates on window resize', () => {
    setWidth(1024);
    const { result } = renderHook(() => useViewport());
    expect(result.current.width).toBe(1024);

    act(() => {
      setWidth(400);
      window.dispatchEvent(new Event('resize'));
    });
    expect(result.current.width).toBe(400);
    expect(result.current.isMobile).toBe(true);
  });

  it('updates on orientationchange', () => {
    setWidth(1024);
    const { result } = renderHook(() => useViewport());
    act(() => {
      setWidth(320);
      window.dispatchEvent(new Event('orientationchange'));
    });
    expect(result.current.width).toBe(320);
  });
});
