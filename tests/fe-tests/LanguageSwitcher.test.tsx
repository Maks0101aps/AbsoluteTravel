import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LanguageSwitcher from './LanguageSwitcher';
import { LANGUAGES } from './i18n';

describe('LanguageSwitcher', () => {
  it('renders a button for every configured language', () => {
    render(<LanguageSwitcher accent="#3FA66B" />);
    for (const lang of LANGUAGES) {
      expect(screen.getByText(lang.label)).toBeTruthy();
    }
  });

  it('switching language does not throw', () => {
    render(<LanguageSwitcher accent="#3FA66B" />);
    const other = LANGUAGES.find((l) => l.code !== 'uk') ?? LANGUAGES[0];
    fireEvent.click(screen.getByText(other.label));
    expect(screen.getByText(other.label)).toBeTruthy();
  });
});
