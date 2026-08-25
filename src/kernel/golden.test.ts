/**
 * Golden-value physics tests (ARCHITECTURE.md §18, TASKS.md M1-23) —
 * the four named checks M1's gate requires, kept in one dedicated file
 * separate from each submodule's own white-box tests because these are
 * specifically the M1-G acceptance checks, not ordinary coverage.
 *
 * Imported through the kernel barrel (`./index`) rather than individual
 * submodules, so this file also doubles as a smoke test that the barrel
 * wiring (src/kernel/index.ts) is correct.
 */
import { describe, it, expect } from 'vitest';
import * as K from './index';
import type { Vec3 } from './math';

describe('golden: period of a circular orbit', () => {
  it('a circular orbit returns to its starting position/velocity after one closed-form period', () => {
    // Two-body gravity, GM=1. Circular orbit at r=1 has speed v=1 and
    // period T = 2*pi*sqrt(r^3/GM) = 2*pi. State = [x,y,z, vx,vy,vz];
    // accel(state,t) = [vx,vy,vz, -GM*x/rho^3, -GM*y/rho^3, -GM*z/rho^3].
    const GM = 1;
    const accel = (state: Float64Array): Float64Array => {
      const [x, y, z, vx, vy, vz] = state;
      const rho = Math.sqrt(x * x + y * y + z * z);
      const f = -GM / (rho * rho * rho);
      return new Float64Array([vx, vy, vz, f * x, f * y, f * z]);
    };

    let state: Float64Array = new Float64Array([1, 0, 0, 0, 1, 0]);
    const steps = 3600;
    const T = 2 * Math.PI;
    const dt = T / steps;
    for (let i = 0; i < steps; i++) {
      state = K.ode.velocityVerlet(accel, state, i * dt, dt);
    }

    expect(state[0]).toBeCloseTo(1, 3);
    expect(state[1]).toBeCloseTo(0, 3);
    expect(state[2]).toBeCloseTo(0, 3);
    expect(state[3]).toBeCloseTo(0, 3);
    expect(state[4]).toBeCloseTo(1, 3);
    expect(state[5]).toBeCloseTo(0, 3);
  });
});

describe('golden: inertia tensor of a uniform cuboid', () => {
  it('matches the closed-form formula exactly', () => {
    const m = K.inertia.boxInertia(1, [2, 4, 6]);
    expect(m[0]).toBeCloseTo(52 / 12, 12); // Ixx = m/12*(b^2+c^2)
    expect(m[4]).toBeCloseTo(40 / 12, 12); // Iyy = m/12*(a^2+c^2)
    expect(m[8]).toBeCloseTo(20 / 12, 12); // Izz = m/12*(a^2+b^2)
    for (const i of [1, 2, 3, 5, 6, 7]) expect(m[i]).toBe(0);
  });
});

describe('golden: flux of a radial field through a sphere = 4*pi', () => {
  it('surfaceFlux of the unit radial field over a unit sphere converges to 4*pi', () => {
    const F = (p: Vec3): Vec3 => {
      const r = K.math.norm(p);
      return K.math.scale(p, 1 / r);
    };
    const surf = (u: number, v: number): Vec3 =>
      K.frames.sphericalToCartesian({ r: 1, theta: u * Math.PI, phi: v * 2 * Math.PI });
    const result = K.calculus.surfaceFlux(F, surf, 16, 16);
    expect(result.value).toBeCloseTo(4 * Math.PI, 2);
  });

  it('the result is independent of the sphere radius (as it must be for an inverse-square field)', () => {
    const F = (p: Vec3): Vec3 => {
      const r = K.math.norm(p);
      return K.math.scale(p, 1 / (r * r * r)); // p_hat / r^2, the actual inverse-square field
    };
    for (const radius of [0.5, 1, 3]) {
      const surf = (u: number, v: number): Vec3 =>
        K.frames.sphericalToCartesian({ r: radius, theta: u * Math.PI, phi: v * 2 * Math.PI });
      const result = K.calculus.surfaceFlux(F, surf, 16, 16);
      expect(result.value).toBeCloseTo(4 * Math.PI, 2);
    }
  });
});

describe('golden: curl of a rigid rotation field = 2*omega (handedness test)', () => {
  it('matches 2*omega for an axis-aligned omega', () => {
    const omega: Vec3 = [0, 0, 1];
    const F = (p: Vec3): Vec3 => K.math.cross(omega, p);
    const c = K.calculus.curl(F, [1, 2, 3]);
    expect(c[0]).toBeCloseTo(0, 8);
    expect(c[1]).toBeCloseTo(0, 8);
    expect(c[2]).toBeCloseTo(2, 8);
  });

  it('matches 2*omega for a skew omega at a different point — catches an axis-permutation bug, not just a sign flip', () => {
    const omega: Vec3 = [1, 2, -1];
    const F = (p: Vec3): Vec3 => K.math.cross(omega, p);
    const c = K.calculus.curl(F, [-2, 0.5, 4]);
    expect(c[0]).toBeCloseTo(2 * omega[0], 8);
    expect(c[1]).toBeCloseTo(2 * omega[1], 8);
    expect(c[2]).toBeCloseTo(2 * omega[2], 8);
  });
});
