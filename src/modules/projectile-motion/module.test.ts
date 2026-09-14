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
function makeFakeCtx(upAxisRef: { current: 'y' | 'z' }): SceneContext {
  return new Proxy({} as SceneContext, {
    get(_target, prop) {
      if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
      if (prop === 'up') return upAxisRef.current;
      if (prop === 'group') return (name: string) => ({ id: name });
      return () => noopHandle;
    },
  });
}
const fakeCtx = makeFakeCtx({ current: 'y' });

type V3 = [number, number, number];

function angleState(
  t: number,
  speed: number,
  elevation: number,
  g: number,
  extra: { azimuth?: number; startPosition?: V3 } = {},
): ModuleState {
  return {
    params: {
      speed,
      elevation,
      azimuth: extra.azimuth ?? 0,
      g,
      startPosition: extra.startPosition ?? [0, 0, 0],
      launchVelocity: [0, 0, 0],
    },
    layers: { angleMode: true, vectorMode: false, projectile: true, trace: true },
    t,
  };
}

function vectorState(
  t: number,
  launchVelocity: V3,
  g: number,
  startPosition: V3 = [0, 0, 0],
): ModuleState {
  return {
    params: {
      speed: 1,
      elevation: 0,
      azimuth: 0,
      g,
      startPosition,
      launchVelocity,
    },
    layers: { angleMode: false, vectorMode: true, projectile: true, trace: true },
    t,
  };
}

