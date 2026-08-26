import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import { discInertia } from '@/kernel/inertia';
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
    expect(module.manifest.id).toBe('rotational-dynamics');
  });

  it('declares urlKeys that are unique and <= 4 characters', () => {
    const keys = module.params.map((p) => p.urlKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k.length).toBeLessThanOrEqual(4);
    const layerKeys = module.layers.map((l) => l.urlKey);
    expect(new Set(layerKeys).size).toBe(layerKeys.length);
    for (const k of layerKeys) expect(k.length).toBeLessThanOrEqual(4);
  });

  it('golden value: torque magnitude and moment arm for a perpendicular r, F', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ armVector: [2, 0, 0], forceVector: [0, 3, 0] }));
    // tau = r x F = (2,0,0) x (0,3,0) = (0,0,6)
    expect(s.torqueMag).toBeCloseTo(6, 12);
    // r already perpendicular to F, so the moment arm is |r| itself.
    expect(s.momentArm).toBeCloseTo(2, 12);
  });

  it('golden value: parallel-axis theorem, I_offset = I_cm + m d_perp^2', () => {
    const instance = module.create(fakeCtx);
    // box [1,1,1], mass 6: I_cm about z = (m/12)(a^2+b^2) = (6/12)(1+1) = 1
    const s = instance.scalars(stateWith({ boxSize: [1, 1, 1], boxMass: 6, paOffset: [2, 0, 0] }));
    expect(s.parallelAxisI).toBeCloseTo(1 + 6 * 2 * 2, 10);
  });

  it('golden value: L is parallel to omega along a principal axis, non-parallel off-axis', () => {
    const instance = module.create(fakeCtx);
    const onAxis = instance.scalars(
      stateWith({ boxSize: [1, 2, 3], boxMass: 12, omegaVector: [1, 0, 0] }),
    );
    expect(onAxis.angleLOmega).toBeCloseTo(0, 8);

    const offAxis = instance.scalars(
      stateWith({ boxSize: [1, 2, 3], boxMass: 12, omegaVector: [1, 1, 0] }),
    );
    expect(offAxis.angleLOmega).toBeGreaterThan(1);
    expect(offAxis.angleLOmega).toBeLessThan(90);
  });

  it('golden value: principal moments match the box tensor diagonal, sorted ascending', () => {
    const instance = module.create(fakeCtx);
    // box [1,2,3], mass 12: Ixx=13, Iyy=10, Izz=5 (already diagonal/principal).
    const s = instance.scalars(stateWith({ boxSize: [1, 2, 3], boxMass: 12 }));
    expect([s.I1, s.I2, s.I3]).toEqual([5, 10, 13]);
  });

  it('golden value: precession rate matches the closed-form m g l / (I3 spin)', () => {
    const instance = module.create(fakeCtx);
    const params = { topMass: 2, topArmLength: 0.8, topRadius: 0.3, topSpinRate: 50 };
    const s = instance.scalars(stateWith(params));
    const I3 = discInertia(params.topMass, params.topRadius)[8];
    const expected = (params.topMass * 9.8 * params.topArmLength) / (I3 * params.topSpinRate);
    expect(s.precessionRate).toBeCloseTo(expected, 10);
  });

  it('golden value: rolling speed is omega * R', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ rollRadius: 0.7, rollOmega: 4 }));
    expect(s.rollingSpeed).toBeCloseTo(2.8, 12);
  });

  it('Dzhanibekov: reset() sets the documented initial condition', () => {
    const instance = module.create(fakeCtx);
    const state = stateWith({ dzSpin: 10, dzPerturbation: 0.05 });
    instance.reset?.(state);
    const s = instance.scalars(state);
    // w = [spin*pert, spin, spin*pert*0.7]: KE = 0.5 * sum(Ii wi^2).
    expect(s.dzOmegaIntermediate).toBeCloseTo(10, 12);
    expect(s.dzKineticEnergy).toBeGreaterThan(0);
  });

  it('Dzhanibekov: energy and angular momentum are conserved (torque-free), and the intermediate-axis spin actually flips sign', () => {
    const instance = module.create(fakeCtx);
    const state = stateWith({});
    instance.reset?.(state);
    const initial = instance.scalars(state);

    const dt = 1 / 240;
    let minOmegaIntermediate = Infinity;
    for (let i = 0; i < 3000; i++) {
      instance.step?.(dt, state);
      const s = instance.scalars(state);
      minOmegaIntermediate = Math.min(minOmegaIntermediate, s.dzOmegaIntermediate);
    }
    const final = instance.scalars(state);

    // Conserved quantities for a torque-free rigid body.
    expect(final.dzKineticEnergy).toBeCloseTo(initial.dzKineticEnergy, 2);
    expect(final.dzAngularMomentumMag).toBeCloseTo(initial.dzAngularMomentumMag, 2);

    // The Dzhanibekov effect itself: spin about the intermediate axis is
    // unstable, so given enough time it flips sign.
    expect(minOmegaIntermediate).toBeLessThan(0);
  });
});
