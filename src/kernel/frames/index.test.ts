import { describe, it, expect } from 'vitest';
import * as F from './index';
import {
  cross,
  dot,
  norm,
  add,
  fromAxisAngle,
  transformMat3,
  toMatrix,
  identityQuat,
} from '../math';
import type { Vec3 } from '../math';

function expectVec3Close(a: Vec3, b: Vec3, digits = 9) {
  expect(a[0]).toBeCloseTo(b[0], digits);
  expect(a[1]).toBeCloseTo(b[1], digits);
  expect(a[2]).toBeCloseTo(b[2], digits);
}

describe('cylindrical <-> cartesian', () => {
  it('round-trips a handful of points', () => {
    const points: Vec3[] = [
      [1, 0, 0],
      [0, 1, 2],
      [-3, 4, -5],
      [2, 2, 0],
    ];
    for (const p of points) {
      const c = F.cartesianToCylindrical(p);
      expectVec3Close(F.cylindricalToCartesian(c), p);
    }
  });

  it('theta runs from +x toward +y (right-handed)', () => {
    const c = F.cartesianToCylindrical([0, 1, 0]);
    expect(c.theta).toBeCloseTo(Math.PI / 2, 12);
  });
});

describe('spherical <-> cartesian', () => {
  it('round-trips a handful of points', () => {
    const points: Vec3[] = [
      [1, 0, 0],
      [0, 0, 1],
      [1, 1, 1],
      [-2, 3, -1],
    ];
    for (const p of points) {
      const s = F.cartesianToSpherical(p);
      expectVec3Close(F.sphericalToCartesian(s), p);
    }
  });

  it('theta is the polar angle from +z', () => {
    expect(F.cartesianToSpherical([0, 0, 1]).theta).toBeCloseTo(0, 12);
    expect(F.cartesianToSpherical([1, 0, 0]).theta).toBeCloseTo(Math.PI / 2, 12);
  });

  it('handles the origin without NaN', () => {
    const s = F.cartesianToSpherical([0, 0, 0]);
    expect(Number.isNaN(s.theta)).toBe(false);
    expect(s.r).toBe(0);
  });
});

describe('bases are right-handed (ADR 0008)', () => {
  it('cylindrical: r-hat cross theta-hat = z-hat', () => {
    const basis = F.cylindricalBasis(0.7);
    const rHat: Vec3 = [basis[0], basis[1], basis[2]];
    const thetaHat: Vec3 = [basis[3], basis[4], basis[5]];
    const zHat: Vec3 = [basis[6], basis[7], basis[8]];
    expectVec3Close(cross(rHat, thetaHat), zHat);
  });

  it('spherical: r-hat cross theta-hat = phi-hat at theta=90deg, phi=0', () => {
    const basis = F.sphericalBasis(Math.PI / 2, 0);
    const rHat: Vec3 = [basis[0], basis[1], basis[2]];
    const thetaHat: Vec3 = [basis[3], basis[4], basis[5]];
    const phiHat: Vec3 = [basis[6], basis[7], basis[8]];
    expectVec3Close(rHat, [1, 0, 0]);
    expectVec3Close(thetaHat, [0, 0, -1]);
    expectVec3Close(cross(rHat, thetaHat), phiHat);
  });

  it('spherical basis is orthonormal at an arbitrary angle', () => {
    const basis = F.sphericalBasis(1.1, 2.2);
    const rHat: Vec3 = [basis[0], basis[1], basis[2]];
    const thetaHat: Vec3 = [basis[3], basis[4], basis[5]];
    const phiHat: Vec3 = [basis[6], basis[7], basis[8]];
    expect(norm(rHat)).toBeCloseTo(1, 12);
    expect(norm(thetaHat)).toBeCloseTo(1, 12);
    expect(norm(phiHat)).toBeCloseTo(1, 12);
    expect(dot(rHat, thetaHat)).toBeCloseTo(0, 12);
    expect(dot(rHat, phiHat)).toBeCloseTo(0, 12);
    expect(dot(thetaHat, phiHat)).toBeCloseTo(0, 12);
  });
});

