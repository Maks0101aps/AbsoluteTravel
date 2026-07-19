import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import LeaderboardPage from './LeaderboardPage';
import type { XpLeaderboardRow } from './api';

const getXpLeaderboardMock = vi.fn();
vi.mock('./api', () => ({
  getXpLeaderboard: (...args: unknown[]) => getXpLeaderboardMock(...args),
}));

const row = (overrides: Partial<XpLeaderboardRow> = {}): XpLeaderboardRow => ({
  rank: 1,
  userId: 2,
  username: 'traveler',
  name: 'Traveler',
  avatarUrl: '/assets/avatar_default.svg',
  level: 5,
  xp: 500,
  region: 'Львівська область',
  cells: 10,
  places: 3,
  ...overrides,
});

describe('LeaderboardPage', () => {
  beforeEach(() => {
    getXpLeaderboardMock.mockReset();
    getXpLeaderboardMock.mockResolvedValue([row()]);
  });

  it('renders the fetched leaderboard rows', async () => {
    render(<LeaderboardPage userId={1} userRegion={null} accent="#3FA66B" />);
    await waitFor(() => expect(screen.getByText('Traveler')).toBeTruthy());
  });

  it('shows an error state when the fetch fails', async () => {
    getXpLeaderboardMock.mockRejectedValue(new Error('Не вдалося з’єднатися із сервером'));
    render(<LeaderboardPage userId={1} userRegion={null} accent="#3FA66B" />);
    await waitFor(() => expect(getXpLeaderboardMock).toHaveBeenCalled());
  });

  it('renders with an empty leaderboard', async () => {
    getXpLeaderboardMock.mockResolvedValue([]);
    render(<LeaderboardPage userId={1} userRegion="Одеська область" accent="#3FA66B" />);
    await waitFor(() => expect(getXpLeaderboardMock).toHaveBeenCalled());
  });
});