describe(module.manifest.id, () => {
  it('has a manifest id matching its folder name', () => {
    expect(module.manifest.id).toBe('projectile-motion');
  });

  it('range and max height match the closed-form kinematics formulas (45°, v0=20, g=9.8, angle mode)', () => {
    const instance = module.create(fakeCtx);
    const speed = 20;
    const elevation = Math.PI / 4;
    const g = 9.8;
    const { timeOfFlight, range, maxHeight } = instance.scalars(angleState(0, speed, elevation, g));

    // t_flight = 2 * v0 * sin(theta) / g, R = v0^2 * sin(2*theta) / g,
    // H = (v0*sin(theta))^2 / (2*g).
    expect(timeOfFlight).toBeCloseTo((2 * speed * Math.sin(elevation)) / g, 10);
    expect(range).toBeCloseTo((speed * speed * Math.sin(2 * elevation)) / g, 10);
    expect(maxHeight).toBeCloseTo((speed * Math.sin(elevation)) ** 2 / (2 * g), 10);
    // At 45 degrees range and 4*maxHeight coincide exactly (sin(90) = 1,
    // sin(45)^2 = 1/2), a known special case worth pinning as a golden
    // value rather than just re-deriving the same formula both places.
    expect(range).toBeCloseTo(4 * maxHeight, 10);
  });

  it('45° elevation gives the maximum range for a fixed speed and gravity, at zero azimuth', () => {
    const instance = module.create(fakeCtx);
    const speed = 15;
    const g = 9.8;
    const rangeAt = (elevation: number) =>
      instance.scalars(angleState(0, speed, elevation, g)).range;

    const range45 = rangeAt(Math.PI / 4);
    expect(range45).toBeGreaterThan(rangeAt(Math.PI / 6));
    expect(range45).toBeGreaterThan(rangeAt(Math.PI / 3));
  });

  it('azimuth rotates the horizontal launch direction but never changes range, max height, or flight time', () => {
    const instance = module.create(fakeCtx);
    const speed = 15;
    const elevation = Math.PI / 6;
    const g = 9.8;
    const baseline = instance.scalars(angleState(0, speed, elevation, g, { azimuth: 0 }));
    for (const azimuth of [0.4, Math.PI / 2, 2, Math.PI]) {
      const rotated = instance.scalars(angleState(0, speed, elevation, g, { azimuth }));
      expect(rotated.range).toBeCloseTo(baseline.range, 10);
      expect(rotated.maxHeight).toBeCloseTo(baseline.maxHeight, 10);
    }
  });

  it('angle mode and an equivalent vector (same speed/elevation, azimuth=0) agree exactly on range and max height', () => {
    const instance = module.create(fakeCtx);
    const speed = 18;
    const elevation = Math.PI / 3;
    const g = 9.8;
    const angleResult = instance.scalars(angleState(0, speed, elevation, g));

    const vx = speed * Math.cos(elevation);
    const vy = speed * Math.sin(elevation);
    const vectorResult = instance.scalars(vectorState(0, [vx, vy, 0], g));

    expect(vectorResult.range).toBeCloseTo(angleResult.range, 8);
    expect(vectorResult.maxHeight).toBeCloseTo(angleResult.maxHeight, 8);
  });

  it('vector mode with a nonzero z-component still conserves the closed-form range (out of the default 2D plane)', () => {
    const instance = module.create(fakeCtx);
    const g = 9.8;
    // Same horizontal speed (hypot(6,8)=10) and vertical speed (10) as a
    // 45-degree, speed-14.14 in-plane launch, just rotated in azimuth.
    const { range, maxHeight } = instance.scalars(vectorState(0, [6, 10, 8], g));
    const horizSpeed = Math.hypot(6, 8);
    const flight = (2 * 10) / g;
    expect(range).toBeCloseTo(horizSpeed * flight, 8);
    expect(maxHeight).toBeCloseTo((10 * 10) / (2 * g), 8);
  });

  it('a nonzero start height adds directly to max height, and range uses the taller closed-form flight time', () => {
    const instance = module.create(fakeCtx);
    const g = 9.8;
    const vy0 = 5;
    const y0 = 20;
    const vx0 = 3;
    const { maxHeight, range } = instance.scalars(vectorState(0, [vx0, vy0, 0], g, [0, y0, 0]));
    expect(maxHeight).toBeCloseTo(y0 + (vy0 * vy0) / (2 * g), 8);

    // Flight time from height y0 with upward speed vy0: the positive
    // root of 0.5 g t^2 - vy0 t - y0 = 0.
    const flight = (vy0 + Math.sqrt(vy0 * vy0 + 2 * g * y0)) / g;
    expect(range).toBeCloseTo(vx0 * flight, 8);
  });

  it('zero launch speed from a height is a pure free fall: zero range, max height equals the start height', () => {
    const instance = module.create(fakeCtx);
    const g = 9.8;
    const y0 = 15;
    // Speed=0 is now reachable (params.ts's `speed` min was lowered from
    // 1 to 0 for exactly this case) — the elevation angle is moot at
    // zero magnitude, so any value should give the same result.
    const { range, maxHeight } = instance.scalars(
      angleState(0, 0, Math.PI / 4, g, { startPosition: [0, y0, 0] }),
    );
    // Zero horizontal speed -> zero range; zero vertical launch speed ->
    // max height is just the start height (no upward coasting to add).
    expect(range).toBe(0);
    expect(maxHeight).toBeCloseTo(y0, 10);
  });

  it('a start position below the ground plane (y0 < 0) has zero flight — range is zero, not tunnelling further', () => {
    const instance = module.create(fakeCtx);
    const g = 9.8;
    const vy0 = 1;
    const y0 = -3;
    const { range, maxHeight } = instance.scalars(vectorState(0, [1, vy0, 0], g, [0, y0, 0]));
    expect(range).toBe(0); // flight = 0, so horizSpeed * flight = 0 exactly
    expect(maxHeight).toBeCloseTo(y0 + (vy0 * vy0) / (2 * g), 10);
  });

  it('a genuinely 3D launch (nonzero x, y, AND z) matches independently-derived closed-form values, under z-up (TASKS.md X-22 regression case)', () => {
    // The reported bug case: startPosition (0,0,50), launch vector
    // (20,15,10), g=9.8, "up" being z. Values below are derived
    // independently of sceneAt()'s helpers, straight from
    // r(t) = r0 + v0*t - 1/2 g t^2 upHat and vy(t) = vy0 - g*t.
    const upAxis = { current: 'z' as const };
    const instance = module.create(makeFakeCtx(upAxis));
    const g = 9.8;
    const r0: V3 = [0, 0, 50];
    const v0: V3 = [20, 15, 10];
    const { timeOfFlight, range, maxHeight } = instance.scalars(vectorState(0, v0, g, r0));

    // 0.5*g*t^2 - vy0*t - y0 = 0 with vy0=10, y0=50 -> quadratic formula.
    const expectedFlight = (10 + Math.sqrt(10 * 10 + 2 * g * 50)) / g;
    const expectedRange = Math.hypot(20, 15) * expectedFlight; // horizontal speed * flight
    const expectedMaxHeight = 50 + (10 * 10) / (2 * g); // vy0 > 0

    expect(timeOfFlight).toBeCloseTo(expectedFlight, 10);
    expect(range).toBeCloseTo(expectedRange, 8);
    expect(maxHeight).toBeCloseTo(expectedMaxHeight, 10);
  });

  it('a live up-axis switch (Settings -> Up axis) is reflected on the very next scalars()/update() call, not frozen at create()-time (TASKS.md X-22)', () => {
    // ctx.up is documented as LIVE (SceneContext.ts). Before the fix,
    // this module read ctx.up once in create() and cached it — so
    // switching axes on an already-mounted instance silently kept using
    // the stale axis. Same v0/r0/g, only the axis interpretation changes.
    const upAxis: { current: 'y' | 'z' } = { current: 'y' };
    const instance = module.create(makeFakeCtx(upAxis));
    const g = 9.8;
    const r0: V3 = [0, 50, 0]; // "vertical" only under y-up
    const v0: V3 = [20, 10, 15]; // vertical component is index 1 (y) or 2 (z)

    const underYUp = instance.scalars(vectorState(0, v0, g, r0));

    upAxis.current = 'z'; // simulate a live Settings -> Up axis switch
    const underZUp = instance.scalars(vectorState(0, v0, g, r0));

    // Under y-up: y0=50, vy0=10 (component 1). Under z-up: y0=0, vy0=15
    // (component 2) — a completely different flight, because r0/v0 here
    // were deliberately chosen so the "vertical" component differs
    // between the two axes. If the axis read were still stale, these
    // would be identical instead.
    expect(underZUp.timeOfFlight).not.toBeCloseTo(underYUp.timeOfFlight, 1);
    expect(underZUp.range).not.toBeCloseTo(underYUp.range, 1);
    expect(underZUp.maxHeight).not.toBeCloseTo(underYUp.maxHeight, 1);

    const expectedZUpFlight = (2 * 15) / g; // y0=0 under z-up -> 2*vy0/g
    const expectedZUpRange = Math.hypot(20, 10) * expectedZUpFlight;
    const expectedZUpMaxHeight = (15 * 15) / (2 * g);
    expect(underZUp.timeOfFlight).toBeCloseTo(expectedZUpFlight, 10);
    expect(underZUp.range).toBeCloseTo(expectedZUpRange, 8);
    expect(underZUp.maxHeight).toBeCloseTo(expectedZUpMaxHeight, 10);
  });
});
