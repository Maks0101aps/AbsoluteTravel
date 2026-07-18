// Live-GPS state for the map: publishes the user's own position every 15s
// over WebSocket and receives friends' positions from the server's 10s
// broadcast. Friends silent for >5 minutes are flagged stale (greyed out);
// >30 minutes the server drops them entirely.
import { useEffect, useRef, useState } from 'react';
import { getFriends, setLocationVisibility, type FriendEntry, type LiveLocation } from './api';
import { getSocket } from './socket';
import i18n from './i18n';

const PUBLISH_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 5 * 60 * 1000;
// Accept a recent cached fix instead of forcing a brand-new (slow) GPS lock.
const GEO_MAX_AGE_MS = 60_000;

const LOCAL_STORAGE_GPS_KEY = 'at-last-known-gps';

let lastKnownSelf: { lat: number; lng: number } | null = (() => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_GPS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
})();

function updateLastKnownSelf(pos: { lat: number; lng: number } | null) {
  lastKnownSelf = pos;
  try {
    if (pos) {
      localStorage.setItem(LOCAL_STORAGE_GPS_KEY, JSON.stringify(pos));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_GPS_KEY);
    }
  } catch {
    // ignore
  }
}

export interface FriendDot extends LiveLocation {
  friend: FriendEntry;
  stale: boolean; // offline > 5 min — render greyed out
}

export interface LiveGpsState {
  selfPosition: { lat: number; lng: number } | null;
  friendDots: FriendDot[];
  sharing: boolean;
  geoError: string | null;
  setSharing: (visible: boolean) => void;
}

export function useLiveGps(userId: number | undefined, enabled = true): LiveGpsState {
  // Seed from the cached fix so the dot shows immediately after a tab switch.
  const [selfPosition, setSelfPosition] = useState<{ lat: number; lng: number } | null>(lastKnownSelf);
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [friends, setFriends] = useState<FriendEntry[]>([]);
  const [sharing, setSharingState] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // re-evaluates staleness periodically
  const sharingRef = useRef(sharing);
  sharingRef.current = sharing;

  // Friend metadata (avatar/name) for the dots.
  useEffect(() => {
    if (!userId || !enabled) return;
    getFriends(userId).then(setFriends).catch(() => {});
  }, [userId, enabled]);

  // Receive the server's periodic friends:locations broadcast.
  useEffect(() => {
    if (!userId || !enabled) return;
    let disposed = false;
    let cleanup = () => {};
    getSocket(userId).then((socket) => {
      if (disposed) return;
      const onLocations = (list: LiveLocation[]) => setLocations(Array.isArray(list) ? list : []);
      socket.on('friends:locations', onLocations);
      cleanup = () => socket.off('friends:locations', onLocations);
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, [userId, enabled]);

  // Watch the device position continuously and publish to the socket at most
  // once per PUBLISH_INTERVAL_MS. watchPosition yields more accurate/stable
  // fixes than periodic getCurrentPosition, especially on mobile GPS.
  useEffect(() => {
    if (!userId || !enabled) return;
    if (!('geolocation' in navigator)) {
      setGeoError(i18n.t('common.geo.unsupported'));
      return;
    }

    let stopped = false;
    let lastPublishedAt = 0;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (stopped || !sharingRef.current) return;
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        updateLastKnownSelf({ lat, lng });
        setSelfPosition({ lat, lng });
        setGeoError(null);

        const now = Date.now();
        if (now - lastPublishedAt < PUBLISH_INTERVAL_MS) return;
        lastPublishedAt = now;
        getSocket(userId).then((socket) => {
          if (!stopped && socket.connected) socket.emit('location:update', { lat, lng });
        });
      },
      (err) => {
        if (!stopped) setGeoError(err.code === err.PERMISSION_DENIED ? i18n.t('common.geo.denied') : i18n.t('common.geo.failed'));
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: GEO_MAX_AGE_MS },
    );

    // Keep staleness flags fresh even without new position events.
    const timer = setInterval(() => setTick((t) => t + 1), PUBLISH_INTERVAL_MS);
    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watchId);
      clearInterval(timer);
    };
  }, [userId, enabled, sharing]);

  const setSharing = (visible: boolean) => {
    setSharingState(visible);
    if (userId) setLocationVisibility(userId, visible).catch(() => {});
    if (!visible) {
      setSelfPosition(null);
    } else {
      // Show the last known fix instantly, then refine with a fresh reading.
      if (lastKnownSelf) setSelfPosition(lastKnownSelf);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = Number(pos.coords.latitude.toFixed(6));
            const lng = Number(pos.coords.longitude.toFixed(6));
            updateLastKnownSelf({ lat, lng });
            setSelfPosition({ lat, lng });
            if (userId) {
              getSocket(userId).then((socket) => {
                if (socket.connected) socket.emit('location:update', { lat, lng });
              });
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: GEO_MAX_AGE_MS }
        );
      }
    }
  };

  // `tick` increments every publish interval, forcing a re-render so the
  // staleness flags below stay current even without new broadcasts.
  void tick;
  const now = Date.now();
  const friendDots: FriendDot[] = locations
    .map((loc) => {
      const friend = friends.find((f) => f.id === loc.userId);
      if (!friend) return null;
      return { ...loc, friend, stale: now - Date.parse(loc.updatedAt) > STALE_AFTER_MS };
    })
    .filter((d): d is FriendDot => d !== null);

  return { selfPosition, friendDots, sharing, geoError, setSharing };
}
