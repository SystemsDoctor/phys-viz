// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. These cover the golden-value SHM/energy-conservation physics
// that's specific to this module.
import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import { formatQuantity, VELOCITY } from '@/kernel/units';
import module from './index';
import type { ModuleState } from '../types';

// A minimal structural stand-in for SceneContext, built locally rather
// than importing MockSceneContext — modules may not import a sibling
// module (or `modules/testing`) via any path (ARCHITECTURE.md §6).
const noopHandle = { set: () => {}, visible: () => {}, dispose: () => {} };
const fakeCtx = new Proxy({} as SceneContext, {
  get(_target, prop) {
    if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
    if (prop === 'up') return 'y';
    if (prop === 'group') return (name: string) => ({ id: name });
    return () => noopHandle;
  },
});

function stateAt(t: number, mass: number, k: number, amplitude: number): ModuleState {
  return {
    params: { mass, k, amplitude },
    layers: { landscape: true, particle: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('work-energy');
  });

  it('starts at the turning point: x=A, U=E, KE=0 at t=0', () => {
    const instance = module.create(fakeCtx);
    const mass = 1;
    const k = 10;
    const A = 1.5;
    const E = 0.5 * k * A * A;

    const { PE, KE, E: total } = instance.scalars(stateAt(0, mass, k, A));
    expect(PE).toBeCloseTo(E, 10);
    expect(KE).toBeCloseTo(0, 10);
    expect(total).toBeCloseTo(E, 10);
  });

  it('reaches maximum speed at x=0, a quarter period in: KE=E, speed=Aω', () => {
    const instance = module.create(fakeCtx);
    const mass = 2;
    const k = 8;
    const A = 1.2;
    const omega = Math.sqrt(k / mass);
    const quarterPeriod = (2 * Math.PI) / omega / 4;

    const { PE, KE, speed } = instance.scalars(stateAt(quarterPeriod, mass, k, A));
    expect(PE).toBeCloseTo(0, 8);
    expect(KE).toBeCloseTo(0.5 * k * A * A, 8);
    expect(speed).toBeCloseTo(A * omega, 8);
  });

  it('conserves total energy PE+KE=E across a full period, sampled densely', () => {
    const instance = module.create(fakeCtx);
    const mass = 1.3;
    const k = 15;
    const A = 2;
    const omega = Math.sqrt(k / mass);
    const period = (2 * Math.PI) / omega;

    for (let i = 0; i <= 20; i++) {
      const t = (period * i) / 20;
      const { PE, KE, E } = instance.scalars(stateAt(t, mass, k, A));
      expect(PE + KE).toBeCloseTo(E, 8);
      expect(E).toBeCloseTo(0.5 * k * A * A, 8);
    }
  });

  it('the work-energy theorem: ΔKE from the turning point to any x equals -ΔU', () => {
    const instance = module.create(fakeCtx);
    const mass = 1;
    const k = 12;
    const A = 1.8;
    const omega = Math.sqrt(k / mass);

    const start = instance.scalars(stateAt(0, mass, k, A));
    const later = instance.scalars(stateAt(0.37 / omega, mass, k, A));

    const deltaKE = later.KE - start.KE;
    const deltaPE = later.PE - start.PE;
    expect(deltaKE).toBeCloseTo(-deltaPE, 8);
  });

  it('a turning-point speed reads as exact "0.00" in the readout, not floating-point trig noise misread as a large number (regression)', () => {
    // Reported live: the sidebar's "Speed" readout showed values "in the
    // hundreds" right where speed should visibly settle near zero, at
    // the ends of the potential surface (the turning points). Root
    // cause: v = -A*omega*Math.sin(omega*t) is exactly 0 mathematically
    // at a turning point (omega*t = a multiple of pi), but Math.sin of
    // a float64 APPROXIMATION of pi is essentially never exactly 0
    // (Math.sin(Math.PI) = 1.2246...e-16) — kernel/units' formatQuantity
    // used to route that residue through the SI-prefix ladder into an
    // absurd atto/zepto/yocto scale whose mantissa could print as a
    // misleadingly large-looking 2-3 digit number.
    const instance = module.create(fakeCtx);
    const mass = 1;
    const k = 10;
    const A = 1.5;
    const omega = Math.sqrt(k / mass);
    const halfPeriod = Math.PI / omega; // a turning point: x = -A, v should be exactly 0

    const { speed } = instance.scalars(stateAt(halfPeriod, mass, k, A));
    // The raw closed-form value may still carry a tiny non-zero residue
    // — that's fine and expected; what must be fixed is the READOUT.
    expect(speed).toBeLessThan(1e-9);
    expect(formatQuantity({ value: speed, dim: VELOCITY }).trim()).toBe('0.00');
  });

  it('larger amplitude raises the total energy but leaves the period unchanged (SHM)', () => {
    const instance = module.create(fakeCtx);
    const mass = 1;
    const k = 10;

    const small = instance.scalars(stateAt(0, mass, k, 1));
    const large = instance.scalars(stateAt(0, mass, k, 2));

    expect(large.E).toBeGreaterThan(small.E);
    expect(large.period).toBeCloseTo(small.period, 10);
  });
});
