import { describe, it, expect } from 'vitest';
import * as C from './index';
import { cross, norm } from '../math';
import type { Vec3 } from '../math';

describe('grad', () => {
  it('matches the analytic gradient of a quadratic form', () => {
    // f(x,y,z) = x^2 + 2y^2 + 3z^2 => grad = (2x, 4y, 6z)
    const f = (p: Vec3) => p[0] * p[0] + 2 * p[1] * p[1] + 3 * p[2] * p[2];
    const g = C.grad(f, [1, 2, 3]);
    expect(g[0]).toBeCloseTo(2, 6);
    expect(g[1]).toBeCloseTo(8, 6);
    expect(g[2]).toBeCloseTo(18, 6);
  });

  it('accepts an explicit h override', () => {
    const f = (p: Vec3) => p[0] * p[0];
    const g = C.grad(f, [3, 0, 0], 1e-4);
    expect(g[0]).toBeCloseTo(6, 4);
  });
});

describe('div', () => {
  it('matches the analytic divergence of a linear field', () => {
    // F(x,y,z) = (x, 2y, 3z) => div = 1+2+3 = 6, everywhere
    const F = (p: Vec3): Vec3 => [p[0], 2 * p[1], 3 * p[2]];
    expect(C.div(F, [1, 1, 1])).toBeCloseTo(6, 6);
    expect(C.div(F, [10, -5, 2])).toBeCloseTo(6, 6);
  });

  it('is zero for a solenoidal (rigid rotation) field', () => {
    const omega: Vec3 = [1, 2, 3];
    const F = (p: Vec3): Vec3 => cross(omega, p);
    expect(C.div(F, [4, -1, 2])).toBeCloseTo(0, 6);
  });
});

describe('curl', () => {
  it('is 2*omega for a rigid rotation field (handedness check)', () => {
    const omega: Vec3 = [0, 0, 1];
    const F = (p: Vec3): Vec3 => cross(omega, p);
    const c = C.curl(F, [1, 2, 3]);
    expect(c[0]).toBeCloseTo(0, 6);
    expect(c[1]).toBeCloseTo(0, 6);
    expect(c[2]).toBeCloseTo(2, 6);
  });

  it('is zero for a conservative (gradient) field', () => {
    // F = grad(x^2+y^2+z^2) = (2x,2y,2z), curl of a gradient is always zero
    const F = (p: Vec3): Vec3 => [2 * p[0], 2 * p[1], 2 * p[2]];
    const c = C.curl(F, [1, -2, 3]);
    expect(c[0]).toBeCloseTo(0, 6);
    expect(c[1]).toBeCloseTo(0, 6);
    expect(c[2]).toBeCloseTo(0, 6);
  });
});

describe('gaussLegendre', () => {
  it('matches the known n=2 table', () => {
    const rule = C.gaussLegendre(2);
    const expectedNode = 1 / Math.sqrt(3);
    expect(rule.nodes[0]).toBeCloseTo(-expectedNode, 12);
    expect(rule.nodes[1]).toBeCloseTo(expectedNode, 12);
    expect(rule.weights[0]).toBeCloseTo(1, 12);
    expect(rule.weights[1]).toBeCloseTo(1, 12);
  });

  it('matches the known n=3 table', () => {
    const rule = C.gaussLegendre(3);
    const expectedNode = Math.sqrt(3 / 5);
    expect(rule.nodes[0]).toBeCloseTo(-expectedNode, 12);
    expect(rule.nodes[1]).toBeCloseTo(0, 12);
    expect(rule.nodes[2]).toBeCloseTo(expectedNode, 12);
    expect(rule.weights[0]).toBeCloseTo(5 / 9, 12);
    expect(rule.weights[1]).toBeCloseTo(8 / 9, 12);
    expect(rule.weights[2]).toBeCloseTo(5 / 9, 12);
  });

  it('integrates a degree (2n-1) polynomial on [-1,1] exactly', () => {
    // n=4 GL integrates degree <= 7 exactly. Integral of x^6 on [-1,1] = 2/7.
    const rule = C.gaussLegendre(4);
    let sum = 0;
    for (let i = 0; i < 4; i++) sum += rule.weights[i] * Math.pow(rule.nodes[i], 6);
    expect(sum).toBeCloseTo(2 / 7, 9);
  });

  it('is memoized (returns the same object for the same n)', () => {
    expect(C.gaussLegendre(5)).toBe(C.gaussLegendre(5));
  });

  it('throws for n < 1', () => {
    expect(() => C.gaussLegendre(0)).toThrow();
  });
});

