import { describe, it, expect } from 'vitest';
import * as O from './index';

describe('rk4', () => {
  it('integrates dy/dt = y exactly (up to O(dt^5)) — exponential growth', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[0]]);
    let state: Float64Array = new Float64Array([1]);
    let t = 0;
    const dt = 0.01;
    for (let i = 0; i < 100; i++) {
      state = O.rk4(deriv, state, t, dt);
      t += dt;
    }
    expect(state[0]).toBeCloseTo(Math.E, 6);
  });

  it('integrates simple harmonic motion (dx/dt=v, dv/dt=-x) and conserves the period', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]); // x=1, v=0
    let t = 0;
    const dt = (2 * Math.PI) / 1000;
    for (let i = 0; i < 1000; i++) {
      state = O.rk4(deriv, state, t, dt);
      t += dt;
    }
    // after one full period, back near the start
    expect(state[0]).toBeCloseTo(1, 4);
    expect(state[1]).toBeCloseTo(0, 4);
  });

  it('allocates zero after warmup at a given state length', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]);
    O.rk4(deriv, state, 0, 0.01); // warm up (allocates scratch for length 2, if not already)
    O._resetScratchAllocCount();
    for (let i = 0; i < 500; i++) {
      state = O.rk4(deriv, state, i * 0.01, 0.01);
    }
    expect(O._scratchAllocCount()).toBe(0);
  });

  it('works with a deriv that reuses the same returned buffer every call', () => {
    const scratch = new Float64Array(2);
    const deriv = (state: Float64Array): Float64Array => {
      scratch[0] = state[1];
      scratch[1] = -state[0];
      return scratch;
    };
    let state: Float64Array = new Float64Array([1, 0]);
    for (let i = 0; i < 10; i++) state = O.rk4(deriv, state, i * 0.01, 0.01);
    expect(Number.isNaN(state[0])).toBe(false);
    expect(Number.isFinite(state[0])).toBe(true);
  });
});

describe('velocityVerlet', () => {
  it('conserves energy for simple harmonic motion over many periods', () => {
    // state = [x, v], accel(state,t) = [v, -x]
    const accel = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]);
    const dt = 0.001;
    const steps = (2 * Math.PI * 5) / dt; // 5 periods
    for (let i = 0; i < steps; i++) {
      state = O.velocityVerlet(accel, state, i * dt, dt);
    }
    const energy = 0.5 * state[0] * state[0] + 0.5 * state[1] * state[1];
    expect(energy).toBeCloseTo(0.5, 2); // started at x=1,v=0 => E=0.5
  });

  it('matches the closed-form parabola for constant acceleration', () => {
    // free fall: x'' = -g. state=[x,v], accel=[v,-g]
    const g = 9.8;
    const accel = (state: Float64Array): Float64Array => new Float64Array([state[1], -g]);
    let state: Float64Array = new Float64Array([0, 0]);
    const dt = 0.01;
    let t = 0;
    for (let i = 0; i < 100; i++) {
      state = O.velocityVerlet(accel, state, t, dt);
      t += dt;
    }
    const expectedX = -0.5 * g * t * t;
    expect(state[0]).toBeCloseTo(expectedX, 6);
  });

  it('throws for an odd-length state', () => {
    const accel = (state: Float64Array): Float64Array => state;
    expect(() => O.velocityVerlet(accel, new Float64Array([1, 2, 3]), 0, 0.01)).toThrow();
  });

  it('allocates zero after warmup at a given state length', () => {
    const accel = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]);
    O.velocityVerlet(accel, state, 0, 0.01);
    O._resetScratchAllocCount();
    for (let i = 0; i < 500; i++) {
      state = O.velocityVerlet(accel, state, i * 0.01, 0.01);
    }
    expect(O._scratchAllocCount()).toBe(0);
  });
});

