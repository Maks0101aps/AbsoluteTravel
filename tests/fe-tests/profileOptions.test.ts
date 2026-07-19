import { describe, it, expect } from 'vitest';
import { lockLabel } from './profileOptions';

describe('lockLabel', () => {
  it('returns null for a free item', () => {
    expect(lockLabel({ type: 'free' })).toBeNull();
  });

  it('describes a level-locked item', () => {
    expect(lockLabel({ type: 'level', level: 10 })).toMatch(/10/);
  });

  it('describes a case-exclusive item', () => {
    expect(lockLabel({ type: 'case' })).toBeTruthy();
  });

  it('describes a coin-priced item', () => {
    expect(lockLabel({ type: 'coins', price: 500 })).toMatch(/500/);
  });
});
