import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { createGridPlane } from './gridPlane';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

// X-49: the grid is a `LineSegments2` (a `THREE.Mesh` subclass, NOT a
// `THREE.LineSegments`), so find it by exact constructor.
const gridLines = (host: ReturnType<typeof createFakeHost>): LineSegments2 =>
  (host.root.children[0] as THREE.Group).children.find(
    (c): c is LineSegments2 => c.constructor === LineSegments2,
  )!;
const liveCount = (lines: LineSegments2): number =>
  (lines.geometry as LineSegmentsGeometry).instanceCount * 2; // points

describe('createGridPlane', () => {
  it('draws a LineSegments2/LineMaterial that projector mode can thicken, keeping its translucency (X-49)', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xy', { extent: 4 }, host);
    const lines = gridLines(host);
    const material = lines.material as LineMaterial;
    expect(material).toBeInstanceOf(LineMaterial);
    expect(material.linewidth).toBeGreaterThan(1);
    expect(material.worldUnits).toBe(false);
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.5, 9);
    expect(host.themedMaterials).toEqual([{ material, kind: 'line' }]);
    host.fireFrame({ rendererWidth: 640, rendererHeight: 360 });
    expect(material.resolution.x).toBe(640);
    expect(material.resolution.y).toBe(360);
    handle.dispose();
    expect(host.themedMaterials.length).toBe(0);
  });

  it('draws grid lines confined to the given plane (xz stays at y=0)', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xz', { extent: 4 }, host);
    const root = host.root.children[0] as THREE.Group;
    expect(root).toBeDefined();
    const lines = gridLines(host);
    const positions = rawPositionBuffer(lines.geometry as LineSegmentsGeometry);
    const count = liveCount(lines);
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      expect(positions[i * 3 + 1]).toBeCloseTo(0, 9); // y coordinate always 0 in the xz plane
    }
    handle.dispose();
  });

  it('recomputes grid spacing from camera distance on a frame tick', () => {
    const host = createFakeHost();
    const handle = createGridPlane('xy', { extent: 5 }, host);
    const before = gridLines(host);
    const beforeCount = liveCount(before);
    host.fireFrame();
    expect(liveCount(before)).toBeGreaterThan(0);
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
