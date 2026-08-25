/**
 * kernel/calculus — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * grad/div/curl via central differences with an adaptive h. Integrals use
 * Gauss-Legendre quadrature, not naive Riemann sums, and return both the
 * value AND the per-sample contributions so the visualizer can shade the
 * accumulating ribbon rather than just report a number.
 *
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

import type { Vec3 } from '../math';

export type ScalarField = (p: Vec3) => number;
export type VectorField = (p: Vec3) => Vec3;

export interface QuadratureResult {
  value: number;
  contributions: number[];
}

export function grad(_f: ScalarField, _p: Vec3, _h?: number): Vec3 {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function div(_field: VectorField, _p: Vec3, _h?: number): number {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function curl(_field: VectorField, _p: Vec3, _h?: number): Vec3 {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function lineIntegral(_field: VectorField, _path: (t: number) => Vec3, _n: number): QuadratureResult {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function surfaceFlux(
  _field: VectorField,
  _surf: (u: number, v: number) => Vec3,
  _nu: number,
  _nv: number,
): QuadratureResult {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function volumeIntegral(_f: ScalarField, _region: unknown, _n: number): QuadratureResult {
  throw new Error('kernel/calculus: not implemented (see M1 in ARCHITECTURE.md §20)');
}
