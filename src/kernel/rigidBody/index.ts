/**
 * kernel/rigidBody — Layer 0 (pure). Added at M5 for rotational-dynamics'
 * Dzhanibekov-effect sub-demonstration (TASKS.md M5-1): a torque-free
 * asymmetric top's tumbling has no closed form, so it's the one genuine
 * `stepped` piece of that module (ARCHITECTURE.md §12).
 *
 * Two small, general primitives — not a rigid-body simulator (§2): just
 * the two derivative functions any module integrating rigid-body
 * orientation/spin would need, packed by the caller into whatever
 * `kernel/ode` state shape it likes.
 */

import type { Vec3, Quat } from '../math';
import { multiplyQuat } from '../math';

/**
 * Euler's rigid-body equations (RHS), evaluated in the body/principal-axis
 * frame: `I·dω/dt = τ - ω×(I·ω)`, componentwise for a diagonal `I`.
 * `torqueBody` defaults to zero (torque-free — the Dzhanibekov case).
 */
export function eulerRHS(omega: Vec3, inertiaDiag: Vec3, torqueBody: Vec3 = [0, 0, 0]): Vec3 {
  const [w1, w2, w3] = omega;
  const [i1, i2, i3] = inertiaDiag;
  const [t1, t2, t3] = torqueBody;
  return [
    (t1 + (i2 - i3) * w2 * w3) / i1,
    (t2 + (i3 - i1) * w3 * w1) / i2,
    (t3 + (i1 - i2) * w1 * w2) / i3,
  ];
}

/**
 * Quaternion time-derivative for a body spinning at body-frame angular
 * velocity `omega`: `dq/dt = 1/2 * q ⊗ (omega, 0)`. NOT renormalized —
 * a caller integrating this (e.g. via `kernel/ode`'s `rk4`) must
 * renormalize the result periodically, standard practice for quaternion
 * integration.
 */
export function quatDerivative(q: Quat, omega: Vec3): Quat {
  const omegaQuat: Quat = [omega[0], omega[1], omega[2], 0];
  const product = multiplyQuat(q, omegaQuat);
  return [product[0] / 2, product[1] / 2, product[2] / 2, product[3] / 2];
}
