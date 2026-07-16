// Territory-exploration state for the map. Given the user's live GPS position
// (from useLiveGps), it converts each fix to an H3 cell and, when the user
// steps into a cell they've never unlocked, calls the backend to record it and
// award XP. It owns three things the UI renders:
//   • visitedCells — every unlocked cell, painted as hexes on the map
//   • lastRevealed — the most recently unlocked cell, for the reveal animation
//   • events       — a short-lived queue of "+XP" popups
//
// Business logic lives here; the components stay presentational.
import { useCallback, useEffect, useRef, useState } from 'react';
import { getVisitedCells, getExplorationStats, visitCell, type VisitCellResult } from '../api';
import { cellAt } from './h3';

export interface XpEvent {
  id: number;
  xp: number;
  newRegion: boolean;
}

export interface ExplorationState {
  visitedCells: string[];
  lastRevealed: string | null;
  events: XpEvent[];
  totalCells: number;
  totalRegions: number;
  dismissEvent: (id: number) => void;
}

// How long an unlocked cell keeps its "just revealed" glow.
const REVEAL_HIGHLIGHT_MS = 2200;
// How long a "+XP" popup stays on screen.
const EVENT_TTL_MS = 2600;

export function useExploration(
  userId: number | undefined,
  selfPosition: { lat: number; lng: number } | null,
  // Called after every successful new-cell unlock so the parent can fold the
  // new xp/level into the logged-in user.
  onUnlock?: (result: VisitCellResult) => void,
): ExplorationState {
  const [visitedCells, setVisitedCells] = useState<string[]>([]);
  const [lastRevealed, setLastRevealed] = useState<string | null>(null);
  const [events, setEvents] = useState<XpEvent[]>([]);
  const [totalRegions, setTotalRegions] = useState(0);

  // Fast membership check + in-flight guard so one cell is never posted twice
  // (GPS emits many fixes inside the same hex before the first request returns).
  const visitedRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const eventIdRef = useRef(0);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Latest callback without re-triggering the position effect on every render.
  const onUnlockRef = useRef(onUnlock);
  onUnlockRef.current = onUnlock;

  // Load already-unlocked cells + region count when the user changes.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    visitedRef.current = new Set();
    pendingRef.current = new Set();
    setVisitedCells([]);
    setLastRevealed(null);

    getVisitedCells(userId)
      .then(({ cells }) => {
        if (cancelled) return;
        visitedRef.current = new Set(cells);
        setVisitedCells(cells);
      })
      .catch(() => {});
    getExplorationStats(userId)
      .then((s) => !cancelled && setTotalRegions(s.totalRegions))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Whenever the position enters a not-yet-unlocked cell, claim it.
  useEffect(() => {
    if (!userId || !selfPosition) return;
    const cellId = cellAt(selfPosition.lat, selfPosition.lng);
    if (visitedRef.current.has(cellId) || pendingRef.current.has(cellId)) return;

    pendingRef.current.add(cellId);
    let cancelled = false;
    visitCell(userId, selfPosition.lat, selfPosition.lng)
      .then((result) => {
        if (cancelled) return;
        
        // Add all unlocked cell IDs (primary cell + any neighboring cells)
        const newlyUnlocked = result.unlockedCellIds || [result.cellId];
        newlyUnlocked.forEach((id) => visitedRef.current.add(id));

        if (!result.isNew) return;

        setVisitedCells((prev) => {
          const next = [...prev];
          newlyUnlocked.forEach((id) => {
            if (!next.includes(id)) {
              next.push(id);
            }
          });
          return next;
        });
        setTotalRegions(result.totalRegions);
        setLastRevealed(result.cellId);
        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = setTimeout(() => setLastRevealed(null), REVEAL_HIGHLIGHT_MS);

        const id = ++eventIdRef.current;
        setEvents((prev) => [...prev, { id, xp: result.xpAwarded, newRegion: result.newRegion }]);
        setTimeout(() => setEvents((prev) => prev.filter((e) => e.id !== id)), EVENT_TTL_MS);

        onUnlockRef.current?.(result);
      })
      .catch(() => {})
      .finally(() => {
        pendingRef.current.delete(cellId);
      });

    return () => {
      cancelled = true;
    };
    // Re-run when the containing cell changes (position may jitter within a cell
    // without needing a new request — cellAt collapses that noise).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selfPosition && cellAt(selfPosition.lat, selfPosition.lng)]);

  useEffect(
    () => () => {
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    },
    [],
  );

  const dismissEvent = useCallback((id: number) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    visitedCells,
    lastRevealed,
    events,
    totalCells: visitedCells.length,
    totalRegions,
    dismissEvent,
  };
}
