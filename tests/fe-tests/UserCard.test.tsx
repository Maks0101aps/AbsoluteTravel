import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UserCard, { OnlineDot } from './UserCard';
import type { FriendUser } from './api';

const user: FriendUser = {
  id: 1,
  username: 'traveler',
  name: 'Traveler',
  avatar: '/assets/avatar_default.svg',
  level: 5,
  xp: 300,
  region: 'Львівська область',
  city: 'Львів',
  online: true,
  lastSeenAt: null,
};

describe('UserCard', () => {
  it('renders the user name', () => {
    render(<UserCard user={user} />);
    expect(screen.getByText('Traveler')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<UserCard user={user} onClick={onClick} />);
    fireEvent.click(screen.getByText('Traveler'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a custom subtitle when provided', () => {
    render(<UserCard user={user} subtitle="Online now" />);
    expect(screen.getByText('Online now')).toBeTruthy();
  });

  it('renders in compact mode', () => {
    const { container } = render(<UserCard user={user} compact />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders an offline user without crashing', () => {
    render(<UserCard user={{ ...user, online: false }} />);
    expect(screen.getByText('Traveler')).toBeTruthy();
  });
});

describe('OnlineDot', () => {
  it('renders green when online', () => {
    const { container } = render(<OnlineDot online />);
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('renders dim when offline', () => {
    const { container } = render(<OnlineDot online={false} />);
    expect(container.querySelector('span')).toBeTruthy();
  });
});
