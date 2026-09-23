import { describe, it, expect } from 'vitest';
import { unitSymbolOf, formatQuantityWithUnit } from './unitSymbol';
import {
  DIMENSIONLESS,
  MASS,
  LENGTH,
  TIME,
  VELOCITY,
  ACCEL,
  FORCE,
  ENERGY,
  TORQUE,
  MOMENT_OF_INERTIA,
  ANGULAR_VELOCITY,
  ANGULAR_MOMENTUM,
} from '@/kernel/units';
import type { Dimension } from '@/kernel/units';

describe('unitSymbolOf', () => {
  it('returns an empty string for DIMENSIONLESS — never a spurious unit suffix', () => {
    expect(unitSymbolOf(DIMENSIONLESS)).toBe('');
  });

  it('gives the base symbol for the single-axis named dimensions', () => {
    expect(unitSymbolOf(MASS)).toBe('kg');
    expect(unitSymbolOf(LENGTH)).toBe('m');
    expect(unitSymbolOf(TIME)).toBe('s');
  });

  it('gives idiomatic named symbols rather than a raw composition', () => {
    expect(unitSymbolOf(FORCE)).toBe('N');
    expect(unitSymbolOf(ENERGY)).toBe('J');
    expect(unitSymbolOf(ANGULAR_VELOCITY)).toBe('rad/s');
  });

  it('distinguishes TORQUE from ENERGY despite an identical Dimension value', () => {
    expect(unitSymbolOf(TORQUE)).toBe('N·m');
    expect(unitSymbolOf(ENERGY)).toBe('J');
    expect(unitSymbolOf(TORQUE)).not.toBe(unitSymbolOf(ENERGY));
  });

  it('composes velocity and acceleration from base symbols (matches the task-specified example)', () => {
    expect(unitSymbolOf(VELOCITY)).toBe('m/s');
    expect(unitSymbolOf(ACCEL)).toBe('m/s²');
  });

  it('composes a multi-term numerator with a middle dot', () => {
    expect(unitSymbolOf(MOMENT_OF_INERTIA)).toBe('kg·m²');
  });

  it('composes a numerator-over-denominator combination', () => {
    expect(unitSymbolOf(ANGULAR_MOMENTUM)).toBe('kg·m²/s');
  });

  it('composes an ad-hoc literal Dimension a module might hand-write (spring constant, kg/s²)', () => {
    const SPRING_CONSTANT: Dimension = [1, 0, -2, 0, 0, 0, 0];
    expect(unitSymbolOf(SPRING_CONSTANT)).toBe('kg/s²');
  });

  it('falls back to fully spelled-out exponents when two or more denominator terms would be ambiguous as one fraction', () => {
    // kg / (m*s) — a real single-slash "kg/m·s" would misread as (kg/m)*s.
    const AMBIGUOUS: Dimension = [1, -1, -1, 0, 0, 0, 0];
    const symbol = unitSymbolOf(AMBIGUOUS);
    expect(symbol).not.toContain('/');
    expect(symbol).toBe('kg·m⁻¹·s⁻¹');
  });
});

describe('formatQuantityWithUnit', () => {
  it('appends the unit directly after the SI-prefix letter, e.g. milli + meter reads as "mm"', () => {
    expect(formatQuantityWithUnit({ value: 0.847, dim: LENGTH })).toBe('847 mm');
  });

  it('shows no prefix letter when none is needed', () => {
    expect(formatQuantityWithUnit({ value: 4.56, dim: LENGTH })).toBe('4.56 m');
  });

  it('never appends a unit for a DIMENSIONLESS quantity', () => {
    const s = formatQuantityWithUnit({ value: 0.949, dim: DIMENSIONLESS });
    expect(s).toBe('0.949');
    expect(s).not.toContain(' ');
  });

  it('keeps a negative sign in front of the numeral, before the unit', () => {
    expect(formatQuantityWithUnit({ value: -4.56, dim: LENGTH })).toBe('-4.56 m');
  });

  it('reads a near-zero value as a plain "0.00 <unit>", not a bogus atto/yocto-prefixed one', () => {
    expect(formatQuantityWithUnit({ value: 0, dim: LENGTH })).toBe('0.00 m');
    expect(formatQuantityWithUnit({ value: Math.sin(Math.PI), dim: VELOCITY })).toBe('0.00 m/s');
  });

  it('composes a named idiomatic unit correctly (force in kilonewtons)', () => {
    expect(formatQuantityWithUnit({ value: 4560, dim: FORCE })).toBe('4.56 kN');
  });

  it('respects a custom sigFigs count', () => {
    expect(formatQuantityWithUnit({ value: 4.5678, dim: LENGTH }, 5)).toBe('4.5678 m');
  });

  // X-37: gluing an SI prefix onto a POWERED unit is dimensionally
  // wrong — "km²/s" reads as (km)²/s = 10^6 m²/s under standard SI
  // prefix rules, not the 1000x chooseSIPrefix actually computed from
  // the raw magnitude. All three reproduce the audit's own numbers.
  describe('X-37: a powered/composite unit falls back to scientific notation instead of a misleading prefix', () => {
    const AREA_PER_TIME: Dimension = [0, 2, -1, 0, 0, 0, 0]; // m^2/s
    const VOL_PER_TIME_SQ: Dimension = [0, 3, -2, 0, 0, 0, 0]; // m^3/s^2 (gravitational parameter mu)
    const SPECIFIC_ENERGY: Dimension = [0, 2, -2, 0, 0, 0, 0]; // m^2/s^2

    it('2000 m^2/s is NOT shown as "2.00 km²/s" (which would read as 2e6 m^2/s)', () => {
      const s = formatQuantityWithUnit({ value: 2000, dim: AREA_PER_TIME });
      expect(s).not.toBe('2.00 km²/s');
      expect(s).toBe('2.00×10³ m²/s');
    });

    it('3.986e14 m^3/s^2 is NOT shown as "399 Tm³/s²"', () => {
      const s = formatQuantityWithUnit({ value: 3.986e14, dim: VOL_PER_TIME_SQ });
      expect(s).not.toContain('Tm');
      expect(s).toBe('3.99×10¹⁴ m³/s²');
    });

    it('gravitation\'s reachable case: specific energy -0.1 m^2/s^2 is NOT shown as "-100 mm²/s²" (1000x off)', () => {
      const s = formatQuantityWithUnit({ value: -0.1, dim: SPECIFIC_ENERGY });
      expect(s).not.toBe('-100 mm²/s²');
      expect(s).toBe('-1.00×10⁻¹ m²/s²');
    });

    it('a leading-exponent-1 composite (velocity, m/s) is still prefixed normally', () => {
      expect(formatQuantityWithUnit({ value: 2000, dim: VELOCITY })).toBe('2.00 km/s');
    });

    it('a leading MASS (kg) composite also falls back to scientific, per the pre-existing kg exception', () => {
      expect(formatQuantityWithUnit({ value: 2000, dim: MOMENT_OF_INERTIA })).toBe(
        '2.00×10³ kg·m²',
      );
    });
  });
});