describe('lineIntegral', () => {
  it('matches a closed-form work integral for a constant force along a straight line', () => {
    // F = (1,0,0) constant, path from (0,0,0) to (2,0,0) => work = 2
    const F = (): Vec3 => [1, 0, 0];
    const path = (t: number): Vec3 => [2 * t, 0, 0];
    const result = C.lineIntegral(F, path, 8);
    expect(result.value).toBeCloseTo(2, 6);
    expect(result.contributions.length).toBe(8);
  });

  it('contributions sum to the reported value', () => {
    const F = (p: Vec3): Vec3 => [p[1], -p[0], 0];
    const path = (t: number): Vec3 => [Math.cos(2 * Math.PI * t), Math.sin(2 * Math.PI * t), 0];
    const result = C.lineIntegral(F, path, 12);
    const sum = result.contributions.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(result.value, 9);
  });
});

describe('surfaceFlux', () => {
  it('flux of a radial field through a sphere is 4*pi (golden check, independent of the golden.test.ts one)', () => {
    const F = (p: Vec3): Vec3 => {
      const r = norm(p);
      return [p[0] / r, p[1] / r, p[2] / r];
    };
    const surf = (u: number, v: number): Vec3 => {
      const theta = u * Math.PI;
      const phi = v * 2 * Math.PI;
      const sinT = Math.sin(theta);
      return [sinT * Math.cos(phi), sinT * Math.sin(phi), Math.cos(theta)];
    };
    const result = C.surfaceFlux(F, surf, 16, 16);
    expect(result.value).toBeCloseTo(4 * Math.PI, 2);
    expect(result.contributions.length).toBe(256);
  });

  it('flux of a uniform field through a flat square normal to it equals the area', () => {
    const F = (): Vec3 => [0, 0, 1];
    const surf = (u: number, v: number): Vec3 => [u, v, 0];
    const result = C.surfaceFlux(F, surf, 6, 6);
    expect(result.value).toBeCloseTo(1, 6);
  });

  it('contributions sum to the reported value', () => {
    const F = (p: Vec3): Vec3 => p;
    const surf = (u: number, v: number): Vec3 => [u, v, 0];
    const result = C.surfaceFlux(F, surf, 5, 5);
    const sum = result.contributions.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(result.value, 9);
  });
});

describe('pathTangent / surfacePartials domain-edge handling', () => {
  it('pathTangent uses a forward difference right at t=0', () => {
    const path = (t: number): Vec3 => [t, 0, 0];
    const tangent = C.pathTangent(path, 0);
    expect(tangent[0]).toBeCloseTo(1, 3);
  });

  it('pathTangent uses a backward difference right at t=1', () => {
    const path = (t: number): Vec3 => [t, 0, 0];
    const tangent = C.pathTangent(path, 1);
    expect(tangent[0]).toBeCloseTo(1, 3);
  });

  it('surfacePartials uses one-sided differences at every domain corner', () => {
    const surf = (u: number, v: number): Vec3 => [u, v, 0];
    for (const [u, v] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ] as const) {
      const [dSdu, dSdv] = C.surfacePartials(surf, u, v);
      expect(dSdu[0]).toBeCloseTo(1, 3);
      expect(dSdv[1]).toBeCloseTo(1, 3);
    }
  });
});

describe('isBoxRegion', () => {
  it('accepts a well-formed box', () => {
    expect(C.isBoxRegion({ min: [0, 0, 0], max: [1, 1, 1] })).toBe(true);
  });

  it('rejects anything else', () => {
    expect(C.isBoxRegion(null)).toBe(false);
    expect(C.isBoxRegion({})).toBe(false);
    expect(C.isBoxRegion({ min: [0, 0, 0] })).toBe(false);
    expect(C.isBoxRegion({ min: [0, 0], max: [1, 1, 1] })).toBe(false);
  });
});

describe('volumeIntegral', () => {
  it('matches the closed-form volume of a unit cube (f=1)', () => {
    const result = C.volumeIntegral(() => 1, { min: [0, 0, 0], max: [1, 1, 1] }, 4);
    expect(result.value).toBeCloseTo(1, 9);
    expect(result.contributions.length).toBe(64);
  });

  it('matches a closed-form mass integral for a linearly varying density', () => {
    // density(x,y,z) = x, over box [0,2]x[0,1]x[0,1] => mass = 2*1*1 * (avg x=1) = 2
    const result = C.volumeIntegral((p) => p[0], { min: [0, 0, 0], max: [2, 1, 1] }, 4);
    expect(result.value).toBeCloseTo(2, 9);
  });

  it('throws for a non-BoxRegion', () => {
    expect(() => C.volumeIntegral(() => 1, {}, 4)).toThrow();
  });
});
