import { describe, it, expect } from 'vitest';
import * as U from './index';
import type { Dimension, Quantity } from './index';

const LENGTH: Dimension = [0, 1, 0, 0, 0, 0, 0];
const TIME: Dimension = [0, 0, 1, 0, 0, 0, 0];
const VELOCITY: Dimension = [0, 1, -1, 0, 0, 0, 0];
const MASS: Dimension = [1, 0, 0, 0, 0, 0, 0];

describe('addQ', () => {
  it('adds two quantities of the same dimension', () => {
    const a: Quantity = { value: 3, dim: LENGTH };
    const b: Quantity = { value: 4, dim: LENGTH };
    expect(U.addQ(a, b)).toEqual({ value: 7, dim: LENGTH });
  });

  it('throws when dimensions mismatch', () => {
    const a: Quantity = { value: 3, dim: LENGTH };
    const b: Quantity = { value: 4, dim: TIME };
    expect(() => U.addQ(a, b)).toThrow();
  });

  it('allows adding dimensionless quantities', () => {
    const a: Quantity = { value: 1, dim: U.DIMENSIONLESS };
    const b: Quantity = { value: 2, dim: U.DIMENSIONLESS };
    expect(U.addQ(a, b).value).toBe(3);
  });
});

describe('mulQ', () => {
  it('multiplies values and sums dimension exponents (length * time^-1 = velocity)', () => {
    const length: Quantity = { value: 10, dim: LENGTH };
    const inverseTime: Quantity = { value: 2, dim: [0, 0, -1, 0, 0, 0, 0] };
    const result = U.mulQ(length, inverseTime);
    expect(result.value).toBe(20);
    expect(result.dim).toEqual(VELOCITY);
  });

  it('never throws regardless of dimension (multiplication is always defined)', () => {
    const a: Quantity = { value: 1, dim: MASS };
    const b: Quantity = { value: 1, dim: TIME };
    expect(() => U.mulQ(a, b)).not.toThrow();
  });
});

describe('divQ', () => {
  it('divides values and subtracts dimension exponents (length / time = velocity)', () => {
    const length: Quantity = { value: 10, dim: LENGTH };
    const time: Quantity = { value: 5, dim: TIME };
    const result = U.divQ(length, time);
    expect(result.value).toBe(2);
    expect(result.dim).toEqual(VELOCITY);
  });

  it('dividing a quantity by itself yields dimensionless', () => {
    const a: Quantity = { value: 5, dim: LENGTH };
    const result = U.divQ(a, a);
    expect(result.dim).toEqual(U.DIMENSIONLESS);
    expect(result.value).toBe(1);
  });
});

describe('formatQuantity', () => {
  it('formats a simple value with no prefix', () => {
    expect(U.formatQuantity({ value: 4.56, dim: U.DIMENSIONLESS }).trim()).toBe('4.56');
  });

  it('formats zero', () => {
    expect(U.formatQuantity({ value: 0, dim: U.DIMENSIONLESS }).trim()).toBe('0.00');
  });

  it('picks the kilo prefix for thousands', () => {
    const s = U.formatQuantity({ value: 4560, dim: U.DIMENSIONLESS });
    expect(s.trim()).toBe('4.56k');
  });

  it('picks the milli prefix for small values', () => {
    const s = U.formatQuantity({ value: 0.00456, dim: U.DIMENSIONLESS });
    expect(s.trim()).toBe('4.56m');
  });

  it('picks the micro prefix', () => {
    const s = U.formatQuantity({ value: 0.0000123, dim: U.DIMENSIONLESS });
    expect(s.trim()).toBe('12.3µ');
  });

  it('prefixes negative values with a minus sign', () => {
    const s = U.formatQuantity({ value: -4.56, dim: U.DIMENSIONLESS });
    expect(s.startsWith('-')).toBe(true);
    expect(s.trim()).toBe('-4.56');
  });

  it('is fixed-width across a range of magnitudes for a fixed sigFigs', () => {
    const widths = new Set<number>();
    for (const value of [1, 12, 123, 1234, 12345, 0.1, 0.01, 0.001, 999, 999999]) {
      widths.add(U.formatQuantity({ value, dim: U.DIMENSIONLESS }, 3).length);
    }
    expect(widths.size).toBe(1);
  });

  it('respects a custom sigFigs count', () => {
    const s = U.formatQuantity({ value: 4.5678, dim: U.DIMENSIONLESS }, 5);
    expect(s.trim()).toBe('4.5678');
  });

  it('renders engineering-notation groups correctly (2 and 3 integer digits before the decimal)', () => {
    expect(U.formatQuantity({ value: 45.6, dim: U.DIMENSIONLESS }).trim()).toBe('45.6');
    expect(U.formatQuantity({ value: 456, dim: U.DIMENSIONLESS }).trim()).toBe('456');
  });

  it('corrects a Math.log10 rounding artifact just under a power-of-1000 boundary', () => {
    // Math.log10(999999.9999999999) rounds to exactly 6, which would
    // otherwise pick prefixExp=6 (mega) and land mantissa just under 1.
    const s = U.formatQuantity({ value: 999999.9999999999, dim: U.DIMENSIONLESS });
    expect(s.trim()).toBe('1.00M');
  });

  it('handles a value that rounds up into the next engineering-notation group', () => {
    // 999.96 rounds to "1000" at 3 sig figs, which must bump to the next
    // prefix rather than printing a 4-digit mantissa.
    const s = U.formatQuantity({ value: 999.96, dim: U.DIMENSIONLESS });
    expect(s.trim()).toBe('1.00k');
  });

  it('clamps the prefix at the top of the supported range instead of throwing', () => {
    const s = U.formatQuantity({ value: 1e30, dim: U.DIMENSIONLESS });
    expect(s).toContain('Y');
    expect(() => U.formatQuantity({ value: 1e30, dim: U.DIMENSIONLESS })).not.toThrow();
  });

  it('clamps the prefix at the bottom of the supported range instead of throwing', () => {
    const s = U.formatQuantity({ value: 1e-30, dim: U.DIMENSIONLESS });
    expect(s).toContain('y');
  });
});
