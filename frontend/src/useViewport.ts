import { useEffect, useState } from 'react';

/**
 * Viewport width as state. Most responsive work belongs in CSS media queries —
 * reach for this only where a pixel value has to cross into JS (a component that
 * takes a numeric `size` prop, or a layout that swaps which subtree renders).
 *
 * Breakpoints mirror the ones in index.css: 860 (tablet) and 560 (phone).
 */
export function useViewport() {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1200 : window.innerWidth));

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  return { width, isMobile: width <= 560, isNarrow: width <= 860 };
}
