import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_META, DIFFICULTY_META, type Place } from './data/places';
import { AVATARS } from './data/profileOptions';

const ICON_PATHS: Record<string, string> = {
  compass: '<circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" />',
  mountain: '<path d="M3 20l6-11 4 6 2-3 6 8z" /><path d="M9 9l2 3" />',
  pine: '<path d="M12 4l5 7h-3l3 5H7l3-5H7z" /><path d="M12 16v4" />',
  tent: '<path d="M12 5L3 20h18z" /><path d="M12 5v15" /><path d="M9 20l3-5 3 5" />',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" />',
  signpost: '<path d="M12 3v18" /><path d="M5 6h11l2 2-2 2H5z" /><path d="M7 14h12" />',
  binoculars: '<circle cx="7" cy="15" r="3" /><circle cx="17" cy="15" r="3" /><path d="M7 12l1-6h2l1 6M17 12l-1-6h-2l-1 6" %>',
  flame: '<path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-4.5C9 9 10 6 12 3z" %>',
  backpack: '<path d="M7 8a5 5 0 0 1 10 0v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M10 8V6a2 2 0 0 1 4 0v2" /><path d="M9 13h6" %>',
  feather: '<path d="M20 4C11 4 4 11 4 20" /><path d="M20 4c0 8-5 12-12 13" /><path d="M8 17l-4 3" %>',
  shield: '<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" %>',
  moon: '<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" %>',
  sun: '<circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" %>',
  crown: '<path d="M4 8l3 4 5-6 5 6 3-4v9H4z" /><path d="M4 20h16" %>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" /><path d="M12 12v4M9 20h6M10 20l.5-4h3l.5 4" %>',
  star: '<path d="M12 3l2.6 5.6L20 9.3l-4 4 1 6-5-3-5 3 1-6-4-4 5.4-.7z" />'
};

// Bounding box of Ukraine — the map won't let the user pan/zoom too far outside it.
const UA_BOUNDS: L.LatLngBoundsExpression = [
  [43.0, 20.0],
  [53.6, 41.5],
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
  height = '460px',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string | number, L.Marker>>(new Map());
  const liveMarkersRef = useRef<Map<string | number, L.Marker>>(new Map());
  const pinMarkerRef = useRef<L.Marker | null>(null);
  const [zoom, setZoom] = useState<number>(6);

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
    }).addTo(map);

    map.on('zoomend', () => {
      setZoom(map.getZoom());
    });

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
    const nextIds = new Set(clusteredItems.map((item) => ('isCluster' in item ? item.id : item.id)));

    // Remove markers for places no longer present.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    clusteredItems.forEach((item) => {
      if ('isCluster' in item) {
        const isHovered = item.places.some((p) => p.id === hoverId);
        const isActive = item.places.some((p) => p.id === activeId);
        const activeState = isActive || isHovered;
        
        const color = DIFFICULTY_META[item.difficulty]?.color ?? '#3FA66B';
        const diffLabel = DIFFICULTY_META[item.difficulty]?.label ?? '';
        
        let marker = existing.get(item.id);
        if (!marker) {
          marker = L.marker([item.centerLat, item.centerLng], { icon: clusterIcon(color, item.places.length, activeState) });
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
          marker.setLatLng([item.centerLat, item.centerLng]);
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
          marker = L.marker([place.lat, place.lng], { icon: dotIcon(color, isActive) });
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
          marker.setLatLng([place.lat, place.lng]);
        }
      }
    });
  }, [places, activeId, hoverId, zoom]);

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
        cursor: pickable ? 'crosshair' : undefined,
      }}
    />
  );
}

export default LeafletMap;
