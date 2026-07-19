import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationsSettings from './NotificationsSettings';
import type { PushState } from './usePush';

const usePushMock = vi.fn<[], PushState>();
vi.mock('./usePush', () => ({
  usePush: () => usePushMock(),
}));

const baseState: PushState = {
  supported: true,
  permission: 'default',
  subscribed: false,
  busy: false,
  error: null,
  enable: vi.fn(),
  disable: vi.fn(),
};

describe('NotificationsSettings', () => {
  beforeEach(() => {
    usePushMock.mockReset();
  });

  it('shows the "unsupported" message when push is not supported', () => {
    usePushMock.mockReturnValue({ ...baseState, supported: false });
    render(<NotificationsSettings userId={1} accent="#3FA66B" />);
    expect(screen.getByText(/не підтримує|doesn't support|nie obsługuje/i)).toBeTruthy();
  });

  it('shows an "enable" button when notifications are off', () => {
    usePushMock.mockReturnValue(baseState);
    render(<NotificationsSettings userId={1} accent="#3FA66B" />);
    expect(screen.getByRole('button', { name: /увімкнути|enable|włącz/i })).toBeTruthy();
  });

  it('calls enable(userId) when the toggle is clicked while off', () => {
    const enable = vi.fn();
    usePushMock.mockReturnValue({ ...baseState, enable });
    render(<NotificationsSettings userId={42} accent="#3FA66B" />);
    fireEvent.click(screen.getByRole('button', { name: /увімкнути|enable|włącz/i }));
    expect(enable).toHaveBeenCalledWith(42);
  });

  it('shows a "disable" button and calls disable(userId) when subscribed', () => {
    const disable = vi.fn();
    usePushMock.mockReturnValue({ ...baseState, subscribed: true, disable });
    render(<NotificationsSettings userId={7} accent="#3FA66B" />);
    const btn = screen.getByRole('button', { name: /вимкнути|disable|wyłącz/i });
    fireEvent.click(btn);
    expect(disable).toHaveBeenCalledWith(7);
  });

  it('disables the toggle while a request is in flight', () => {
    usePushMock.mockReturnValue({ ...baseState, busy: true });
    render(<NotificationsSettings userId={1} accent="#3FA66B" />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables the toggle and shows guidance when permission is blocked', () => {
    usePushMock.mockReturnValue({ ...baseState, permission: 'denied' });
    render(<NotificationsSettings userId={1} accent="#3FA66B" />);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/заблоковані|blocked|zablokowane/i)).toBeTruthy();
  });
});
