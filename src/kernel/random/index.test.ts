import { describe, it, expect } from 'vitest';
import { createRng, nextInt, nextRange } from './index';

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds produce different sequences', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a()).not.toBe(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not repeat the first value immediately (sanity check against a constant generator)', () => {
    const rng = createRng(0);
    const v1 = rng();
    const v2 = rng();
    expect(v1).not.toBe(v2);
  });
});

describe('nextInt', () => {
  it('stays within [min, max)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 500; i++) {
      const v = nextInt(rng, 3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('nextRange', () => {
  it('stays within [min, max)', () => {
    const rng = createRng(456);
    for (let i = 0; i < 500; i++) {
      const v = nextRange(rng, -2, 5);
      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });
});
