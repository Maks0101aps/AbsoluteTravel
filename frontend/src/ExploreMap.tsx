import { useEffect, useMemo, useRef, useState } from 'react';
import { PLACES, CATEGORY_META, DIFFICULTY_META, type Place, type PlaceCategory } from './data/places';
import { getPlaces, type VerifyCheckmarkResult, type VisitCellResult, type ProfileCustomization } from './api';
import AddPlaceForm from './AddPlaceForm';
import VerifyVisitModal from './VerifyVisitModal';
import LeafletMap, { type LiveMarker } from './LeafletMap';
import { useLiveGps, type FriendDot } from './useLiveGps';
import { useExploration } from './exploration/useExploration';
import { UserAvatar } from './UserCard';
import { Icon, type IconName } from './icons';

// Distinct dot colors for friends on the live map.
const FRIEND_COLORS = ['#E0A54E', '#5BB8F5', '#C77DDB', '#E58784', '#6FCF97', '#F2C94C'];

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
  // Client-side profile customization
  profile?: ProfileCustomization;
  // Place ids the user has already verified (opened).
  openedPlaceIds?: Set<string | number>;
  // Called after a successful verification: award XP/coins and mark opened.
  onVerified?: (placeId: string | number, result: VerifyCheckmarkResult) => void;
  // Called after a new territory cell is unlocked: fold the new xp/level in.
  onExplored?: (result: VisitCellResult) => void;
  // Open the chat tab with this friend (from the live-map mini profile card).
  onMessageFriend?: (friendId: number) => void;
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

