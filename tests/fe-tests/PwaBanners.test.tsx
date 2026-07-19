import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PwaBanners from './PwaBanners';
import type { PwaState } from './usePwa';

const usePwaMock = vi.fn<[], PwaState>();
vi.mock('./usePwa', () => ({
  usePwa: () => usePwaMock(),
}));

const basePwaState: PwaState = {
  offline: false,
  needRefresh: false,
  canInstall: false,
  installed: false,
  promptInstall: vi.fn(),
  dismissInstall: vi.fn(),
  update: vi.fn(),
};

describe('PwaBanners', () => {
  beforeEach(() => {
    usePwaMock.mockReset();
  });

  it('renders nothing when there is nothing to show', () => {
    usePwaMock.mockReturnValue(basePwaState);
    const { container } = render(<PwaBanners />);
    expect(container.textContent).toBe('');
  });

  it('shows the offline banner when offline is true', () => {
    usePwaMock.mockReturnValue({ ...basePwaState, offline: true });
    render(<PwaBanners />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('shows the install card when canInstall is true', () => {
    usePwaMock.mockReturnValue({ ...basePwaState, canInstall: true });
    render(<PwaBanners />);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows the update toast when needRefresh is true', () => {
    usePwaMock.mockReturnValue({ ...basePwaState, needRefresh: true });
    render(<PwaBanners />);
    // Both the offline pill and the update toast use role="status"; assert at
    // least one status region renders instead of assuming there's only one.
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('can show the offline banner and install card at the same time', () => {
    usePwaMock.mockReturnValue({ ...basePwaState, offline: true, canInstall: true });
    render(<PwaBanners />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
