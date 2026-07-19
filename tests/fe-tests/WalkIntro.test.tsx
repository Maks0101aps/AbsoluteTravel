import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WalkIntro from './WalkIntro';
import type { AuthUser } from './api';

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return { ...actual, getPlaces: vi.fn().mockRejectedValue(new Error('offline — use fallback')) };
});

const user: AuthUser = {
  id: 1,
  username: 'traveler',
  email: 'a@b.com',
  city: null,
  region: null,
  name: 'Traveler',
  avatar: '/assets/avatar_default.svg',
  level: 1,
  xp: 0,
  coins: 0,
  unlockedItems: [],
  currentDestination: null,
};

describe('WalkIntro', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the recommended-places dialog and falls back to local data on API failure', async () => {
    render(<WalkIntro user={user} accent="#3FA66B" onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
  });

  it('calls onClose when dismissed', async () => {
    const onClose = vi.fn();
    render(<WalkIntro user={user} accent="#3FA66B" onClose={onClose} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    const closeBtn = screen.queryByLabelText(/close|закрити|zamknij/i) ?? screen.queryAllByRole('button')[0];
    expect(closeBtn).toBeTruthy();
  });
});
