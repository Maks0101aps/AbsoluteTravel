import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AchievementsPage from './AchievementsPage';
import type { Achievement } from './api';

const getAchievementsMock = vi.fn();
const claimAchievementMock = vi.fn();
vi.mock('./api', () => ({
  getAchievements: (...args: unknown[]) => getAchievementsMock(...args),
  claimAchievement: (...args: unknown[]) => claimAchievementMock(...args),
}));

const achievement = (overrides: Partial<Achievement> = {}): Achievement => ({
  key: 'first_visit',
  title: 'Перше відкриття',
  description: 'Відвідай перше місце',
  icon: 'compass',
  metric: 'places',
  threshold: 1,
  xp: 100,
  coins: 50,
  tier: 'bronze',
  value: 1,
  progress: 1,
  completed: true,
  ...overrides,
});

describe('AchievementsPage', () => {
  beforeEach(() => {
    getAchievementsMock.mockReset();
    claimAchievementMock.mockReset();
  });

  it('shows a loading state, then renders fetched achievements', async () => {
    getAchievementsMock.mockResolvedValue({
      weekly: [],
      regular: [achievement()],
      weekKey: '2026-W29',
      claimableCount: 1,
    });
    render(<AchievementsPage userId={1} accent="#3FA66B" onReward={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Перше відкриття')).toBeTruthy());
  });

  it('shows an error state when the fetch fails', async () => {
    getAchievementsMock.mockRejectedValue(new Error('Не вдалося з’єднатися із сервером'));
    render(<AchievementsPage userId={1} accent="#3FA66B" onReward={vi.fn()} />);
    await waitFor(() => expect(getAchievementsMock).toHaveBeenCalled());
  });

  it('renders weekly achievements alongside regular ones', async () => {
    getAchievementsMock.mockResolvedValue({
      weekly: [achievement({ key: 'w_social', title: 'Товариський тиждень', weekly: true })],
      regular: [achievement()],
      weekKey: '2026-W29',
      claimableCount: 2,
    });
    render(<AchievementsPage userId={1} accent="#3FA66B" onReward={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Товариський тиждень')).toBeTruthy());
    expect(screen.getByText('Перше відкриття')).toBeTruthy();
  });

  it('renders an incomplete (in-progress) achievement', async () => {
    getAchievementsMock.mockResolvedValue({
      weekly: [],
      regular: [achievement({ completed: false, value: 0, progress: 0 })],
      weekKey: '2026-W29',
      claimableCount: 0,
    });
    render(<AchievementsPage userId={1} accent="#3FA66B" onReward={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Перше відкриття')).toBeTruthy());
  });
});
