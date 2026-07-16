import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_META, DIFFICULTY_META, type Place } from './data/places';
import { AVATARS } from './data/profileOptions';
import { cellPolygon, cellCenter, regionOf } from './exploration/h3';
import { UA_BORDER } from './data/ukraineBorder';

// Explored-territory hexes. Soft green, translucent — they tint the map you've
// walked without hiding it.
const HEX_FILL = '#3FA66B';
const HEX_STROKE = 'rgba(155,216,180,0.55)';

// --- fog of war -------------------------------------------------------------
// The fog lives in its own pane sitting above the tiles (200) but below the
// overlay pane (400) and the marker pane (600). That ordering is what keeps the
// place markers readable *through* the fog: unexplored POIs stay visible to
// lure the user towards them, they just have no map detail around them.
const FOG_PANE = 'at-fog';
const FOG_PANE_Z = 350;

// Tuned against a real render, not by eye in the abstract: at 0.88 the tiles
// still read straight through the fog — every city name and road legible — which
// defeats the point. At 0.95 unexplored land is reduced to ghosts while the POI
// markers above still pull you towards it.
const FOG_COLOR = '#0A1F16';
// Never been anywhere near: full darkness.
const FOG_DEEP_OPACITY = 0.95;
// Been in the region, but not on this exact spot: a haze — you know roughly
// what's here, the detail still has to be walked.
const FOG_HAZE_OPACITY = 0.5;
const FOG_REGION_STROKE = 'rgba(155,216,180,0.22)';

// The outer ring of the fog. Deliberately the whole Mercator world rather than
// Ukraine's bbox: the map bounces a little past maxBounds when panned hard, and
// a world-sized ring means no un-fogged sliver can ever appear at the edge.
// (±85 is the Mercator projection limit — ±90 projects to infinity.)
const WORLD_RING: [number, number][] = [
  [-85, -180],
  [-85, 180],
  [85, 180],
  [85, -180],
];

// Below this zoom a res-9 hex is smaller than a pixel, so punching the fine
// holes would cost thousands of rings to render something invisible. Zoomed
// out, a visited region reads as one haze patch; zoom in and the walked cells
// clear inside it.
const FOG_FINE_ZOOM = 10;

// How much slack the fog/mask renderers draw beyond the viewport, as a fraction
// of its size (Leaflet's own default is 0.1, which is not enough — see where the
// renderers are created). The fine-cell culling below reuses this, so the holes
// always cover everything the renderer has actually drawn.
const FOG_RENDER_PADDING = 1;

// --- border mask ------------------------------------------------------------
// Everything outside Ukraine is painted out completely: the same world-ring
// trick as the fog, but with the national border as the hole and a fully opaque
// fill, so no neighbouring country shows through. maxBounds alone can't do this
// — it's a rectangle, and Ukraine is not.
//
// Sits above the fog but below the overlay/marker panes, so markers still draw
// over it (a friend abroad stays visible even though the land around them is
// masked off).
const MASK_PANE = 'at-mask';
const MASK_PANE_Z = 360;
// Must stay clearly darker than the deep fog above: at 0.95 the fog resolves to
// roughly #16291F, and an "outside" anywhere near that makes the country's own
// silhouette vanish into the void around it.
const OUTSIDE_FILL = '#040B08';
const BORDER_STROKE = 'rgba(155,216,180,0.38)';


