import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import { compileExpr } from '@/kernel/expr';
import { grad } from '@/kernel/calculus';
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

function defaultParams(): ModuleState['params'] {
  const params: ModuleState['params'] = {};
  for (const p of module.params) params[p.key] = p.default;
  return params;
}

function stateWith(overrides: Record<string, ModuleState['params'][string]>, t = 0): ModuleState {
  return { params: { ...defaultParams(), ...overrides }, layers: {}, t };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('fields-gradients');
  });

  it('declares urlKeys that are unique and <= 4 characters', () => {
    const keys = module.params.map((p) => p.urlKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
    const layerKeys = module.layers.map((l) => l.urlKey);
    expect(new Set(layerKeys).size).toBe(layerKeys.length);
    for (const k of layerKeys) expect(k.length).toBeLessThanOrEqual(4);
  });

  it('golden value: curl of the default field is the constant (0,0,2)', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({}));
    expect(s.curlMag).toBeCloseTo(2, 8);
  });

  it('golden value: divergence of the default field at the box center is 2x+2y+1', () => {
    const instance = module.create(fakeCtx);
    const boxCenter: [number, number, number] = [0.7, -0.3, 1.1];
    const s = instance.scalars(stateWith({ boxCenter }));
    const expected = 2 * boxCenter[0] + 2 * boxCenter[1] + 1;
    expect(s.divAtBox).toBeCloseTo(expected, 6);
  });

  it('the divergence theorem holds: flux through the box equals the volume integral of its divergence', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ n: 6 }));
    expect(s.divergenceGap).toBeLessThan(1e-6);
  });

  it('shrinking-box limit: flux/volume converges to the pointwise divergence as the box shrinks', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ boxHalfSize: 0.01, n: 6 }));
    expect(s.fluxOverVolume).toBeCloseTo(s.divAtBox, 3);
  });

  it("Stokes' theorem holds: circulation converges to the flux of curl F through the cap as n grows (both are trig-parametrized, so unlike the box faces this is genuine quadrature convergence, not exact at any finite n)", () => {
    const instance = module.create(fakeCtx);
    const low = instance.scalars(stateWith({ n: 2 }));
    const high = instance.scalars(stateWith({ n: 16 }));
    expect(high.stokesGap).toBeLessThan(low.stokesGap);
    expect(high.stokesGap).toBeLessThan(1e-3);
  });

  it('Stokes surface-independence: the flux of curl F through the cap is the same flat or deeply bowled', () => {
    const instance = module.create(fakeCtx);
    const flat = instance.scalars(stateWith({ capDepth: 0, n: 8 }));
    const bowl = instance.scalars(stateWith({ capDepth: 1.2, n: 8 }));
    expect(bowl.curlFluxThroughCap).toBeCloseTo(flat.curlFluxThroughCap, 4);
  });

  it('the gradient is perpendicular to the level-curve tangent direction at the probe', () => {
    // Independently re-derived from the default f, not read off the
    // module's own internals — the module's update() is trusted to use
    // the same kernel grad() call this test does (code review, not a
    // second implementation, is what keeps the two in sync).
    const f = compileExpr('sin(x) * cos(y)', ['x', 'y']);
    if (typeof f !== 'function') throw new Error('unexpected expression error');
    const px = 1.2;
    const py = -0.8;
    const g = grad((p) => f({ x: p[0], y: p[1] }), [px, py, 0]);
    const gradMag = Math.hypot(g[0], g[1]);
    const tangent: [number, number] = [-g[1] / gradMag, g[0] / gradMag];
    expect(g[0] * tangent[0] + g[1] * tangent[1]).toBeCloseTo(0, 10);

    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ px, py }));
    expect(s.gradMag).toBeCloseTo(gradMag, 8);
  });
});
