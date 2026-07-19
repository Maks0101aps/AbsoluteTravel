import { useCallback, useEffect, useState } from 'react';
import { getVapidKey, subscribePush, unsubscribePush, sendTestPush } from './api';

// VAPID keys are URL-safe base64; the Push API wants a Uint8Array.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export interface PushState {
  supported: boolean;
  permission: NotificationPermission;
  subscribed: boolean;
  busy: boolean;
  error: string | null;
  enable: (userId: number) => Promise<void>;
  disable: (userId: number) => Promise<void>;
  test: (userId: number) => Promise<void>;
}

export function usePush(): PushState {
  const [permission, setPermission] = useState<NotificationPermission>(
    pushSupported ? Notification.permission : 'denied',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reflect an existing subscription (e.g. enabled on a previous visit).
  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  const enable = useCallback(async (userId: number) => {
    if (!pushSupported) return;
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('denied');
        return;
      }
      const { key, enabled } = await getVapidKey();
      if (!enabled || !key) {
        setError('server-disabled');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast: TS 6 types Uint8Array over ArrayBufferLike, but the Push API
          // only ever hands us an ArrayBuffer-backed view here.
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }));
      await subscribePush(userId, sub.toJSON());
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async (_userId: number) => {
    if (!pushSupported) return;
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const { endpoint } = sub;
        await sub.unsubscribe();
        await unsubscribePush(endpoint).catch(() => {});
      }
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async (userId: number) => {
    await sendTestPush(userId).catch(() => {});
  }, []);

  return { supported: pushSupported, permission, subscribed, busy, error, enable, disable, test };
}
