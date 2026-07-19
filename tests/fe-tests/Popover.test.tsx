import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Popover, { type AnchorRect } from './Popover';

const anchor: AnchorRect = { top: 100, left: 100, bottom: 130, right: 200, width: 100 };

describe('Popover', () => {
  it('renders its title and children', () => {
    render(
      <Popover anchor={anchor} title="Test Title" accent="#3FA66B" onClose={vi.fn()}>
        <div>Popover body</div>
      </Popover>,
    );
    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Popover body')).toBeTruthy();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Popover anchor={anchor} title="T" accent="#3FA66B" onClose={onClose}>
        <div>Body</div>
      </Popover>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside', () => {
    const onClose = vi.fn();
    render(
      <Popover anchor={anchor} title="T" accent="#3FA66B" onClose={onClose}>
        <div>Body</div>
      </Popover>,
    );
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });

  it('accepts a custom width', () => {
    const { container } = render(
      <Popover anchor={anchor} title="T" width={400} accent="#3FA66B" onClose={vi.fn()}>
        <div>Body</div>
      </Popover>,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
