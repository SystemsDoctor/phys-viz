import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createBody } from './body';
import type { BodyKind } from './body';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getMesh(host: ReturnType<typeof createFakeHost>): THREE.Mesh {
  return host.root.children[0] as THREE.Mesh;
}

describe('createBody', () => {
  const kinds: BodyKind[] = ['box', 'sphere', 'cylinder', 'disc', 'rod', 'spring'];

  it.each(kinds)('builds a non-degenerate geometry for kind=%s', (kind) => {
    const host = createFakeHost();
    const handle = createBody({ kind, position: [0, 0, 0] }, host);
    const mesh = getMesh(host);
    const count = mesh.geometry.attributes.position.count;
    expect(count).toBeGreaterThan(0);
    handle.dispose();
  });

  it('applies position, orientation, and scale', () => {
    const host = createFakeHost();
    const handle = createBody(
      { kind: 'box', position: [1, 2, 3], orientation: [0, 0, 0, 1], scale: [2, 3, 4] },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.position.toArray()).toEqual([1, 2, 3]);
    expect(mesh.scale.toArray()).toEqual([2, 3, 4]);
    handle.dispose();
  });

  it('rebuilds geometry when kind changes via set()', () => {
    const host = createFakeHost();
    const handle = createBody({ kind: 'box', position: [0, 0, 0] }, host);
    const mesh = getMesh(host);
    const boxVertexCount = mesh.geometry.attributes.position.count;
    handle.set({ kind: 'sphere' });
    const sphereVertexCount = mesh.geometry.attributes.position.count;
    expect(sphereVertexCount).not.toBe(boxVertexCount);
    handle.dispose();
  });

  it('updates colour on set()', () => {
    const host = createFakeHost();
    const handle = createBody({ kind: 'box', position: [0, 0, 0], color: '#ff0000' }, host);
    const mesh = getMesh(host);
    const material = mesh.material as THREE.MeshStandardMaterial;
    handle.set({ color: '#0000ff' });
    expect(material.color.b).toBeCloseTo(1, 6);
    handle.dispose();
  });

  it('dispose removes the mesh from its parent', () => {
    const host = createFakeHost();
    const handle = createBody({ kind: 'box', position: [0, 0, 0] }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
