// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. These cover the golden-value driven-oscillator physics that's
// specific to this module.
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
  m: number,
  k: number,
  c: number,
  F0: number,
  omegaDrive: number,
): ModuleState {
  return {
    params: { m, k, c, F0, omegaDrive },
    layers: { system: true, drive: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('oscillations');
  });

  it('omega0 and zeta match their closed-form definitions', () => {
    const instance = module.create(fakeCtx);
    const m = 2;
    const k = 8;
    const c = 1.5;
    const { omega0, zeta } = instance.scalars(stateAt(0, m, k, c, 3, 1));
    expect(omega0).toBeCloseTo(Math.sqrt(k / m), 10);
    expect(zeta).toBeCloseTo(c / (2 * Math.sqrt(m * k)), 10);
  });

  it('at exact resonance, the phase lag is pi/2', () => {
    const instance = module.create(fakeCtx);
    const m = 1;
    const k = 9; // omega0 = 3
    const c = 0.6;
    const { phaseLag } = instance.scalars(stateAt(0, m, k, c, 5, 3));
    expect(phaseLag).toBeCloseTo(Math.PI / 2, 10);
  });

  it('amplitude matches the closed-form driven-damped-oscillator formula', () => {
    const instance = module.create(fakeCtx);
    const m = 1.4;
    const k = 6;
    const c = 0.8;
    const F0 = 4;
    const omegaDrive = 1.7;
    const omega0 = Math.sqrt(k / m);
    const gamma = c / m;
    const expected =
      F0 /
      m /
      Math.sqrt((omega0 * omega0 - omegaDrive * omegaDrive) ** 2 + (gamma * omegaDrive) ** 2);
    const { amplitude } = instance.scalars(stateAt(0, m, k, c, F0, omegaDrive));
    expect(amplitude).toBeCloseTo(expected, 8);
  });

  it('far below resonance, amplitude approaches the static deflection F0/k', () => {
    const instance = module.create(fakeCtx);
    const m = 1;
    const k = 9;
    const c = 0.6;
    const F0 = 5;
    // A tiny fraction of omega0=3 — nearly a static (zero-frequency) push.
    const { amplitude } = instance.scalars(stateAt(0, m, k, c, F0, 0.01));
    expect(amplitude).toBeCloseTo(F0 / k, 2);
  });

  it('far above resonance, the phase lag approaches pi and amplitude falls off like 1/Omega^2', () => {
    const instance = module.create(fakeCtx);
    const m = 1;
    const k = 9;
    const c = 0.6;
    const F0 = 5;
    const omegaDrive = 60; // far above omega0 = 3
    const { amplitude, phaseLag } = instance.scalars(stateAt(0, m, k, c, F0, omegaDrive));
    expect(phaseLag).toBeGreaterThan(3.0); // approaching pi ~= 3.1416
    expect(amplitude).toBeCloseTo(F0 / (m * omegaDrive * omegaDrive), 3);
  });

  it('v(t) is the time-derivative of x(t) (central-difference check)', () => {
    const instance = module.create(fakeCtx);
    const m = 1;
    const k = 9;
    const c = 0.6;
    const F0 = 5;
    const omegaDrive = 2.2;
    const t = 1.3;
    const h = 1e-5;
    const before = instance.scalars(stateAt(t - h, m, k, c, F0, omegaDrive)).x;
    const after = instance.scalars(stateAt(t + h, m, k, c, F0, omegaDrive)).x;
    const numericV = (after - before) / (2 * h);
    const { v } = instance.scalars(stateAt(t, m, k, c, F0, omegaDrive));
    expect(v).toBeCloseTo(numericV, 4);
  });

  it('damping coefficient c=0 at exact resonance stays finite (no Infinity/NaN)', () => {
    const instance = module.create(fakeCtx);
    const { amplitude, x, v } = instance.scalars(stateAt(0.7, 1, 9, 0, 5, 3));
    expect(Number.isFinite(amplitude)).toBe(true);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(v)).toBe(true);
  });

  // X-39 golden test: asserts what actually reaches the spring's
  // .set({scale}) at the module's own DEFAULT params, which sit exactly
  // at resonance (omega0 = omegaDrive = 3) — a readout-only check can't
  // see this, since scalars().x correctly stays the large true
  // amplitude; the bug was purely in the DRAWN spring geometry.
  it('the drawn spring never inverts (negative/zero scale.y), even at resonance where amplitude exceeds REST_LENGTH', () => {
    let capturedSpringScale: [number, number, number] | undefined;
    const springCtx = new Proxy({} as SceneContext, {
      get(_target, prop) {
        if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
        if (prop === 'up') return 'y';
        if (prop === 'group') return (name: string) => ({ id: name });
        if (prop === 'body') {
          return (props: { kind: string; scale: [number, number, number] }) => {
            const isSpring = props.kind === 'spring';
            if (isSpring) capturedSpringScale = props.scale;
            return {
              set: (next: { scale?: [number, number, number] }) => {
                if (isSpring && next.scale) capturedSpringScale = next.scale;
              },
              visible: () => {},
              dispose: () => {},
            };
          };
        }
        return () => noopHandle;
      },
    });

    const instance = module.create(springCtx);
    // Default params (m=1, k=9, c=0.6, F0=5, omegaDrive=3): omega0 = 3 =
    // omegaDrive exactly, amplitude = F0/(c*omegaDrive) = 5/1.8 ~= 2.78,
    // well past REST_LENGTH (1.4) — the audit's own reproduction.
    const params = { m: 1, k: 9, c: 0.6, F0: 5, omegaDrive: 3 };
    const { amplitude } = instance.scalars({ params, layers: {}, t: 0 });
    expect(amplitude).toBeGreaterThan(1.4); // confirms this state really does exceed REST_LENGTH

    // Sample across a full drive cycle — the mass swings through both
    // extremes (toward AND away from the anchor).
    const omegaDrive = params.omegaDrive;
    const period = (2 * Math.PI) / omegaDrive;
    for (let i = 0; i <= 40; i++) {
      const t = (period * i) / 40;
      instance.update({ params, layers: { system: true, drive: true }, t });
      expect(capturedSpringScale).toBeDefined();
      expect(capturedSpringScale![1]).toBeGreaterThan(0);
    }
  });
});
