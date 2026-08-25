import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPoint } from './point';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('createPoint', () => {
  it('positions the marker mesh at the given position', () => {
    const host = createFakeHost();
    const handle = createPoint({ position: [1, 2, 3] }, host);
    host.fireFrame();
    const mesh = host.root.children[0] as THREE.Mesh;
    expect(mesh.position.x).toBeCloseTo(1, 6);
    expect(mesh.position.y).toBeCloseTo(2, 6);
    expect(mesh.position.z).toBeCloseTo(3, 6);
    handle.dispose();
  });

  it('scales to a larger world size when farther from the camera (screen-space constancy)', () => {
    const host = createFakeHost();
    const handle = createPoint({ position: [0, 0, 0] }, host);
    host.fireFrame(); // camera at z=10 by default in the fake host
    const mesh = host.root.children[0] as THREE.Mesh;
    const nearScale = mesh.scale.x;

    handle.set({ position: [0, 0, -50] }); // now much farther from the camera at z=10
    host.fireFrame();
    const farScale = mesh.scale.x;
    expect(farScale).toBeGreaterThan(nearScale);
    handle.dispose();
  });

  it('updates color immediately on set()', () => {
    const host = createFakeHost();
    const handle = createPoint({ position: [0, 0, 0], color: '#ff0000' }, host);
    const mesh = host.root.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshBasicMaterial;
    handle.set({ color: '#00ff00' });
    expect(material.color.g).toBeCloseTo(1, 6);
    handle.dispose();
  });

  it('visible(false) hides the marker', () => {
    const host = createFakeHost();
    const handle = createPoint({ position: [0, 0, 0] }, host);
    handle.visible(false);
    const mesh = host.root.children[0] as THREE.Mesh;
    expect(mesh.visible).toBe(false);
  });

  it('dispose removes the mesh and does not throw on a later frame', () => {
    const host = createFakeHost();
    const handle = createPoint({ position: [0, 0, 0] }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
    expect(() => host.fireFrame()).not.toThrow();
  });
});
