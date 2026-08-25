import { describe, it, expect } from 'vitest';
import * as G from './index';

const unitSquareCCW: G.Polygon2D = {
  points: [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ],
};
const unitSquareCW: G.Polygon2D = {
  points: [
    [0, 0],
    [0, 1],
    [1, 1],
    [1, 0],
  ],
};

describe('polygonArea', () => {
  it('is positive for CCW winding, negative for CW', () => {
    expect(G.polygonArea(unitSquareCCW)).toBeCloseTo(1, 12);
    expect(G.polygonArea(unitSquareCW)).toBeCloseTo(-1, 12);
  });

  it('matches a known triangle area', () => {
    const tri: G.Polygon2D = {
      points: [
        [0, 0],
        [4, 0],
        [0, 3],
      ],
    };
    expect(G.polygonArea(tri)).toBeCloseTo(6, 12);
  });
});

describe('polygonCentroid', () => {
  it('is the center of a unit square', () => {
    const c = G.polygonCentroid(unitSquareCCW);
    expect(c[0]).toBeCloseTo(0.5, 12);
    expect(c[1]).toBeCloseTo(0.5, 12);
  });

  it('is the vertex average for a degenerate (zero-area) polygon', () => {
    const degenerate: G.Polygon2D = {
      points: [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
    };
    const c = G.polygonCentroid(degenerate);
    expect(c[0]).toBeCloseTo(1, 12);
    expect(c[1]).toBeCloseTo(0, 12);
  });
});

describe('clipPolygonByHalfPlane', () => {
  it('clips a unit square in half', () => {
    // keep x <= 0.5: outward normal points in +x, plane through (0.5, 0)
    const half = G.clipPolygonByHalfPlane(unitSquareCCW, { point: [0.5, 0], normal: [1, 0] });
    expect(G.polygonArea(half)).toBeCloseTo(0.5, 9);
  });

  it('returns the whole polygon when entirely inside', () => {
    const half = G.clipPolygonByHalfPlane(unitSquareCCW, { point: [10, 0], normal: [1, 0] });
    expect(Math.abs(G.polygonArea(half))).toBeCloseTo(1, 9);
  });

  it('returns an empty polygon when entirely outside', () => {
    const half = G.clipPolygonByHalfPlane(unitSquareCCW, { point: [-10, 0], normal: [1, 0] });
    expect(half.points.length).toBe(0);
  });
});

describe('convexHull', () => {
  it('drops interior points', () => {
    const pts: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [2, 2], // interior — should be dropped
    ];
    const hull = G.convexHull(pts);
    expect(hull.length).toBe(4);
  });

  it('handles fewer than 3 points by returning them unchanged', () => {
    expect(
      G.convexHull([
        [0, 0],
        [1, 1],
      ]),
    ).toEqual([
      [0, 0],
      [1, 1],
    ]);
  });

  it('the hull area matches the bounding square', () => {
    const pts: [number, number][] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [1, 1],
      [3, 3],
      [1, 3],
    ];
    const hull = G.convexHull(pts);
    expect(Math.abs(G.polygonArea({ points: hull }))).toBeCloseTo(16, 9);
  });
});

describe('pointInPolygon', () => {
  it('classifies points inside and outside a square', () => {
    expect(G.pointInPolygon([0.5, 0.5], unitSquareCCW)).toBe(true);
    expect(G.pointInPolygon([2, 2], unitSquareCCW)).toBe(false);
  });

  it('agrees regardless of winding order', () => {
    expect(G.pointInPolygon([0.5, 0.5], unitSquareCW)).toBe(true);
  });

  it('classifies a point outside a non-convex (L-shaped) polygon correctly', () => {
    const lshape: G.Polygon2D = {
      points: [
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 1],
        [1, 2],
        [0, 2],
      ],
    };
    expect(G.pointInPolygon([1.5, 1.5], lshape)).toBe(false); // in the notch
    expect(G.pointInPolygon([0.5, 0.5], lshape)).toBe(true);
  });
});

describe('rayPlaneIntersect', () => {
  it('hits a plane straight ahead', () => {
    const hit = G.rayPlaneIntersect([0, 0, 0], [0, 0, 1], [0, 0, 5], [0, 0, -1]);
    expect(hit).toEqual([0, 0, 5]);
  });

  it('returns null for a ray parallel to the plane', () => {
    expect(G.rayPlaneIntersect([0, 0, 0], [1, 0, 0], [0, 0, 5], [0, 0, 1])).toBeNull();
  });

  it('returns null when the plane is behind the ray origin', () => {
    expect(G.rayPlaneIntersect([0, 0, 0], [0, 0, 1], [0, 0, -5], [0, 0, -1])).toBeNull();
  });
});

describe('raySphereIntersect', () => {
  it('hits the near side of a sphere straight ahead', () => {
    const hit = G.raySphereIntersect([0, 0, -5], [0, 0, 1], [0, 0, 0], 1);
    expect(hit).not.toBeNull();
    expect(hit?.[2]).toBeCloseTo(-1, 9);
  });

  it('returns null for a ray that misses the sphere', () => {
    expect(G.raySphereIntersect([5, 5, -5], [0, 0, 1], [0, 0, 0], 1)).toBeNull();
  });

  it('returns null when the sphere is entirely behind the ray origin', () => {
    expect(G.raySphereIntersect([0, 0, 5], [0, 0, 1], [0, 0, 0], 1)).toBeNull();
  });

  it('picks the exit point when the ray starts inside the sphere', () => {
    const hit = G.raySphereIntersect([0, 0, 0], [0, 0, 1], [0, 0, 0], 1);
    expect(hit?.[2]).toBeCloseTo(1, 9);
  });
});
