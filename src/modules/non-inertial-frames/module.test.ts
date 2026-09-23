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

  it('centrifugal acceleration magnitude is omega^2 * rho', () => {
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

  // X-26 golden test: asserts what actually reaches the fictitious-force
  // arrows' .set() — a readout-only check (like the two above) can't
  // catch a sign flip in the drawn direction, since aCoriolis/aCentrifugal
  // are magnitudes. Captures each arrow by the fixed `label` it was
  // created with in create().
  it('the drawn centrifugal and Coriolis arrows point in the fictitious-force direction, not the kinematic-transport direction', () => {
    const captured = new Map<
      string,
      { from: [number, number, number]; to: [number, number, number] }
    >();
    const arrowCtx = new Proxy({} as SceneContext, {
      get(_target, prop) {
        if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
        if (prop === 'up') return 'y';
        if (prop === 'group') return (name: string) => ({ id: name });
        if (prop === 'arrow') {
          return (props: {
            label?: string;
            from: [number, number, number];
            to: [number, number, number];
          }) => {
            const key = props.label;
            if (key) captured.set(key, { from: props.from, to: props.to });
            return {
              set: (next: { from?: [number, number, number]; to?: [number, number, number] }) => {
                if (key) {
                  const prev = captured.get(key)!;
                  captured.set(key, { from: next.from ?? prev.from, to: next.to ?? prev.to });
                }
              },
              visible: () => {},
              dispose: () => {},
            };
          };
        }
        return () => noopHandle;
      },
    });

    const instance = module.create(arrowCtx);
    const omega = 2.1;
    const x0 = -2;
    const y0 = 1;
    const speed = 1.2;
    const launchAngle = 1.1;
    const t = 1.6;
    const state = stateAt(t, omega, speed, launchAngle, x0, y0);
    instance.update(state);

    // Recompute the rotating-frame position/velocity independently, the
    // same closed-form way the module does, from the same inputs — the
    // module doesn't expose `rot` directly.
    const vx0 = speed * Math.cos(launchAngle);
    const vy0 = speed * Math.sin(launchAngle);
    const labX = x0 + vx0 * t;
    const labY = y0 + vy0 * t;
    const theta = omega * t;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const rx = c * labX + s * labY;
    const ry = -s * labX + c * labY;
    const rotatedVx = c * vx0 + s * vy0;
    const rotatedVy = -s * vx0 + c * vy0;
    const rvx = rotatedVx + omega * ry;
    const rvy = rotatedVy - omega * rx;

    const cf = captured.get('\\vec{a}_{cf}')!;
    const cfVec = [cf.to[0] - cf.from[0], cf.to[1] - cf.from[1]];
    // Fictitious centrifugal acceleration points AWAY from the rotation
    // axis: dot(a_cf, r') > 0.
    expect(cfVec[0] * rx + cfVec[1] * ry).toBeGreaterThan(0);

    const cor = captured.get('\\vec{a}_{Cor}')!;
    const corVec = [cor.to[0] - cor.from[0], cor.to[1] - cor.from[1]];
    // a_Cor_fict = -2 * omega x v' (omega along +z) = (2*omega*vy', -2*omega*vx')
    const expectedCor = [2 * omega * rvy, -2 * omega * rvx];
    // corVec is scaled by ACC_ARROW_SCALE internally to the module, so
    // compare directions (normalized dot ~ 1), not magnitudes.
    const corLen = Math.hypot(corVec[0], corVec[1]);
    const expLen = Math.hypot(expectedCor[0], expectedCor[1]);
    expect(
      (corVec[0] * expectedCor[0] + corVec[1] * expectedCor[1]) / (corLen * expLen),
    ).toBeCloseTo(1, 6);
  });
});
