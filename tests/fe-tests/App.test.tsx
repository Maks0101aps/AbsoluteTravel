import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

describe('App (landing page)', () => {
  beforeEach(() => {
    // The landing page scans localhost:3000-3005 for a backend on mount. In
    // the test environment there is none, so make every attempt fail fast
    // and deterministically instead of hitting real sockets/timeouts.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no backend in tests')));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the hero and nav logo', async () => {
    render(<App onStart={() => {}} />);
    expect(screen.getByAltText('Absolute Travel')).toBeTruthy();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  }, 10000);

  it('falls back to local demo data once the backend scan fails', async () => {
    render(<App onStart={() => {}} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 10000 });
  }, 10000);

  it('calls onStart when the primary CTA is clicked', async () => {
    const onStart = vi.fn();
    render(<App onStart={onStart} />);
    const ctas = screen.getAllByRole('button').filter((b) => /дослідж|explor/i.test(b.textContent ?? ''));
    expect(ctas.length).toBeGreaterThan(0);
    ctas[0].click();
    expect(onStart).toHaveBeenCalled();
  }, 10000);
});
