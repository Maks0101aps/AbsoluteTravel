import React from 'react';

export type IconName =
  | 'compass' | 'mountain' | 'pine' | 'tent' | 'map' | 'signpost' | 'binoculars'
  | 'flame' | 'backpack' | 'feather' | 'shield' | 'moon' | 'sun' | 'crown'
  | 'leaf' | 'boot' | 'camera' | 'flag' | 'trophy'
  | 'user' | 'users' | 'shoppingBag' | 'image' | 'target' | 'star' | 'sparkle'
  | 'lock' | 'coin' | 'pencil' | 'close' | 'check' | 'plus' | 'arrowLeft' | 'arrowRight' | 'messageSquare' | 'mic' | 'smile' | 'hexagon' | 'gift' | 'globe' | 'medal' | 'alertTriangle' | 'chevronUp'
  | 'qrcode' | 'scan';

const PATHS: Record<IconName, React.ReactNode> = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 5.3-5.3 2.2 2.2-5.3z" /></>,
  mountain: <><path d="M3 20l6-11 4 6 2-3 6 8z" /><path d="M9 9l2 3" /></>,
  pine: <><path d="M12 4l5 7h-3l3 5H7l3-5H7z" /><path d="M12 16v4" /></>,
  tent: <><path d="M12 5L3 20h18z" /><path d="M12 5v15" /><path d="M9 20l3-5 3 5" /></>,
  map: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  signpost: <><path d="M12 3v18" /><path d="M5 6h11l2 2-2 2H5z" /><path d="M7 14h12" /></>,
  binoculars: <><circle cx="7" cy="15" r="3" /><circle cx="17" cy="15" r="3" /><path d="M7 12l1-6h2l1 6M17 12l-1-6h-2l-1 6" /></>,
  flame: <><path d="M12 3c3 3 5 5.5 5 9a5 5 0 0 1-10 0c0-2 1-3.5 2.5-4.5C9 9 10 6 12 3z" /></>,
  backpack: <><path d="M7 8a5 5 0 0 1 10 0v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" /><path d="M10 8V6a2 2 0 0 1 4 0v2" /><path d="M9 13h6" /></>,
  feather: <><path d="M20 4C11 4 4 11 4 20" /><path d="M20 4c0 8-5 12-12 13" /><path d="M8 17l-4 3" /></>,
  shield: <><path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  moon: <><path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" /></>,
  alertTriangle: <><path d="M12 3l10 18H2z" /><path d="M12 10v4" /><path d="M12 17.5v.01" /></>,
  crown: <><path d="M4 8l3 4 5-6 5 6 3-4v9H4z" /><path d="M4 20h16" /></>,
  leaf: <><path d="M12 20v-6" /><path d="M12 14c0-3 2-5 6-5 0 4-3 5-6 5z" /><path d="M12 16c0-2-2-4-6-4 0 3 3 4 6 4z" /></>,
  boot: <><path d="M8 3v10l8 4v4H6a2 2 0 0 1-2-2v-3l4-2V3z" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2" /><circle cx="12" cy="13" r="3.5" /><path d="M8 7l1.5-2.5h5L16 7" /></>,
  flag: <><path d="M6 21V4" /><path d="M6 4h11l-2 3 2 3H6" /></>,
  trophy: <><path d="M8 4h8v4a4 4 0 0 1-8 0z" /><path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" /><path d="M12 12v4M9 20h6M10 20l.5-4h3l.5 4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M5 20c0-4 3-6 7-6s7 2 7 6" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="M21 16l-5-5-7 7" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  star: <><path d="M12 3l2.6 5.6L20 9.3l-4 4 1 6-5-3-5 3 1-6-4-4 5.4-.7z" /></>,
  sparkle: <><path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L5 10l6.5-1.5z" /><path d="M18.5 13l.7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7z" /></>,
  lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  coin: (
    <>
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity={0.15} />
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="7" strokeWidth={1.2} strokeOpacity={0.5} />
      <path d="M12 6v12" />
      <path d="M15 9h-4.5a2 2 0 1 0 0 4h3a2 2 0 1 1 0 4H9" />
      <path d="M19 2q0 2 2 2q-2 0 -2 2q0-2 -2-2q2 0 2-2" fill="currentColor" stroke="none" />
    </>
  ),
  pencil: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4 12l5 5L20 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrowLeft: <><path d="M19 12H5" /><path d="M11 18l-6-6 6-6" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></>,
  chevronUp: <path d="M6 15l6-6 6 6" />,
  messageSquare: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  mic: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" /><path d="M19 10v1a7 7 0 0 1-14 0v-1" /><path d="M12 18v4" /><path d="M8 22h8" /></>,
  smile: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
  shoppingBag: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  hexagon: <path d="M12 2.5l8.2 4.75v9.5L12 21.5l-8.2-4.75v-9.5z" />,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9" /><path d="M12 8v13" /><path d="M12 8S10.5 3.5 8 4.5 8.5 8 12 8zM12 8s1.5-4.5 4-3.5S15.5 8 12 8z" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  medal: <><path d="M8.5 2l3.5 6 3.5-6" /><path d="M7 2l3 5.5M17 2l-3 5.5" /><circle cx="12" cy="15" r="6" /><path d="M12 12.5l1 2 2.2.2-1.7 1.5.5 2.1L12 17.2l-2 1.2.5-2.1L8.8 14.7l2.2-.2z" /></>,
  qrcode: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM19 14h2v2h-2zM14 19h2v2h-2zM19 19h2v2h-2z" fill="currentColor" stroke="none" />
    </>
  ),
  scan: (
    <>
      <path d="M3 8V5a2 2 0 0 1 2-2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M3 12h18" />
    </>
  ),
};

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 24, stroke = 'currentColor', strokeWidth = 1.8, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
