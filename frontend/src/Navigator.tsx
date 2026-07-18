import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Place } from './data/places';
import { fetchNavigatorRoute, formatDuration, type RoutePoint, type RouteResult, type TravelProfile } from './data/routing';
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
  onClose: () => void;
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
  onClose,
}: NavigatorProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<TravelProfile>('driving');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Draggable like a floating window: offset from the default bottom-right
  // anchor, dragged from the header. Starts at (0,0) so first render matches
  // the original fixed position exactly.
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

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `calc(24px - ${dragOffset.y}px)`,
        right: `calc(24px - ${dragOffset.x}px)`,
        zIndex: 150,
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
      }}
    >
      <div
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '14px', cursor: 'grab', touchAction: 'none' }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', color: accent, marginBottom: '4px' }}>{t('explore.navigator.label')}</div>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{t(`places.${target.id}.name`, { defaultValue: target.name })}</div>
        </div>
        <button
          onClick={onClose}
          aria-label={t('explore.navigator.close')}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '9px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: CREAM, cursor: 'pointer', flex: '0 0 auto' }}
        >
          <Icon name="close" size={14} strokeWidth={2} />
        </button>
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
    </div>
  );
}

export default Navigator;
