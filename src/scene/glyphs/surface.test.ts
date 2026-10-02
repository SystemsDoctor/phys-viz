import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { createSurface } from './surface';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

// X-49: the wireframe overlay is a `LineSegments2` (a `THREE.Mesh`
// subclass), so the filled surface is the child with the EXACT `Mesh`
// constructor.
function getMesh(host: ReturnType<typeof createFakeHost>): THREE.Mesh {
  return host.root.children.find((c): c is THREE.Mesh => c.constructor === THREE.Mesh)!;
}
function getWire(host: ReturnType<typeof createFakeHost>): LineSegments2 {
  return host.root.children.find((c): c is LineSegments2 => c.constructor === LineSegments2)!;
}

describe('createSurface colorRange (X-45)', () => {
  // The rendered colour of a uniform-scalar surface: red channel of its
  // first vertex (LOW 0x0072b2 has r=0, HIGH 0xd55e00 has r>0).
  const uniformSurfaceRed = (value: number, colorRange?: [number, number]): number => {
    const host = createFakeHost();
    const handle = createSurface(
      {
        parametric: (u, v) => [u, v, 0],
        uRange: [0, 1],
        vRange: [0, 1],
        resolution: [2, 2],
        colorField: () => value,
        colorRange,
      },
      host,
    );
    const red = getMesh(host).geometry.attributes.color.array[0] as number;
    handle.dispose();
    return red;
  };

  it('without colorRange a uniform scalar always renders mid-colour, whatever its sign (the bug)', () => {
    expect(uniformSurfaceRed(-5)).toBeCloseTo(uniformSurfaceRed(5), 9);
  });

  it('with a shared fixed colorRange, negative / zero / positive uniform scalars render DIFFERENT colours, ordered along the ramp', () => {
    const negative = uniformSurfaceRed(-1, [-1, 1]);
    const zero = uniformSurfaceRed(0, [-1, 1]);
    const positive = uniformSurfaceRed(1, [-1, 1]);
    expect(negative).toBeLessThan(zero);
    expect(zero).toBeLessThan(positive);
  });

  it('clamps scalars outside the range to the ramp ends', () => {
    expect(uniformSurfaceRed(50, [-1, 1])).toBeCloseTo(uniformSurfaceRed(1, [-1, 1]), 9);
    expect(uniformSurfaceRed(-50, [-1, 1])).toBeCloseTo(uniformSurfaceRed(-1, [-1, 1]), 9);
  });
});

