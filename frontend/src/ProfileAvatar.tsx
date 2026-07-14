import { AVATARS, FRAMES } from './data/profileOptions';
import { Icon } from './icons';

interface ProfileAvatarProps {
  avatarId: string;
  customAvatar?: string;
  frameId?: string;
  color: string;
  size?: number;
}

function frameStyle(frameId: string | undefined, color: string): React.CSSProperties {
  const frame = FRAMES.find((f) => f.id === frameId);
  switch (frame?.ring) {
    case 'accent':
      return { border: `3px solid ${color}` };
    case 'glow':
      return { border: `2px solid ${color}`, boxShadow: `0 0 0 4px ${color}33, 0 0 20px ${color}66` };
    case 'gold':
      return { border: '3px solid #E7C34B', boxShadow: '0 0 0 3px rgba(231,195,75,0.35), 0 0 18px rgba(231,195,75,0.5)' };
    case 'gem':
      return { border: '3px solid #8A7CDF', boxShadow: '0 0 0 3px rgba(138,124,223,0.4), 0 0 22px rgba(138,124,223,0.6)' };
    default:
      return { border: '2px solid rgba(255,255,255,0.12)' };
  }
}

// Renders the chosen avatar (uploaded image or emoji-on-gradient) with the selected frame.
function ProfileAvatar({ avatarId, customAvatar, frameId, color, size = 96 }: ProfileAvatarProps) {
  const avatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0];
  const common: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...frameStyle(frameId, color),
  };

  if (customAvatar) {
    return <img src={customAvatar} alt="avatar" style={{ ...common, objectFit: 'cover' }} />;
  }

  return (
    <div style={{ ...common, background: avatar.gradient }}>
      <Icon name={avatar.icon} size={size * 0.46} stroke="rgba(244,241,232,0.95)" strokeWidth={1.7} />
    </div>
  );
}

export default ProfileAvatar;
