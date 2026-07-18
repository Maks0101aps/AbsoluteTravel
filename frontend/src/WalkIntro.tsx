import { useEffect, useMemo, useRef, useState } from 'react';
import { getPlaces, type AuthUser } from './api';
import {
  PLACES,
  CATEGORY_META,
  CATEGORY_ORDER,
  DIFFICULTY_META,
  type Place,
  type PlaceCategory,
} from './data/places';
import { Icon, type IconName } from './icons';

const CREAM = '#F4F1E8';
const BG = '#071F16';

const CATEGORY_ICON: Record<PlaceCategory, IconName> = {
  nature: 'leaf',
  mountains: 'mountain',
  history: 'shield',
  city: 'signpost',
  coast: 'compass',
};

// A soft gradient per category — the fallback backdrop when a place has no photo.
const CATEGORY_GRADIENT: Record<PlaceCategory, string> = {
  nature: 'linear-gradient(135deg, #123b28 0%, #2f7d52 100%)',
  mountains: 'linear-gradient(135deg, #16303a 0%, #4a7f8c 100%)',
  history: 'linear-gradient(135deg, #3a2f14 0%, #9c7a2c 100%)',
  city: 'linear-gradient(135deg, #3a2416 0%, #b3703f 100%)',
  coast: 'linear-gradient(135deg, #123a44 0%, #3f9fb3 100%)',
};

// --- selection logic -------------------------------------------------------

