import { describe, it, expect } from 'vitest';
import { runMigrations } from './migrations';
import type { Migration } from './migrations';

describe('runMigrations', () => {
  it('applies a single migration step and reports migrated: true', () => {
    const table: Record<string, Record<number, Migration>> = {
      'demo-module': { 1: (old) => ({ ...old, angle: (old.degrees as number) * (Math.PI / 180) }) },
    };
    const result = runMigrations('demo-module', 1, 2, { degrees: 90 }, table);
    expect(result.migrated).toBe(true);
    expect(result.params.angle).toBeCloseTo(Math.PI / 2, 10);
  });

  it('chains multiple sequential migration steps in order', () => {
    const table: Record<string, Record<number, Migration>> = {
      m: {
        1: (old) => ({ ...old, x: (old.x as number) + 1 }),
        2: (old) => ({ ...old, x: (old.x as number) * 2 }),
      },
    };
    // v1 -> v3: apply step 1 (x+1), then step 2 (x*2).
    const result = runMigrations('m', 1, 3, { x: 5 }, table);
    expect(result.migrated).toBe(true);
    expect(result.params.x).toBe(12); // (5 + 1) * 2
  });

  it('reports migrated: false and returns the raw input untouched when a step is missing', () => {
    const table: Record<string, Record<number, Migration>> = {
      m: { 1: (old) => ({ ...old, seen: true }) },
      // no entry for v2 — a link encoded at v1 asking to reach v3 can't bridge the gap.
    };
    const raw = { x: 1 };
    const result = runMigrations('m', 1, 3, raw, table);
    expect(result.migrated).toBe(false);
    expect(result.params).toBe(raw); // same reference, untouched
  });

  it('reports migrated: false for a PARTIAL chain, not just a fully-missing one', () => {
    // This is the case a naive reference-equality check gets wrong: the
    // first step DOES run (producing a new object), but the chain still
    // never reaches toVersion because the second step is missing.
    const table: Record<string, Record<number, Migration>> = {
      m: { 1: (old) => ({ ...old, step1: true }) },
    };
    const result = runMigrations('m', 1, 3, { x: 1 }, table);
    expect(result.migrated).toBe(false);
  });

  it('reports migrated: true and returns the input unchanged when fromVersion === toVersion (no migration needed)', () => {
    const result = runMigrations('m', 1, 1, { x: 1 }, {});
    expect(result.migrated).toBe(true);
    expect(result.params).toEqual({ x: 1 });
  });

  it('an unregistered module id with no table entry reports migrated: false', () => {
    const result = runMigrations('nonexistent', 1, 2, { x: 1 }, {});
    expect(result.migrated).toBe(false);
  });

  it('defaults to the real exported migrations table when none is passed', () => {
    // No module has bumped schemaVersion yet, so this should report
    // migrated: false for any nonzero gap — proves the default
    // parameter wiring itself works, independent of the synthetic
    // tables the other tests use.
    const result = runMigrations('vector-algebra', 1, 2, {});
    expect(result.migrated).toBe(false);
  });
});
