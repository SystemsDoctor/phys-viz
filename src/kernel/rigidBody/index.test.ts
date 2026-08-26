import { describe, it, expect } from 'vitest';
import { eulerRHS, quatDerivative } from './index';
import { fromAxisAngle, identityQuat, normalizeQuat, dotQuat } from '../math';
import type { Quat } from '../math';

describe('eulerRHS', () => {
  it('a symmetric top (I1 === I2) has zero angular acceleration about the symmetry axis, torque-free', () => {
    const [, , dw3] = eulerRHS([1, 0.5, 0.3], [2, 2, 5]);
    expect(dw3).toBeCloseTo(0, 12);
  });

  it('matches a hand-computed asymmetric torque-free case', () => {
    // I = [1,2,3], omega = [1,1,1]:
    // dw1 = (I2-I3)*w2*w3/I1 = (2-3)*1*1/1 = -1
    // dw2 = (I3-I1)*w3*w1/I2 = (3-1)*1*1/2 = 1
    // dw3 = (I1-I2)*w1*w2/I3 = (1-2)*1*1/3 = -1/3
    const [dw1, dw2, dw3] = eulerRHS([1, 1, 1], [1, 2, 3]);
    expect(dw1).toBeCloseTo(-1, 12);
    expect(dw2).toBeCloseTo(1, 12);
    expect(dw3).toBeCloseTo(-1 / 3, 12);
  });

  it('with zero omega and an isotropic tensor, dω/dt is simply torque/I', () => {
    const [dw1, dw2, dw3] = eulerRHS([0, 0, 0], [1, 1, 1], [1, 0, 0]);
    expect(dw1).toBeCloseTo(1, 12);
    expect(dw2).toBeCloseTo(0, 12);
    expect(dw3).toBeCloseTo(0, 12);
  });
});

describe('quatDerivative', () => {
  it('agrees with fromAxisAngle to first order for a small dt', () => {
    const q0 = identityQuat();
    const omega: [number, number, number] = [0, 0, 1];
    const dt = 1e-6;
    const d = quatDerivative(q0, omega);
    const approx: Quat = [
      q0[0] + dt * d[0],
      q0[1] + dt * d[1],
      q0[2] + dt * d[2],
      q0[3] + dt * d[3],
    ];
    const exact = fromAxisAngle([0, 0, 1], dt);
    for (let i = 0; i < 4; i++) expect(approx[i]).toBeCloseTo(exact[i], 9);
  });

  it('integrating constant omega over one full period returns to the starting orientation (up to sign)', () => {
    const omega: [number, number, number] = [0.3, -0.7, 1.1];
    const omegaMag = Math.hypot(...omega);
    const period = (2 * Math.PI) / omegaMag;
    const steps = 20_000;
    const dt = period / steps;

    let q: Quat = identityQuat();
    for (let i = 0; i < steps; i++) {
      const d = quatDerivative(q, omega);
      q = normalizeQuat([q[0] + dt * d[0], q[1] + dt * d[1], q[2] + dt * d[2], q[3] + dt * d[3]]);
    }

    // A full-period rotation returns to the same orientation; |dot| -> 1
    // (quaternions q and -q represent the same rotation).
    expect(Math.abs(dotQuat(q, identityQuat()))).toBeCloseTo(1, 3);
  });
});