const ICON_PATHS: Record<string, string> = {
  compass: '<circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" />',
  mountain: '<path d="M3 20l6-11 4 6 2-3 6 8z" /><path d="M9 9l2 3" />',
  pine: '<path d="M12 4l5 7h-3l3 5H7l3-5H7z" /><path d="M12 16v4" />',
  tent: '<path d="M12 5L3 20h18z" /><path d="M12 5v15" /><path d="M9 20l3-5 3 5" />',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" />',
  signpost: '<path d="M12 3v18" /><path d="M5 6h11l2 2-2 2H5z" /><path d="M7 14h12" />',
  binoculars: '<circle cx="7" cy="15" r="3" /><circle cx="17" cy="15" r="3" /><path d="M7 12l1-6h2l1 6M17 12l-1-6h-2l-1 6" />',
  flame: '<path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-4.5C9 9 10 6 12 3z" />',
  backpack: '<path d="M7 8a5 5 0 0 1 10 0v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M10 8V6a2 2 0 0 1 4 0v2" /><path d="M9 13h6" />',
  feather: '<path d="M20 4C11 4 4 11 4 20" /><path d="M20 4c0 8-5 12-12 13" /><path d="M8 17l-4 3" />',
  shield: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" />',
  moon: '<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" />',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />',
  crown: '<path d="M4 8l3 4 5-6 5 6 3-4v9H4z" /><path d="M4 20h16" />',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" /><path d="M12 12v4M9 20h6M10 20l.5-4h3l.5 4" />',
  star: '<path d="M12 3l2.6 5.6L20 9.3l-4 4 1 6-5-3-5 3 1-6-4-4 5.4-.7z" />'
};

// Bounding box of Ukraine — the map won't let the user pan/zoom too far outside
// it. Kept just off the real border extent (lat 44.18..52.38, lng 22.14..40.23,
// see data/ukraineBorder.ts) so the country never sits flush against the
// viewport edge, but no further: past this there is nothing to see anyway, only
// the masked-out void.
const UA_BOUNDS: L.LatLngBoundsExpression = [
  [43.7, 21.4],
  [52.9, 41.0],
];
const UA_CENTER: [number, number] = [48.9, 31.4];

function difficultyColor(place: Place): string {
  const d = place.difficulty ?? 1;
  return DIFFICULTY_META[d]?.color ?? CATEGORY_META[place.category].color;
}

