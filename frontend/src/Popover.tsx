import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface AnchorRect {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
}

interface PopoverProps {
  anchor: AnchorRect;
  title: string;
  width?: number;
  accent: string;
  onClose: () => void;
  children: React.ReactNode;
}

// A lightweight popover anchored to a screen rect. Rendered as position:fixed so it is
// never clipped by the card's overflow, closes on outside-click and Escape.
function Popover({ anchor, title, width = 320, accent, onClose, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'below' | 'above' }>(() => ({
    top: anchor.bottom + 10,
    left: anchor.left,
    placement: 'below',
  }));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 12;

    let left = anchor.left;
    // center popover under the anchor when the anchor is wider
    left = anchor.left + anchor.width / 2 - width / 2;
    left = Math.max(margin, Math.min(left, vw - width - margin));

    let placement: 'below' | 'above' = 'below';
    let top = anchor.bottom + 10;
    if (top + h + margin > vh && anchor.top - h - 10 > margin) {
      top = anchor.top - h - 10;
      placement = 'above';
    }
    top = Math.max(margin, Math.min(top, vh - h - margin));
    setPos({ top, left, placement });
  }, [anchor, width]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    // Close on outside click, but ignore clicks inside the popover or on elements
    // explicitly marked as editable triggers (so switching targets works smoothly).
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (target.closest('[data-editable]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          width,
          zIndex: 201,
          background: 'rgba(9,28,20,0.98)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '16px',
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.75)',
          padding: '16px',
          animation: 'popIn 0.18s ease both',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.04em', color: accent }}>{title}</div>
          <button
            onClick={onClose}
            aria-label="Закрити"
            style={{ background: 'none', border: 'none', color: 'rgba(244,241,232,0.5)', cursor: 'pointer', padding: 0, lineHeight: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export default Popover;
