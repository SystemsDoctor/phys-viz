import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createArrow } from './arrow';
import { createFakeHost } from '../internal/fakeHost.test-utils';

// X-49: the shaft is now a `Line2` (`LineSegments2` -> `THREE.Mesh`), so
// a plain `instanceof THREE.Mesh` check also matches it, not just the
// cone head/tailHead — use the exact constructor to find only a real
// cone mesh, same discriminator every other migrated glyph's tests use.
const isConeMesh = (c: THREE.Object3D): c is THREE.Mesh => c.constructor === THREE.Mesh;

/** World position of a head cone's apex (its highest-y vertex, in local space). */
function apexWorld(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.attributes.position;
  let apex = new THREE.Vector3();
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > maxY) {
      maxY = pos.getY(i);
      apex = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
  return mesh.localToWorld(apex);
}

describe('createArrow', () => {
  // X-48: the cone was centred on its own origin but placed at the shaft
  // end, so the visible tip fell half a head length short of `to`.
  it('the head apex lands exactly on `to` (X-48)', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [2, 0, 0] }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    const apex = apexWorld(head);
    expect(apex.x).toBeCloseTo(2, 5);
    expect(apex.y).toBeCloseTo(0, 5);
    expect(apex.z).toBeCloseTo(0, 5);
    handle.dispose();
  });

  it('the head apex lands on `to` for an oblique arrow too (X-48)', () => {
    const host = createFakeHost();
    const to: [number, number, number] = [1, 2, -0.5];
    const handle = createArrow({ from: [-1, 0.5, 0.25], to }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    const apex = apexWorld(head);
    expect(apex.x).toBeCloseTo(to[0], 5);
    expect(apex.y).toBeCloseTo(to[1], 5);
    expect(apex.z).toBeCloseTo(to[2], 5);
    handle.dispose();
  });

  it('the double-head tail apex lands exactly on `from` (X-48)', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [-1, 0, 0], to: [2, 0, 0], doubleHead: true }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const cones = root.children.filter(isConeMesh) as THREE.Mesh[];
    const apexes = cones.map(apexWorld);
    const xs = apexes.map((a) => a.x).sort((p, q) => p - q);
    expect(xs[0]).toBeCloseTo(-1, 5);
    expect(xs[1]).toBeCloseTo(2, 5);
    handle.dispose();
  });

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
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    expect(head.position.x).toBeGreaterThan(0);
    expect(head.position.x).toBeLessThanOrEqual(2);
    handle.dispose();
  });

  it('hides everything when from equals to (zero-length vector)', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [1, 1, 1], to: [1, 1, 1] }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    expect(head.visible).toBe(false);
    handle.dispose();
  });

  it('set() updates the endpoint used on the next frame', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0] }, host);
    handle.set({ to: [0, 5, 0] });
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    expect(head.position.y).toBeGreaterThan(0);
    handle.dispose();
  });

  it('doubleHead shows a second cone at the tail', () => {
    const host = createFakeHost();
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0], doubleHead: true }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const meshes = root.children.filter(isConeMesh);
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

  // ADR 0011: a label whose arrow is hidden by TOGGLING ITS GROUP (the
  // path LayerManager/Viewport.setGroupVisible actually uses, not the
  // handle's own .visible()) must hide too. Before this fix, the label
  // — a DOM overlay outside the three.js scene graph — kept rendering
  // forever once its arrow's group started hidden, e.g. vector-algebra's
  // `c` (grouped under the 'triple' layer, off by default).
  it('hides its label when an ancestor group is turned off (not just via handle.visible)', () => {
    const host = createFakeHost();
    const group = { id: 'triple' };
    const handle = createArrow({ from: [0, 0, 0], to: [1, 0, 0], label: '\\vec{c}', group }, host);
    // Simulate the shell hiding the group directly, the way
    // Viewport.setGroupVisible does — never calling handle.visible().
    (host.resolveGroup(group) as THREE.Group).visible = false;
    host.fireFrame();
    const el = host.overlayEl.children[0] as HTMLElement;
    expect(el.style.display).toBe('none');

    (host.resolveGroup(group) as THREE.Group).visible = true;
    host.fireFrame();
    expect(el.style.display).not.toBe('none');
    handle.dispose();
  });
});
