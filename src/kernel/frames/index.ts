/**
 * kernel/frames — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * Cartesian <-> cylindrical <-> spherical conversion, with Jacobians.
 *
 * `Frame`: origin + orientation + optional angular velocity omega and its
 * derivative.
 *
 * `transformPoint`, `transformVector`, and critically `transformVelocity` /
 * `transformAcceleration` between frames MUST expose the omega x r,
 * 2 * omega x v (Coriolis), and omega x (omega x r) (centrifugal) terms as
 * SEPARATELY RETRIEVABLE COMPONENTS, not just as a sum — the non-inertial
 * frames module draws each term as its own arrow.
 *
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

import type { Vec3, Quat } from '../math';

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

export function transformPoint(_frame: Frame, _p: Vec3): Vec3 {
  throw new Error('kernel/frames: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function transformVector(_frame: Frame, _v: Vec3): Vec3 {
  throw new Error('kernel/frames: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function transformVelocity(_frame: Frame, _r: Vec3, _vRel: Vec3): Vec3 {
  throw new Error('kernel/frames: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function transformAcceleration(_frame: Frame, _r: Vec3, _vRel: Vec3, _aRel: Vec3): AccelerationTerms {
  throw new Error('kernel/frames: not implemented (see M1 in ARCHITECTURE.md §20)');
}