// Great-circle distance in km — used to find the place nearest the user.
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function ExploreMap({ accent = '#3FA66B', submitterName, userId, profile, openedPlaceIds, onVerified, onExplored, onMessageFriend }: ExploreMapProps) {
  const [places, setPlaces] = useState<Place[]>(PLACES);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [hoverId, setHoverId] = useState<string | number | null>(null);
  // Only auto-pick the nearest place once per session — after that the user's
  // own clicks own `activeId`.
  const hasAutoSelectedRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [verifyPlace, setVerifyPlace] = useState<Place | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendDot | null>(null);

  // Live GPS: own pulsing dot + friends' dots (server broadcasts every 10s).
  const { selfPosition, friendDots, sharing, geoError, setSharing } = useLiveGps(userId);

  // Territory exploration: unlock the H3 cell under the user, award XP, animate.
  const { visitedCells, lastRevealed, events, totalCells, totalRegions } = useExploration(
    userId,
    selfPosition,
    onExplored,
  );
  const liveMarkers: LiveMarker[] = useMemo(() => {
    const markers: LiveMarker[] = [];
    if (selfPosition && sharing && userId != null) {
      markers.push({
        id: 'self',
        ...selfPosition,
        color: profile?.color ?? accent ?? '#4D9DE0',
        label: `${profile?.displayName ?? submitterName ?? 'Ви'} (Ви тут)`,
        avatar: profile?.customAvatar || profile?.avatarId || undefined,
        pulse: true
      });
    }
    friendDots.forEach((d, i) => {
      markers.push({
        id: `friend-${d.userId}`,
        lat: d.lat,
        lng: d.lng,
        color: FRIEND_COLORS[i % FRIEND_COLORS.length],
        label: `${d.friend.name}${d.stale ? ' · давно не оновлювалось' : ''}`,
        avatar: d.friend.avatar,
        dimmed: d.stale,
        onClick: () => setSelectedFriend(d),
      });
    });
    return markers;
  }, [selfPosition, sharing, userId, friendDots, profile, accent, submitterName]);

  const top3Nearby = useMemo(() => {
    if (!selfPosition || places.length === 0) return [];
    return [...places]
      .map((place) => ({
        place,
        dist: haversineKm(selfPosition.lat, selfPosition.lng, place.lat, place.lng),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map((item) => item.place);
  }, [selfPosition, places]);

  // Load live places from the backend; fall back to the bundled dataset.
  const loadPlaces = () => {
    getPlaces()
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setPlaces(data);
          setActiveId((cur) => {
            if (cur === null || !data.some((p) => p.id === cur)) {
              return data[0].id;
            }
            return cur;
          });
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

  // As soon as we know where the user is (and have places to compare against),
  // highlight the nearest one instead of leaving the arbitrary first-in-list
  // selection from loadPlaces().
  useEffect(() => {
    if (hasAutoSelectedRef.current || !selfPosition || places.length === 0) return;
    hasAutoSelectedRef.current = true;
    let nearest = places[0];
    let nearestKm = haversineKm(selfPosition.lat, selfPosition.lng, nearest.lat, nearest.lng);
    for (const p of places) {
      const km = haversineKm(selfPosition.lat, selfPosition.lng, p.lat, p.lng);
      if (km < nearestKm) {
        nearest = p;
        nearestKm = km;
      }
    }
    setActiveId(nearest.id);
  }, [selfPosition, places]);

  const visiblePlaces = places;

  // The card shows whatever the pointer is hovering, otherwise the last clicked place.
  const shown: Place | undefined = useMemo(() => {
    const id = hoverId ?? activeId;
    return places.find((p) => p.id === id);
  }, [hoverId, activeId, places]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
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

      {/* Fixed-width grid (not flex-grow) so the map/panel split never shifts
          based on how much content the selected place has — the detail panel
          always occupies the same 380px regardless of what's shown inside it. */}
      <div className="at-explore-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 380px', gap: '24px', alignItems: 'flex-start' }}>
        {/* map */}
        <div
          style={{
            position: 'relative',
            // Contain Leaflet's internal z-indexes (panes/controls go up to ~1000)
            // so they can't paint over overlays like the "add place" modal.
            isolation: 'isolate',
            minWidth: 0,
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
            liveMarkers={userId != null ? liveMarkers : undefined}
            focusPosition={userId != null ? selfPosition : undefined}
            exploredCells={userId != null ? visitedCells : undefined}
            revealedCell={lastRevealed}
            // Guests have nothing unlocked, so fogging them would just hand them
            // a black rectangle instead of the map they came to browse.
            fog={userId != null}
            height="clamp(320px, 60vh, 560px)"
          />

          {/* territory progress + floating "+XP" popups (logged-in users only) */}
          {userId != null && (
            <>
              <ExplorationHud totalCells={totalCells} totalRegions={totalRegions} accent={accent} />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 25,
                  pointerEvents: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {events.map((e) => (
                  <div
                    key={e.id}
                    className="at-xp-pop"
                    style={{
                      background: 'rgba(11,43,32,0.94)',
                      border: `1px solid ${accent}88`,
                      borderRadius: '999px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#9BD8B4',
                      boxShadow: '0 10px 30px -8px rgba(0,0,0,0.7)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    +{e.xp} XP{e.newRegion ? ' · Новий регіон!' : ' · Нова клітинка'}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* live-GPS controls (logged-in users only) */}
          {userId != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '10px', padding: '0 4px' }}>
              <button
                onClick={() => setSharing(!sharing)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: sharing ? 'rgba(77,157,224,0.15)' : 'transparent',
                  border: `1px solid ${sharing ? 'rgba(77,157,224,0.55)' : 'rgba(255,255,255,0.15)'}`,
                  color: sharing ? '#4D9DE0' : 'rgba(244,241,232,0.6)',
                  borderRadius: '999px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sharing ? '#4D9DE0' : 'rgba(244,241,232,0.3)' }} />
                {sharing ? 'Геолокація увімкнена — друзі бачать тебе' : 'Геолокація вимкнена'}
              </button>
              <span style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.45)' }}>
                {geoError ?? `Друзів на мапі: ${friendDots.length} · Клітинок відкрито: ${totalCells}`}
              </span>
            </div>
          )}

          {/* friend mini profile card */}
          {selectedFriend && (
            <div
              style={{
                position: 'absolute',
                left: '20px',
                bottom: '20px',
                zIndex: 20,
                background: '#0B2B20',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 16px 40px -10px rgba(0,0,0,0.7)',
                maxWidth: '320px',
              }}
            >
              <UserAvatar user={selectedFriend.friend} size={46} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: CREAM }}>{selectedFriend.friend.name}</div>
                <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.55)' }}>
                  Рівень {selectedFriend.friend.level} · {selectedFriend.friend.xp} XP
                </div>
                <div style={{ fontSize: '11px', color: selectedFriend.stale ? '#E0A54E' : accent }}>
                  {selectedFriend.stale ? 'Давно не оновлювалось' : `Оновлено ${new Date(selectedFriend.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' }}>
                <button
                  onClick={() => onMessageFriend?.(selectedFriend.friend.id)}
                  style={{ background: accent, color: '#071F16', border: 'none', borderRadius: '9px', padding: '7px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                >
                  Написати
                </button>
                <button
                  onClick={() => setSelectedFriend(null)}
                  style={{ background: 'transparent', color: 'rgba(244,241,232,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', padding: '6px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                >
                  Закрити
                </button>
              </div>
            </div>
          )}
        </div>

        {/* detail panel */}
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

          {/* Top 3 places nearby */}
          {selfPosition && top3Nearby.length > 0 && (
            <div style={{
              background: 'rgba(63, 166, 107, 0.06)',
              border: '1px solid rgba(63, 166, 107, 0.18)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800, color: '#3FA66B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                <Icon name="compass" size={15} strokeWidth={2.2} />
                <span>Найближчі місця поруч</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top3Nearby.map((place) => {
                  const dist = haversineKm(selfPosition.lat, selfPosition.lng, place.lat, place.lng);
                  const meta = CATEGORY_META[place.category];
                  const isHovered = place.id === hoverId;
                  const isActive = place.id === activeId;
                  return (
                    <button
                      key={`nearby-${place.id}`}
                      onClick={() => setActiveId(place.id)}
                      onMouseEnter={() => setHoverId(place.id)}
                      onMouseLeave={() => setHoverId(cur => cur === place.id ? null : cur)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left',
                        background: isActive ? 'rgba(255, 255, 255, 0.06)' : 'rgba(11, 43, 32, 0.65)',
                        border: '1px solid',
                        borderColor: isActive ? `${meta.color}55` : isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px',
                        padding: '9px 12px',
                        color: CREAM,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        outline: 'none',
                        fontFamily: "'Manrope', sans-serif"
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: `${meta.color}20`, color: meta.color, flex: '0 0 auto' }}>
                        <Icon name={CATEGORY_ICON[place.category]} size={13} strokeWidth={2} />
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(244, 241, 232, 0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {place.region}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#3FA66B', flex: '0 0 auto', paddingLeft: '6px' }}>
                        {dist < 1 ? `${(dist * 1000).toFixed(0)} м` : `${dist.toFixed(1)} км`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}


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

// Compact overlay in the map's top-left corner: how much territory the user has
// uncovered. The numbers flash briefly whenever they change.
function ExplorationHud({ totalCells, totalRegions, accent }: { totalCells: number; totalRegions: number; accent: string }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '22px',
        left: '22px',
        zIndex: 20,
        display: 'flex',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <HudStat icon="hexagon" label="Клітинки" value={totalCells} accent={accent} />
      <HudStat icon="compass" label="Регіони" value={totalRegions} accent={accent} />
    </div>
  );
}

function HudStat({ icon, label, value, accent }: { icon: IconName; label: string; value: number; accent: string }) {
  const [bump, setBump] = useState(false);
  const prev = useRef(value);
  useEffect(() => {
    if (value !== prev.current) {
      prev.current = value;
      setBump(true);
      const t = setTimeout(() => setBump(false), 500);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(8,26,18,0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '12px',
        padding: '8px 12px',
        boxShadow: '0 8px 24px -10px rgba(0,0,0,0.6)',
      }}
    >
      <Icon name={icon} size={16} stroke={accent} strokeWidth={1.9} />
      <div style={{ lineHeight: 1.15 }}>
        <div key={value} className={bump ? 'at-stat-bump' : undefined} style={{ fontSize: '17px', fontWeight: 800, color: CREAM, transformOrigin: 'left center' }}>
          {value}
        </div>
        <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(244,241,232,0.5)', textTransform: 'uppercase' }}>
          {label}
        </div>
      </div>
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


export default ExploreMap;