describe('Jacobians match numerical differentiation', () => {
  it('cylindricalJacobian matches finite differences of cylindricalToCartesian', () => {
    const r = 2,
      theta = 0.6,
      z = 1;
    const h = 1e-6;
    const dr = F.cylindricalToCartesian({ r: r + h, theta, z });
    const dr0 = F.cylindricalToCartesian({ r: r - h, theta, z });
    const dtheta = F.cylindricalToCartesian({ r, theta: theta + h, z });
    const dtheta0 = F.cylindricalToCartesian({ r, theta: theta - h, z });
    const dz = F.cylindricalToCartesian({ r, theta, z: z + h });
    const dz0 = F.cylindricalToCartesian({ r, theta, z: z - h });
    const numeric = [
      (dr[0] - dr0[0]) / (2 * h),
      (dr[1] - dr0[1]) / (2 * h),
      (dr[2] - dr0[2]) / (2 * h),
      (dtheta[0] - dtheta0[0]) / (2 * h),
      (dtheta[1] - dtheta0[1]) / (2 * h),
      (dtheta[2] - dtheta0[2]) / (2 * h),
      (dz[0] - dz0[0]) / (2 * h),
      (dz[1] - dz0[1]) / (2 * h),
      (dz[2] - dz0[2]) / (2 * h),
    ];
    const jac = F.cylindricalJacobian(r, theta);
    for (let i = 0; i < 9; i++) expect(jac[i]).toBeCloseTo(numeric[i], 5);
  });

  it('sphericalJacobian matches finite differences of sphericalToCartesian', () => {
    const r = 2,
      theta = 0.9,
      phi = 1.3;
    const h = 1e-6;
    const dr = F.sphericalToCartesian({ r: r + h, theta, phi });
    const dr0 = F.sphericalToCartesian({ r: r - h, theta, phi });
    const dtheta = F.sphericalToCartesian({ r, theta: theta + h, phi });
    const dtheta0 = F.sphericalToCartesian({ r, theta: theta - h, phi });
    const dphi = F.sphericalToCartesian({ r, theta, phi: phi + h });
    const dphi0 = F.sphericalToCartesian({ r, theta, phi: phi - h });
    const numeric = [
      (dr[0] - dr0[0]) / (2 * h),
      (dr[1] - dr0[1]) / (2 * h),
      (dr[2] - dr0[2]) / (2 * h),
      (dtheta[0] - dtheta0[0]) / (2 * h),
      (dtheta[1] - dtheta0[1]) / (2 * h),
      (dtheta[2] - dtheta0[2]) / (2 * h),
      (dphi[0] - dphi0[0]) / (2 * h),
      (dphi[1] - dphi0[1]) / (2 * h),
      (dphi[2] - dphi0[2]) / (2 * h),
    ];
    const jac = F.sphericalJacobian(r, theta, phi);
    for (let i = 0; i < 9; i++) expect(jac[i]).toBeCloseTo(numeric[i], 5);
  });
});

describe('Frame — transformPoint/transformVector', () => {
  it('identity frame is a no-op for points and vectors', () => {
    const frame: F.Frame = { origin: [0, 0, 0], orientation: identityQuat() };
    expectVec3Close(F.transformPoint(frame, [1, 2, 3]), [1, 2, 3]);
    expectVec3Close(F.transformVector(frame, [1, 2, 3]), [1, 2, 3]);
  });

  it('translation-only frame offsets points but not vectors', () => {
    const frame: F.Frame = { origin: [5, 0, 0], orientation: identityQuat() };
    expectVec3Close(F.transformPoint(frame, [1, 0, 0]), [6, 0, 0]);
    expectVec3Close(F.transformVector(frame, [1, 0, 0]), [1, 0, 0]);
  });

  it('rotation-only frame rotates both points and vectors', () => {
    const frame: F.Frame = {
      origin: [0, 0, 0],
      orientation: fromAxisAngle([0, 0, 1], Math.PI / 2),
    };
    expectVec3Close(F.transformPoint(frame, [1, 0, 0]), [0, 1, 0]);
    expectVec3Close(F.transformVector(frame, [1, 0, 0]), [0, 1, 0]);
  });

  it('combined rotation+translation matches manual rotate-then-add', () => {
    const orientation = fromAxisAngle([0, 0, 1], 0.4);
    const origin: Vec3 = [1, 2, 3];
    const frame: F.Frame = { origin, orientation };
    const p: Vec3 = [0.5, -0.2, 1.1];
    const expected = add(origin, transformMat3(toMatrix(orientation), p));
    expectVec3Close(F.transformPoint(frame, p), expected);
  });
});

