import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Icon, type IconName } from './icons';

// Rendering every icon name exercises the full PATHS map in one go.
const ALL_ICONS: IconName[] = [
  'compass', 'mountain', 'pine', 'tent', 'map', 'signpost', 'binoculars',
  'flame', 'backpack', 'feather', 'shield', 'moon', 'sun', 'crown',
  'leaf', 'boot', 'camera', 'flag', 'trophy',
  'user', 'users', 'shoppingBag', 'image', 'target', 'star', 'sparkle',
  'lock', 'coin', 'pencil', 'close', 'check', 'plus', 'arrowLeft', 'arrowRight',
  'messageSquare', 'mic', 'smile', 'hexagon', 'gift', 'globe', 'medal',
  'alertTriangle', 'chevronUp', 'bell', 'bellOff',
];

describe('Icon', () => {
  it.each(ALL_ICONS)('renders the "%s" icon without crashing', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('applies the requested size to the svg element', () => {
    const { container } = render(<Icon name="compass" size={32} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '32');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('defaults to a 24px icon with currentColor stroke', () => {
    const { container } = render(<Icon name="star" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('is marked aria-hidden (decorative)', () => {
    const { container } = render(<Icon name="user" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });
});
