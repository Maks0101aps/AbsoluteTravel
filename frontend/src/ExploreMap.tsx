import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PLACES, CATEGORY_META, DIFFICULTY_META, type Place, type PlaceCategory } from './data/places';
import { getPlaces, type VerifyCheckmarkResult, type VisitCellResult, type ProfileCustomization, getFriendLabels, reactToFriendLabel, reportFriendLabel, deleteFriendLabel, type FriendLabel } from './api';
import AddPlaceForm from './AddPlaceForm';
import AddLabelForm from './AddLabelForm';

import VerifyVisitModal from './VerifyVisitModal';
import Navigator from './Navigator';
import type { RouteResult } from './data/routing';
import LeafletMap, { type LiveMarker } from './LeafletMap';
import { useLiveGps, type FriendDot } from './useLiveGps';
import { useExploration } from './exploration/useExploration';
import { UserAvatar } from './UserCard';
import { Icon, type IconName } from './icons';
import { BACKGROUNDS } from './data/profileOptions';

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
  // Open a traveler's profile (tapping the friend card on the map).
  onOpenProfile?: (userId: number) => void;
  // A place to open on the map from outside (e.g. the welcome recommendation):
  // selects it (opening its detail panel) and flies the map there. Carries a
  // nonce so re-selecting the same place still triggers.
  focusPlace?: { id: string | number; nonce: number } | null;
}