describe('transformVelocity / transformAcceleration', () => {
  it('a non-rotating frame reduces velocity to just the relative term', () => {
    const frame: F.Frame = { origin: [0, 0, 0], orientation: identityQuat() };
    const v = F.transformVelocity(frame, [1, 0, 0], [0, 1, 0]);
    expectVec3Close(v, [0, 1, 0]);
  });

  it('omega x r is added for a rotating frame with zero relative velocity', () => {
    const frame: F.Frame = { origin: [0, 0, 0], orientation: identityQuat(), omega: [0, 0, 1] };
    // r = (1,0,0), vRel = 0 => transport term omega x r = (0,1,0)
    const v = F.transformVelocity(frame, [1, 0, 0], [0, 0, 0]);
    expectVec3Close(v, [0, 1, 0]);
  });

  it('acceleration terms are individually correct and sum to total', () => {
    const omega: Vec3 = [0, 0, 2];
    const omegaDot: Vec3 = [0, 0, 0.5];
    const frame: F.Frame = { origin: [0, 0, 0], orientation: identityQuat(), omega, omegaDot };
    const r: Vec3 = [1, 0, 0];
    const vRel: Vec3 = [0, 1, 0];
    const aRel: Vec3 = [0, 0, 3];
    const terms = F.transformAcceleration(frame, r, vRel, aRel);

    expectVec3Close(terms.relative, aRel);
    expectVec3Close(terms.coriolis, [-4, 0, 0]); // 2 * (omega x vRel) = 2*(0,0,2)x(0,1,0) = 2*(-2,0,0)
    expectVec3Close(terms.centrifugal, [-4, 0, 0]); // omega x (omega x r), points toward the axis
    expectVec3Close(terms.euler, [0, 0.5, 0]); // omegaDot x r
    const sum: Vec3 = [
      terms.relative[0] + terms.coriolis[0] + terms.centrifugal[0] + terms.euler[0],
      terms.relative[1] + terms.coriolis[1] + terms.centrifugal[1] + terms.euler[1],
      terms.relative[2] + terms.coriolis[2] + terms.centrifugal[2] + terms.euler[2],
    ];
    expectVec3Close(terms.total, sum);
  });

  it('rotates every term into world space via the frame orientation', () => {
    const orientation = fromAxisAngle([0, 0, 1], Math.PI / 2); // rotate local +x to world +y
    const frame: F.Frame = { origin: [0, 0, 0], orientation, omega: [0, 0, 1] };
    const terms = F.transformAcceleration(frame, [1, 0, 0], [0, 0, 0], [0, 0, 0]);
    // local centrifugal = omega x (omega x r) = (-1,0,0); rotated 90deg about z -> (0,-1,0)
    expectVec3Close(terms.centrifugal, [0, -1, 0]);
  });

  it('defaults omega/omegaDot to zero when absent', () => {
    const frame: F.Frame = { origin: [0, 0, 0], orientation: identityQuat() };
    const terms = F.transformAcceleration(frame, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    expectVec3Close(terms.coriolis, [0, 0, 0]);
    expectVec3Close(terms.centrifugal, [0, 0, 0]);
    expectVec3Close(terms.euler, [0, 0, 0]);
    expectVec3Close(terms.total, [0, 0, 1]);
  });
});
