import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVisitedCells, getExplorationStats, type ExplorationStats } from './api';
import { PLACES } from './data/places';
import LeafletMap from './LeafletMap';
import { Icon } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';

interface FriendMapViewProps {
  userId: number;
  viewerId: number;
  displayName: string;
  accent: string;
  onClose: () => void;
}

// Read-only view of a friend's exploration progress: same fog-of-war +
// unlocked-hexes rendering as the live map, just fed by that friend's cells
// instead of the viewer's own, with no GPS tracking or pick/verify actions.
function FriendMapView({ userId, viewerId, displayName, accent, onClose }: FriendMapViewProps) {
  const { t } = useTranslation();
  const [cells, setCells] = useState<string[] | null>(null);
  const [stats, setStats] = useState<ExplorationStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCells(null);
    setStats(null);
    setError('');
    Promise.all([getVisitedCells(userId, viewerId), getExplorationStats(userId, viewerId)])
      .then(([c, s]) => {
        if (cancelled) return;
        setCells(c.cells);
        setStats(s);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || t('social.friendMap.errorLoading'));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, viewerId, t]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('social.friendMap.ariaLabel', { name: displayName })}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 220,
        background: BG,
        color: CREAM,
        fontFamily: "'Manrope', sans-serif",
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '20px 24px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: CREAM,
              borderRadius: '10px',
              padding: '9px 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            <Icon name="arrowLeft" size={15} strokeWidth={2} />
            {t('social.friendMap.back')}
          </button>

          <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(244,241,232,0.7)' }}>
            {t('social.friendMap.title', { name: displayName })}
          </div>
        </div>

        {error && (
          <div style={{ fontSize: '13.5px', color: '#E9A6A6', background: 'rgba(224,90,90,0.12)', border: '1px solid rgba(224,90,90,0.3)', borderRadius: '12px', padding: '14px 18px' }}>
            {error}
          </div>
        )}

        {!error && cells === null && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(244,241,232,0.5)', fontSize: '14px' }}>
            {t('social.friendMap.loading')}
          </div>
        )}

        {!error && cells !== null && (
          <>
            {stats && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <StatChip icon="map" label={t('social.friendMap.cellsExplored')} value={stats.totalCells} accent={accent} />
                <StatChip icon="flag" label={t('social.friendMap.regions')} value={stats.totalRegions} accent={accent} />
              </div>
            )}
            <div
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: '18px',
                padding: '12px',
                overflow: 'hidden',
              }}
            >
              <LeafletMap
                places={PLACES}
                activeId={null}
                hoverId={null}
                onSelect={() => {}}
                onHover={() => {}}
                exploredCells={cells}
                fog
                height="clamp(320px, 60vh, 560px)"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, accent }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        padding: '9px 14px',
      }}
    >
      <Icon name={icon} size={15} strokeWidth={1.9} stroke={accent} />
      <span style={{ fontSize: '14px', fontWeight: 800 }}>{value}</span>
      <span style={{ fontSize: '12px', color: 'rgba(244,241,232,0.55)' }}>{label}</span>
    </div>
  );
}

export default FriendMapView;