describe('createSurface', () => {
  it('evaluates the parametric function at every grid vertex', () => {
    const host = createFakeHost();
    const handle = createSurface(
      {
        parametric: (u, v) => [u, v, 0],
        uRange: [0, 1],
        vRange: [0, 1],
        resolution: [2, 2],
      },
      host,
    );
    const mesh = getMesh(host);
    const positions = mesh.geometry.attributes.position.array;
    // vertex (0,0) -> (0,0,0); last vertex (u=1,v=1) -> (1,1,0)
    expect(positions[0]).toBeCloseTo(0, 6);
    expect(positions[1]).toBeCloseTo(0, 6);
    const lastIndex = positions.length - 3;
    expect(positions[lastIndex]).toBeCloseTo(1, 6);
    expect(positions[lastIndex + 1]).toBeCloseTo(1, 6);
    handle.dispose();
  });

  it('builds a flat plane with a 2x2 resolution as 8 triangles (4 cells)', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1], resolution: [2, 2] },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.index?.count).toBe(4 * 6); // 4 cells * 2 triangles * 3 indices
    handle.dispose();
  });

  it('colours by colorField, mapping the min to the low colour and max to the high colour', () => {
    const host = createFakeHost();
    const handle = createSurface(
      {
        parametric: (u, v) => [u, v, 0],
        uRange: [0, 1],
        vRange: [0, 1],
        resolution: [4, 4],
        colorField: (u) => u,
      },
      host,
    );
    const mesh = getMesh(host);
    const colors = mesh.geometry.attributes.color.array;
    // u=0 column (index 0) should be the "low" colour, u=1 column (last in each row) the "high" colour
    const lowR = colors[0];
    const highIndex = (4 - 0) * 3; // last vertex in the first row (vi=0, ui=4)
    const highR = colors[highIndex];
    expect(lowR).not.toBeCloseTo(highR, 2);
    handle.dispose();
  });

  it('draws the wireframe as LineSegments2/LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1], wireframe: true },
      host,
    );
    const wire = getWire(host);
    const material = wire.material as LineMaterial;
    expect(material).toBeInstanceOf(LineMaterial);
    expect(material.linewidth).toBeGreaterThan(1);
    expect(material.worldUnits).toBe(false);
    expect(host.themedMaterials.some((m) => m.material === material && m.kind === 'line')).toBe(
      true,
    );
    host.fireFrame({ rendererWidth: 320, rendererHeight: 200 });
    expect(material.resolution.x).toBe(320);
    expect(material.resolution.y).toBe(200);
    handle.dispose();
  });

  it('wireframe edges are the unique triangle edges, rewritten in place on set()', () => {
    const host = createFakeHost();
    const handle = createSurface(
      {
        parametric: (u, v) => [u, v, 0],
        uRange: [0, 1],
        vRange: [0, 1],
        resolution: [2, 2],
        wireframe: true,
      },
      host,
    );
    const wire = getWire(host);
    const buffer = rawPositionBuffer(wire.geometry as LineSegmentsGeometry);
    // 3x3 vertices: 12 grid edges + 4 quad diagonals = 16 unique edges.
    expect(buffer.length).toBe(16 * 6);
    // Every endpoint is a real surface vertex (here the 3x3 grid on z=0).
    for (let i = 0; i < buffer.length; i += 3) {
      expect([0, 0.5, 1]).toContain(buffer[i]);
      expect([0, 0.5, 1]).toContain(buffer[i + 1]);
      expect(buffer[i + 2]).toBe(0);
    }
    // Moving the surface rewrites the SAME typed array.
    handle.set({ parametric: (u, v) => [u, v, 2] });
    expect(rawPositionBuffer(wire.geometry as LineSegmentsGeometry)).toBe(buffer);
    for (let i = 2; i < buffer.length; i += 3) expect(buffer[i]).toBe(2);
    handle.dispose();
  });

  it('toggles the wireframe overlay visibility', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1], wireframe: false },
      host,
    );
    const wireframeLines = getWire(host);
    expect(wireframeLines?.visible).toBe(false);
    handle.set({ wireframe: true });
    expect(wireframeLines?.visible).toBe(true);
    handle.dispose();
  });

  // X-58: set({ wireframe: true }) forced the overlay visible even after
  // visible(false).
  it('set({ wireframe }) after visible(false) does not re-show the wireframe (X-58)', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1], wireframe: false },
      host,
    );
    handle.visible(false);
    handle.set({ wireframe: true });
    expect(getWire(host).visible).toBe(false);
    expect(getMesh(host).visible).toBe(false);
    handle.visible(true);
    expect(getWire(host).visible).toBe(true);
    expect(getMesh(host).visible).toBe(true);
    handle.dispose();
  });

  it('applies a clip plane to the material and clears it when removed', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1] },
      host,
    );
    const mesh = getMesh(host);
    const material = mesh.material as THREE.MeshStandardMaterial;
    handle.set({ clipPlane: { point: [0, 0, 0], normal: [0, 0, 1] } });
    expect(material.clippingPlanes?.length).toBe(1);
    handle.set({ clipPlane: undefined });
    expect(material.clippingPlanes?.length).toBe(0);
    handle.dispose();
  });

  it('dispose removes both the mesh and wireframe lines', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1] },
      host,
    );
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
