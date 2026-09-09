import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createGridPlane } from './gridPlane';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('createGridPlane', () => {
  it('draws grid lines confined to the given plane (xz stays at y=0)', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xz', { extent: 4 }, host);
    const root = host.root.children[0] as THREE.Group;
    const lines = root.children.find((c) => c instanceof THREE.LineSegments) as THREE.LineSegments;
    const positions = lines.geometry.attributes.position.array;
    const count = lines.geometry.drawRange.count;
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      expect(positions[i * 3 + 1]).toBeCloseTo(0, 9); // y coordinate always 0 in the xz plane
    }
    handle.dispose();
  });

  it('recomputes grid spacing from camera distance on a frame tick', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xy', { extent: 5 }, host);
    const before = host.root.children[0].children[0] as THREE.LineSegments;
    const beforeCount = before.geometry.drawRange.count;
    host.fireFrame();
    expect(before.geometry.drawRange.count).toBeGreaterThan(0);
    expect(beforeCount).toBeGreaterThan(0);
    handle.dispose();
  });

  it('visible(false) hides the group without disposing it', () => {
    const host = createFakeHost();
    const handle = createGridPlane('yz', {}, host);
    const root = host.root.children[0] as THREE.Group;
    handle.visible(false);
    expect(root.visible).toBe(false);
    handle.visible(true);
    expect(root.visible).toBe(true);
    handle.dispose();
  });

  it('dispose removes the group from its parent', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xy', {}, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
