// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. These cover the golden-value Kepler-orbit physics that's
// specific to this module: periapsis/apoapsis, Kepler's third law,
// vis-viva energy conservation, and angular momentum conservation —
// cross-checked against independent closed-form formulas, not just
// re-reading the same code path back.
import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import module from './index';
import type { ModuleState } from '../types';

// A minimal structural stand-in for SceneContext, built locally rather
// than importing MockSceneContext — modules may not import a sibling
// module (or `modules/testing`) via any path (ARCHITECTURE.md §6).
const noopHandle = { set: () => {}, visible: () => {}, dispose: () => {} };
// Captures the orbit-outline path's points so the drawn SHAPE (not just
// orbitAt()'s own point-body motion) can be checked — this is exactly
// the function that had a real bug (a `cardioid`-like outline instead
// of an ellipse) that every other test here missed, since they only
// ever sampled orbitAt()/scalars(), never this separate path glyph.
let capturedPathPoints: readonly [number, number, number][] = [];
const fakeCtx = new Proxy({} as SceneContext, {
  get(_target, prop) {
    if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
    if (prop === 'up') return 'y';
    if (prop === 'group') return (name: string) => ({ id: name });
    if (prop === 'path') {
      return (props: { points: readonly [number, number, number][] }) => {
        capturedPathPoints = props.points;
        return {
          set: (next: { points?: readonly [number, number, number][] }) => {
            if (next.points) capturedPathPoints = next.points;
          },
          visible: () => {},
          dispose: () => {},
        };
      };
    }
    return () => noopHandle;
  },
});

