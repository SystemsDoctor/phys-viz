// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. These cover the golden-value collision physics that's specific
// to this module.
import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
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

function stateAt(
  t: number,
  m1: number,
  m2: number,
  u1: number,
  u2: number,
  e: number,
  cmFrame = false,
): ModuleState {
  return {
    params: { m1, m2, u1, u2, e, cmFrame },
    layers: { carts: true, cm: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('momentum-collisions');
  });

  it('conserves total momentum across the collision, for every e', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1.5;
    const m2 = 3;
    const u1 = 4;
    const u2 = -2;
    const pBefore = m1 * u1 + m2 * u2;

    for (const e of [0, 0.3, 0.7, 1]) {
      // Sample well before and well after the collision instant.
      for (const t of [0, 0.1, 3, 10]) {
        const { pTotal } = instance.scalars(stateAt(t, m1, m2, u1, u2, e));
        expect(pTotal).toBeCloseTo(pBefore, 8);
      }
    }
  });

  it('elastic collision (e=1) conserves kinetic energy across the collision', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1;
    const m2 = 2;
    const u1 = 3;
    const u2 = -1;

    const before = instance.scalars(stateAt(0, m1, m2, u1, u2, 1));
    const after = instance.scalars(stateAt(10, m1, m2, u1, u2, 1));
    expect(after.KE).toBeCloseTo(before.KE, 8);
  });

  it('elastic, equal-mass collision swaps the two velocities exactly', () => {
    const instance = module.create(fakeCtx);
    const m1 = 2;
    const m2 = 2;
    const u1 = 5;
    const u2 = -3;

    const after = instance.scalars(stateAt(10, m1, m2, u1, u2, 1));
    expect(after.v1).toBeCloseTo(u2, 8);
    expect(after.v2).toBeCloseTo(u1, 8);
  });

  it('perfectly inelastic collision (e=0) leaves both carts at the CM velocity', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1;
    const m2 = 3;
    const u1 = 4;
    const u2 = -2;
    const vcm = (m1 * u1 + m2 * u2) / (m1 + m2);

    const after = instance.scalars(stateAt(10, m1, m2, u1, u2, 0));
    expect(after.v1).toBeCloseTo(vcm, 8);
    expect(after.v2).toBeCloseTo(vcm, 8);
    expect(after.vcm).toBeCloseTo(vcm, 8);
  });

  it('loses kinetic energy for e strictly between 0 and 1, conserves it only at e=1', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1;
    const m2 = 2;
    const u1 = 3;
    const u2 = -1;
    const before = instance.scalars(stateAt(0, m1, m2, u1, u2, 0.4)).KE;

    const partiallyInelastic = instance.scalars(stateAt(10, m1, m2, u1, u2, 0.4)).KE;
    const elastic = instance.scalars(stateAt(10, m1, m2, u1, u2, 1)).KE;
    expect(partiallyInelastic).toBeLessThan(before);
    expect(elastic).toBeCloseTo(before, 8);
  });

  it('never collides when cart 1 does not approach cart 2 (u1 <= u2): velocities never change', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1;
    const m2 = 1;
    const u1 = 1;
    const u2 = 3; // moving apart from the start

    for (const t of [0, 1, 20]) {
      const { v1, v2 } = instance.scalars(stateAt(t, m1, m2, u1, u2, 1));
      expect(v1).toBeCloseTo(u1, 10);
      expect(v2).toBeCloseTo(u2, 10);
    }
  });

  it('CM velocity is independent of e and of t (only masses and initial velocities set it)', () => {
    const instance = module.create(fakeCtx);
    const m1 = 1;
    const m2 = 2;
    const u1 = 3;
    const u2 = -1;
    const vcm = (m1 * u1 + m2 * u2) / (m1 + m2);

    for (const e of [0, 0.5, 1]) {
      for (const t of [0, 5, 15]) {
        expect(instance.scalars(stateAt(t, m1, m2, u1, u2, e)).vcm).toBeCloseTo(vcm, 10);
      }
    }
  });
});
