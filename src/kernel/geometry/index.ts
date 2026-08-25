/**
 * kernel/geometry — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * Polygon area and centroid (signed, shoelace).
 *
 * Sutherland-Hodgman clip of a polygon by a half-plane — added early even
 * though the first modules don't need it: it is the foundation of any
 * submerged-area / cross-section / cutaway work (ship stability, buoyancy,
 * beam sections). See §22, "Anticipated extensions".
 *
 * Convex hull (2D), point-in-polygon, ray-plane and ray-sphere intersection
 * for picking.
 */

import type { Vec2, Vec3 } from '../math';
import { cross2, sub2, dot2, dot, sub, scale, add } from '../math';

export interface Polygon2D {
  points: Vec2[];
}

/** Signed area (shoelace). Positive for counter-clockwise winding. */
export function polygonArea(poly: Polygon2D): number {
  const pts = poly.points;
  const n = pts.length;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}

export function polygonCentroid(poly: Polygon2D): Vec2 {
  const pts = poly.points;
  const n = pts.length;
  const area = polygonArea(poly);
  if (Math.abs(area) < 1e-15) {
    // Degenerate polygon (zero area): fall back to the vertex average.
    let sx = 0,
      sy = 0;
    for (const [x, y] of pts) {
      sx += x;
      sy += y;
    }
    return [sx / n, sy / n];
  }
  let cx = 0,
    cy = 0;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  return [cx / (6 * area), cy / (6 * area)];
}

/** Half-plane defined by a point on the line and an outward normal. */
export interface HalfPlane {
  point: Vec2;
  normal: Vec2;
}

/** Signed distance of p from the plane along its normal; negative = "inside" (kept). */
function halfPlaneSide(p: Vec2, plane: HalfPlane): number {
  return dot2(sub2(p, plane.point), plane.normal);
}

/** Sutherland-Hodgman clip: keeps the side opposite the outward normal. */
export function clipPolygonByHalfPlane(poly: Polygon2D, plane: HalfPlane): Polygon2D {
  const pts = poly.points;
  const n = pts.length;
  if (n === 0) return { points: [] };
  const out: Vec2[] = [];

  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % n];
    const currSide = halfPlaneSide(curr, plane);
    const nextSide = halfPlaneSide(next, plane);
    const currInside = currSide <= 0;
    const nextInside = nextSide <= 0;

    if (currInside) out.push(curr);
    if (currInside !== nextInside) {
      const t = currSide / (currSide - nextSide);
      const ix = curr[0] + (next[0] - curr[0]) * t;
      const iy = curr[1] + (next[1] - curr[1]) * t;
      out.push([ix, iy]);
    }
  }
  return { points: out };
}

/** 2D convex hull via Andrew's monotone chain. Returns points in CCW order, no duplicate closing point. */
export function convexHull(points: Vec2[]): Vec2[] {
  const pts = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const n = pts.length;
  if (n < 3) return pts;

  const cross = (o: Vec2, a: Vec2, b: Vec2): number => cross2(sub2(a, o), sub2(b, o));

  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: Vec2[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/** Ray-casting (even-odd rule) point-in-polygon test. */
export function pointInPolygon(p: Vec2, poly: Polygon2D): boolean {
  const pts = poly.points;
  const n = pts.length;
  let inside = false;
  const [px, py] = p;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    const crosses = yi !== yj && py >= Math.min(yi, yj) && py < Math.max(yi, yj);
    if (crosses) {
      const xIntersect = xi + ((py - yi) / (yj - yi)) * (xj - xi);
      if (px < xIntersect) inside = !inside;
    }
  }
  return inside;
}

export function rayPlaneIntersect(
  origin: Vec3,
  dir: Vec3,
  planePoint: Vec3,
  planeNormal: Vec3,
): Vec3 | null {
  const denom = dot(dir, planeNormal);
  if (Math.abs(denom) < 1e-12) return null; // ray parallel to the plane
  const t = dot(sub(planePoint, origin), planeNormal) / denom;
  if (t < 0) return null; // plane is behind the ray origin
  return add(origin, scale(dir, t));
}

export function raySphereIntersect(
  origin: Vec3,
  dir: Vec3,
  center: Vec3,
  radius: number,
): Vec3 | null {
  const oc = sub(origin, center);
  const a = dot(dir, dir);
  const b = 2 * dot(oc, dir);
  const c = dot(oc, oc) - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t0 = (-b - sqrtDisc) / (2 * a);
  const t1 = (-b + sqrtDisc) / (2 * a);
  const t = t0 >= 0 ? t0 : t1;
  if (t < 0) return null;
  return add(origin, scale(dir, t));
}
