// Module-specific tests are optional — the contract suite in
// tests/contract/ already runs every registered module through the full
// conformance checklist (ARCHITECTURE.md §18) with no test code required
// here. These cover the golden-value non-inertial-frame physics that's
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
  omega: number,
  speed: number,
  launchAngle: number,
  x0: number,
  y0: number,
): ModuleState {
  return {
    params: { omega, speed, launchAngle, x0, y0 },
    layers: { labFrame: true, rotFrame: true, trace: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('non-inertial-frames');
  });

  it('the three acceleration terms sum to ~0 — the puck feels no real force', () => {
    const instance = module.create(fakeCtx);
    for (const omega of [-2, -0.5, 0.8, 2.5]) {
      for (const t of [0, 0.3, 1.7, 4]) {
        const { residual } = instance.scalars(stateAt(t, omega, 1.1, 0.4, -1.5, 0.7));
        expect(residual).toBeLessThan(1e-8);
      }
    }
  });

  it('omega = 0 collapses the rotating frame onto the lab frame exactly', () => {
    const instance = module.create(fakeCtx);
    const speed = 1.3;
    const launchAngle = 0.6;
    const x0 = -1.8;
    const y0 = 0.4;
    for (const t of [0, 1, 3]) {
      const { rho, speedRel, aCoriolis, aCentrifugal } = instance.scalars(
        stateAt(t, 0, speed, launchAngle, x0, y0),
      );
      expect(speedRel).toBeCloseTo(speed, 10); // no rotation -> observer sees the plain lab speed
      expect(aCoriolis).toBeCloseTo(0, 10);
      expect(aCentrifugal).toBeCloseTo(0, 10);
      expect(rho).toBeCloseTo(
        Math.hypot(x0 + speed * Math.cos(launchAngle) * t, y0 + speed * Math.sin(launchAngle) * t),
        10,
      );
    }
  });

  it('distance from the axis (rho) is frame-invariant — rotation preserves it exactly', () => {
    const instance = module.create(fakeCtx);
    const omega = 1.7;
    const x0 = 2;
    const y0 = -1.1;
    const speed = 0.9;
    const launchAngle = -0.3;
    // Stay within EXIT_RADIUS over this window so the comparison is
    // against the raw (unclamped) closed-form formula.
    for (const t of [0, 0.5, 1]) {
      const labX = x0 + speed * Math.cos(launchAngle) * t;
      const labY = y0 + speed * Math.sin(launchAngle) * t;
      const { rho } = instance.scalars(stateAt(t, omega, speed, launchAngle, x0, y0));
      expect(rho).toBeCloseTo(Math.hypot(labX, labY), 10);
    }
  });

  it('a puck at rest in the lab frame traces a perfect circle in the rotating frame', () => {
    const instance = module.create(fakeCtx);
    const omega = 1.4;
    const x0 = 1.5;
    const y0 = 0.2;
    const rho0 = Math.hypot(x0, y0);
    // speed's declared min is 0.3, so approximate "at rest" with a
    // negligible speed rather than exactly 0 — the closed-form transform
    // itself doesn't care, only the param's own UI-facing range does.
    for (const t of [0, 1, 2.5, 4]) {
      const { rho, speedRel } = instance.scalars(stateAt(t, omega, 1e-6, 0, x0, y0));
      expect(rho).toBeCloseTo(rho0, 5);
      // In the rotating frame, a stationary lab point appears to move
      // purely tangentially at speed omega * rho — the definition of
      // uniform circular motion as seen by the rotating observer.
      expect(speedRel).toBeCloseTo(Math.abs(omega) * rho0, 4);
    }
  });

  it('centrifugal acceleration points toward the axis with magnitude omega^2 * rho', () => {
    const instance = module.create(fakeCtx);
    const omega = 2.1;
    const x0 = -2;
    const y0 = 1;
    const speed = 1.2;
    const launchAngle = 1.1;
    const t = 1.6;
    const { rho, aCentrifugal } = instance.scalars(stateAt(t, omega, speed, launchAngle, x0, y0));
    expect(aCentrifugal).toBeCloseTo(omega * omega * rho, 8);
  });

  it('the puck freezes once it leaves the visible exit radius, instead of coasting off-screen', () => {
    const instance = module.create(fakeCtx);
    // Fast, moving straight outward from near the center — exits quickly.
    const far = instance.scalars(stateAt(20, 1, 3, 0, 0, 0));
    const mid = instance.scalars(stateAt(19, 1, 3, 0, 0, 0));
    expect(far.rho).toBeCloseTo(mid.rho, 6); // both past exit -> same frozen radius
  });

  it('a puck starting beyond the exit radius freezes immediately, even if its straight line would curve back through the interior', () => {
    const instance = module.create(fakeCtx);
    // x0=3, y0=3 puts the start point (rho0 ~= 4.24) beyond EXIT_RADIUS
    // (3.4); launchAngle=pi aims it back toward — and, on a naive
    // first-crossing solve, briefly through — the interior. It must
    // freeze at t=0 instead of momentarily "entering" partway through
    // the scrub range.
    const x0 = 3;
    const y0 = 3;
    const launchAngle = Math.PI;
    const atStart = instance.scalars(stateAt(0, 1, 1, launchAngle, x0, y0));
    for (const t of [0.5, 1.4, 3, 10]) {
      const later = instance.scalars(stateAt(t, 1, 1, launchAngle, x0, y0));
      expect(later.rho).toBeCloseTo(atStart.rho, 8);
    }
  });
});