// Small colored dot marker — avoids bundling/loading Leaflet's default PNG icon assets.
function dotIcon(color: string, active: boolean) {
  const size = active ? 26 : 18;
  const ring = active ? `box-shadow:0 0 0 4px ${color}33;` : '';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #F4F1E8;${ring}"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Live-GPS marker: pulsing dot for the current user, avatar-thumbnail dot for
// friends. `dimmed` greys out friends not seen for a while.
export interface LiveMarker {
  id: string | number;
  lat: number;
  lng: number;
  color: string;
  label: string;
  avatar?: string;
  pulse?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

// Avatar URLs and display names come from other users — escape/validate them
// before they reach divIcon HTML or tooltips (both are parsed as HTML).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeAvatarUrl(url: string): string {
  return /^(\/|https?:\/\/|data:image\/)/.test(url) ? url : '/assets/avatar_default.svg';
}

function liveIcon(m: LiveMarker) {
  const size = 34;
  const ring = m.pulse
    ? `<div style="position:absolute;inset:-7px;border-radius:50%;background:${m.color}55;animation:atLivePulse 2s ease-out infinite;"></div>`
    : '';
  
  let inner = '';
  const avatarOpt = m.avatar ? AVATARS.find((a) => a.id === m.avatar) : undefined;
  
  if (avatarOpt) {
    const pathsHtml = ICON_PATHS[avatarOpt.icon] || '';
    const stroke = "rgba(244,241,232,0.95)";
    const strokeWidth = 1.7;
    const svgSize = size * 0.46;
    inner = `<div style="width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${avatarOpt.gradient};">
      <svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
        ${pathsHtml}
      </svg>
    </div>`;
  } else if (m.avatar) {
    inner = `<img src="${escapeHtml(safeAvatarUrl(m.avatar))}" onerror="this.src='/assets/avatar_default.svg';this.onerror=null;" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;"/>`;
  } else {
    inner = `<div style="width:100%;height:100%;border-radius:50%;background:${m.color};"></div>`;
  }
  
  const grey = m.dimmed ? 'filter:grayscale(1);opacity:0.55;' : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:${size}px;height:${size}px;${grey}">${ring}<div style="position:relative;width:100%;height:100%;border-radius:50%;border:3px solid ${m.color};box-shadow:0 3px 10px rgba(0,0,0,0.45);overflow:hidden;background:#0B2B20;">${inner}</div></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #F4F1E8;box-shadow:0 4px 10px rgba(0,0,0,0.4);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });
}

function clusterIcon(color: string, count: number, active: boolean) {
  const size = active ? 36 : 28;
  const ring = active ? `box-shadow:0 0 0 5px ${color}33;` : '';
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #F4F1E8;display:flex;align-items:center;justify-content:center;color:#071F16;font-size:11px;font-weight:800;${ring}"><span style="text-shadow: 0 1px 0px rgba(255,255,255,0.4);">${count}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface LeafletMapProps {
  // Display mode: a set of places with markers.
  places?: Place[];
  activeId?: string | number | null;
  hoverId?: string | number | null;
  onSelect?: (id: string | number) => void;
  onHover?: (id: string | number | null) => void;

  // Pick mode: click anywhere to drop/move a single draggable pin.
  pickable?: boolean;
  pin?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  accent?: string;

  // Live layer: current user + friends, rendered above the place markers.
  liveMarkers?: LiveMarker[];

  // Territory-exploration layer: H3 cell ids to paint as hexes, and the single
  // cell that was just unlocked (gets the one-shot reveal glow).
  exploredCells?: string[];
  revealedCell?: string | null;

  // Fog of war: darken everything the user has never travelled to, clearing it
  // from `exploredCells` outwards. Off for guests, who have nothing to reveal
  // and would just see a black rectangle.
  fog?: boolean;

  height?: string;
}

interface Cluster {
  isCluster: true;
  id: string;
  difficulty: number;
  places: Place[];
  centerLat: number;
  centerLng: number;
}

function getClusters(places: Place[], map: L.Map, clusterRadiusPixels = 40): (Place | Cluster)[] {
  const result: (Place | Cluster)[] = [];
  
  // Group places by difficulty
  const byDifficulty: Record<number, Place[]> = { 1: [], 2: [], 3: [], 4: [] };
  places.forEach((p) => {
    const diff = p.difficulty ?? 1;
    if (!byDifficulty[diff]) byDifficulty[diff] = [];
    byDifficulty[diff].push(p);
  });

  for (const diffStr of Object.keys(byDifficulty)) {
    const diff = Number(diffStr);
    const diffPlaces = byDifficulty[diff];
    const clusters: Cluster[] = [];

    diffPlaces.forEach((place) => {
      let matchedCluster: Cluster | null = null;
      const placePoint = map.latLngToLayerPoint([place.lat, place.lng]);

      for (const cluster of clusters) {
        const clusterPoint = map.latLngToLayerPoint([cluster.centerLat, cluster.centerLng]);
        if (placePoint.distanceTo(clusterPoint) < clusterRadiusPixels) {
          matchedCluster = cluster;
          break;
        }
      }

      if (matchedCluster) {
        matchedCluster.places.push(place);
        const len = matchedCluster.places.length;
        matchedCluster.centerLat = (matchedCluster.centerLat * (len - 1) + place.lat) / len;
        matchedCluster.centerLng = (matchedCluster.centerLng * (len - 1) + place.lng) / len;
      } else {
        clusters.push({
          isCluster: true,
          id: `cluster-${diff}-${place.id}`,
          difficulty: diff,
          places: [place],
          centerLat: place.lat,
          centerLng: place.lng,
        });
      }
    });

    clusters.forEach((c) => {
      if (c.places.length === 1) {
        result.push(c.places[0]);
      } else {
        result.push(c);
      }
    });
  }

  return result;
}

// Where a marker should actually be drawn. Because clustering is done per
// difficulty, markers of *different* difficulties can still land on the exact
// same coordinates and overlap. This fans any such colliding group out onto a
// small ring around their shared centre so every level stays visible.
interface Rendered {
  item: Place | Cluster;
  lat: number;
  lng: number;
}

function itemLatLng(item: Place | Cluster): [number, number] {
  return 'isCluster' in item ? [item.centerLat, item.centerLng] : [item.lat, item.lng];
}

function spreadOverlaps(items: (Place | Cluster)[], map: L.Map, thresholdPixels = 28): Rendered[] {
  const pts = items.map((item) => {
    const [lat, lng] = itemLatLng(item);
    return { item, lat, lng, pt: map.latLngToLayerPoint([lat, lng]) };
  });

  const used = new Array(pts.length).fill(false);
  const out: Rendered[] = [];

  for (let i = 0; i < pts.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const group = [i];
    for (let j = i + 1; j < pts.length; j++) {
      if (!used[j] && pts[i].pt.distanceTo(pts[j].pt) < thresholdPixels) {
        used[j] = true;
        group.push(j);
      }
    }

    if (group.length === 1) {
      out.push({ item: pts[i].item, lat: pts[i].lat, lng: pts[i].lng });
      continue;
    }

    // Fan the colliding markers evenly around their pixel centroid.
    const cx = group.reduce((s, k) => s + pts[k].pt.x, 0) / group.length;
    const cy = group.reduce((s, k) => s + pts[k].pt.y, 0) / group.length;
    const radius = 16 + group.length * 3;
    group.forEach((k, idx) => {
      const angle = (2 * Math.PI * idx) / group.length - Math.PI / 2;
      const ll = map.layerPointToLatLng(L.point(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)));
      out.push({ item: pts[k].item, lat: ll.lat, lng: ll.lng });
    });
  }

  return out;
}

