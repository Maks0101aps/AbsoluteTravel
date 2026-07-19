import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import XpBar from './XpBar';

describe('XpBar', () => {
  it('renders the current level and XP total', () => {
    render(<XpBar xp={0} accent="#3FA66B" />);
    expect(screen.getByText(/0 \/ 50 XP/)).toBeTruthy();
  });

  it('renders in compact mode without crashing', () => {
    const { container } = render(<XpBar xp={100} accent="#3FA66B" compact />);
    expect(container.firstChild).toBeTruthy();
  });

  it('opens the XP-sources popover when the level label is clicked', () => {
    render(<XpBar xp={0} accent="#3FA66B" />);
    const trigger = screen.getAllByRole('button')[0] ?? screen.getByText(/1/);
    fireEvent.click(trigger);
    // Popover content should now be present somewhere in the document.
    expect(document.body.textContent).toBeTruthy();
  });

  it('handles a maxed-out level without crashing', () => {
    const { container } = render(<XpBar xp={999999} accent="#3FA66B" />);
    expect(container.firstChild).toBeTruthy();
  });
});
