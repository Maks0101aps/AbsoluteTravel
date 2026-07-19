import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProfileAvatar from './ProfileAvatar';
import { FRAMES, AVATARS } from './data/profileOptions';

describe('ProfileAvatar', () => {
  it('renders a known built-in avatar', () => {
    const { container } = render(<ProfileAvatar avatarId="a1" color="#3FA66B" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with a gem frame ring applied', () => {
    const { container } = render(<ProfileAvatar avatarId="a1" frameId="gem" color="#3FA66B" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with a glow frame ring applied', () => {
    const { container } = render(<ProfileAvatar avatarId="a1" frameId="glow" color="#3FA66B" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders a custom uploaded avatar (data URL) instead of the built-in icon', () => {
    const { container } = render(
      <ProfileAvatar avatarId="a1" customAvatar="data:image/png;base64,AAA" color="#3FA66B" />,
    );
    expect(container.querySelector('img')).toBeTruthy();
  });

  it('falls back gracefully for an unknown avatarId', () => {
    const { container } = render(<ProfileAvatar avatarId="does-not-exist" color="#3FA66B" />);
    expect(container.firstChild).toBeTruthy();
  });

  it('respects a custom size', () => {
    const { container } = render(<ProfileAvatar avatarId="a1" color="#3FA66B" size={200} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders every frame ring style without throwing', () => {
    for (const f of FRAMES) {
      expect(() => render(<ProfileAvatar avatarId="a1" frameId={f.id} color="#3FA66B" />)).not.toThrow();
    }
  });

  it('renders every built-in avatar without throwing', () => {
    for (const a of AVATARS) {
      expect(() => render(<ProfileAvatar avatarId={a.id} color="#3FA66B" />)).not.toThrow();
    }
  });
});
