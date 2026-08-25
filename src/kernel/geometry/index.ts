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
 *
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

import type { Vec2, Vec3 } from '../math';

export interface Polygon2D {
  points: Vec2[];
}

export function polygonArea(_poly: Polygon2D): number {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function polygonCentroid(_poly: Polygon2D): Vec2 {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

/** Half-plane defined by a point on the line and an outward normal. */
export interface HalfPlane {
  point: Vec2;
  normal: Vec2;
}

export function clipPolygonByHalfPlane(_poly: Polygon2D, _plane: HalfPlane): Polygon2D {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function convexHull(_points: Vec2[]): Vec2[] {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function pointInPolygon(_p: Vec2, _poly: Polygon2D): boolean {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function rayPlaneIntersect(
  _origin: Vec3,
  _dir: Vec3,
  _planePoint: Vec3,
  _planeNormal: Vec3,
): Vec3 | null {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function raySphereIntersect(
  _origin: Vec3,
  _dir: Vec3,
  _center: Vec3,
  _radius: number,
): Vec3 | null {
  throw new Error('kernel/geometry: not implemented (see M1 in ARCHITECTURE.md §20)');
}
