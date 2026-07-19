// Device compass heading in degrees (0 = north, clockwise), for drawing a
// "which way am I facing" arrow on the self marker while the navigator is
// open — the way a real turn-by-turn navigator does.
//
// iOS Safari requires an explicit user-gesture permission prompt
// (DeviceOrientationEvent.requestPermission) before it will fire orientation
// events at all; other browsers grant this implicitly on first listen. When
// permission is required, `needsPermission` is set and the caller should
// show a button that calls `requestPermission()` directly from its click
// handler (must stay inside the gesture, so it can't be called from an effect).
import { useEffect, useState } from 'react';

interface OrientationEventWithCompass extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

function headingFromEvent(e: OrientationEventWithCompass): number | null {
  if (typeof e.webkitCompassHeading === 'number') {
    // iOS already reports clockwise-from-north.
    return e.webkitCompassHeading;
  }
  if (e.alpha != null) {
    // 'alpha' is counter-clockwise from the device's initial orientation;
    // flip it to match the clockwise-from-north compass convention.
    return (360 - e.alpha) % 360;
  }
  return null;
}

export function useHeading(active: boolean) {
  const [heading, setHeading] = useState<number | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);

  useEffect(() => {
    if (!active || typeof DeviceOrientationEvent === 'undefined') {
      setHeading(null);
      return;
    }

    const onOrientation = (e: Event) => {
      const h = headingFromEvent(e as OrientationEventWithCompass);
      if (h != null) setHeading(h);
    };

    const requestPermissionFn = (DeviceOrientationEvent as any).requestPermission;
    if (typeof requestPermissionFn === 'function') {
      // iOS 13+: nothing fires until the user explicitly grants it.
      setNeedsPermission(true);
      return;
    }

    const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(eventName, onOrientation);
    return () => window.removeEventListener(eventName, onOrientation);
  }, [active]);

  const requestPermission = async () => {
    const requestPermissionFn = (DeviceOrientationEvent as any)?.requestPermission;
    if (typeof requestPermissionFn !== 'function') return;
    try {
      const result = await requestPermissionFn();
      if (result !== 'granted') return;
      setNeedsPermission(false);
      window.addEventListener('deviceorientation', (e) => {
        const h = headingFromEvent(e as OrientationEventWithCompass);
        if (h != null) setHeading(h);
      });
    } catch {
      // Permission denied or unsupported — heading stays null, the marker
      // just falls back to the plain (non-directional) self dot.
    }
  };

  return { heading, needsPermission, requestPermission };
}
