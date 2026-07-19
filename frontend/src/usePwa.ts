import { useCallback, useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// The `beforeinstallprompt` event isn't in the DOM lib yet.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

const INSTALL_DISMISSED_KEY = 'absolute_travel_pwa_install_dismissed';

// True when the app is already running as an installed PWA (standalone window),
// so we never nag an installed user to install again.
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari exposes this non-standard flag instead of display-mode.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export interface PwaState {
  /** Network status, kept live via the online/offline events. */
  offline: boolean;
  /** A new service worker is waiting — the user can refresh to update. */
  needRefresh: boolean;
  /** The browser offered an install prompt and the user hasn't dismissed it. */
  canInstall: boolean;
  /** Running inside an installed PWA window. */
  installed: boolean;
  /** Trigger the browser install flow (Android/desktop Chrome). */
  promptInstall: () => Promise<void>;
  /** Hide the install banner and remember the choice. */
  dismissInstall: () => void;
  /** Activate the waiting worker and reload into the new version. */
  update: () => void;
}

export function usePwa(): PwaState {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(INSTALL_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Poll for a new build every hour so long-lived tabs pick up updates.
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const onDisplayChange = () => setInstalled(isStandalone());
    standaloneMq.addEventListener?.('change', onDisplayChange);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      standaloneMq.removeEventListener?.('change', onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    setInstallEvent(null);
    if (choice.outcome === 'dismissed') {
      setDismissed(true);
      try {
        localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
      } catch {
        /* ignore */
      }
    }
  }, [installEvent]);

  const dismissInstall = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  const update = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  return {
    offline,
    needRefresh,
    canInstall: !!installEvent && !installed && !dismissed,
    installed,
    promptInstall,
    dismissInstall,
    update,
  };
}
