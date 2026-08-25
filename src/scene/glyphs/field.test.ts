import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createField } from './field';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getMesh(host: ReturnType<typeof createFakeHost>): THREE.InstancedMesh {
  return host.root.children[0] as THREE.InstancedMesh;
}

describe('createField', () => {
  it('creates exactly one InstancedMesh (one draw call) with count = grid resolution product', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: () => [1, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [1, 1, 1] },
        gridResolution: [3, 3, 2],
      },
      host,
    );
    expect(host.root.children.length).toBe(1);
    const mesh = getMesh(host);
    expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
    expect(mesh.count).toBe(3 * 3 * 2);
    handle.dispose();
  });

  it('samples the field at each grid point', () => {
    const host = createFakeHost();
    const sampled: [number, number, number][] = [];
    const handle = createField(
      {
        sample: (p) => {
          sampled.push([...p]);
          return [1, 0, 0];
        },
        gridBounds: { min: [0, 0, 0], max: [2, 0, 0] },
        gridResolution: [3, 1, 1],
      },
      host,
    );
    expect(sampled.length).toBe(3);
    expect(sampled[0][0]).toBeCloseTo(0, 6);
    expect(sampled[1][0]).toBeCloseTo(1, 6);
    expect(sampled[2][0]).toBeCloseTo(2, 6);
    handle.dispose();
  });

  it('length mode scales instance length with magnitude', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: (p) => [p[0] < 0.5 ? 1 : 5, 0, 0], // varying magnitude across the grid
        gridBounds: { min: [0, 0, 0], max: [1, 0, 0] },
        gridResolution: [2, 1, 1],
        mode: 'length',
      },
      host,
    );
    const mesh = getMesh(host);
    const m0 = new THREE.Matrix4();
    const m1 = new THREE.Matrix4();
    mesh.getMatrixAt(0, m0);
    mesh.getMatrixAt(1, m1);
    const s0 = new THREE.Vector3();
    const s1 = new THREE.Vector3();
    m0.decompose(new THREE.Vector3(), new THREE.Quaternion(), s0);
    m1.decompose(new THREE.Vector3(), new THREE.Quaternion(), s1);
    expect(s1.x).toBeGreaterThan(s0.x); // the higher-magnitude instance is longer
    handle.dispose();
  });

  it('color mode assigns different colors for different magnitudes', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: (p) => [p[0] < 0.5 ? 1 : 5, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [1, 0, 0] },
        gridResolution: [2, 1, 1],
        mode: 'color',
      },
      host,
    );
    const mesh = getMesh(host);
    const c0 = new THREE.Color();
    const c1 = new THREE.Color();
    mesh.getColorAt(0, c0);
    mesh.getColorAt(1, c1);
    expect(c0.getHex()).not.toBe(c1.getHex());
    handle.dispose();
  });

  it('handles a zero-magnitude sample without producing NaN', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: () => [0, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [1, 1, 1] },
        gridResolution: [2, 2, 1],
      },
      host,
    );
    const mesh = getMesh(host);
    const m = new THREE.Matrix4();
    mesh.getMatrixAt(0, m);
    for (const v of m.elements) expect(Number.isNaN(v)).toBe(false);
    handle.dispose();
  });

  it('handles a 1D grid resolution (e.g. [5,1,1]) without allocating a zero-size mesh', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: () => [1, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [4, 0, 0] },
        gridResolution: [5, 1, 1],
      },
      host,
    );
    const mesh = getMesh(host);
    expect(mesh.count).toBe(5);
    handle.dispose();
  });

  it('dispose removes the mesh from its parent', () => {
    const host = createFakeHost();
    const handle = createField(
      {
        sample: () => [1, 0, 0],
        gridBounds: { min: [0, 0, 0], max: [1, 1, 1] },
        gridResolution: [2, 2, 2],
      },
      host,
    );
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