// Fold away apostrophe variants / case so "Кам’янець" matches "Камянець".
function norm(s: string): string {
  return s.toLowerCase().replace(/['’ʼ`]/g, '').replace(/\s+/g, ' ').trim();
}

// The oblast adjective ("Львівська", "Івано-Франківська") used to match a place's
// region string, which may bundle two oblasts ("Тернопільська / Чернівецька…").
function regionKey(region: string | null): string {
  if (!region) return '';
  const first = region.split(/[\s/]+/)[0];
  if (first === 'м.' || norm(first) === 'автономна') return norm(region);
  return norm(first);
}

// Nicer walks bubble to the top: easy first, then a small nudge toward the kinds
// of places you actually stroll through, then those that have a photo.
function walkScore(p: Place): number {
  const diff = p.difficulty ?? 1;
  const catBonus = CATEGORY_ORDER.indexOf(p.category); // city=0 … coast=4-ish
  const photoBonus = p.photos && p.photos.length ? -0.5 : 0;
  return diff + catBonus * 0.15 + photoBonus;
}

// Great-circle distance in km between two lat/lng points.
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Administrative-centre coordinates per region — the anchor we measure "nearest"
// from when the user's own area doesn't have enough places on its own.
const REGION_CENTER: Record<string, { lat: number; lng: number }> = {
  'Вінницька область': { lat: 49.233, lng: 28.468 },
  'Волинська область': { lat: 50.747, lng: 25.325 },
  'Дніпропетровська область': { lat: 48.465, lng: 35.046 },
  'Донецька область': { lat: 48.023, lng: 37.802 },
  'Житомирська область': { lat: 50.254, lng: 28.658 },
  'Закарпатська область': { lat: 48.62, lng: 22.288 },
  'Запорізька область': { lat: 47.838, lng: 35.139 },
  'Івано-Франківська область': { lat: 48.922, lng: 24.711 },
  'Київська область': { lat: 50.2, lng: 30.2 },
  'Кіровоградська область': { lat: 48.508, lng: 32.262 },
  'Луганська область': { lat: 48.574, lng: 39.307 },
  'Львівська область': { lat: 49.842, lng: 24.032 },
  'Миколаївська область': { lat: 46.975, lng: 31.995 },
  'Одеська область': { lat: 46.482, lng: 30.723 },
  'Полтавська область': { lat: 49.589, lng: 34.551 },
  'Рівненська область': { lat: 50.619, lng: 26.251 },
  'Сумська область': { lat: 50.907, lng: 34.798 },
  'Тернопільська область': { lat: 49.554, lng: 25.595 },
  'Харківська область': { lat: 49.994, lng: 36.23 },
  'Херсонська область': { lat: 46.635, lng: 32.616 },
  'Хмельницька область': { lat: 49.423, lng: 26.988 },
  'Черкаська область': { lat: 49.444, lng: 32.059 },
  'Чернівецька область': { lat: 48.292, lng: 25.935 },
  'Чернігівська область': { lat: 51.494, lng: 31.294 },
  'м. Київ': { lat: 50.45, lng: 30.523 },
  'Автономна Республіка Крим': { lat: 44.952, lng: 34.102 },
  'м. Севастополь': { lat: 44.616, lng: 33.525 },
};

// Where to measure "nearest" from: the centroid of the places that already match
// the user's region (most precise), otherwise the region's admin centre.
function anchorFor(regionPlaces: Place[], region: string | null): { lat: number; lng: number } | null {
  if (regionPlaces.length) {
    const lat = regionPlaces.reduce((s, p) => s + p.lat, 0) / regionPlaces.length;
    const lng = regionPlaces.reduce((s, p) => s + p.lng, 0) / regionPlaces.length;
    return { lat, lng };
  }
  return region && REGION_CENTER[region] ? REGION_CENTER[region] : null;
}

// 'city'/'region' — all three picks are from the user's own area. 'nearby' — the
// area had fewer than three, so we topped up with the closest neighbours.
export type WalkScope = 'city' | 'region' | 'nearby' | 'country';

export function pickWalkPlaces(
  places: Place[],
  city: string | null,
  region: string | null,
): { scope: WalkScope; places: Place[] } {
  const byWalk = [...places].sort((a, b) => walkScore(a) - walkScore(b));

  const c = city ? norm(city) : '';
  const inCity = c ? byWalk.filter((p) => norm(p.name).includes(c) || norm(p.region).includes(c)) : [];
  if (inCity.length >= 3) return { scope: 'city', places: inCity.slice(0, 3) };

  const rk = regionKey(region);
  const inRegion = rk ? byWalk.filter((p) => norm(p.region).includes(rk)) : [];

  // Places already in the user's own area (city matches first, then the rest of
  // the region), nicest-walk first and de-duplicated.
  const local: Place[] = [];
  const seen = new Set<string | number>();
  for (const p of [...inCity, ...inRegion]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      local.push(p);
    }
  }
  if (local.length >= 3) {
    return { scope: inCity.length >= 3 ? 'city' : 'region', places: local.slice(0, 3) };
  }

  // Fewer than three locally — top up with the geographically closest places
  // (i.e. the nearest neighbouring towns), so the list is always full.
  const anchor = anchorFor(inRegion, region);
  const result = [...local];
  if (anchor) {
    const nearest = places
      .filter((p) => !seen.has(p.id))
      .map((p) => ({ p, d: distanceKm(anchor, p) }))
      .sort((a, b) => a.d - b.d);
    for (const { p } of nearest) {
      if (result.length >= 3) break;
      result.push(p);
      seen.add(p.id);
    }
  } else {
    // No location at all to anchor on — fall back to the best walks countrywide.
    for (const p of byWalk) {
      if (result.length >= 3) break;
      if (!seen.has(p.id)) {
        result.push(p);
        seen.add(p.id);
      }
    }
  }

  const scope: WalkScope = local.length > 0 ? 'nearby' : region || city ? 'nearby' : 'country';
  return { scope, places: result.slice(0, 3) };
}

// --- component -------------------------------------------------------------

interface WalkIntroProps {
  user: AuthUser;
  accent: string;
  onClose: () => void;
  // Open a recommended place on the map (with its side detail panel).
  onOpenPlace?: (id: string | number) => void;
}

function WalkIntro({ user, accent, onClose, onOpenPlace }: WalkIntroProps) {
  const [places, setPlaces] = useState<Place[]>(PLACES);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Live places if the API is reachable; the offline dataset is the fallback.
  useEffect(() => {
    let alive = true;
    getPlaces()
      .then((list) => {
        if (alive && list.length) setPlaces(list);
      })
      .catch(() => {
        /* keep offline fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { scope, places: picks } = useMemo(
    () => pickWalkPlaces(places, user.city, user.region),
    [places, user.city, user.region],
  );

  const close = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 260);
  };

  // Esc closes; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Location shown as a plain nominative label (no preposition) so Ukrainian
  // case endings never come out wrong — e.g. "Куп'янськ · Харківська область".
  const locationLabel = [user.city, user.region].filter(Boolean).join(' · ');

  const lead =
    scope === 'city'
      ? 'Зібрали три найкращі локації прямо у твоєму місті — саме час вибратись на прогулянку.'
      : scope === 'region'
        ? 'У твоєму місті поки затишно, тож ось три найкращі маршрути з твоєї області.'
        : scope === 'nearby'
          ? 'Поруч небагато місць, тому ми додали найближчі цікаві локації із сусідніх міст.'
          : 'Ось три наші улюблені місця для прогулянки, з яких приємно почати подорож Україною.';

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '22px',
        background: 'rgba(4,16,11,0.72)',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        opacity: mounted && !closing ? 1 : 0,
        transition: 'opacity 0.28s ease',
        fontFamily: "'Manrope', sans-serif",
      }}
    >
      {/* scoped animations */}
      <style>{`
        @keyframes atWalkPop {
          0% { opacity: 0; transform: translateY(26px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes atWalkCard {
          0% { opacity: 0; transform: translateY(22px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes atWalkSheen {
          0% { transform: translateX(-120%) skewX(-18deg); }
          60%, 100% { transform: translateX(320%) skewX(-18deg); }
        }
        @keyframes atWalkFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes atWalkRank {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.18); }
          100% { transform: scale(1); opacity: 1; }
        }
        .at-walk-card { transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease; }
        .at-walk-card:hover, .at-walk-card:focus-visible {
          transform: translateY(-2px);
          background: rgba(255,255,255,0.07);
          border-color: var(--wa);
          outline: none;
        }
        .at-walk-arrow { transition: transform 0.16s ease; }
        .at-walk-card:hover .at-walk-arrow { transform: translateY(-50%) translateX(3px); }
      `}</style>

      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative',
          width: 'min(680px, 100%)',
          maxHeight: '92dvh',
          overflowY: 'auto',
          borderRadius: '26px',
          background: 'linear-gradient(180deg, #0b2a1e 0%, #071c14 100%)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 40px 90px -30px rgba(0,0,0,0.85)',
          color: CREAM,
          animation: closing
            ? 'none'
            : mounted
              ? 'atWalkPop 0.5s cubic-bezier(0.22,1,0.36,1) both'
              : 'none',
          transform: closing ? 'translateY(16px) scale(0.97)' : undefined,
          opacity: closing ? 0 : undefined,
          transition: closing ? 'opacity 0.24s ease, transform 0.24s ease' : undefined,
        }}
      >
        {/* glow header band */}
        <div
          style={{
            position: 'relative',
            padding: '30px 28px 22px',
            overflow: 'hidden',
            background: `radial-gradient(120% 140% at 20% 0%, ${accent}33 0%, transparent 60%)`,
          }}
        >
          <button
            onClick={close}
            aria-label="Закрити"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(244,241,232,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Icon name="close" size={16} strokeWidth={2} />
          </button>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 13px',
              borderRadius: '999px',
              background: `${accent}22`,
              border: `1px solid ${accent}55`,
              color: accent,
              fontSize: '11.5px',
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '16px',
            }}
          >
            <span style={{ display: 'inline-flex', animation: 'atWalkFloat 2.6s ease-in-out infinite' }}>
              <Icon name="sparkle" size={14} strokeWidth={1.9} />
            </span>
            Вітаємо в Absolute Travel
          </div>

          <h2
            style={{
              fontFamily: "'Lora', serif",
              fontWeight: 500,
              fontSize: 'clamp(23px, 4vw, 31px)',
              lineHeight: 1.15,
              margin: '0 0 10px',
            }}
          >
            Топ-3 місця, куди сходити
            <br />
            погуляти
          </h2>
          {locationLabel && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 700,
                color: accent,
                marginBottom: '10px',
              }}
            >
              <Icon name="signpost" size={15} strokeWidth={1.9} stroke={accent} />
              {locationLabel}
            </div>
          )}
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: 1.5,
              color: 'rgba(244,241,232,0.62)',
              maxWidth: '460px',
            }}
          >
            {lead}
          </p>
        </div>

        {/* cards */}
        <div style={{ padding: '6px 22px 8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {picks.map((p, i) => {
            const meta = CATEGORY_META[p.category];
            const diff = DIFFICULTY_META[p.difficulty ?? 1] ?? DIFFICULTY_META[1];
            const photo = p.photos && p.photos.length ? p.photos[0] : null;
            return (
              <div
                key={p.id}
                className="at-walk-card"
                role="button"
                tabIndex={0}
                title={`Відкрити «${p.name}» на мапі`}
                onClick={() => onOpenPlace?.(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenPlace?.(p.id);
                  }
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  gap: '15px',
                  padding: '13px',
                  paddingRight: '38px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.035)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  opacity: 0,
                  // exposes the accent to the scoped :hover rule
                  ['--wa' as string]: accent,
                  animation: mounted && !closing
                    ? `atWalkCard 0.55s cubic-bezier(0.22,1,0.36,1) ${0.22 + i * 0.13}s both`
                    : 'none',
                }}
              >
                {/* affordance: "open on map" chevron */}
                <span
                  className="at-walk-arrow"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '13px',
                    transform: 'translateY(-50%)',
                    color: accent,
                    display: 'inline-flex',
                  }}
                >
                  <Icon name="arrowRight" size={18} strokeWidth={2.2} stroke={accent} />
                </span>
                {/* thumbnail */}
                <div
                  style={{
                    position: 'relative',
                    flex: '0 0 auto',
                    width: '96px',
                    height: '96px',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    background: CATEGORY_GRADIENT[p.category],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {photo ? (
                    <img
                      src={photo}
                      alt={p.name}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <Icon name={CATEGORY_ICON[p.category]} size={30} stroke="rgba(255,255,255,0.9)" strokeWidth={1.6} />
                  )}
                  {/* rank badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '-7px',
                      left: '-7px',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: accent,
                      color: BG,
                      fontSize: '13px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
                      animation: mounted && !closing ? `atWalkRank 0.45s ease ${0.4 + i * 0.13}s both` : 'none',
                    }}
                  >
                    {i + 1}
                  </span>
                </div>

                {/* text */}
                <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: '17px', fontWeight: 600 }}>{p.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: meta.color,
                        background: `${meta.color}22`,
                        border: `1px solid ${meta.color}55`,
                        borderRadius: '999px',
                        padding: '2px 8px',
                      }}
                    >
                      <Icon name={CATEGORY_ICON[p.category]} size={11} strokeWidth={1.9} />
                      {meta.label}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        color: diff.color,
                        background: `${diff.color}22`,
                        border: `1px solid ${diff.color}55`,
                        borderRadius: '999px',
                        padding: '2px 8px',
                      }}
                    >
                      {diff.label}
                    </span>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12.5px',
                      lineHeight: 1.45,
                      color: 'rgba(244,241,232,0.6)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* footer */}
        <div style={{ padding: '10px 22px 26px' }}>
          <button
            onClick={close}
            style={{
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              padding: '15px',
              borderRadius: '14px',
              border: 'none',
              background: accent,
              color: BG,
              fontFamily: "'Manrope', sans-serif",
              fontSize: '14.5px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '55px',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                animation: 'atWalkSheen 2.8s ease-in-out 0.9s infinite',
              }}
            />
            <span style={{ position: 'relative' }}>Погнали досліджувати мапу</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default WalkIntro;