describe('rkf45', () => {
  it('integrates simple harmonic motion accurately', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]);
    let t = 0;
    let dt = 0.1;
    while (t < 2 * Math.PI) {
      const stepDt = Math.min(dt, 2 * Math.PI - t);
      const result = O.rkf45(deriv, state, t, stepDt);
      state = result.state;
      dt = result.dtNext;
      t += stepDt;
    }
    expect(state[0]).toBeCloseTo(1, 3);
    expect(state[1]).toBeCloseTo(0, 3);
  });

  it('shrinks the next step when error is large, grows it when error is tiny', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    const state = new Float64Array([1, 0]);
    const bigStep = O.rkf45(deriv, state, 0, 1, 1e-8);
    const tinyStep = O.rkf45(deriv, state, 0, 1e-6, 1e-3);
    expect(bigStep.dtNext).toBeLessThan(1);
    expect(tinyStep.dtNext).toBeGreaterThan(1e-6);
  });

  it('allocates zero after warmup at a given state length', () => {
    const deriv = (state: Float64Array): Float64Array => new Float64Array([state[1], -state[0]]);
    let state: Float64Array = new Float64Array([1, 0]);
    O.rkf45(deriv, state, 0, 0.01);
    O._resetScratchAllocCount();
    for (let i = 0; i < 200; i++) {
      const result = O.rkf45(deriv, state, i * 0.01, 0.01);
      state = result.state;
    }
    expect(O._scratchAllocCount()).toBe(0);
  });
});

describe('findEvent', () => {
  it('finds the zero-crossing of a simple linear function', () => {
    const t = O.findEvent((x) => x - 3, 0, 10);
    expect(t).toBeCloseTo(3, 8);
  });

  it('finds when a projectile hits the ground (parabola root)', () => {
    const h = (t: number) => 10 - 0.5 * 9.8 * t * t;
    const tHit = Math.sqrt(20 / 9.8);
    const found = O.findEvent(h, 0, 3);
    expect(found).toBeCloseTo(tHit, 6);
  });
});

describe('findRoot', () => {
  it('solves a simple quadratic with the bracket given in reverse orientation (f(lo) > 0)', () => {
    const f = (x: number) => 4 - x * x; // positive at x=0, negative at x=10
    const fp = (x: number) => -2 * x;
    const root = O.findRoot(f, fp, 0, 10);
    expect(root).toBeCloseTo(2, 9);
  });

  it('solves a simple quadratic', () => {
    const f = (x: number) => x * x - 4;
    const fp = (x: number) => 2 * x;
    const root = O.findRoot(f, fp, 0, 10);
    expect(root).toBeCloseTo(2, 9);
  });

  it("solves Kepler's equation (M = E - e*sin(E)) via Newton-Raphson", () => {
    const e = 0.5;
    const M = 1.0;
    const f = (E: number) => E - e * Math.sin(E) - M;
    const fp = (E: number) => 1 - e * Math.cos(E);
    const E = O.findRoot(f, fp, 0, Math.PI);
    expect(E - e * Math.sin(E)).toBeCloseTo(M, 9);
  });

  it('returns its best estimate if maxIter is exhausted before convergence', () => {
    const f = (x: number) => x * x - 4;
    const fp = (x: number) => 2 * x;
    // one Newton step from the midpoint (5) can't reach 1e-15 tolerance
    const root = O.findRoot(f, fp, 0, 10, 1e-15, 1);
    expect(root).toBeCloseTo(2.9, 9);
    expect(root).not.toBeCloseTo(2, 6);
  });

  it('returns an endpoint immediately if it is already a root', () => {
    const f = (x: number) => x - 5;
    const fp = () => 1;
    expect(O.findRoot(f, fp, 5, 10)).toBe(5);
    expect(O.findRoot(f, fp, 0, 5)).toBe(5);
  });

  it("falls back to bisection when a Newton step would leave the bracket (Newton's 1669 cubic)", () => {
    // x^3 - 2x - 5 on a wide bracket: verified separately that this specific
    // bracket makes the algorithm take the bisection branch twice before
    // converging, exercising that path rather than assuming it by construction.
    const f = (x: number) => x * x * x - 2 * x - 5;
    const fp = (x: number) => 3 * x * x - 2;
    const root = O.findRoot(f, fp, -3, 5);
    expect(root).toBeCloseTo(2.0945514815423265, 12);
  });
});
