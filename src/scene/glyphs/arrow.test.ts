import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createArrow } from './arrow';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('createArrow', () => {
  it('attaches to the scene root when no group is given', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0] }, host);
    expect(host.root.children.length).toBeGreaterThan(0);
    handle.dispose();
  });

  it('attaches to a named group', () => {
    const host = createFakeHost();
    const group = { id: 'vectors' };
    createArrow({ from: [0, 0, 0], to: [1, 0, 0], group }, host);
    const g = host.resolveGroup(group) as THREE.Group;
    expect(g.children.length).toBeGreaterThan(0);
  });

  it('positions the shaft and head after a frame tick', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [2, 0, 0] }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(head.position.x).toBeGreaterThan(0);
    expect(head.position.x).toBeLessThanOrEqual(2);
    handle.dispose();
  });

  it('hides everything when from equals to (zero-length vector)', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [1, 1, 1], to: [1, 1, 1] }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(head.visible).toBe(false);
    handle.dispose();
  });

  it('set() updates the endpoint used on the next frame', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0] }, host);
    handle.set({ to: [0, 5, 0] });
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(head.position.y).toBeGreaterThan(0);
    handle.dispose();
  });

  it('doubleHead shows a second cone at the tail', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0], doubleHead: true }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const meshes = root.children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
    expect(meshes.filter((m) => m.visible).length).toBe(2);
    handle.dispose();
  });

  it('visible(false) hides the whole group', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0] }, host);
    handle.visible(false);
    const root = host.root.children[0] as THREE.Group;
    expect(root.visible).toBe(false);
  });

  it('dispose removes the group from its parent and does not throw on frame callbacks after', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0] }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
    expect(() => host.fireFrame()).not.toThrow();
  });

  it('renders a label when provided', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0], label: '\\vec{a}' }, host);
    expect(host.overlayEl.children.length).toBe(1);
    handle.dispose();
    expect(host.overlayEl.children.length).toBe(0);
  });
});
