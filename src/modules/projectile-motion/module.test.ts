// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. Add tests in this file only for behavior specific to this
// module (e.g. a golden-value physics check).
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

function stateAt(t: number, speed: number, angle: number, g: number): ModuleState {
  return {
    params: { speed, angle, g },
    layers: { projectile: true, trace: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('projectile-motion');
  });

  it('range and max height match the closed-form kinematics formulas (45°, v0=20, g=9.8)', () => {
    const instance = module.create(fakeCtx);
    const speed = 20;
    const angle = Math.PI / 4;
    const g = 9.8;
    const { range, maxHeight } = instance.scalars(stateAt(0, speed, angle, g));

    // R = v0^2 * sin(2*theta) / g, H = (v0*sin(theta))^2 / (2*g).
    expect(range).toBeCloseTo((speed * speed * Math.sin(2 * angle)) / g, 10);
    expect(maxHeight).toBeCloseTo((speed * Math.sin(angle)) ** 2 / (2 * g), 10);
    // At 45 degrees range and 4*maxHeight coincide exactly (sin(90) = 1,
    // sin(45)^2 = 1/2), a known special case worth pinning as a golden
    // value rather than just re-deriving the same formula both places.
    expect(range).toBeCloseTo(4 * maxHeight, 10);
  });

  it('45° launch angle gives the maximum range for a fixed speed and gravity', () => {
    const instance = module.create(fakeCtx);
    const speed = 15;
    const g = 9.8;
    const rangeAt = (angle: number) => instance.scalars(stateAt(0, speed, angle, g)).range;

    const range45 = rangeAt(Math.PI / 4);
    expect(range45).toBeGreaterThan(rangeAt(Math.PI / 6));
    expect(range45).toBeGreaterThan(rangeAt(Math.PI / 3));
  });
});
