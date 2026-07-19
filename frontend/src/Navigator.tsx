import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Place } from './data/places';
import { buildGoogleMapsUrl, fetchNavigatorRoute, formatDuration, type RoutePoint, type RouteResult, type TravelProfile } from './data/routing';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';

interface NavigatorProps {
  target: Place;
  start: RoutePoint | null;
  waypoints: RoutePoint[];
  route: RouteResult | null;
  picking: 'start' | 'waypoint' | null;
  accent: string;
  onPickStart: () => void;
  onPickWaypoint: () => void;
  onStopPicking: () => void;
  onRemoveWaypoint: (index: number) => void;
  onRouteBuilt: (route: RouteResult | null) => void;
  // iOS only: compass heading needs an explicit user-gesture permission
  // grant before it'll report anything (see useHeading.ts) — when true, show
  // a button that calls onRequestHeadingPermission from its own click handler.
  headingNeedsPermission: boolean;
  onRequestHeadingPermission: () => void;
}

// Floating panel for planning a road-following route to `target`, with
// optional stops along the way — NOT a full-screen modal, since the whole
// point is that the map underneath stays visible and clickable so the user
// can tap points onto it while this is open (see ExploreMap's `pickable`/
// `onPick` wiring, which this panel drives via onPickStart/onPickWaypoint).
function Navigator({
  target,
  start,
  waypoints,
  route,
  picking,
  accent,
  onPickStart,
  onPickWaypoint,
  onStopPicking,
  onRemoveWaypoint,
  onRouteBuilt,
  headingNeedsPermission,
  onRequestHeadingPermission,
}: NavigatorProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<TravelProfile>('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Keep the screen awake for as long as the navigator is open — walking
  // directions are useless if the phone locks itself mid-route. Released on
  // unmount (i.e. whenever the panel closes — ExploreMap only renders
  // <Navigator> while navTarget is set) and re-acquired if the OS drops it
  // when the tab loses visibility and comes back.
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!('wakeLock' in navigator)) {
      setWakeLockSupported(false);
      return;
    }
    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await (navigator as any).wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        if (!cancelled) setWakeLockSupported(false);
      }
    };

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // Desktop: draggable like a floating window, offset from the default
  // bottom-right anchor. Starts at (0,0) so first render matches the
  // original fixed position exactly.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const onDragStart = (e: React.PointerEvent) => {
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: dragOffset.x, originY: dragOffset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const { startX, startY, originX, originY } = dragState.current;
    setDragOffset({ x: originX + (e.clientX - startX), y: originY + (e.clientY - startY) });
  };
  const onDragEnd = () => {
    dragState.current = null;
  };

  // Mobile: a Google-Maps-style bottom sheet instead of a floating window —
  // dragging the handle down past a threshold collapses it to just a small
  // "expand" tab, tapping that tab (or dragging up) brings the full sheet
  // back. `sheetDragY` is the live drag offset while a mobile drag is in
  // progress (0 once released — the collapse itself is a discrete state).
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [sheetDragY, setSheetDragY] = useState(0);
  const sheetDragState = useRef<{ startY: number } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    if (!isMobile) {
      onDragStart(e);
      return;
    }
    sheetDragState.current = { startY: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!isMobile) {
      onDragMove(e);
      return;
    }
    if (!sheetDragState.current) return;
    // Only drag downward (collapsing) from the handle — dragging up while
    // already expanded has nothing further to reveal.
    setSheetDragY(Math.max(0, e.clientY - sheetDragState.current.startY));
  };
  const onHandlePointerUp = () => {
    if (!isMobile) {
      onDragEnd();
      return;
    }
    if (sheetDragY > 70) setCollapsed(true);
    setSheetDragY(0);
    sheetDragState.current = null;
  };

  const build = async () => {
    if (!start) {
      setError(t('explore.navigator.startRequired'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const points: RoutePoint[] = [start, ...waypoints, { lat: target.lat, lng: target.lng }];
      const result = await fetchNavigatorRoute(points, profile);
      onRouteBuilt(result);
    } catch (e: any) {
      onRouteBuilt(null);
      setError(e?.message || t('explore.navigator.buildFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Collapsed on mobile: everything shrinks to a small round "expand" tab —
  // tapping it (or dragging up, but a tap is simpler and matches the ask)
  // brings the full sheet back. Nothing else of the panel renders while
  // collapsed, same as Google Maps' minimized route sheet.
  if (isMobile && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        aria-label={t('explore.navigator.expand')}
        style={{
          position: 'fixed',
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 600,
          width: '56px',
          height: '40px',
          borderRadius: '20px',
          background: PANEL,
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: accent,
          cursor: 'pointer',
          boxShadow: '0 12px 30px -8px rgba(0,0,0,0.7)',
        }}
      >
        <Icon name="chevronUp" size={20} strokeWidth={2.2} stroke={accent} />
      </button>
    );
  }

  return (
    <div
      style={
        isMobile
          ? {
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 600,
              width: '100%',
              maxHeight: 'calc(100vh - 24px)',
              overflowY: 'auto',
              background: PANEL,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '18px 18px 0 0',
              padding: '10px 18px 18px',
              boxShadow: '0 -12px 40px -12px rgba(0,0,0,0.7)',
              fontFamily: "'Manrope', sans-serif",
              color: CREAM,
              transform: `translateY(${sheetDragY}px)`,
              transition: sheetDragState.current ? 'none' : 'transform 0.25s ease',
              touchAction: 'none',
            }
          : {
              position: 'fixed',
              bottom: `calc(24px - ${dragOffset.y}px)`,
              right: `calc(24px - ${dragOffset.x}px)`,
              // Above the full-screen map wrapper (zIndex:500 in ExploreMap.tsx) —
              // this panel floats on top of the navigator's dedicated map window.
              zIndex: 600,
              width: 'min(360px, calc(100vw - 48px))',
              maxHeight: 'calc(100vh - 48px)',
              overflowY: 'auto',
              background: PANEL,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '18px',
              padding: '18px',
              boxShadow: '0 24px 60px -18px rgba(0,0,0,0.7)',
              fontFamily: "'Manrope', sans-serif",
              color: CREAM,
            }
      }
    >
      {/* Drag handle — a small grabber pill on mobile (Google-Maps-style bottom
          sheet), the whole header row on desktop (free-floating window). */}
      {isMobile && (
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 10px', cursor: 'grab', touchAction: 'none' }}
        >
          <div style={{ width: '36px', height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.25)' }} />
        </div>
      )}
      <div
        onPointerDown={isMobile ? undefined : onHandlePointerDown}
        onPointerMove={isMobile ? undefined : onHandlePointerMove}
        onPointerUp={isMobile ? undefined : onHandlePointerUp}
        onPointerCancel={isMobile ? undefined : onHandlePointerUp}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', cursor: isMobile ? 'default' : 'grab', touchAction: 'none' }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: accent, marginBottom: '4px' }}>
            {t('explore.navigator.label')}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{t(`places.${target.id}.name`, { defaultValue: target.name })}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '11.5px', lineHeight: 1.4, color: wakeLockSupported ? accent : '#E0A54E' }}>
          <Icon name={wakeLockSupported ? 'sun' : 'alertTriangle'} size={14} strokeWidth={1.9} />
          <span>{wakeLockSupported ? t('explore.navigator.wakeLockOn') : t('explore.navigator.wakeLockOff')}</span>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '11.5px', lineHeight: 1.4, color: 'rgba(244,241,232,0.55)' }}>
            <Icon name="alertTriangle" size={14} strokeWidth={1.9} />
            <span>{t('explore.navigator.backgroundNotice')}</span>
          </div>
        )}
        {headingNeedsPermission && (
          <button
            onClick={onRequestHeadingPermission}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              alignSelf: 'flex-start',
              background: `${accent}18`,
              border: `1px solid ${accent}55`,
              color: accent,
              borderRadius: '9px',
              padding: '7px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name="compass" size={13} strokeWidth={1.9} />
            {t('explore.navigator.enableCompass')}
          </button>
        )}
      </div>

      {/* start point */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(244,241,232,0.5)', marginBottom: '6px' }}>{t('explore.navigator.start')}</div>
        {start ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12.5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '9px 12px' }}>
            <span>{start.lat.toFixed(5)}, {start.lng.toFixed(5)}</span>
            <button
              onClick={onPickStart}
              style={{ background: 'none', border: 'none', color: accent, fontSize: '12px', fontWeight: 700, cursor: 'pointer', flex: '0 0 auto' }}
            >
              {t('explore.navigator.change')}
            </button>
          </div>
        ) : (
          <button
            onClick={onPickStart}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              background: picking === 'start' ? `${accent}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${picking === 'start' ? accent : 'rgba(255,255,255,0.12)'}`,
              color: picking === 'start' ? accent : CREAM,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name="target" size={14} strokeWidth={1.9} />
            {picking === 'start' ? t('explore.navigator.picking') : t('explore.navigator.pickStartButton')}
          </button>
        )}
      </div>

      {/* waypoints */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(244,241,232,0.5)', marginBottom: '6px' }}>{t('explore.navigator.waypoints')}</div>
        {waypoints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
            {waypoints.map((w, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12.5px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px' }}>
                <span>{i + 1}. {w.lat.toFixed(5)}, {w.lng.toFixed(5)}</span>
                <button
                  onClick={() => onRemoveWaypoint(i)}
                  aria-label={t('explore.navigator.removeWaypoint')}
                  style={{ background: 'none', border: 'none', color: 'rgba(244,241,232,0.5)', cursor: 'pointer', display: 'flex', flex: '0 0 auto' }}
                >
                  <Icon name="close" size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
        {picking === 'waypoint' ? (
          <button
            onClick={onStopPicking}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              background: `${accent}22`,
              border: `1px solid ${accent}`,
              color: accent,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {t('explore.navigator.waypointDone')}
          </button>
        ) : (
          <button
            onClick={onPickWaypoint}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: CREAM,
              borderRadius: '10px',
              padding: '10px 12px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name="plus" size={14} strokeWidth={2} />
            {t('explore.navigator.addWaypoint')}
          </button>
        )}
      </div>

      {/* profile toggle */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {(['driving', 'walking'] as TravelProfile[]).map((p) => (
          <button
            key={p}
            onClick={() => setProfile(p)}
            style={{
              flex: 1,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: profile === p ? `${accent}22` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${profile === p ? accent : 'rgba(255,255,255,0.1)'}`,
              color: profile === p ? accent : 'rgba(244,241,232,0.7)',
              borderRadius: '10px',
              padding: '9px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name={p === 'driving' ? 'compass' : 'boot'} size={14} strokeWidth={1.9} />
            {p === 'driving' ? t('explore.navigator.driving') : t('explore.navigator.walking')}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: '12px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '10px', padding: '9px 12px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {route ? (
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: `${accent}14`, border: `1px solid ${accent}45`, borderRadius: '12px', padding: '12px 14px' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: accent }}>{t('explore.distance.km', { value: route.distanceKm.toFixed(1) })}</div>
              <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.6)' }}>{formatDuration(route.durationMin)}</div>
            </div>
            <Icon name="check" size={20} strokeWidth={2.2} stroke={accent} />
          </div>
          {route.footSegment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: 'rgba(244,241,232,0.65)', padding: '8px 2px 0' }}>
              <Icon name="boot" size={13} strokeWidth={1.9} />
              <span>
                {t('explore.navigator.footNotice', {
                  meters: Math.round(route.footSegment.distanceKm * 1000),
                  duration: formatDuration(route.footSegment.durationMin),
                })}
              </span>
            </div>
          )}
        </div>
      ) : null}

      <button
        onClick={build}
        disabled={loading || !start}
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: accent,
          color: '#071F16',
          border: 'none',
          borderRadius: '12px',
          padding: '12px 18px',
          fontSize: '13.5px',
          fontWeight: 700,
          cursor: loading || !start ? 'not-allowed' : 'pointer',
          opacity: loading || !start ? 0.6 : 1,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {loading ? t('explore.navigator.building') : route ? t('explore.navigator.rebuildRoute') : t('explore.navigator.buildRoute')}
      </button>

      {/* Alternative to our own OSRM-drawn route: hands the same trip off to
          the native Google Maps app (mobile) or Maps in a new tab (desktop)
          via a plain URL — no API key, no billing (see buildGoogleMapsUrl). */}
      <a
        href={buildGoogleMapsUrl({ lat: target.lat, lng: target.lng }, profile, waypoints)}
        target="_blank"
        rel="noreferrer"
        style={{
          marginTop: '8px',
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          background: 'transparent',
          color: CREAM,
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          padding: '11px 18px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
          fontFamily: "'Manrope', sans-serif",
          boxSizing: 'border-box',
        }}
      >
        {t('explore.navigator.openInGoogleMaps')}
        <Icon name="externalLink" size={14} strokeWidth={2} />
      </a>
    </div>
  );
}

export default Navigator;
