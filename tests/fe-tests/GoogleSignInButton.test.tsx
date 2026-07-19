import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import GoogleSignInButton from './GoogleSignInButton';

describe('GoogleSignInButton', () => {
  // VITE_GOOGLE_CLIENT_ID isn't set in the test environment, so the component
  // intentionally renders nothing (see GoogleSignInButton.tsx) rather than
  // showing a broken Google button — that's the behavior under test here.
  it('renders nothing without a configured client id, and does not throw', () => {
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts a disabled flag without throwing', () => {
    const { container } = render(<GoogleSignInButton onCredential={vi.fn()} disabled />);
    expect(container.firstChild).toBeNull();
  });
});