function CategoryBadge({ category }: { category: PlaceCategory }) {
  const { t } = useTranslation();
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
      {t(`category.${category}`, { defaultValue: meta.label })}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: number }) {
  const { t } = useTranslation();
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
      {t(`difficulty.${difficulty}`, { defaultValue: meta.label })} · +{meta.xp} XP
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

function ExploreMap({ accent = '#3FA66B', submitterName, userId, profile, openedPlaceIds, onVerified, onExplored, onMessageFriend, onOpenProfile, focusPlace }: ExploreMapProps) {
  const { t } = useTranslation();
  const [places, setPlaces] = useState<Place[]>(PLACES);
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [hoverId, setHoverId] = useState<string | number | null>(null);
  // Only auto-pick the nearest place once per session — after that the user's
  // own clicks own `activeId`.
  const hasAutoSelectedRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [verifyPlace, setVerifyPlace] = useState<Place | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<FriendDot | null>(null);
  // Screen position (relative to the map box) of the avatar that was clicked,
  // so the mini-profile card can pop up right next to it instead of a fixed
  // corner. Cleared together with selectedFriend.
  const [selectedFriendPos, setSelectedFriendPos] = useState<{ x: number; y: number } | null>(null);
  const mapBoxRef = useRef<HTMLDivElement>(null);
  // Live-tracking a friend: re-centers the map on them every time a new
  // position broadcast comes in (see the effect below), so their movement is
  // visible on the map itself rather than only as a jumping dot.
  const [followFriendId, setFollowFriendId] = useState<number | null>(null);

  // Navigator: road-following route to a destination, with optional stops
  // along the way. See Navigator.tsx for the panel UI; state lives here
  // because it has to drive props on the same <LeafletMap> instance the rest
  // of the page already uses.
  const [navTarget, setNavTarget] = useState<Place | null>(null);
  const [navStart, setNavStart] = useState<{ lat: number; lng: number } | null>(null);
  const [navWaypoints, setNavWaypoints] = useState<{ lat: number; lng: number }[]>([]);
  const [navPicking, setNavPicking] = useState<'start' | 'waypoint' | null>(null);
  const [navRoute, setNavRoute] = useState<RouteResult | null>(null);

  const openNavigator = (place: Place) => {
    setNavTarget(place);
    setNavStart(selfPosition ?? null);
    setNavWaypoints([]);
    setNavRoute(null);
    setNavPicking(null);
  };

  const closeNavigator = () => {
    setNavTarget(null);
    setNavStart(null);
    setNavWaypoints([]);
    setNavRoute(null);
    setNavPicking(null);
  };

  // Local friend labels states
  const [friendLabels, setFriendLabels] = useState<FriendLabel[]>([]);
  const [activeLabelId, setActiveLabelId] = useState<number | null>(null);
  const [hoverLabelId, setHoverLabelId] = useState<number | null>(null);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Live GPS: own pulsing dot + friends' dots (server broadcasts every 10s).
  const { selfPosition, friendDots, sharing, geoError, setSharing } = useLiveGps(userId);

  // While following a friend, re-center the map on them each time their dot
  // moves. `flyTarget` is the same "fly here" channel the welcome-screen
  // place recommendation uses (LeafletMap.tsx) — a new object identity here
  // triggers the pan, no separate map-following plumbing needed. Stops
  // itself if the friend drops off the live layer (goes offline/out of range).
  const followedDot = followFriendId == null ? undefined : friendDots.find((d) => d.userId === followFriendId);
  useEffect(() => {
    if (followFriendId == null) return;
    if (!followedDot) {
      setFollowFriendId(null);
      return;
    }
    setFlyTarget({ lat: followedDot.lat, lng: followedDot.lng });
    // `useLiveGps` rebuilds `friendDots` (and every dot object in it) fresh
    // on every render rather than memoizing — depending on the dot object,
    // or the whole array, would refire this effect (and thus setFlyTarget)
    // every render, not just on real position changes, which pegs React in
    // an infinite update loop. Depending on the raw lat/lng numbers instead
    // means it only reruns when the friend's position actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followFriendId, followedDot?.lat, followedDot?.lng]);

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
        label: t('explore.live.youHere', { name: profile?.displayName ?? submitterName ?? t('explore.live.youFallback') }),
        avatar: profile?.customAvatar || profile?.avatarId || undefined,
        pulse: true
      });
    }
    friendDots.forEach((d, i) => {
      markers.push({
        id: `friend-${d.userId}`,
        lat: d.lat,
        lng: d.lng,
        // A friend's own chosen accent colour wins when they've set one, so
        // their pin's ring matches their profile — falls back to the
        // rotating palette for friends who never customized.
        color: d.friend.color ?? FRIEND_COLORS[i % FRIEND_COLORS.length],
        label: `${d.friend.name}${d.stale ? t('explore.live.staleSuffix') : ''}`,
        avatar: d.friend.customAvatar || d.friend.avatarId || d.friend.avatar,
        frameId: d.friend.frameId,
        dimmed: d.stale,
        // Followed friend's dot pulses too, matching the "Ви тут" self-dot —
        // a quick visual cue for which one you're currently tracking.
        pulse: followFriendId === d.userId,
        onClick: (point) => {
          setSelectedFriend(d);
          setSelectedFriendPos(point);
        },
      });
    });
    return markers;
  }, [selfPosition, sharing, userId, friendDots, profile, accent, submitterName, followFriendId]);

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

  const loadLabels = () => {
    if (userId == null) return;
    getFriendLabels(userId)
      .then((data) => {
        if (Array.isArray(data)) {
          setFriendLabels(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPlaces();
    loadLabels();
    setActiveId((cur) => cur ?? PLACES[0]?.id ?? null);
  }, [userId]);

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

  // Open a place requested from outside the map (welcome recommendation): select
  // it so the side detail panel appears, and fly the map to its coordinates. The
  // nonce in the dep list lets the same place be re-opened.
  useEffect(() => {
    if (!focusPlace) return;
    const p = places.find((x) => x.id === focusPlace.id) ?? PLACES.find((x) => x.id === focusPlace.id);
    if (!p) return;
    hasAutoSelectedRef.current = true; // don't let the GPS auto-pick override this
    setActiveId(p.id);
    setFlyTarget({ lat: p.lat, lng: p.lng, zoom: 12 });
  }, [focusPlace, places]);

  const visiblePlaces = places;

  // The card shows whatever the pointer is hovering, otherwise the last clicked place.
  const shown: Place | undefined = useMemo(() => {
    const id = hoverId ?? activeId;
    return places.find((p) => p.id === id);
  }, [hoverId, activeId, places]);

  const shownLabel: FriendLabel | undefined = useMemo(() => {
    const id = hoverLabelId ?? activeLabelId;
    return friendLabels.find((l) => l.id === id);
  }, [hoverLabelId, activeLabelId, friendLabels]);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: 'clamp(24px, 3vw, 34px)', margin: '0 0 8px' }}>
            {t('explore.heading')}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'rgba(244,241,232,0.62)', margin: 0, maxWidth: '560px' }}>
            {t('explore.subheading')}
          </p>
        </div>
        <button
          onClick={() => setShowSelectionModal(true)}
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
          {t('explore.addPlace')}
        </button>
      </div>

      {/* Fixed-width grid (not flex-grow) so the map/panel split never shifts
          based on how much content the selected place has — the detail panel
          always occupies the same 380px regardless of what's shown inside it. */}
      <div className="at-explore-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 380px', gap: '24px', alignItems: 'flex-start' }}>
        {/* map column: the map box + the GPS-controls row below it, as ONE
            grid child — keeping this a strict 2-item grid (map column, detail
            panel) so CSS grid's auto-placement can't push the detail panel
            into an implicit second row (which left it sunk below an empty
            row-1 cell — the "empty space above the place card" bug). */}
        <div style={{ minWidth: 0 }}>
        <div
          ref={mapBoxRef}
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
            onSelect={(id) => {
              setActiveId(id);
              setActiveLabelId(null);
            }}
            onHover={(id) => setHoverId(id)}
            liveMarkers={userId != null ? liveMarkers : undefined}
            focusPosition={userId != null ? selfPosition : undefined}
            flyTo={flyTarget}
            exploredCells={userId != null ? visitedCells : undefined}
            revealedCell={lastRevealed}
            fog={userId != null}
            height="clamp(320px, 60vh, 560px)"
            friendLabels={friendLabels}
            activeLabelId={activeLabelId}
            hoverLabelId={hoverLabelId}
            onSelectLabel={(id) => {
              setActiveLabelId(id);
              setActiveId(null);
            }}
            onHoverLabel={(id) => setHoverLabelId(id)}
            pickable={navPicking !== null}
            onPick={(lat, lng) => {
              if (navPicking === 'start') {
                setNavStart({ lat, lng });
                setNavPicking(null);
              } else if (navPicking === 'waypoint') {
                setNavWaypoints((w) => [...w, { lat, lng }]);
              }
            }}
            route={navRoute?.points ?? null}
            routeOnFoot={navRoute?.profile === 'walking'}
            routeFootSegment={navRoute?.footSegment?.points ?? null}
            routeMarkers={
              navTarget
                ? [
                    ...(navStart ? [{ ...navStart, label: 'A' }] : []),
                    ...navWaypoints.map((w, i) => ({ ...w, label: String(i + 1) })),
                  ]
                : undefined
            }
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
                  // Leaflet's own panes (tiles/markers/popups) go up to
                  // z-index:700 and — since .leaflet-container itself never
                  // sets a z-index — aren't contained in their own stacking
                  // context, so they leak straight into this wrapper's
                  // isolated context and paint over anything with a lower
                  // z-index here. Needs to clear 700, not just sibling overlays.
                  zIndex: 900,
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
                    +{e.xp} XP{e.newRegion ? t('explore.xp.newRegion') : t('explore.xp.newCell')}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* friend mini profile card — pops up right next to the avatar that
              was clicked, flipping to the other side/clamping vertically so
              it never runs off the edge of the map box. */}
          {selectedFriend && selectedFriendPos && (() => {
            const CARD_W = 260;
            const CARD_H = 100;
            const boxW = mapBoxRef.current?.clientWidth ?? 600;
            const boxH = mapBoxRef.current?.clientHeight ?? 400;
            // Always to the right of the avatar — clamped (not flipped to the
            // other side) so it never runs off the map box on narrow layouts.
            const left = Math.min(selectedFriendPos.x + 16, Math.max(8, boxW - CARD_W - 8));
            const top = Math.min(Math.max(selectedFriendPos.y - CARD_H / 2, 8), Math.max(8, boxH - CARD_H - 8));
            const bg = BACKGROUNDS.find((b) => b.id === selectedFriend.friend.backgroundId)?.css ?? '#0B2B20';
            return (
            <div
              style={{
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                // Same reason as the xp-popup wrapper above: has to clear
                // Leaflet's own panes (up to z-index:700), which leak into
                // this box's stacking context since .leaflet-container has
                // no z-index of its own to contain them.
                zIndex: 900,
                background: bg,
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 16px 40px -10px rgba(0,0,0,0.7)',
                width: `${CARD_W}px`,
              }}
            >
              <button
                onClick={() => onOpenProfile?.(selectedFriend.friend.id)}
                title={t('explore.live.profileOf', { name: selectedFriend.friend.name })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: onOpenProfile ? 'pointer' : 'default',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                <UserAvatar user={selectedFriend.friend} size={46} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: CREAM }}>{selectedFriend.friend.name}</div>
                  <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.55)' }}>
                    {t('explore.live.level', { level: selectedFriend.friend.level, xp: selectedFriend.friend.xp })}
                  </div>
                  <div style={{ fontSize: '11px', color: selectedFriend.stale ? '#E0A54E' : accent }}>
                    {selectedFriend.stale ? t('explore.live.staleLong') : t('explore.live.updatedAt', { time: new Date(selectedFriend.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }) })}
                  </div>
                </div>
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 auto' }}>
                <button
                  onClick={() => onMessageFriend?.(selectedFriend.friend.id)}
                  style={{ background: accent, color: '#071F16', border: 'none', borderRadius: '9px', padding: '7px 13px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                >
                  {t('explore.live.message')}
                </button>
                <button
                  onClick={() => setFollowFriendId((id) => (id === selectedFriend.userId ? null : selectedFriend.userId))}
                  disabled={selectedFriend.stale}
                  title={selectedFriend.stale ? t('explore.live.followDisabledTitle') : undefined}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: followFriendId === selectedFriend.userId ? `${accent}22` : 'transparent',
                    color: followFriendId === selectedFriend.userId ? accent : 'rgba(244,241,232,0.75)',
                    border: `1px solid ${followFriendId === selectedFriend.userId ? accent : 'rgba(255,255,255,0.15)'}`,
                    borderRadius: '9px',
                    padding: '6px 13px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: selectedFriend.stale ? 'not-allowed' : 'pointer',
                    opacity: selectedFriend.stale ? 0.5 : 1,
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  <Icon name="compass" size={13} strokeWidth={1.9} />
                  {followFriendId === selectedFriend.userId ? t('explore.live.following') : t('explore.live.follow')}
                </button>
                <button
                  onClick={() => {
                    setSelectedFriend(null);
                    setSelectedFriendPos(null);
                  }}
                  style={{ background: 'transparent', color: 'rgba(244,241,232,0.6)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '9px', padding: '6px 13px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Manrope', sans-serif" }}
                >
                  {t('explore.live.close')}
                </button>
              </div>
            </div>
            );
          })()}
        </div>

        {/* live-GPS controls (logged-in users only) — sits below the map, not
            inside its position:relative box, so it can't push the friend-card/
            xp-popup overlays (bottom/top percentages anchored to that box) down
            past the map's own bottom edge. */}
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
              {sharing ? t('explore.live.geoOn') : t('explore.live.geoOff')}
            </button>
            <span style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.45)' }}>
              {geoError ?? t('explore.live.friendsCount', { count: friendDots.length, cells: totalCells })}
            </span>
            {followFriendId != null && (
              <button
                onClick={() => setFollowFriendId(null)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  background: `${accent}18`,
                  border: `1px solid ${accent}55`,
                  color: accent,
                  borderRadius: '999px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                <Icon name="compass" size={13} strokeWidth={1.9} />
                {t('explore.live.followingChip', { name: friendDots.find((d) => d.userId === followFriendId)?.friend.name ?? '' })}
              </button>
            )}
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
            {shownLabel ? (
              <LabelDetailView
                label={shownLabel}
                userId={userId}
                accent={accent}
                onDelete={async (id) => {
                  if (userId == null) return;
                  await deleteFriendLabel(id, userId);
                  setActiveLabelId(null);
                  setFriendLabels((cur) => cur.filter((l) => l.id !== id));
                }}
                onReact={async (id, type) => {
                  if (userId == null) return;
                  const res = await reactToFriendLabel(id, userId, type);
                  setFriendLabels((cur) =>
                    cur.map((l) =>
                      l.id === id
                        ? {
                            ...l,
                            likesCount: res.likesCount,
                            dislikesCount: res.dislikesCount,
                            myReaction: res.myReaction,
                          }
                        : l
                    )
                  );
                }}
                onReport={async (id, reason) => {
                  if (userId == null) return { action: 'kept', reason: t('explore.label.loginToReport') };
                  const res = await reportFriendLabel(id, userId, reason);
                  if (res.action === 'deleted') {
                    setFriendLabels((cur) => cur.filter((l) => l.id !== id));
                    setActiveLabelId(null);
                  }
                  return res;
                }}
              />
            ) : shown ? (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <CategoryBadge category={shown.category} />
                  <DifficultyBadge difficulty={shown.difficulty ?? 1} />
                  {openedPlaceIds?.has(shown.id) && <OpenedBadge />}
                </div>
                <div style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, margin: '12px 0 4px' }}>
                  {t(`places.${shown.id}.name`, { defaultValue: shown.name })}
                </div>
                <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.5)', marginBottom: '14px' }}>{t(`places.${shown.id}.region`, { defaultValue: shown.region })}</div>

                {shown.photos && shown.photos.length > 0 && <PhotoStrip photos={shown.photos} name={t(`places.${shown.id}.name`, { defaultValue: shown.name })} />}

                <p style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.78)', margin: '0 0 16px' }}>
                  {t(`places.${shown.id}.description`, { defaultValue: shown.description })}
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
                    {t(`places.${shown.id}.bestSeason`, { defaultValue: shown.bestSeason })}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: 'rgba(244,241,232,0.5)' }}>
                    <Icon name="target" size={14} strokeWidth={1.9} />
                    {shown.lat.toFixed(3)}, {shown.lng.toFixed(3)}
                  </span>
                </div>
                {shown.submittedBy && (
                  <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.4)', marginTop: '10px' }}>
                    {t('explore.detail.addedBy', { name: shown.submittedBy })}
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
                    {t('explore.detail.verifyVisit')}
                  </button>
                )}

                {/* Road-following route to this place — see Navigator.tsx. */}
                <button
                  onClick={() => openNavigator(shown)}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    background: `${accent}18`,
                    color: accent,
                    border: `1px solid ${accent}55`,
                    borderRadius: '12px',
                    padding: '12px 18px',
                    fontSize: '13.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  <Icon name="signpost" size={16} strokeWidth={1.9} />
                  {t('explore.detail.navigate')}
                </button>
              </>
            ) : (
              <div style={{ color: 'rgba(244,241,232,0.55)', fontSize: '14px' }}>
                {t('explore.detail.selectPrompt')}
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
                <span>{t('explore.nearby.heading')}</span>
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
                          {t(`places.${place.id}.name`, { defaultValue: place.name })}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'rgba(244, 241, 232, 0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t(`places.${place.id}.region`, { defaultValue: place.region })}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 800, color: '#3FA66B', flex: '0 0 auto', paddingLeft: '6px' }}>
                        {dist < 1
                          ? t('explore.distance.meters', { value: (dist * 1000).toFixed(0) })
                          : t('explore.distance.km', { value: dist.toFixed(1) })}
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

      {showLabelForm && userId != null && (
        <AddLabelForm
          accent={accent}
          userId={userId}
          onClose={() => setShowLabelForm(false)}
          onCreated={(newLabel) => {
            setFriendLabels((cur) => [newLabel, ...cur]);
            setActiveLabelId(newLabel.id);
            setActiveId(null);
          }}
        />
      )}

      {showSelectionModal && (
        <div
          onClick={() => setShowSelectionModal(false)}
          className="at-sheet-shell"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(4,16,11,0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '500px',
              background: '#071F16',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '28px',
              fontFamily: "'Manrope', sans-serif",
              color: CREAM,
              boxShadow: '0 30px 80px -24px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontFamily: "'Lora', serif", fontWeight: 500, fontSize: '22px', margin: 0 }}>
                {t('explore.selectModal.title')}
              </h3>
              <button
                onClick={() => setShowSelectionModal(false)}
                aria-label={t('explore.selectModal.close')}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: CREAM,
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flex: '0 0 auto',
                }}
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Option 1: Public Place */}
              <button
                onClick={() => {
                  setShowSelectionModal(false);
                  setShowForm(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: CREAM,
                  fontFamily: "'Manrope', sans-serif",
                  transition: 'all 0.2s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <Icon name="map" size={22} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{t('explore.selectModal.publicPlace.title')}</div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.6)' }}>{t('explore.selectModal.publicPlace.desc')}</div>
                </div>
              </button>

              {/* Option 2: Friend Label */}
              <button
                onClick={() => {
                  if (userId == null) return;
                  setShowSelectionModal(false);
                  setShowLabelForm(true);
                }}
                disabled={userId == null}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: userId == null ? 'not-allowed' : 'pointer',
                  color: CREAM,
                  fontFamily: "'Manrope', sans-serif",
                  transition: 'all 0.2s ease',
                  opacity: userId == null ? 0.5 : 1,
                  width: '100%',
                }}
                onMouseEnter={(e) => userId != null && (e.currentTarget.style.borderColor = '#ffffff')}
                onMouseLeave={(e) => userId != null && (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                  <Icon name="flag" size={22} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px' }}>{t('explore.selectModal.friendLabel.title')}</div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(244,241,232,0.6)' }}>
                    {userId == null ? t('explore.selectModal.friendLabel.loginRequired') : t('explore.selectModal.friendLabel.desc')}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
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

      {navTarget && (
        <Navigator
          target={navTarget}
          start={navStart}
          waypoints={navWaypoints}
          route={navRoute}
          picking={navPicking}
          accent={accent}
          onPickStart={() => setNavPicking('start')}
          onPickWaypoint={() => setNavPicking('waypoint')}
          onStopPicking={() => setNavPicking(null)}
          onRemoveWaypoint={(i) => setNavWaypoints((w) => w.filter((_, idx) => idx !== i))}
          onRouteBuilt={setNavRoute}
          onClose={closeNavigator}
        />
      )}
    </div>
  );
}

