// Live-GPS state for the map: publishes the user's own position every 15s
// over WebSocket and receives friends' positions from the server's 10s
// broadcast. Friends silent for >5 minutes are flagged stale (greyed out);
// >30 minutes the server drops them entirely.
import { useEffect, useRef, useState } from 'react';
import { getFriends, setLocationVisibility, type FriendEntry, type LiveLocation } from './api';
import { getSocket } from './socket';

const PUBLISH_INTERVAL_MS = 15_000;
const STALE_AFTER_MS = 5 * 60 * 1000;

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
  const [selfPosition, setSelfPosition] = useState<{ lat: number; lng: number } | null>(null);
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

  // Publish own position every 15 seconds while sharing is on.
  useEffect(() => {
    if (!userId || !enabled) return;
    if (!('geolocation' in navigator)) {
      setGeoError('Геолокація недоступна у цьому браузері');
      return;
    }

    let stopped = false;
    const publish = () => {
      if (stopped || !sharingRef.current) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (stopped) return;
          const lat = Number(pos.coords.latitude.toFixed(6));
          const lng = Number(pos.coords.longitude.toFixed(6));
          setSelfPosition({ lat, lng });
          setGeoError(null);
          getSocket(userId).then((socket) => {
            if (!stopped && socket.connected) socket.emit('location:update', { lat, lng });
          });
        },
        (err) => {
          if (!stopped) setGeoError(err.code === err.PERMISSION_DENIED ? 'Доступ до геолокації заборонено' : 'Не вдалося визначити позицію');
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 10_000 },
      );
    };

    publish();
    const timer = setInterval(() => {
      publish();
      setTick((t) => t + 1);
    }, PUBLISH_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [userId, enabled, sharing]);

  const setSharing = (visible: boolean) => {
    setSharingState(visible);
    if (userId) setLocationVisibility(userId, visible).catch(() => {});
    if (!visible) setSelfPosition(null);
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
