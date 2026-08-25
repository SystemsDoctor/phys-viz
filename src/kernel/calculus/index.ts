/**
 * kernel/calculus — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * grad/div/curl via central differences with an adaptive h. Integrals use
 * Gauss-Legendre quadrature, not naive Riemann sums, and return both the
 * value AND the per-sample contributions so the visualizer can shade the
 * accumulating ribbon rather than just report a number.
 *
 * Domains: `lineIntegral`'s `path(t)` is sampled for t in [0,1];
 * `surfaceFlux`'s `surf(u,v)` for (u,v) in [0,1]x[0,1]. Tangents/normals
 * are obtained by central-differencing the path/surface function itself
 * (one-sided within an epsilon of a domain edge) — no separate derivative
 * callback is required from the caller. `surfaceFlux`'s contributions are
 * indexed `i*nv+j` (u-major, v-minor).
 */

import type { Vec3 } from '../math';
import { sub, scale, cross, dot, norm } from '../math';

export type ScalarField = (p: Vec3) => number;
export type VectorField = (p: Vec3) => Vec3;

export interface QuadratureResult {
  value: number;
  contributions: number[];
}

function defaultH(p: Vec3): number {
  return Math.cbrt(Number.EPSILON) * Math.max(1, norm(p));
}

function offset(p: Vec3, axis: 0 | 1 | 2, delta: number): Vec3 {
  const out: [number, number, number] = [p[0], p[1], p[2]];
  out[axis] += delta;
  return out;
}

export function grad(f: ScalarField, p: Vec3, h?: number): Vec3 {
  const hh = h ?? defaultH(p);
  return [
    (f(offset(p, 0, hh)) - f(offset(p, 0, -hh))) / (2 * hh),
    (f(offset(p, 1, hh)) - f(offset(p, 1, -hh))) / (2 * hh),
    (f(offset(p, 2, hh)) - f(offset(p, 2, -hh))) / (2 * hh),
  ];
}

export function div(field: VectorField, p: Vec3, h?: number): number {
  const hh = h ?? defaultH(p);
  const dFxdx = (field(offset(p, 0, hh))[0] - field(offset(p, 0, -hh))[0]) / (2 * hh);
  const dFydy = (field(offset(p, 1, hh))[1] - field(offset(p, 1, -hh))[1]) / (2 * hh);
  const dFzdz = (field(offset(p, 2, hh))[2] - field(offset(p, 2, -hh))[2]) / (2 * hh);
  return dFxdx + dFydy + dFzdz;
}

export function curl(field: VectorField, p: Vec3, h?: number): Vec3 {
  const hh = h ?? defaultH(p);
  const fxp = field(offset(p, 0, hh));
  const fxm = field(offset(p, 0, -hh));
  const fyp = field(offset(p, 1, hh));
  const fym = field(offset(p, 1, -hh));
  const fzp = field(offset(p, 2, hh));
  const fzm = field(offset(p, 2, -hh));

  const dFzdy = (fyp[2] - fym[2]) / (2 * hh);
  const dFydz = (fzp[1] - fzm[1]) / (2 * hh);
  const dFxdz = (fzp[0] - fzm[0]) / (2 * hh);
  const dFzdx = (fxp[2] - fxm[2]) / (2 * hh);
  const dFydx = (fxp[1] - fxm[1]) / (2 * hh);
  const dFxdy = (fyp[0] - fym[0]) / (2 * hh);

  return [dFzdy - dFydz, dFxdz - dFzdx, dFydx - dFxdy];
}

/* --------------------------- Gauss-Legendre quadrature --------------------------- */

export interface QuadratureRule {
  nodes: number[];
  weights: number[];
}

function legendrePAndDerivative(n: number, x: number): { p: number; pPrime: number } {
  let p0 = 1;
  let p1 = x;
  for (let k = 1; k < n; k++) {
    const p2 = ((2 * k + 1) * x * p1 - k * p0) / (k + 1);
    p0 = p1;
    p1 = p2;
  }
  const pPrime = (n / (x * x - 1)) * (x * p1 - p0);
  return { p: p1, pPrime };
}

const gaussLegendreCache = new Map<number, QuadratureRule>();

/** Nodes/weights for n-point Gauss-Legendre quadrature on [-1,1]. Memoized by n. */
export function gaussLegendre(n: number): QuadratureRule {
  const cached = gaussLegendreCache.get(n);
  if (cached) return cached;
  if (n < 1) throw new Error('kernel/calculus: gaussLegendre requires n >= 1');

  const nodes: number[] = [];
  const weights: number[] = [];
  for (let i = 1; i <= n; i++) {
    let x = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5));
    for (let iter = 0; iter < 100; iter++) {
      const { p, pPrime } = legendrePAndDerivative(n, x);
      const dx = p / pPrime;
      x -= dx;
      if (Math.abs(dx) < 1e-14) break;
    }
    const { pPrime } = legendrePAndDerivative(n, x);
    nodes.push(x);
    weights.push(2 / ((1 - x * x) * pPrime * pPrime));
  }

  const order = nodes.map((_, i) => i).sort((a, b) => nodes[a] - nodes[b]);
  const rule: QuadratureRule = {
    nodes: order.map((i) => nodes[i]),
    weights: order.map((i) => weights[i]),
  };
  gaussLegendreCache.set(n, rule);
  return rule;
}

function rescaleNode(x: number, a: number, b: number): number {
  return ((b - a) / 2) * x + (a + b) / 2;
}

function rescaleWeight(w: number, a: number, b: number): number {
  return ((b - a) / 2) * w;
}