function stateAt(
  t: number,
  mu: number,
  a: number,
  e: number,
  omega = 0,
  inclination = 0,
): ModuleState {
  return {
    params: { mu, a, e, omega, inclination },
    layers: { orbit: true, vectors: true, angularMomentum: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('gravitation');
  });

  it("orbital period matches Kepler's third law", () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const { period } = instance.scalars(stateAt(0, mu, a, 0.5));
    expect(period).toBeCloseTo(2 * Math.PI * Math.sqrt((a * a * a) / mu), 10);
  });

  it('at t=0 (periapsis) distance and speed match the closed-form periapsis values', () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const e = 0.5;
    const { r, speed } = instance.scalars(stateAt(0, mu, a, e));
    expect(r).toBeCloseTo(a * (1 - e), 9);
    expect(speed).toBeCloseTo(Math.sqrt((mu / a) * ((1 + e) / (1 - e))), 9);
  });

  it('at half a period (apoapsis) distance and speed match the closed-form apoapsis values', () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const e = 0.5;
    const n = Math.sqrt(mu / (a * a * a));
    const halfPeriod = Math.PI / n;
    const { r, speed } = instance.scalars(stateAt(halfPeriod, mu, a, e));
    expect(r).toBeCloseTo(a * (1 + e), 9);
    expect(speed).toBeCloseTo(Math.sqrt((mu / a) * ((1 - e) / (1 + e))), 9);
  });

  it('vis-viva: specific energy stays constant (= -mu/2a) at every point in the orbit', () => {
    const instance = module.create(fakeCtx);
    const mu = 6;
    const a = 3;
    const e = 0.6;
    const expected = -mu / (2 * a);
    for (const t of [0, 0.7, 1.9, 3.4, 5.1]) {
      const { r, speed, specificEnergy } = instance.scalars(stateAt(t, mu, a, e));
      expect(specificEnergy).toBeCloseTo(expected, 8);
      // Cross-check against the raw vis-viva formula computed from r and
      // speed independently, not just re-reading specificEnergy back.
      expect((speed * speed) / 2 - mu / r).toBeCloseTo(expected, 6);
    }
  });

  it('specific angular momentum is conserved and matches sqrt(mu*a*(1-e^2))', () => {
    const instance = module.create(fakeCtx);
    const mu = 6;
    const a = 3;
    const e = 0.6;
    const expected = Math.sqrt(mu * a * (1 - e * e));
    for (const t of [0, 1.1, 2.6, 4.0]) {
      const { h } = instance.scalars(stateAt(t, mu, a, e));
      expect(h).toBeCloseTo(expected, 9);
    }
  });

  it('distance is consistent with the polar conic equation r = p/(1+e cos(true anomaly))', () => {
    const instance = module.create(fakeCtx);
    const mu = 5;
    const a = 2.5;
    const e = 0.4;
    const p = a * (1 - e * e);
    for (const t of [0.3, 1.8, 3.2, 5.5]) {
      const { r, trueAnomaly } = instance.scalars(stateAt(t, mu, a, e));
      expect(r).toBeCloseTo(p / (1 + e * Math.cos(trueAnomaly)), 8);
    }
  });

  it('gravitational acceleration matches mu/r^2 and is largest at periapsis', () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const e = 0.5;
    const n = Math.sqrt(mu / (a * a * a));
    const periapsis = instance.scalars(stateAt(0, mu, a, e));
    const apoapsis = instance.scalars(stateAt(Math.PI / n, mu, a, e));
    expect(periapsis.accel).toBeCloseTo(mu / (periapsis.r * periapsis.r), 9);
    expect(apoapsis.accel).toBeCloseTo(mu / (apoapsis.r * apoapsis.r), 9);
    expect(periapsis.accel).toBeGreaterThan(apoapsis.accel);
  });

  it('a circular orbit (e=0) has constant distance and speed, and sweeps angle at a constant rate', () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const n = Math.sqrt(mu / (a * a * a)); // = 1 for these params
    const expectedSpeed = Math.sqrt(mu / a);
    for (const t of [0, 0.5, 1.7, 3.0]) {
      const { r, speed } = instance.scalars(stateAt(t, mu, a, 0));
      expect(r).toBeCloseTo(a, 9);
      expect(speed).toBeCloseTo(expectedSpeed, 9);
    }
    const quarterPeriod = Math.PI / 2 / n;
    const { trueAnomaly } = instance.scalars(stateAt(quarterPeriod, mu, a, 0));
    expect(trueAnomaly).toBeCloseTo(Math.PI / 2, 8);
  });

  it('the drawn orbit outline traces a true ellipse, not a distorted curve, at nonzero eccentricity', () => {
    const instance = module.create(fakeCtx);
    const mu = 8;
    const a = 2;
    const e = 0.5;
    const p = a * (1 - e * e);
    instance.update(stateAt(0, mu, a, e));
    expect(capturedPathPoints.length).toBeGreaterThan(50);
    // omega=inclination=0, so these points sit directly in the orbital
    // plane with no rotation applied — check every one against the same
    // polar conic equation (r = p / (1 + e*cos(true anomaly))) the
    // "distance is consistent with..." test above already validates
    // orbitAt() against, catching a bug in the SEPARATE outline-sampling
    // code path rather than re-checking orbitAt() a second time.
    for (const [x, y] of capturedPathPoints) {
      const r = Math.hypot(x, y);
      const nu = Math.atan2(y, x);
      expect(r).toBeCloseTo(p / (1 + e * Math.cos(nu)), 8);
    }
    // The central mass sits at one FOCUS, not the ellipse's center — so
    // the outline's own x-extent either side of the origin must differ:
    // periapsis (nu=0) at +a(1-e) on one side, apoapsis (nu=pi) at
    // -a(1+e) on the other — not the symmetric +-a a center-parametrized
    // (or the reported cardioid-shaped) outline would produce.
    const xs = capturedPathPoints.map(([x]) => x);
    expect(Math.max(...xs)).toBeCloseTo(a * (1 - e), 6);
    expect(Math.min(...xs)).toBeCloseTo(-a * (1 + e), 6);
  });

  it('stays finite at a high eccentricity, near periapsis where curvature is sharpest', () => {
    const instance = module.create(fakeCtx);
    const { r, speed, h, accel, specificEnergy, trueAnomaly } = instance.scalars(
      stateAt(0.01, 10, 3, 0.9),
    );
    for (const value of [r, speed, h, accel, specificEnergy, trueAnomaly]) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
