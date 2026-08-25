/**
 * kernel/inertia — Layer 0 (pure). Added at M1 (see TASKS.md M1-21); not
 * in ARCHITECTURE.md §5's original file list, recorded there now.
 *
 * Inertia tensors for the schematic body set §8's `body` glyph draws
 * (box, sphere, cylinder, disc, rod), about the body's own center of
 * mass in its own principal-axis frame (so every tensor here is
 * diagonal) — plus the parallel-axis theorem to move a tensor to an
 * offset point. §18's golden-value list names "the inertia tensor of a
 * uniform cuboid", so this has to exist in the kernel at M1; M5's
 * rotational-dynamics module needs the rest regardless.
 *
 * Every shape's formula is consistent with the others at the degenerate
 * limit — cylinderInertia(m,r,0) matches discInertia(m,r), and
 * cylinderInertia(m,0,L) matches rodInertia(m,L) — checked directly in
 * the test file, not just asserted here.
 */

import type { Vec3, Mat3 } from '../math';
import { dot, outer } from '../math';

function diag(ixx: number, iyy: number, izz: number): Mat3 {
  return [ixx, 0, 0, 0, iyy, 0, 0, 0, izz];
}

/** Solid rectangular box, full side lengths (a,b,c) = size. */
export function boxInertia(mass: number, size: Vec3): Mat3 {
  const [a, b, c] = size;
  return diag(
    (mass / 12) * (b * b + c * c),
    (mass / 12) * (a * a + c * c),
    (mass / 12) * (a * a + b * b),
  );
}

/** Solid sphere — isotropic, so orientation-independent. */
export function sphereInertia(mass: number, radius: number): Mat3 {
  const i = (2 / 5) * mass * radius * radius;
  return diag(i, i, i);
}

/** Solid cylinder, axis along z, given radius and height. */
export function cylinderInertia(mass: number, radius: number, height: number): Mat3 {
  const iAxial = 0.5 * mass * radius * radius;
  const iTransverse = (mass / 12) * (3 * radius * radius + height * height);
  return diag(iTransverse, iTransverse, iAxial);
}

/** Flat solid disc (zero-thickness cylinder), axis along z. */
export function discInertia(mass: number, radius: number): Mat3 {
  const iAxial = 0.5 * mass * radius * radius;
  const iTransverse = 0.25 * mass * radius * radius;
  return diag(iTransverse, iTransverse, iAxial);
}

/** Thin straight rod (zero-radius cylinder), axis along z. */
export function rodInertia(mass: number, length: number): Mat3 {
  const iTransverse = (mass / 12) * length * length;
  return diag(iTransverse, iTransverse, 0);
}

/** Parallel-axis theorem: translate a center-of-mass inertia tensor by `offset`. */
export function parallelAxis(inertiaCm: Mat3, mass: number, offset: Vec3): Mat3 {
  const dSq = dot(offset, offset);
  const outerD = outer(offset, offset);
  const out: number[] = new Array(9);
  for (let i = 0; i < 9; i++) {
    const identityTerm = i === 0 || i === 4 || i === 8 ? dSq : 0;
    out[i] = inertiaCm[i] + mass * (identityTerm - outerD[i]);
  }
  return out as unknown as Mat3;
}
