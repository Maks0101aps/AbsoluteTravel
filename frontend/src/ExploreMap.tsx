import { useEffect, useMemo, useState } from 'react';
import { PLACES, CATEGORY_META, CATEGORY_ORDER, DIFFICULTY_META, DIFFICULTY_ORDER, type Place, type PlaceCategory } from './data/places';
import { getPlaces, type VerifyCheckmarkResult } from './api';
import AddPlaceForm from './AddPlaceForm';
import VerifyVisitModal from './VerifyVisitModal';
import LeafletMap from './LeafletMap';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';
const PANEL = '#0B2B20';

const CATEGORY_ICON: Record<PlaceCategory, IconName> = {
  nature: 'leaf',
  mountains: 'mountain',
  history: 'shield',
  city: 'signpost',
  coast: 'compass',
};

interface ExploreMapProps {
  accent?: string;
  submitterName?: string;
  // The logged-in user's id (enables visit verification). Undefined = guest.
  userId?: number;
  // Place ids the user has already verified (opened).
  openedPlaceIds?: Set<string | number>;
  // Called after a successful verification: award XP/coins and mark opened.
  onVerified?: (placeId: string | number, result: VerifyCheckmarkResult) => void;
}

function CategoryBadge({ category }: { category: PlaceCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: 700,
        color: meta.color,
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}55`,
        borderRadius: '999px',
        padding: '3px 9px',
      }}
    >
      <Icon name={CATEGORY_ICON[category]} size={13} strokeWidth={1.9} />
      {meta.label}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const meta = DIFFICULTY_META[difficulty] ?? DIFFICULTY_META[1];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: 700,
        color: meta.color,
        background: `${meta.color}22`,
        border: `1px solid ${meta.color}55`,
        borderRadius: '999px',
        padding: '3px 9px',
      }}
    >
      <Icon name="star" size={13} strokeWidth={1.9} />
      {meta.label} · +{meta.xp} XP
    </span>
  );
}

function ExploreMap({ accent = '#3FA66B', submitterName, userId, openedPlaceIds, onVerified }: ExploreMapProps) {
  const [places, setPlaces] = useState<Place[]>(PLACES);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [hoverId, setHoverId] = useState<string | number | null>(null);
  const [filter, setFilter] = useState<PlaceCategory | 'all'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [verifyPlace, setVerifyPlace] = useState<Place | null>(null);

  // Load live places from the backend; fall back to the bundled dataset.
  const loadPlaces = () => {
    getPlaces()
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setPlaces(data);
          setActiveId((cur) => cur ?? data[0].id);
        }
      })
      .catch(() => {
        // keep the offline fallback already in state
      });
  };

  useEffect(() => {
    loadPlaces();
    setActiveId((cur) => cur ?? PLACES[0]?.id ?? null);
  }, []);

  const visiblePlaces = useMemo(
    () =>
      places.filter(
        (p) =>
          (filter === 'all' || p.category === filter) &&
          (difficultyFilter === 'all' || (p.difficulty ?? 1) === difficultyFilter),
      ),
    [filter, difficultyFilter, places],
  );

  // The card shows whatever the pointer is hovering, otherwise the last clicked place.
  const shown: Place | undefined = useMemo(() => {
    const id = hoverId ?? activeId;
    return places.find((p) => p.id === id);
  }, [hoverId, activeId, places]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.22em', color: accent, marginBottom: '10px' }}>
            МАПА МАНДРІВОК
          </div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
            Куди поїхати в Україні
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: 0, maxWidth: '560px' }}>
            Наведи або торкнись точки на карті — і дізнайся, що варто побачити. Знаєш круте місце? Додай його!
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: accent,
            color: '#071F16',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 20px',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Manrope', sans-serif",
            flex: '0 0 auto',
          }}
        >
          <Icon name="plus" size={17} strokeWidth={2} />
          Додати місце
        </button>
      </div>

      {/* category filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} color={accent} label="Усі місця" />
        {CATEGORY_ORDER.map((cat) => (
          <FilterChip
            key={cat}
            active={filter === cat}
            onClick={() => setFilter(cat)}
            color={CATEGORY_META[cat].color}
            label={CATEGORY_META[cat].label}
          />
        ))}
      </div>

      {/* difficulty filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
        <FilterChip active={difficultyFilter === 'all'} onClick={() => setDifficultyFilter('all')} color={accent} label="Будь-яка складність" />
        {DIFFICULTY_ORDER.map((d) => (
          <FilterChip
            key={d}
            active={difficultyFilter === d}
            onClick={() => setDifficultyFilter(d)}
            color={DIFFICULTY_META[d].color}
            label={DIFFICULTY_META[d].label}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
        {/* map */}
        <div
          style={{
            position: 'relative',
            // Contain Leaflet's internal z-indexes (panes/controls go up to ~1000)
            // so they can't paint over overlays like the "add place" modal.
            isolation: 'isolate',
            flex: '1 1 460px',
            minWidth: '300px',
            background: '#081E15',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '18px',
            padding: '12px',
            overflow: 'hidden',
          }}
        >
          <LeafletMap
            places={visiblePlaces}
            activeId={activeId}
            hoverId={hoverId}
            onSelect={(id) => setActiveId(id)}
            onHover={(id) => setHoverId(id)}
            height="clamp(320px, 60vh, 560px)"
          />
        </div>

        {/* detail panel */}
        <div style={{ flex: '1 1 260px', minWidth: '240px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              background: PANEL,
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '16px',
              padding: '22px',
              // Fixed height + internal scroll: hovering different places swaps the
              // content without changing this panel's outer size, so the list below
              // never shifts under the cursor (which otherwise caused a hover flicker loop).
              height: 'clamp(320px, 46vh, 440px)',
              overflowY: 'auto',
            }}
          >
            {shown ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <CategoryBadge category={shown.category} />
                  <DifficultyBadge difficulty={shown.difficulty ?? 1} />
                  {openedPlaceIds?.has(shown.id) && <OpenedBadge />}
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, margin: '12px 0 4px' }}>
                  {shown.name}
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.5)', marginBottom: '14px' }}>{shown.region}</div>

                {shown.photos && shown.photos.length > 0 && <PhotoStrip photos={shown.photos} name={shown.name} />}

                <p style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.78)', margin: '0 0 16px' }}>
                  {shown.description}
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'rgba(244,241,232,0.7)',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    paddingTop: '14px',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <Icon name="sun" size={15} stroke={accent} strokeWidth={1.9} />
                    {shown.bestSeason}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'rgba(244,241,232,0.5)' }}>
                    <Icon name="target" size={14} strokeWidth={1.9} />
                    {shown.lat.toFixed(3)}, {shown.lng.toFixed(3)}
                  </span>
                </div>
                {shown.submittedBy && (
                  <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.4)', marginTop: '10px' }}>
                    Додав: {shown.submittedBy}
                  </div>
                )}

                {/* Visit verification — only for logged-in users on not-yet-opened places. */}
                {userId != null && !openedPlaceIds?.has(shown.id) && (
                  <button
                    onClick={() => setVerifyPlace(shown)}
                    style={{
                      marginTop: '16px',
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
                      cursor: 'pointer',
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    <Icon name="camera" size={16} strokeWidth={1.9} />
                    Верифікувати відвідування
                  </button>
                )}
              </>
            ) : (
              <div style={{ color: 'rgba(244,241,232,0.55)', fontSize: '14px' }}>
                Обери точку на карті, щоб побачити деталі.
              </div>
            )}
          </div>

          {/* quick list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
            {visiblePlaces.map((place) => {
              const meta = CATEGORY_META[place.category];
              const isActive = place.id === activeId;
              return (
                <button
                  key={place.id}
                  onClick={() => setActiveId(place.id)}
                  onMouseEnter={() => setHoverId(place.id)}
                  onMouseLeave={() => setHoverId((cur) => (cur === place.id ? null : cur))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    textAlign: 'left',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: '1px solid',
                    borderColor: isActive ? `${meta.color}55` : 'rgba(255,255,255,0.07)',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    color: CREAM,
                    cursor: 'pointer',
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: meta.color, flex: '0 0 auto' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {place.name}
                  </span>
                  {openedPlaceIds?.has(place.id) && (
                    <span title="Відкрито" style={{ display: 'inline-flex', alignItems: 'center', color: '#3FA66B', flex: '0 0 auto' }}>
                      <Icon name="check" size={14} strokeWidth={2.6} />
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'rgba(244,241,232,0.45)', flex: '0 0 auto' }}>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showForm && (
        <AddPlaceForm
          accent={accent}
          submitterName={submitterName}
          onClose={() => setShowForm(false)}
          onApproved={() => loadPlaces()}
        />
      )}

      {verifyPlace && userId != null && (
        <VerifyVisitModal
          place={verifyPlace}
          userId={userId}
          accent={accent}
          onClose={() => setVerifyPlace(null)}
          onVerified={(result) => onVerified?.(verifyPlace.id, result)}
        />
      )}
    </div>
  );
}

function OpenedBadge() {
  const color = '#3FA66B';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '11px',
        fontWeight: 700,
        color,
        background: `${color}22`,
        border: `1px solid ${color}55`,
        borderRadius: '999px',
        padding: '3px 9px',
      }}
    >
      <Icon name="check" size={13} strokeWidth={2.4} />
      Відкрито
    </span>
  );
}

function PhotoStrip({ photos, name }: { photos: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const idx = Math.min(active, photos.length - 1);
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16 / 10', background: '#04100B' }}>
        <img src={photos[idx]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      {photos.length > 1 && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          {photos.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{ width: '46px', height: '38px', borderRadius: '8px', overflow: 'hidden', border: i === idx ? '2px solid #fff' : '1px solid rgba(255,255,255,0.16)', padding: 0, cursor: 'pointer', background: 'none', flex: '0 0 auto' }}
            >
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, color, label }: { active: boolean; onClick: () => void; color: string; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: active ? `${color}22` : 'transparent',
        border: `1px solid ${active ? `${color}77` : 'rgba(255,255,255,0.12)'}`,
        color: active ? color : 'rgba(244,241,232,0.7)',
        borderRadius: '999px',
        padding: '7px 14px',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
      {label}
    </button>
  );
}

export default ExploreMap;