// Compact overlay in the map's top-left corner: how much territory the user has
// uncovered. The numbers flash briefly whenever they change.
function ExplorationHud({ totalCells, totalRegions, accent }: { totalCells: number; totalRegions: number; accent: string }) {
  const { t: hudT } = useTranslation();
  return (
    <div
      style={{
        position: 'absolute',
        top: '22px',
        left: '22px',
        // Needs to clear Leaflet's own panes (up to z-index:700) — see the
        // matching comment on the friend mini-profile card below.
        zIndex: 900,
        display: 'flex',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <HudStat icon="hexagon" label={hudT('explore.hud.cells')} value={totalCells} accent={accent} />
      <HudStat icon="compass" label={hudT('explore.hud.regions')} value={totalRegions} accent={accent} />
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
  const { t } = useTranslation();
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
      {t('explore.detail.opened')}
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

// --- Sub-components for local labels ---------------------------------------

interface LabelDetailViewProps {
  label: FriendLabel;
  userId?: number;
  accent: string;
  onDelete: (id: number) => Promise<void>;
  onReact: (id: number, type: 'LIKE' | 'DISLIKE' | null) => Promise<void>;
  onReport: (id: number, reason: string) => Promise<{ action: 'deleted' | 'kept'; reason: string }>;
}

function LabelDetailView({ label, userId, accent, onDelete, onReact, onReport }: LabelDetailViewProps) {
  const { t } = useTranslation();
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{ action: string; reason: string } | null>(null);

  // Time remaining
  let expiresStr = '';
  if (label.isTemporary && label.expiresAt) {
    const diff = new Date(label.expiresAt).getTime() - Date.now();
    if (diff > 0) {
      const hours = Math.floor(diff / (3600 * 1000));
      const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
      expiresStr = t('explore.label.timeLeft', { hours, mins });
    } else {
      expiresStr = t('explore.label.expired');
    }
  }

  let params: Record<string, string> = {};
  try {
    params = JSON.parse(label.customParams || '{}');
  } catch {}

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    setReporting(true);
    try {
      const res = await onReport(label.id, reportReason.trim());
      setReportFeedback(res);
    } catch (err: any) {
      setReportFeedback({ action: 'kept', reason: err?.message || t('explore.label.reportError') });
    } finally {
      setReporting(false);
    }
  };

  const isOwner = userId != null && label.userId === userId;

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: label.friendsOnly ? '#ffffff' : '#FCEB92',
            background: label.friendsOnly ? 'rgba(255,255,255,0.1)' : 'rgba(252,235,146,0.1)',
            border: `1px solid ${label.friendsOnly ? 'rgba(255,255,255,0.3)' : 'rgba(252,235,146,0.3)'}`,
            borderRadius: '999px',
            padding: '3px 9px',
          }}
        >
          <Icon name="flag" size={12} strokeWidth={2} />
          {label.friendsOnly ? t('explore.label.friendsOnly') : t('explore.label.public')}
        </span>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '11px',
            fontWeight: 700,
            color: 'rgba(244,241,232,0.6)',
            background: 'rgba(244,241,232,0.05)',
            border: '1px solid rgba(244,241,232,0.15)',
            borderRadius: '999px',
            padding: '3px 9px',
          }}
        >
          {label.isTemporary ? t('explore.label.temporary', { time: expiresStr }) : t('explore.label.permanent')}
        </span>
      </div>

      <div style={{ fontFamily: "'Lora', serif", fontSize: '22px', fontWeight: 500, margin: '0 0 4px', color: '#ffffff' }}>
        {label.name}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'rgba(244,241,232,0.5)', marginBottom: '14px' }}>
        <img
          src={label.user.avatar || '/assets/avatar_default.svg'}
          alt=""
          style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
        />
        <span>{t('explore.label.addedBy', { name: label.user.name || label.user.username })}</span>
      </div>

      {label.photo && (
        <div style={{ marginBottom: '14px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', aspectRatio: '16 / 10', background: '#04100B' }}>
          <img src={label.photo} alt={label.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      )}

      <p style={{ fontSize: '13.5px', lineHeight: 1.65, color: 'rgba(244,241,232,0.78)', margin: '0 0 16px' }}>
        {label.description}
      </p>

      {/* custom params */}
      {Object.keys(params).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 0 16px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          {Object.entries(params).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: 'rgba(244,241,232,0.5)', fontWeight: 600 }}>{k}</span>
              <span style={{ color: CREAM, fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* coordinates */}
      <div style={{ fontSize: '11.5px', color: 'rgba(244,241,232,0.4)', marginBottom: '16px' }}>
        {t('explore.label.coordinates', { lat: label.lat.toFixed(5), lng: label.lng.toFixed(5) })}
      </div>

      {/* Likes / Dislikes / Actions row */}
      {userId != null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Like */}
            <button
              onClick={() => onReact(label.id, label.myReaction === 'LIKE' ? null : 'LIKE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: label.myReaction === 'LIKE' ? 'rgba(63, 166, 107, 0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${label.myReaction === 'LIKE' ? accent : 'rgba(255,255,255,0.12)'}`,
                color: label.myReaction === 'LIKE' ? accent : 'rgba(244,241,232,0.7)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              <Icon name="sun" size={14} strokeWidth={2} />
              <span>{label.likesCount}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={() => onReact(label.id, label.myReaction === 'DISLIKE' ? null : 'DISLIKE')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: label.myReaction === 'DISLIKE' ? 'rgba(224, 90, 90, 0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${label.myReaction === 'DISLIKE' ? '#E05A5A' : 'rgba(255,255,255,0.12)'}`,
                color: label.myReaction === 'DISLIKE' ? '#E05A5A' : 'rgba(244,241,232,0.7)',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              <Icon name="moon" size={14} strokeWidth={2} />
              <span>{label.dislikesCount}</span>
            </button>

            <div style={{ flex: 1 }} />

            {/* Delete button (owner only) */}
            {isOwner && (
              <button
                onClick={() => onDelete(label.id)}
                style={{
                  background: 'rgba(224, 90, 90, 0.15)',
                  border: '1px solid rgba(224, 90, 90, 0.4)',
                  color: '#E05A5A',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {t('explore.label.delete')}
              </button>
            )}

            {/* Report toggle button (non-owner only) */}
            {!isOwner && !showReportForm && !reportFeedback && (
              <button
                onClick={() => setShowReportForm(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'rgba(244,241,232,0.6)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                {t('explore.label.report')}
              </button>
            )}
          </div>

          {/* Inline Report Form */}
          {showReportForm && !reportFeedback && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(244,241,232,0.6)' }}>{t('explore.label.reportReasonLabel')}</label>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t('explore.label.reportPlaceholder')}
                rows={2}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  color: CREAM,
                  fontSize: '13px',
                  fontFamily: "'Manrope', sans-serif",
                  outline: 'none',
                  resize: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowReportForm(false);
                    setReportReason('');
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'rgba(244,241,232,0.5)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('explore.label.cancel')}
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={reporting || !reportReason.trim()}
                  style={{
                    background: accent,
                    border: 'none',
                    borderRadius: '6px',
                    color: '#071F16',
                    padding: '5px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: reporting || !reportReason.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {reporting ? t('explore.label.aiChecking') : t('explore.label.submitReport')}
                </button>
              </div>
            </div>
          )}

          {/* Report Feedback (AI Moderator response) */}
          {reportFeedback && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: reportFeedback.action === 'deleted' ? 'rgba(224,90,90,0.1)' : 'rgba(63,166,107,0.1)',
              border: `1px solid ${reportFeedback.action === 'deleted' ? 'rgba(224,90,90,0.3)' : 'rgba(63,166,107,0.3)'}`,
              borderRadius: '10px',
              padding: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 800, color: reportFeedback.action === 'deleted' ? '#E05A5A' : '#3FA66B' }}>
                <Icon name={reportFeedback.action === 'deleted' ? 'close' : 'check'} size={15} strokeWidth={2} />
                <span>{reportFeedback.action === 'deleted' ? t('explore.label.reportDeletedTitle') : t('explore.label.reportRejectedTitle')}</span>
              </div>
              <p style={{ fontSize: '12.5px', lineHeight: 1.5, color: 'rgba(244,241,232,0.85)', margin: 0 }}>
                {reportFeedback.reason}
              </p>
              <button
                onClick={() => {
                  setReportFeedback(null);
                  setShowReportForm(false);
                  setReportReason('');
                }}
                style={{
                  alignSelf: 'flex-end',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: CREAM,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                {t('explore.label.gotIt')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
