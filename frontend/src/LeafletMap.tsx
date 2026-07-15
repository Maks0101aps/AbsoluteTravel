import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CATEGORY_META, DIFFICULTY_META, type Place } from './data/places';

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

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #F4F1E8;box-shadow:0 4px 10px rgba(0,0,0,0.4);"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
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

  height?: string;
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
  height = '460px',
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string | number, L.Marker>>(new Map());
  const pinMarkerRef = useRef<L.Marker | null>(null);

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
    const nextIds = new Set((places ?? []).map((p) => p.id));

    // Remove markers for places no longer present.
    for (const [id, marker] of existing) {
      if (!nextIds.has(id)) {
        marker.remove();
        existing.delete(id);
      }
    }

    (places ?? []).forEach((place) => {
      const isActive = place.id === activeId || place.id === hoverId;
      const color = difficultyColor(place);
      let marker = existing.get(place.id);
      if (!marker) {
        marker = L.marker([place.lat, place.lng], { icon: dotIcon(color, isActive) });
        marker.on('click', () => stateRef.current.onSelect?.(place.id));
        marker.on('mouseover', () => stateRef.current.onHover?.(place.id));
        marker.on('mouseout', () => stateRef.current.onHover?.(null));
        const diffLabel = DIFFICULTY_META[place.difficulty ?? 1]?.label ?? '';
        marker.bindTooltip(`${place.name}${diffLabel ? ` · ${diffLabel}` : ''}`, {
          direction: 'top',
          offset: [0, -8],
        });
        marker.addTo(map);
        existing.set(place.id, marker);
      } else {
        marker.setIcon(dotIcon(color, isActive));
        marker.setLatLng([place.lat, place.lng]);
      }
    });
  }, [places, activeId, hoverId]);

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
