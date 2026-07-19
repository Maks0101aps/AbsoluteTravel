// Explore-map places. Live data now comes from the backend (`GET /api/places`);
// this file provides the category metadata plus an offline fallback dataset so
// the map still renders if the API is unreachable.
//
// Positions are stored as real WGS84 coordinates (lat/lng) and projected onto
// the stylised silhouette at render time (see data/geo.ts).

import { GENERATED_PLACES } from './generatedPlaces';

export type PlaceCategory = 'nature' | 'mountains' | 'history' | 'city' | 'coast';

export interface Place {
  id: string | number;
  name: string;
  region: string;
  category: PlaceCategory;
  // Geolocation (mandatory for every place).
  lat: number;
  lng: number;
  // Short pitch: what it is and what to do there.
  description: string;
  // Best time to visit.
  bestSeason: string;
  // Image URLs (data URLs for user/admin submissions). May be empty for the
  // curated starter set, which is text-only.
  photos?: string[];
  // Exploration difficulty, 1 (easy) – 4 (extreme). Drives the XP reward.
  difficulty?: number;
  source?: string;
  submittedBy?: string | null;
}

export const DIFFICULTY_META: Record<number, { label: string; color: string; xp: number }> = {
  1: { label: 'Легко', color: '#3FA66B', xp: 20 },
  2: { label: 'Середньо', color: '#D9B44A', xp: 50 },
  3: { label: 'Складно', color: '#E4A672', xp: 100 },
  4: { label: 'Екстремально', color: '#E05A5A', xp: 250 },
};

export const DIFFICULTY_ORDER = [1, 2, 3, 4];

// Display metadata per category: Ukrainian label + accent colour for the marker.
export const CATEGORY_META: Record<PlaceCategory, { label: string; color: string }> = {
  nature: { label: 'Природа', color: '#3FA66B' },
  mountains: { label: 'Гори', color: '#7FC4A0' },
  history: { label: 'Історія', color: '#D9B44A' },
  city: { label: 'Місто', color: '#E4A672' },
  coast: { label: 'Узбережжя', color: '#5AB6C9' },
};

export const CATEGORY_ORDER: PlaceCategory[] = ['nature', 'mountains', 'history', 'city', 'coast'];

export const PLACES: Place[] = GENERATED_PLACES;
