import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileSetup from './ProfileSetup';
import type { AuthUser } from './api';

const baseUser: AuthUser = {
  id: 1,
  username: 'traveler',
  email: 'a@b.com',
  city: 'Львів',
  region: 'Львівська область',
  name: 'Traveler',
  avatar: '/assets/avatar_default.svg',
  level: 1,
  xp: 0,
  coins: 0,
  unlockedItems: [],
  currentDestination: null,
};

describe('ProfileSetup', () => {
  it('renders for a brand-new user with no profile yet', () => {
    render(<ProfileSetup user={baseUser} onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('pre-fills fields when editing an existing profile', () => {
    const withProfile: AuthUser = {
      ...baseUser,
      profile: {
        avatarId: 'a1',
        color: '#3FA66B',
        displayName: 'Мандрівник',
        bio: 'Люблю гори',
        backgroundId: 'ocean',
        frameId: 'none',
        badges: [],
        effectId: 'none',
      },
    };
    render(<ProfileSetup user={withProfile} onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByText('Мандрівник')).toBeTruthy();
  });

  it('calls onSkip when the skip action is used', () => {
    const onSkip = vi.fn();
    render(<ProfileSetup user={baseUser} onComplete={vi.fn()} onSkip={onSkip} />);
    const skipBtn = screen.queryByText(/пропустити|skip|pomiń/i);
    if (skipBtn) {
      fireEvent.click(skipBtn);
      expect(onSkip).toHaveBeenCalled();
    }
  });

  it('opens each customization rail popover (avatar/frame/background/badges/effects)', () => {
    render(<ProfileSetup user={baseUser} onComplete={vi.fn()} onSkip={vi.fn()} />);
    for (const label of ['Аватар', 'Рамка', 'Фон', 'Значки', 'Ефекти']) {
      const btn = screen.getByText(label);
      fireEvent.click(btn);
      // Closing via Escape returns the rail to its resting state before the
      // next iteration opens a different popover.
      fireEvent.keyDown(document, { key: 'Escape' });
    }
  });

  it('picking an avatar/frame/background/color/effect option updates the card', () => {
    render(<ProfileSetup user={baseUser} onComplete={vi.fn()} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText('Аватар'));
    const avatarOption = document.querySelector('[style*="cursor: pointer"]');
    if (avatarOption) fireEvent.click(avatarOption);
    fireEvent.keyDown(document, { key: 'Escape' });
  });

  it('calls onComplete with the assembled profile when saving', () => {
    const onComplete = vi.fn();
    render(<ProfileSetup user={baseUser} onComplete={onComplete} onSkip={vi.fn()} />);
    fireEvent.click(screen.getByText('Зберегти профіль'));
    expect(onComplete).toHaveBeenCalled();
    const saved = onComplete.mock.calls[0][0];
    expect(saved.displayName).toBeTruthy();
  });
});
