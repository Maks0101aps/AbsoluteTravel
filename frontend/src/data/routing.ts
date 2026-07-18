// Road-following route geometry via OSRM's public HTTP API.
export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteResult {
  points: [number, number][]; // [lat, lng], full road geometry
  distanceKm: number;
  durationMin: number;
}

export type TravelProfile = 'driving' | 'walking';

// OSRM's public demo instance — free, no API key, but meant for light/
// evaluation traffic rather than guaranteed uptime or heavy production load.
// Swap this for a self-hosted or paid routing provider if usage grows; every
// other call site only depends on the RouteResult shape above, not on OSRM
// itself, so that swap stays contained to this file.
const OSRM_BASE = 'https://router.project-osrm.org/route/v1';

/** Fetch a real road-following route through `points`, in order. */
export async function fetchRoute(points: RoutePoint[], profile: TravelProfile): Promise<RouteResult> {
  if (points.length < 2) {
    throw new Error('Потрібно щонайменше дві точки для маршруту');
  }

  const coords = points.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_BASE}/${profile}/${coords}?overview=full&geometries=geojson`;

  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Не вдалося з’єднатися із сервісом маршрутів');
  }
  if (!res.ok) {
    throw new Error('Не вдалося побудувати маршрут');
  }

  const data = await res.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('Маршрут між цими точками не знайдено');
  }

  const route = data.routes[0];
  const routePoints: [number, number][] = route.geometry.coordinates.map(
    ([lng, lat]: [number, number]) => [lat, lng],
  );

  return {
    points: routePoints,
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
  };
}

/** "42 хв" under an hour, "1 год 20 хв" at/above it. */
export function formatDuration(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total} хв`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h} год ${m} хв` : `${h} год`;
}
