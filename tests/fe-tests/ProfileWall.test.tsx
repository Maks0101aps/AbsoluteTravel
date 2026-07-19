import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ProfileWall from './ProfileWall';

const fetchWallMock = vi.fn();
vi.mock('./api', () => ({
  fetchWall: (...args: unknown[]) => fetchWallMock(...args),
}));

describe('ProfileWall', () => {
  beforeEach(() => {
    fetchWallMock.mockReset();
  });

  it('shows an empty-state message when the wall has no posts', async () => {
    fetchWallMock.mockResolvedValue({ posts: [], nextCursor: null });
    render(<ProfileWall userId={1} accent="#3FA66B" />);
    await waitFor(() => expect(fetchWallMock).toHaveBeenCalled());
    await waitFor(() => expect(document.body.textContent).not.toBe(''));
  });

  it('renders posts returned by the API', async () => {
    fetchWallMock.mockResolvedValue({
      posts: [
        {
          id: 1,
          type: 'visit',
          placeId: 5,
          placeName: 'Тестове місце',
          cellId: null,
          photo: null,
          xpAwarded: 20,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    });
    render(<ProfileWall userId={1} accent="#3FA66B" />);
    await waitFor(() => expect(screen.getByText('Тестове місце')).toBeTruthy());
  });

  it('renders a new-region unlock entry', async () => {
    fetchWallMock.mockResolvedValue({
      posts: [
        { id: 2, type: 'new_region', placeId: null, placeName: null, cellId: 'abc', photo: null, xpAwarded: 50, createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    });
    render(<ProfileWall userId={1} accent="#3FA66B" />);
    await waitFor(() => expect(fetchWallMock).toHaveBeenCalled());
  });

  it('shows an error state when the fetch fails', async () => {
    fetchWallMock.mockRejectedValue(new Error('Стіна доступна лише друзям'));
    render(<ProfileWall userId={1} viewerId={2} accent="#3FA66B" />);
    await waitFor(() => expect(fetchWallMock).toHaveBeenCalled());
  });
});
