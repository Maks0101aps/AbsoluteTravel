import type { ReactNode } from 'react';
import type { FriendUser } from './api';

const CREAM = '#F4F1E8';

// Shared row card for a user: avatar with online dot, name, level/XP, and an
// action slot on the right. Reused by FriendsPage, search results and chat.
interface UserCardProps {
  user: FriendUser;
  accent?: string;
  subtitle?: string;
  actions?: ReactNode;
  onClick?: () => void;
  compact?: boolean;
}

export function OnlineDot({ online, size = 10 }: { online: boolean; size?: number }) {
  return (
    <span
      title={online ? 'Онлайн' : 'Офлайн'}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        background: online ? '#3FA66B' : 'rgba(244,241,232,0.25)',
        border: '2px solid #0B2B20',
        boxShadow: online ? '0 0 6px rgba(63,166,107,0.8)' : 'none',
        display: 'inline-block',
        flex: '0 0 auto',
      }}
    />
  );
}

export function UserAvatar({ user, size = 44 }: { user: Pick<FriendUser, 'avatar' | 'name' | 'online'>; size?: number }) {
  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flex: '0 0 auto' }}>
      <img
        src={user.avatar}
        alt={user.name}
        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#081E15', border: '1px solid rgba(255,255,255,0.15)' }}
        onError={(e) => {
          e.currentTarget.src = '/assets/avatar_default.svg';
          e.currentTarget.onerror = null;
        }}
      />
      <span style={{ position: 'absolute', right: '-1px', bottom: '-1px', display: 'inline-flex' }}>
        <OnlineDot online={user.online} />
      </span>
    </div>
  );
}

function UserCard({ user, accent = '#3FA66B', subtitle, actions, onClick, compact }: UserCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: '#0B2B20',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '14px',
        padding: compact ? '10px 12px' : '13px 16px',
        cursor: onClick ? 'pointer' : 'default',
        fontFamily: "'Manrope', sans-serif",
        color: CREAM,
      }}
    >
      <UserAvatar user={user} size={compact ? 38 : 46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: '#071F16',
              background: accent,
              borderRadius: '999px',
              padding: '2px 8px',
              flex: '0 0 auto',
            }}
          >
            РІВЕНЬ {user.level}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(244,241,232,0.55)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle ?? `@${user.username} · ${user.xp} XP${user.city ? ` · ${user.city}` : ''}`}
        </div>
      </div>
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 0 auto' }} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  );
}

export default UserCard;
