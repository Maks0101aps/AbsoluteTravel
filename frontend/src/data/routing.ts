// Road-following route geometry via OSRM's public HTTP API.
import i18n from '../i18n';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: [number, number][]; // [lat, lng], full road geometry
  distanceKm: number;
  durationMin: number;
  profile: TravelProfile;
  // A driving route is snapped to the nearest road OSRM knows — for
  // destinations inside pedestrian zones (e.g. Sofiyivska Square) that's
  // short of the actual pin, and without this the line on the map just
  // stops on a street with a visible gap to the marker. When present, this
  // is the last-mile walk from where the car route ends to the real
  // destination, meant to be drawn dashed on top of the solid driving line.
  footSegment?: { points: [number, number][]; distanceKm: number; durationMin: number };
}

export type TravelProfile = 'driving' | 'walking';

// router.project-osrm.org (OSRM's own public demo) only ever serves the car
// graph, regardless of which profile segment is requested in the URL — so
// asking it for "walking" silently returns the same car route as "driving".
// OpenStreetMap Germany hosts separate, real car/foot/bike graphs as three
// distinct public instances instead; free, no API key, same request/response
// shape as OSRM itself (it *is* OSRM, just three separately-built profiles).
// Swap this for a self-hosted or paid routing provider if usage grows; every
// other call site only depends on the RouteResult shape above, not on this
// host, so that swap stays contained to this file.
const OSRM_HOSTS: Record<TravelProfile, { base: string; profile: string }> = {
  driving: { base: 'https://routing.openstreetmap.de/routed-car/route/v1', profile: 'driving' },
  walking: { base: 'https://routing.openstreetmap.de/routed-foot/route/v1', profile: 'foot' },
};

/** Fetch a real road-following route through `points`, in order. */
export async function fetchRoute(points: RoutePoint[], profile: TravelProfile): Promise<RouteResult> {
  if (points.length < 2) {
    throw new Error(i18n.t('explore.routing.needTwoPoints'));
  }

  const { base, profile: osrmProfile } = OSRM_HOSTS[profile];
  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${base}/${osrmProfile}/${coords}?overview=full&geometries=geojson`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(i18n.t('explore.routing.connectFailed'));
  }
  if (!res.ok) {
    throw new Error(i18n.t('explore.routing.buildFailed'));
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(i18n.t('explore.routing.noRoute'));
  }

  const route = data.routes[0];
  const routePoints: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng],
  );

  return {
    points: routePoints,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    profile,
  };
}

function haversineMeters(a: RoutePoint, b: RoutePoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Like `fetchRoute`, but for driving routes it also detects when OSRM had to
 * snap the destination to the nearest road (pedestrian zones, squares, hill-
 * top viewpoints — anywhere a car can't actually reach) and fetches a real
 * walking leg to bridge that last stretch, attached as `footSegment` so the
 * caller can draw it dashed instead of leaving the route looking like it
 * just stops short of the pin.
 */
export async function fetchNavigatorRoute(points: RoutePoint[], profile: TravelProfile): Promise<RouteResult> {
  const result = await fetchRoute(points, profile);
  if (profile !== 'driving') return result;

  const routeEnd = result.points[result.points.length - 1];
  const target = points[points.length - 1];
  const gapMeters = haversineMeters({ lat: routeEnd[0], lng: routeEnd[1] }, target);

  if (gapMeters < 30) return result;

  try {
    const foot = await fetchRoute([{ lat: routeEnd[0], lng: routeEnd[1] }, target], 'walking');
    return { ...result, footSegment: { points: foot.points, distanceKm: foot.distanceKm, durationMin: foot.durationMin } };
  } catch {
    // Foot server unreachable/no path — still show the driving route as-is
    // rather than failing the whole request over a cosmetic last-mile line.
    return result;
  }
}

/** "42 хв" under an hour, "1 год 20 хв" at/above it. */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return i18n.t('explore.duration.minutes', { count: total });
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0
    ? i18n.t('explore.duration.hoursMinutes', { hours: h, mins: m })
    : i18n.t('explore.duration.hoursOnly', { count: h });
}
