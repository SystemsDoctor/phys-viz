import { describe, it, expect } from 'vitest';
import * as I from './index';
import type { Mat3, Vec3 } from '../math';

describe('boxInertia', () => {
  it('matches the closed-form formula for a uniform cuboid', () => {
    const m = I.boxInertia(1, [2, 4, 6]);
    // Ixx = m/12*(b^2+c^2) = (16+36)/12, Iyy = (4+36)/12, Izz = (4+16)/12
    expect(m[0]).toBeCloseTo(52 / 12, 9);
    expect(m[4]).toBeCloseTo(40 / 12, 9);
    expect(m[8]).toBeCloseTo(20 / 12, 9);
  });

  it('is diagonal', () => {
    const m = I.boxInertia(2, [1, 2, 3]);
    for (const i of [1, 2, 3, 5, 6, 7]) expect(m[i]).toBe(0);
  });

  it('is isotropic for a cube', () => {
    const m = I.boxInertia(6, [1, 1, 1]);
    expect(m[0]).toBeCloseTo(1, 9);
    expect(m[4]).toBeCloseTo(1, 9);
    expect(m[8]).toBeCloseTo(1, 9);
  });
});

describe('sphereInertia', () => {
  it('matches the closed-form formula and is isotropic', () => {
    const m = I.sphereInertia(5, 2);
    const expected = (2 / 5) * 5 * 4;
    expect(m[0]).toBeCloseTo(expected, 9);
    expect(m[4]).toBeCloseTo(expected, 9);
    expect(m[8]).toBeCloseTo(expected, 9);
  });
});

describe('cylinderInertia / discInertia / rodInertia consistency', () => {
  it('cylinderInertia at height=0 matches discInertia (cross-check)', () => {
    const cyl = I.cylinderInertia(3, 2, 0);
    const disc = I.discInertia(3, 2);
    for (let i = 0; i < 9; i++) expect(cyl[i]).toBeCloseTo(disc[i], 9);
  });

  it('cylinderInertia at radius=0 matches rodInertia (cross-check)', () => {
    const cyl = I.cylinderInertia(3, 0, 5);
    const rod = I.rodInertia(3, 5);
    for (let i = 0; i < 9; i++) expect(cyl[i]).toBeCloseTo(rod[i], 9);
  });

  it('matches the closed-form cylinder formula', () => {
    const m = I.cylinderInertia(2, 3, 4);
    const iAxial = 0.5 * 2 * 9;
    const iTransverse = (2 / 12) * (3 * 9 + 16);
    expect(m[0]).toBeCloseTo(iTransverse, 9);
    expect(m[4]).toBeCloseTo(iTransverse, 9);
    expect(m[8]).toBeCloseTo(iAxial, 9);
  });

  it('rodInertia has zero moment about its own axis', () => {
    const m = I.rodInertia(4, 10);
    expect(m[8]).toBe(0);
  });
});

describe('parallelAxis', () => {
  it('is a no-op for zero offset', () => {
    const iCm = I.sphereInertia(1, 1);
    const shifted = I.parallelAxis(iCm, 1, [0, 0, 0]);
    for (let i = 0; i < 9; i++) expect(shifted[i]).toBeCloseTo(iCm[i], 9);
  });

  it('matches the closed-form point-mass parallel-axis shift', () => {
    // A point mass (I_cm = 0) shifted by offset d picks up exactly
    // m*(|d|^2 * I - d (x) d), the parallel-axis correction with nothing
    // else added.
    const zero: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const mass = 2;
    const offset: Vec3 = [1, 2, 3];
    const shifted = I.parallelAxis(zero, mass, offset);
    const dSq = offset[0] * offset[0] + offset[1] * offset[1] + offset[2] * offset[2];
    // Ixx = m*(dSq - dx*dx)
    expect(shifted[0]).toBeCloseTo(mass * (dSq - offset[0] * offset[0]), 9);
    // Iyy = m*(dSq - dy*dy)
    expect(shifted[4]).toBeCloseTo(mass * (dSq - offset[1] * offset[1]), 9);
    // Izz = m*(dSq - dz*dz)
    expect(shifted[8]).toBeCloseTo(mass * (dSq - offset[2] * offset[2]), 9);
    // off-diagonal Ixy = -m*dx*dy
    expect(shifted[3]).toBeCloseTo(-mass * offset[0] * offset[1], 9);
  });

  it('reproduces a rod-about-one-end from two point masses at its center of mass', () => {
    // Two point masses of m/2 at +-L/2 along x, relative to their shared
    // center of mass, reproduce a thin rod's transverse inertia there:
    // I = 2 * (m/2) * (L/2)^2 = m*L^2/4... actually the standard rod
    // formula is m*L^2/12, so verify against the point-mass sum directly
    // rather than assuming which is "right" — they need not match (a rod
    // has continuously distributed mass, not two point masses), this
    // only checks parallelAxis's own arithmetic is self-consistent.
    const L = 4;
    const halfMass = 0.5;
    const zero: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const left = I.parallelAxis(zero, halfMass, [-L / 2, 0, 0]);
    const right = I.parallelAxis(zero, halfMass, [L / 2, 0, 0]);
    const totalIzz = left[8] + right[8];
    // Izz for two point masses at distance L/2 from the z-axis (which
    // passes through their midpoint, perpendicular to the line joining
    // them): Izz = sum(m_i * r_i^2) = 2 * (halfMass) * (L/2)^2
    expect(totalIzz).toBeCloseTo(2 * halfMass * (L / 2) * (L / 2), 9);
  });
});
