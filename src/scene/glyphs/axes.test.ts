import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createAxes, niceSpacing } from './axes';
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

describe('createAxes', () => {
  it('draws 3 axis segments spanning the given extent', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 4 }, host);
    const root = host.root.children[0] as THREE.Group;
    const axisLines = root.children.find(
      (c) => c instanceof THREE.LineSegments,
    ) as THREE.LineSegments;
    const positions = axisLines.geometry.attributes.position.array;
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
    const lineSegments = root.children.filter(
      (c) => c instanceof THREE.LineSegments,
    ) as THREE.LineSegments[];
    const tickLines = lineSegments[1];
    expect(tickLines.geometry.drawRange.count).toBeGreaterThan(0);
    handle.dispose();
  });

  it('does not generate ticks when showTicks is false', () => {
    const host = createFakeHost();
    const handle = createAxes({ extent: 5, showTicks: false }, host);
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const lineSegments = root.children.filter(
      (c) => c instanceof THREE.LineSegments,
    ) as THREE.LineSegments[];
    const tickLines = lineSegments[1];
    expect(tickLines.geometry.drawRange.count).toBe(0);
    handle.dispose();
  });

  it('dispose removes the group from its parent', () => {
    const host = createFakeHost();
    const handle = createAxes({}, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
