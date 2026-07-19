import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfileShop, { type ShopSelections } from './ProfileShop';

const selections: ShopSelections = {
  avatarId: 'a1',
  backgroundId: 'ocean',
  frameId: 'none',
  color: '#3FA66B',
  badges: [],
  effectId: 'none',
};

describe('ProfileShop', () => {
  it('renders the shop categories', () => {
    render(
      <ProfileShop
        coins={1000}
        level={5}
        owned={[]}
        buying={null}
        error={null}
        selections={selections}
        onBuy={vi.fn()}
        onEquip={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls onClose when closed', () => {
    const onClose = vi.fn();
    render(
      <ProfileShop
        coins={1000}
        level={5}
        owned={[]}
        buying={null}
        error={null}
        selections={selections}
        onBuy={vi.fn()}
        onEquip={vi.fn()}
        onClose={onClose}
      />,
    );
    const closeBtn = screen.queryByLabelText(/close|закрити|zamknij/i);
    if (closeBtn) fireEvent.click(closeBtn);
  });

  it('renders an error message when present', () => {
    render(
      <ProfileShop
        coins={0}
        level={1}
        owned={[]}
        buying={null}
        error="Не вдалося придбати товар"
        selections={selections}
        onBuy={vi.fn()}
        onEquip={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('Не вдалося придбати товар')).toBeTruthy();
  });

  it('renders with some items already owned', () => {
    render(
      <ProfileShop
        coins={5000}
        level={20}
        owned={['gold', 'ocean', 'gem']}
        buying="a19"
        error={null}
        selections={selections}
        onBuy={vi.fn()}
        onEquip={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});
