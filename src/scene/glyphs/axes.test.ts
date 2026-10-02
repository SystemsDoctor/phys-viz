import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { createAxes, niceSpacing } from './axes';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('niceSpacing', () => {
  it('snaps to the nearest 1/2/5 x 10^n value', () => {
    expect(niceSpacing(0.9)).toBeCloseTo(1, 9);
    expect(niceSpacing(1.6)).toBeCloseTo(2, 9);
    expect(niceSpacing(4)).toBeCloseTo(5, 9);
    expect(niceSpacing(8)).toBeCloseTo(10, 9);
    expect(niceSpacing(15)).toBeCloseTo(20, 9);
    expect(niceSpacing(0.03)).toBeCloseTo(0.02, 9);
  });
});

// X-49: the axes/ticks are `LineSegments2` (a `THREE.Mesh` subclass, NOT a
// `THREE.LineSegments`), so find them by exact constructor.
const segmentsOf = (root: THREE.Group): LineSegments2[] =>
  root.children.filter((c) => c.constructor === LineSegments2) as LineSegments2[];

describe('createAxes', () => {
  it('draws axes and ticks as LineSegments2/LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 5 }, host);
    const root = host.root.children[0] as THREE.Group;
    const segments = segmentsOf(root);
    expect(segments.length).toBe(2);
    for (const seg of segments) {
      const material = seg.material as LineMaterial;
      expect(material).toBeInstanceOf(LineMaterial);
      expect(material.linewidth).toBeGreaterThan(1);
      expect(material.worldUnits).toBe(false);
      expect(host.themedMaterials.some((m) => m.material === material && m.kind === 'line')).toBe(
        true,
      );
    }
    host.fireFrame({ rendererWidth: 700, rendererHeight: 350 });
    for (const seg of segments) {
      const material = seg.material as LineMaterial;
      expect(material.resolution.x).toBe(700);
      expect(material.resolution.y).toBe(350);
    }
    handle.dispose();
    expect(host.themedMaterials.length).toBe(0);
  });

  it('draws 3 axis segments spanning the given extent', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 4 }, host);
    const root = host.root.children[0] as THREE.Group;
    const axisLines = segmentsOf(root)[0];
    const positions = rawPositionBuffer(axisLines.geometry as LineSegmentsGeometry);
    // x axis: from (-4,0,0) to (4,0,0)
    expect(positions[0]).toBeCloseTo(-4, 6);
    expect(positions[3]).toBeCloseTo(4, 6);
    handle.dispose();
  });

  it('generates tick marks after a frame tick', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 5 }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const tickLines = segmentsOf(root)[1];
    expect((tickLines.geometry as LineSegmentsGeometry).instanceCount).toBeGreaterThan(0);
    handle.dispose();
  });

  it('does not generate ticks when showTicks is false', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 5, showTicks: false }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const tickLines = segmentsOf(root)[1];
    expect((tickLines.geometry as LineSegmentsGeometry).instanceCount).toBe(0);
    handle.dispose();
  });

  it('dispose removes the group from its parent', () => {
    const host = createFakeHost();
    const handle = createAxes({}, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