/* --------------------------------- Integrals --------------------------------- */

const TANGENT_EPS = 1e-6;

/** Exported for direct testing of the domain-edge one-sided differences; not otherwise a public entry point. */
export function pathTangent(path: (t: number) => Vec3, t: number, eps = TANGENT_EPS): Vec3 {
  if (t < eps) return scale(sub(path(t + eps), path(t)), 1 / eps);
  if (t > 1 - eps) return scale(sub(path(t), path(t - eps)), 1 / eps);
  return scale(sub(path(t + eps), path(t - eps)), 1 / (2 * eps));
}

/** Exported for direct testing of the domain-edge one-sided differences; not otherwise a public entry point. */
export function surfacePartials(
  surf: (u: number, v: number) => Vec3,
  u: number,
  v: number,
  eps = TANGENT_EPS,
): [Vec3, Vec3] {
  let dSdu: Vec3;
  if (u < eps) dSdu = scale(sub(surf(u + eps, v), surf(u, v)), 1 / eps);
  else if (u > 1 - eps) dSdu = scale(sub(surf(u, v), surf(u - eps, v)), 1 / eps);
  else dSdu = scale(sub(surf(u + eps, v), surf(u - eps, v)), 1 / (2 * eps));

  let dSdv: Vec3;
  if (v < eps) dSdv = scale(sub(surf(u, v + eps), surf(u, v)), 1 / eps);
  else if (v > 1 - eps) dSdv = scale(sub(surf(u, v), surf(u, v - eps)), 1 / eps);
  else dSdv = scale(sub(surf(u, v + eps), surf(u, v - eps)), 1 / (2 * eps));

  return [dSdu, dSdv];
}

/** ∫ F·dl along `path(t)`, t in [0,1], via n-point Gauss-Legendre quadrature. */
export function lineIntegral(
  field: VectorField,
  path: (t: number) => Vec3,
  n: number,
): QuadratureResult {
  const rule = gaussLegendre(n);
  const contributions: number[] = new Array(n);
  let value = 0;
  for (let i = 0; i < n; i++) {
    const t = rescaleNode(rule.nodes[i], 0, 1);
    const w = rescaleWeight(rule.weights[i], 0, 1);
    const contribution = dot(field(path(t)), pathTangent(path, t)) * w;
    contributions[i] = contribution;
    value += contribution;
  }
  return { value, contributions };
}

/** ∫∫ F·dA over `surf(u,v)`, (u,v) in [0,1]x[0,1], via nu*nv-point Gauss-Legendre quadrature. */
export function surfaceFlux(
  field: VectorField,
  surf: (u: number, v: number) => Vec3,
  nu: number,
  nv: number,
): QuadratureResult {
  const ruleU = gaussLegendre(nu);
  const ruleV = gaussLegendre(nv);
  const contributions: number[] = new Array(nu * nv);
  let value = 0;
  for (let i = 0; i < nu; i++) {
    const u = rescaleNode(ruleU.nodes[i], 0, 1);
    const wu = rescaleWeight(ruleU.weights[i], 0, 1);
    for (let j = 0; j < nv; j++) {
      const v = rescaleNode(ruleV.nodes[j], 0, 1);
      const wv = rescaleWeight(ruleV.weights[j], 0, 1);
      const [dSdu, dSdv] = surfacePartials(surf, u, v);
      const normalRaw = cross(dSdu, dSdv); // magnitude IS the area Jacobian
      const contribution = dot(field(surf(u, v)), normalRaw) * wu * wv;
      contributions[i * nv + j] = contribution;
      value += contribution;
    }
  }
  return { value, contributions };
}

/**
 * `volumeIntegral`'s region argument is deliberately `unknown` — only
 * `BoxRegion` is supported today, but future region kinds (sphere,
 * cylinder) can be added via the same runtime-dispatch pattern without
 * touching this exported signature.
 */
export interface BoxRegion {
  min: Vec3;
  max: Vec3;
}

function isVec3Like(v: unknown): v is Vec3 {
  return Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'number');
}

export function isBoxRegion(region: unknown): region is BoxRegion {
  if (typeof region !== 'object' || region === null) return false;
  const r = region as Record<string, unknown>;
  return isVec3Like(r.min) && isVec3Like(r.max);
}

/** ∫∫∫ f dV over a BoxRegion, via n*n*n-point Gauss-Legendre quadrature. */
export function volumeIntegral(f: ScalarField, region: unknown, n: number): QuadratureResult {
  if (!isBoxRegion(region)) {
    throw new Error('kernel/calculus: volumeIntegral supports BoxRegion {min,max} only');
  }
  const rule = gaussLegendre(n);
  const contributions: number[] = new Array(n * n * n);
  let value = 0;
  for (let i = 0; i < n; i++) {
    const x = rescaleNode(rule.nodes[i], region.min[0], region.max[0]);
    const wx = rescaleWeight(rule.weights[i], region.min[0], region.max[0]);
    for (let j = 0; j < n; j++) {
      const y = rescaleNode(rule.nodes[j], region.min[1], region.max[1]);
      const wy = rescaleWeight(rule.weights[j], region.min[1], region.max[1]);
      for (let k = 0; k < n; k++) {
        const z = rescaleNode(rule.nodes[k], region.min[2], region.max[2]);
        const wz = rescaleWeight(rule.weights[k], region.min[2], region.max[2]);
        const contribution = f([x, y, z]) * wx * wy * wz;
        contributions[i * n * n + j * n + k] = contribution;
        value += contribution;
      }
    }
  }
  return { value, contributions };
}
