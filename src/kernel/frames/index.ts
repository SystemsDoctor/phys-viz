/**
 * kernel/frames — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * Cartesian <-> cylindrical <-> spherical conversion, with Jacobians,
 * right-handed per ADR 0008: cylindrical (r, theta, z) with theta from
 * +x toward +y; spherical (r, theta, phi) in the physics convention
 * (theta = polar angle from +z, phi = azimuth from +x toward +y).
 *
 * `Frame`: origin + orientation + optional angular velocity omega and its
 * derivative, describing a local -> parent rigid transform.
 *
 * `transformPoint`, `transformVector`, and critically `transformVelocity` /
 * `transformAcceleration` between frames expose the omega x r,
 * 2 * omega x v (Coriolis), and omega x (omega x r) (centrifugal) terms as
 * SEPARATELY RETRIEVABLE COMPONENTS, not just as a sum — the non-inertial
 * frames module draws each term as its own arrow. `r`, `vRel`, `aRel`, and
 * `omega`/`omegaDot` are all given in the frame's own (local) basis; every
 * returned term is rotated into the parent/world basis via
 * `frame.orientation`, so each one is directly arrow-drawable without a
 * further rotation step.
 *
 * SIGN CONVENTION: "centrifugal" here is literally `omega x (omega x r)`
 * — the kinematic transport term, which for a point at radius r from the
 * rotation axis points *toward* the axis (centripetal-directed). This is
 * the transport-theorem sign, not the "fictitious force" convention
 * (which negates it). A caller wanting the fictitious force per unit mass
 * negates this term. Two textbook conventions disagree here; this module
 * follows §7's literal text.
 */

import type { Vec3, Mat3, Quat } from '../math';
import { add, cross, scale, fromColumns3, rotateVec3 } from '../math';

export interface Frame {
  origin: Vec3;
  orientation: Quat;
  omega?: Vec3;
  omegaDot?: Vec3;
}

export interface AccelerationTerms {
  relative: Vec3;
  coriolis: Vec3;
  centrifugal: Vec3;
  euler: Vec3;
  total: Vec3;
}

export function transformPoint(frame: Frame, p: Vec3): Vec3 {
  return add(frame.origin, rotateVec3(frame.orientation, p));
}

export function transformVector(frame: Frame, v: Vec3): Vec3 {
  return rotateVec3(frame.orientation, v);
}

export function transformVelocity(frame: Frame, r: Vec3, vRel: Vec3): Vec3 {
  const omega = frame.omega ?? [0, 0, 0];
  const vLocal = add(vRel, cross(omega, r));
  return transformVector(frame, vLocal);
}

export function transformAcceleration(
  frame: Frame,
  r: Vec3,
  vRel: Vec3,
  aRel: Vec3,
): AccelerationTerms {
  const omega = frame.omega ?? [0, 0, 0];
  const omegaDot = frame.omegaDot ?? [0, 0, 0];

  const relativeLocal = aRel;
  const coriolisLocal = scale(cross(omega, vRel), 2);
  const centrifugalLocal = cross(omega, cross(omega, r));
  const eulerLocal = cross(omegaDot, r);
  const totalLocal = add(add(add(relativeLocal, coriolisLocal), centrifugalLocal), eulerLocal);

  return {
    relative: transformVector(frame, relativeLocal),
    coriolis: transformVector(frame, coriolisLocal),
    centrifugal: transformVector(frame, centrifugalLocal),
    euler: transformVector(frame, eulerLocal),
    total: transformVector(frame, totalLocal),
  };
}

/* ------------------------- Curvilinear coordinates ------------------------- */

export interface Cylindrical {
  r: number;
  theta: number;
  z: number;
}

export interface Spherical {
  r: number;
  theta: number; // polar angle from +z
  phi: number; // azimuth from +x toward +y
}

export function cartesianToCylindrical(p: Vec3): Cylindrical {
  const [x, y, z] = p;
  return { r: Math.sqrt(x * x + y * y), theta: Math.atan2(y, x), z };
}

export function cylindricalToCartesian(c: Cylindrical): Vec3 {
  return [c.r * Math.cos(c.theta), c.r * Math.sin(c.theta), c.z];
}

export function cartesianToSpherical(p: Vec3): Spherical {
  const [x, y, z] = p;
  const r = Math.sqrt(x * x + y * y + z * z);
  return { r, theta: r === 0 ? 0 : Math.acos(z / r), phi: Math.atan2(y, x) };
}

export function sphericalToCartesian(s: Spherical): Vec3 {
  const sinTheta = Math.sin(s.theta);
  return [
    s.r * sinTheta * Math.cos(s.phi),
    s.r * sinTheta * Math.sin(s.phi),
    s.r * Math.cos(s.theta),
  ];
}

/** Orthonormal (r̂, θ̂, ẑ) basis as Mat3 columns — direction-only, well-defined at r=0. */
export function cylindricalBasis(theta: number): Mat3 {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const rHat: Vec3 = [cosT, sinT, 0];
  const thetaHat: Vec3 = [-sinT, cosT, 0];
  const zHat: Vec3 = [0, 0, 1];
  return fromColumns3(rHat, thetaHat, zHat);
}

/** ∂(x,y,z)/∂(r,theta,z) — the cylindrical basis with the θ column scaled by r. */
export function cylindricalJacobian(r: number, theta: number): Mat3 {
  const basis = cylindricalBasis(theta);
  return fromColumns3(
    [basis[0], basis[1], basis[2]],
    [basis[3] * r, basis[4] * r, basis[5] * r],
    [basis[6], basis[7], basis[8]],
  );
}

/** Orthonormal (r̂, θ̂, φ̂) basis as Mat3 columns — direction-only, well-defined at r=0. Right-handed: r̂ × θ̂ = φ̂. */
export function sphericalBasis(theta: number, phi: number): Mat3 {
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cosP = Math.cos(phi);
  const sinP = Math.sin(phi);
  const rHat: Vec3 = [sinT * cosP, sinT * sinP, cosT];
  const thetaHat: Vec3 = [cosT * cosP, cosT * sinP, -sinT];
  const phiHat: Vec3 = [-sinP, cosP, 0];
  return fromColumns3(rHat, thetaHat, phiHat);
}

/** ∂(x,y,z)/∂(r,theta,phi) — the spherical basis with θ scaled by r and φ scaled by r·sinθ. */
export function sphericalJacobian(r: number, theta: number, phi: number): Mat3 {
  const basis = sphericalBasis(theta, phi);
  const rSinTheta = r * Math.sin(theta);
  return fromColumns3(
    [basis[0], basis[1], basis[2]],
    [basis[3] * r, basis[4] * r, basis[5] * r],
    [basis[6] * rSinTheta, basis[7] * rSinTheta, basis[8] * rSinTheta],
  );
}
