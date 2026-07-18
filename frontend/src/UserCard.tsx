import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FriendUser } from './api';
import { AVATARS } from './data/profileOptions';
import { Icon } from './icons';
import ProfileAvatar from './ProfileAvatar';

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
  index?: number;
}

export function OnlineDot({ online, size = 10 }: { online: boolean; size?: number }) {
  const { t } = useTranslation();
  return (
    <span
      title={online ? t('social.userCard.online') : t('social.userCard.offline')}
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

export function UserAvatar({
  user,
  size = 44,
}: {
  user: Pick<FriendUser, 'avatar' | 'name' | 'online'> & Partial<Pick<FriendUser, 'avatarId' | 'customAvatar' | 'frameId' | 'color'>>;
  size?: number;
}) {
  const avatarOpt = AVATARS.find((a) => a.id === user.avatar);

  // A saved profile customization (equipped avatar + frame) takes priority
  // over the plain default `avatar` image — this is what makes a friend's
  // actual frame show up on their map pin / mini-profile card instead of a
  // bare photo.
  if (user.avatarId) {
    return (
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flex: '0 0 auto' }}>
        <ProfileAvatar avatarId={user.avatarId} customAvatar={user.customAvatar} frameId={user.frameId} color={user.color ?? '#3FA66B'} size={size} />
        <span style={{ position: 'absolute', right: '-1px', bottom: '-1px', display: 'inline-flex' }}>
          <OnlineDot online={user.online} />
        </span>
      </div>
    );
  }

  const commonStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    objectFit: 'cover',
  };

  const renderInner = () => {
    if (avatarOpt) {
      return (
        <div style={{ ...commonStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', background: avatarOpt.gradient }}>
          <Icon name={avatarOpt.icon} size={size * 0.46} stroke="rgba(244,241,232,0.95)" strokeWidth={1.7} />
        </div>
      );
    }
    return (
      <img
        src={user.avatar}
        alt={user.name}
        style={{ ...commonStyle, background: '#081E15', border: '1px solid rgba(255,255,255,0.15)' }}
        onError={(e) => {
          e.currentTarget.src = '/assets/avatar_default.svg';
          e.currentTarget.onerror = null;
        }}
      />
    );
  };

  return (
    <div style={{ position: 'relative', width: `${size}px`, height: `${size}px`, flex: '0 0 auto' }}>
      {renderInner()}
      <span style={{ position: 'absolute', right: '-1px', bottom: '-1px', display: 'inline-flex' }}>
        <OnlineDot online={user.online} />
      </span>
    </div>
  );
}

function UserCard({ user, accent = '#3FA66B', subtitle, actions, onClick, compact, index }: UserCardProps) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      className="at-hover-lift at-fade-up"
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
        animationDelay: index != null ? `${Math.min(index, 10) * 45}ms` : undefined,
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
            {t('social.userCard.level', { level: user.level })}
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
