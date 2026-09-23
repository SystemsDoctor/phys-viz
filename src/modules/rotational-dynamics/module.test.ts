import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import { discInertia, parallelAxis as parallelAxisTensor } from '@/kernel/inertia';
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

  it('nutationAmplitude=0 isolates pure steady precession: no coupling, secular rate = bare rate', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ nutationAmplitude: 0 }));
    expect(s.nutationCouplingRatio).toBeCloseTo(0, 10);
    expect(s.precessionRateSecular).toBeCloseTo(s.precessionRate, 10);
  });

  it('golden value: nutationAmplitude = "released from rest" swing gives an exactly cusped path (ratio=1)', () => {
    const instance = module.create(fakeCtx);
    const params = {
      topMass: 1.4,
      topArmLength: 0.7,
      topRadius: 0.35,
      topSpinRate: 90,
      topTiltAngle: 0.5,
    };
    const I3 = discInertia(params.topMass, params.topRadius)[8];
    const I1 = parallelAxisTensor(discInertia(params.topMass, params.topRadius), params.topMass, [
      0,
      0,
      params.topArmLength,
    ])[0];
    const omegaP = (params.topMass * 9.8 * params.topArmLength) / (I3 * params.topSpinRate);
    const nutationOmega = (I3 * params.topSpinRate) / I1;
    // baseSwing: the nutation amplitude produced by releasing the top
    // from rest (zero initial precession) — the classic textbook case,
    // and the exact boundary between "wavy" and "looping" (a cusped
    // path, where precession momentarily stops but never reverses).
    const baseSwing = (2 * omegaP * Math.sin(params.topTiltAngle)) / nutationOmega;

    const cusped = instance.scalars(stateWith({ ...params, nutationAmplitude: baseSwing }));
    expect(cusped.nutationCouplingRatio).toBeCloseTo(1, 6);

    // Push the release condition further from steady precession in the
    // same direction (more nutation than "released from rest" produces)
    // and the path should genuinely loop — precession reverses somewhere
    // in the cycle, not just touch zero.
    const looping = instance.scalars(stateWith({ ...params, nutationAmplitude: baseSwing * 1.3 }));
    expect(looping.nutationCouplingRatio).toBeGreaterThan(1);

    // And pulling back toward the steady rate (less nutation than
    // "released from rest") gives an ordinary wavy path that never
    // reverses at all.
    const wavy = instance.scalars(stateWith({ ...params, nutationAmplitude: baseSwing * 0.5 }));
    expect(wavy.nutationCouplingRatio).toBeLessThan(1);
  });

  it('golden value: rolling speed is omega * R', () => {
    const instance = module.create(fakeCtx);
    const s = instance.scalars(stateWith({ rollRadius: 0.7, rollOmega: 4 }));
    expect(s.rollingSpeed).toBeCloseTo(2.8, 12);
  });

  // X-27 golden test: asserts what actually reaches rimTrace's .set(),
  // not just rollingSpeed's magnitude readout — a readout-only check
  // can't catch the cycloid being traced upside down.
  it('golden: the rolling rim trace has zero velocity at the contact instant, not at the top', () => {
    let capturedPoints: readonly [number, number, number][] = [];
    const pathCtx = new Proxy({} as SceneContext, {
      get(_target, prop) {
        if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
        if (prop === 'up') return 'y';
        if (prop === 'group') return (name: string) => ({ id: name });
        if (prop === 'path') {
          return (props: {
            group?: { id: string };
            points: readonly [number, number, number][];
          }) => {
            const isRimTrace = props.group?.id === 'rolling';
            if (isRimTrace) capturedPoints = props.points;
            return {
              set: (next: { points?: readonly [number, number, number][] }) => {
                if (isRimTrace && next.points) capturedPoints = next.points;
              },
              visible: () => {},
              dispose: () => {},
            };
          };
        }
        return () => noopHandle;
      },
    });

    const instance = module.create(pathCtx);
    const rollRadius = 0.6;
    const rollOmega = 3;
    const v = rollOmega * rollRadius;
    // Large enough that every one of the 80 sampled instants (t - i*dt,
    // i = 79..0) is >= 0, so none is skipped and the captured array
    // indices line up 1:1 with this loop's iterations.
    const t = 50;
    instance.update(stateWith({ rollRadius, rollOmega }, t));

    // Rebuild the exact instants the module samples, so the trace point
    // nearest an exact contact instant (wt = 2*pi*k) can be located
    // independently of the sampling grid. Checking the HEIGHT there
    // isn't discriminating (the cos term that sets it is sign-symmetric
    // in the bug), so instead finite-difference the SHAFT (x) coordinate
    // across that instant — a true rolling contact point is
    // instantaneously at rest (dx/dt = 0), while the pre-fix
    // x = vt + R sin(wt) has dx/dt = v(1 + cos(wt)) = 2v there.
    const ROLL_TRACE_POINTS = 80;
    const rollTraceDt = (2 * Math.PI) / rollOmega / 20;
    let contactIndex = -1;
    let nearestSpacing = Infinity;
    for (let i = ROLL_TRACE_POINTS - 1; i >= 0; i--) {
      const ti = t - i * rollTraceDt;
      const phase = (((rollOmega * ti) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const distToContact = Math.min(phase, 2 * Math.PI - phase);
      if (distToContact < nearestSpacing) {
        nearestSpacing = distToContact;
        contactIndex = ROLL_TRACE_POINTS - 1 - i;
      }
    }
    expect(contactIndex).toBeGreaterThan(0);
    expect(contactIndex).toBeLessThan(capturedPoints.length - 1);
    const before = capturedPoints[contactIndex - 1];
    const after = capturedPoints[contactIndex + 1];
    const dxdt = (after[0] - before[0]) / (2 * rollTraceDt);
    // Zero (not 2v) at the contact instant, well away from 2v = 2*1.8.
    expect(Math.abs(dxdt)).toBeLessThan(0.1 * v);
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
