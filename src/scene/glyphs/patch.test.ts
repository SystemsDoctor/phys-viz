import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPatch } from './patch';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getMesh(host: ReturnType<typeof createFakeHost>): THREE.Mesh {
  return host.root.children[0] as THREE.Mesh;
}

describe('createPatch', () => {
  it('fan-triangulates a quad into 2 triangles', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(6); // 2 triangles * 3 vertices
    handle.dispose();
  });

  it('a triangle produces exactly 1 triangle', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(3);
    handle.dispose();
  });

  it('is double-sided and does not write depth (transparency correctness)', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    const material = mesh.material as THREE.MeshBasicMaterial;
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(true);
    handle.dispose();
  });

  it('degenerates to zero triangles for fewer than 3 points', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
        ],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.geometry.drawRange.count).toBe(0);
    handle.dispose();
  });

  it('dispose removes the mesh from its parent', () => {
    const host = createFakeHost();
    const handle = createPatch(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      host,
    );
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
