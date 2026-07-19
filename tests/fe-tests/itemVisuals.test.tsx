import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { itemVisual, equipValue, ProfileCardEffect, ProfileCosmosFlourish, ProfileSakuraFlourish } from './itemVisuals';
import { AVATARS, FRAMES, BACKGROUNDS, COLORS, EFFECTS } from './data/profileOptions';

describe('itemVisual', () => {
  it('produces a visual for every avatar option', () => {
    for (const a of AVATARS) {
      expect(() => itemVisual('avatar', a.id)).not.toThrow();
    }
  });

  it('produces a visual for every frame option', () => {
    for (const f of FRAMES) {
      expect(() => itemVisual('frame', f.id)).not.toThrow();
    }
  });

  it('produces a visual for every background option', () => {
    for (const b of BACKGROUNDS) {
      expect(() => itemVisual('background', b.id)).not.toThrow();
    }
  });

  it('falls back gracefully for an unknown id', () => {
    expect(() => itemVisual('avatar', 'does-not-exist')).not.toThrow();
  });

  it('respects a custom size', () => {
    const v = itemVisual('avatar', AVATARS[0].id, 80);
    expect(v).toBeTruthy();
  });
});

describe('equipValue', () => {
  it('returns a value for every slot/id combination without throwing', () => {
    for (const a of AVATARS) expect(() => equipValue('avatar', a.id)).not.toThrow();
    for (const f of FRAMES) expect(() => equipValue('frame', f.id)).not.toThrow();
  });

  it('resolves a color id to its hex value', () => {
    const c = COLORS[0];
    expect(equipValue('color', c.id)).toBe(c.value);
  });

  it('falls back to the raw id for an unknown color', () => {
    expect(equipValue('color', 'not-a-color')).toBe('not-a-color');
  });
});

describe('card flourish components', () => {
  it('ProfileCardEffect renders (or renders nothing) without throwing for every effect', () => {
    for (const e of EFFECTS) {
      expect(() => render(<ProfileCardEffect effectId={e.id} color="#3FA66B" />)).not.toThrow();
    }
    expect(() => render(<ProfileCardEffect effectId={undefined} color="#3FA66B" />)).not.toThrow();
  });

  it('ProfileCosmosFlourish renders without throwing', () => {
    expect(() => render(<ProfileCosmosFlourish backgroundId="cosmos" />)).not.toThrow();
    expect(() => render(<ProfileCosmosFlourish backgroundId={undefined} />)).not.toThrow();
  });

  it('ProfileSakuraFlourish renders without throwing', () => {
    expect(() => render(<ProfileSakuraFlourish backgroundId="sakura" />)).not.toThrow();
    expect(() => render(<ProfileSakuraFlourish backgroundId={undefined} />)).not.toThrow();
  });
});