function LeafletMap({
  places,
  activeId,
  hoverId,
  onSelect,
  onHover,
  pickable,
  pin,
  onPick,
  accent = '#3FA66B',
  liveMarkers,
  exploredCells,
  revealedCell,
  fog = false,
  height = '460px',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string | number, L.Marker>>(new Map());
  const liveMarkersRef = useRef<Map<string | number, L.Marker>>(new Map());
  const hexLayersRef = useRef<Map<string, L.Polygon>>(new Map());
  const fogLayersRef = useRef<L.Polygon[]>([]);
  const fogRendererRef = useRef<L.SVG | null>(null);
  const maskRendererRef = useRef<L.SVG | null>(null);
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const [zoom, setZoom] = useState<number>(6);
  // Bumped on every pan/zoom so the fog effect re-runs and re-culls its fine
  // holes against the new viewport.
  const [viewKey, setViewKey] = useState(0);

  // Keep the latest callbacks/values in refs so the map-init effect (which only
  // runs once) can reach fresh state without re-creating the map instance.
  const stateRef = useRef({ places, activeId, hoverId, onSelect, onHover, pickable, onPick, accent });
  stateRef.current = { places, activeId, hoverId, onSelect, onHover, pickable, onPick, accent };

  // --- initialize the map once ---------------------------------------------
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: UA_CENTER,
      zoom: 6,
      minZoom: 5,
      maxZoom: 18,
      maxBounds: UA_BOUNDS,
      maxBoundsViscosity: 0.6,
      // Better touch UX on phones: single-finger pan, pinch to zoom.
      touchZoom: true,
      dragging: true,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      // Don't even fetch what the border mask is going to paint over. Past the
      // country's bbox there is nothing the user may see, so a tile there is
      // pure waste — and, until the mask covers it, a flash of the wrong country.
      bounds: UA_BOUNDS,
    }).addTo(map);

    // Dedicated panes so the fog and the border mask always land between the
    // tiles and everything we draw on top of them (hexes, place markers, live
    // dots). Both must let clicks through to the map/markers underneath.
    for (const [name, z] of [
      [FOG_PANE, FOG_PANE_Z],
      [MASK_PANE, MASK_PANE_Z],
    ] as const) {
      map.createPane(name);
      const pane = map.getPane(name);
      if (pane) {
        pane.style.zIndex = String(z);
        pane.style.pointerEvents = 'none';
      }
    }

    // Leaflet only draws vectors across the viewport plus `padding` (default a
    // mere 10%). The map is born inside a grid cell and resized by the
    // invalidateSize below, and every resize or fast pan briefly exposes a strip
    // the renderer has not covered — at the edges of this map, that strip is a
    // neighbouring country showing through the mask. Rendering a viewport's
    // worth of slack in every direction means the exposed strip never exists.
    fogRendererRef.current = L.svg({ pane: FOG_PANE, padding: FOG_RENDER_PADDING });
    maskRendererRef.current = L.svg({ pane: MASK_PANE, padding: FOG_RENDER_PADDING });

    map.on('zoomend', () => {
      setZoom(map.getZoom());
    });

    // Fine fog holes are culled to the viewport, so the fog has to be rebuilt
    // whenever the viewport moves.
    map.on('moveend', () => setViewKey((k) => k + 1));

    // "Locate me" control — handy on a phone while out exploring.
    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const el = L.DomUtil.create('button', 'leaflet-bar');
        el.title = 'Моя геолокація';
        el.style.width = '34px';
        el.style.height = '34px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.background = '#fff';
        el.style.cursor = 'pointer';
        el.innerHTML =
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B2B20" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2" fill="#0B2B20"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
        L.DomEvent.disableClickPropagation(el);
        el.addEventListener('click', () => {
          if (!('geolocation' in navigator)) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;
              map.flyTo([latitude, longitude], 13, { duration: 0.8 });
              if (stateRef.current.pickable && stateRef.current.onPick) {
                stateRef.current.onPick(Number(latitude.toFixed(5)), Number(longitude.toFixed(5)));
              }
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 },
          );
        });
        return el;
      },
    });
    map.addControl(new LocateControl());

    map.on('click', (e: L.LeafletMouseEvent) => {
      const { pickable: p, onPick: cb } = stateRef.current;
      if (p && cb) {
        cb(Number(e.latlng.lat.toFixed(5)), Number(e.latlng.lng.toFixed(5)));
      }
    });

    mapRef.current = map;

    // Fix sizing glitches when the map first renders inside a flex/grid layout.
    setTimeout(() => map.invalidateSize(), 60);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- sync place markers -----------------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = markersRef.current;
    const clusteredItems = getClusters(places ?? [], map, 50);
    // Fan out markers that would otherwise overlap (e.g. different difficulties
    // at the same coordinates) so every level stays visible.
    const rendered = spreadOverlaps(clusteredItems, map, 28);
    const nextIds = new Set(rendered.map(({ item }) => ('isCluster' in item ? item.id : item.id)));

    // Remove markers for places no longer present.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    rendered.forEach(({ item, lat, lng }) => {
      if ('isCluster' in item) {
        const isHovered = item.places.some((p) => p.id === hoverId);
        const isActive = item.places.some((p) => p.id === activeId);
        const activeState = isActive || isHovered;

        const color = DIFFICULTY_META[item.difficulty]?.color ?? '#3FA66B';
        const diffLabel = DIFFICULTY_META[item.difficulty]?.label ?? '';

        let marker = existing.get(item.id);
        if (!marker) {
          marker = L.marker([lat, lng], { icon: clusterIcon(color, item.places.length, activeState) });
          marker.on('click', () => {
            map.flyTo([item.centerLat, item.centerLng], map.getZoom() + 2, { duration: 0.5 });
            if (item.places.length > 0) {
              stateRef.current.onSelect?.(item.places[0].id);
            }
          });
          marker.addTo(map);
          existing.set(item.id, marker);
        } else {
          marker.setIcon(clusterIcon(color, item.places.length, activeState));
          marker.setLatLng([lat, lng]);
        }

        const maxToShow = 4;
        const placeNames = item.places.slice(0, maxToShow).map((p) => escapeHtml(p.name)).join(', ');
        const suffix = item.places.length > maxToShow ? ` та ще ${item.places.length - maxToShow}...` : '';
        marker.bindTooltip(`<strong>Складність: ${diffLabel} (${item.places.length} місць)</strong><br/><span style="font-size:11px;opacity:0.85">${placeNames}${suffix}</span>`, {
          direction: 'top',
          offset: [0, -14],
        });
      } else {
        const place = item;
        const isActive = place.id === activeId || place.id === hoverId;
        const color = difficultyColor(place);
        let marker = existing.get(place.id);
        if (!marker) {
          marker = L.marker([lat, lng], { icon: dotIcon(color, isActive) });
          marker.on('click', () => stateRef.current.onSelect?.(place.id));
          marker.on('mouseover', () => stateRef.current.onHover?.(place.id));
          marker.on('mouseout', () => stateRef.current.onHover?.(null));
          const diffLabel = DIFFICULTY_META[place.difficulty ?? 1]?.label ?? '';
          marker.bindTooltip(`${escapeHtml(place.name)}${diffLabel ? ` · ${diffLabel}` : ''}`, {
            direction: 'top',
            offset: [0, -8],
          });
          marker.addTo(map);
          existing.set(place.id, marker);
        } else {
          marker.setIcon(dotIcon(color, isActive));
          marker.setLatLng([lat, lng]);
        }
      }
    });
  }, [places, activeId, hoverId, zoom]);

  // --- paint out everything outside Ukraine -----------------------------------
  // The border never changes, so this is added once and left alone. Declared
  // after the init effect above, which is what guarantees mapRef is populated
  // by the time it runs.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mask = L.polygon([WORLD_RING, UA_BORDER], {
      pane: MASK_PANE,
      renderer: maskRendererRef.current ?? undefined,
      // evenodd (Leaflet's default) makes the border ring a hole in the world
      // ring, so the fill lands on everything *except* Ukraine.
      fillColor: OUTSIDE_FILL,
      fillOpacity: 1,
      color: BORDER_STROKE,
      weight: 1,
      interactive: false,
    });
    mask.addTo(map);

    return () => {
      mask.remove();
    };
  }, []);

  // --- sync explored-territory hexes ------------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = hexLayersRef.current;
    const cells = exploredCells ?? [];
    const nextIds = new Set(cells);

    // Drop hexes no longer present (e.g. after logout/user switch).
    for (const [id, layer] of existing) {
      if (!nextIds.has(id)) {
        layer.remove();
        existing.delete(id);
      }
    }

    cells.forEach((cellId) => {
      if (existing.has(cellId)) return;
      // A freshly-unlocked cell is created with the reveal class so its glow
      // animation plays exactly once, then settles into the resting hex style.
      const isReveal = cellId === revealedCell;
      let polygon: L.Polygon;
      try {
        polygon = L.polygon(cellPolygon(cellId), {
          className: isReveal ? 'at-hex at-hex-reveal' : 'at-hex',
          color: HEX_STROKE,
          weight: 1,
          fillColor: HEX_FILL,
          fillOpacity: 0.16,
          opacity: 0.5,
          interactive: false,
        });
      } catch {
        return; // ignore an invalid cell id rather than break the layer
      }
      polygon.addTo(map);
      existing.set(cellId, polygon);
    });
  }, [exploredCells, revealedCell]);

  // --- sync the fog of war ----------------------------------------------------
  // Two stacked layers give three tiers of knowledge:
  //   deep haze  — never travelled here          (world ring, regions punched out)
  //   light haze — been in the region, not here  (region ring, walked cells punched out)
  //   clear      — walked it                     (a hole in both layers)
  // Both are rebuilt wholesale rather than diffed: the rings change on every pan
  // and a rebuild is two polygons, while diffing them would be real bookkeeping.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    fogLayersRef.current.forEach((layer) => layer.remove());
    fogLayersRef.current = [];
    if (!fog) return;

    // Group the walked cells by region once, instead of re-scanning the whole
    // list for every region below.
    const byRegion = new Map<string, string[]>();
    for (const cellId of exploredCells ?? []) {
      const region = regionOf(cellId);
      if (!region) continue; // ignore a malformed id rather than break the fog
      const bucket = byRegion.get(region);
      if (bucket) bucket.push(cellId);
      else byRegion.set(region, [cellId]);
    }

    const regionRings = new Map<string, [number, number][]>();
    for (const region of byRegion.keys()) {
      try {
        regionRings.set(region, cellPolygon(region));
      } catch {
        byRegion.delete(region);
      }
    }

    // Deep fog: the whole world, with every visited region cut out of it.
    // With no regions yet this is a solid sheet — a brand-new user starts with
    // the map entirely dark, which is the point.
    const deep = L.polygon([WORLD_RING, ...regionRings.values()], {
      pane: FOG_PANE,
      renderer: fogRendererRef.current ?? undefined,
      className: 'at-fog',
      stroke: false,
      fillColor: FOG_COLOR,
      fillOpacity: FOG_DEEP_OPACITY,
      interactive: false,
    });
    deep.addTo(map);
    fogLayersRef.current.push(deep);

    if (regionRings.size === 0) return;

    // Light haze over each visited region, with the individual walked cells cut
    // out of it. The fine holes are only worth punching once they're big enough
    // to see, and only for the part of the world currently on screen.
    const fine = map.getZoom() >= FOG_FINE_ZOOM;
    // Cull to what the renderer actually draws, not to the visible viewport:
    // culling tighter than the padding would leave un-punched haze sitting in
    // the drawn-but-not-yet-visible slack, which then slides into view on a pan.
    const view = map.getBounds().pad(FOG_RENDER_PADDING);

    const hazeShapes: [number, number][][][] = [];
    for (const [region, ring] of regionRings) {
      const rings: [number, number][][] = [ring];
      if (fine) {
        for (const cellId of byRegion.get(region) ?? []) {
          try {
            if (!view.contains(cellCenter(cellId))) continue;
            rings.push(cellPolygon(cellId));
          } catch {
            // skip an unparseable cell, keep the rest of the region's haze
          }
        }
      }
      hazeShapes.push(rings);
    }

    const haze = L.polygon(hazeShapes, {
      pane: FOG_PANE,
      renderer: fogRendererRef.current ?? undefined,
      className: 'at-fog',
      color: FOG_REGION_STROKE,
      weight: 1,
      fillColor: FOG_COLOR,
      fillOpacity: FOG_HAZE_OPACITY,
      interactive: false,
    });
    haze.addTo(map);
    fogLayersRef.current.push(haze);
  }, [fog, exploredCells, zoom, viewKey]);

  // --- sync live GPS markers (self + friends) ----------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existing = liveMarkersRef.current;
    const next = liveMarkers ?? [];
    const nextIds = new Set(next.map((m) => m.id));

    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    next.forEach((m) => {
      let marker = existing.get(m.id);
      if (!marker) {
        marker = L.marker([m.lat, m.lng], { icon: liveIcon(m), zIndexOffset: 1000 });
        marker.addTo(map);
        existing.set(m.id, marker);
      } else {
        marker.setIcon(liveIcon(m));
        marker.setLatLng([m.lat, m.lng]);
      }
      marker.off('click');
      if (m.onClick) marker.on('click', m.onClick);
      marker.unbindTooltip();
      // Leaflet renders tooltip strings as HTML — escape the user-derived label.
      marker.bindTooltip(escapeHtml(m.label), { direction: 'top', offset: [0, -18] });
    });
  }, [liveMarkers]);

  // --- sync the single draggable pick pin -------------------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pin) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      return;
    }

    if (!pinMarkerRef.current) {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: pinIcon(accent),
        draggable: !!onPick,
      });
      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        stateRef.current.onPick?.(Number(ll.lat.toFixed(5)), Number(ll.lng.toFixed(5)));
      });
      marker.addTo(map);
      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLatLng([pin.lat, pin.lng]);
    }
  }, [pin, accent, onPick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height,
        borderRadius: '18px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        // Leaflet's container is white by default, so before the first tiles
        // arrive the map flashes white. Starting from the outside-the-border
        // colour means the load reads as the void filling in, not as a blank
        // page — and matches what the mask paints a moment later.
        background: OUTSIDE_FILL,
        cursor: pickable ? 'crosshair' : undefined,
      }}
    />
  );
}

export default LeafletMap;
