import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createSurface } from './surface';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getMesh(host: ReturnType<typeof createFakeHost>): THREE.Mesh {
  return host.root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
}

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

  it('toggles the wireframe overlay visibility', () => {
    const host = createFakeHost();
    const handle = createSurface(
      { parametric: (u, v) => [u, v, 0], uRange: [0, 1], vRange: [0, 1], wireframe: false },
      host,
    );
    const wireframeLines = host.root.children.find((c) => c instanceof THREE.LineSegments);
    expect(wireframeLines?.visible).toBe(false);
    handle.set({ wireframe: true });
    expect(wireframeLines?.visible).toBe(true);
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
