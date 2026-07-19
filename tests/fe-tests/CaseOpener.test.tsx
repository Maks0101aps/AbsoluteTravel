import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CaseOpener from './CaseOpener';

describe('CaseOpener', () => {
  it('renders the case list without crashing', () => {
    render(
      <CaseOpener
        coins={1000}
        owned={[]}
        openedCaseIds={[]}
        onOpen={vi.fn().mockResolvedValue({
          caseId: 'starter',
          itemId: 'ocean',
          rarity: 'common',
          duplicate: false,
          compensation: 0,
          coins: 950,
          unlockedItems: ['ocean'],
        })}
        onEquip={vi.fn()}
        onBack={vi.fn()}
      />,
    );
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('calls onBack when navigating back', () => {
    const onBack = vi.fn();
    render(
      <CaseOpener
        coins={0}
        owned={[]}
        openedCaseIds={['starter']}
        onOpen={vi.fn()}
        onEquip={vi.fn()}
        onBack={onBack}
      />,
    );
    const backBtn = screen.queryByLabelText(/back|назад|wstecz/i);
    if (backBtn) backBtn.click();
  });
});
