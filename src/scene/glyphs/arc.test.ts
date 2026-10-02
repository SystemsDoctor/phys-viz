import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createArc } from './arc';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

// X-49: the arc is a `Line2` (a `THREE.Mesh` subclass, NOT a `THREE.Line`),
// so find it by exact constructor and read its instance buffer.
function getLine(host: ReturnType<typeof createFakeHost>): Line2 {
  const root = host.root.children[0] as THREE.Group;
  return root.children.find((c): c is Line2 => c.constructor === Line2)!;
}
const positionsOf = (line: Line2): Float32Array => rawPositionBuffer(line.geometry as LineGeometry);

describe('createArc', () => {
  it('is a Line2/LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 1 }, host);
    const material = getLine(host).material as LineMaterial;
    expect(material).toBeInstanceOf(LineMaterial);
    expect(material.linewidth).toBeGreaterThan(1);
    expect(material.worldUnits).toBe(false);
    expect(host.themedMaterials).toEqual([{ material, kind: 'line' }]);
    host.fireFrame({ rendererWidth: 480, rendererHeight: 240 });
    expect(material.resolution.x).toBe(480);
    expect(material.resolution.y).toBe(240);
    handle.dispose();
    expect(host.themedMaterials.length).toBe(0);
  });

  it('starts the arc at the from-direction, scaled by radius', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 2 }, host);
    const line = getLine(host);
    const positions = positionsOf(line);
    expect(positions[0]).toBeCloseTo(2, 5);
    expect(positions[1]).toBeCloseTo(0, 5);
    expect(positions[2]).toBeCloseTo(0, 5);
    handle.dispose();
  });

  it('ends the arc at the to-direction, scaled by radius', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 2 }, host);
    const line = getLine(host);
    const positions = positionsOf(line);
    const last = positions.length - 3;
    expect(positions[last]).toBeCloseTo(0, 4);
    expect(positions[last + 1]).toBeCloseTo(2, 4);
    handle.dispose();
  });

  it('handles parallel from/to vectors without producing NaN', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [1, 0, 0], radius: 1 }, host);
    const line = getLine(host);
    const positions = positionsOf(line);
    for (let i = 0; i < positions.length; i++) expect(Number.isNaN(positions[i])).toBe(false);
    handle.dispose();
  });

  it('handles anti-parallel from/to vectors without producing NaN', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [-1, 0, 0], radius: 1 }, host);
    const line = getLine(host);
    const positions = positionsOf(line);
    for (let i = 0; i < positions.length; i++) expect(Number.isNaN(positions[i])).toBe(false);
    handle.dispose();
  });

  it('renders and disposes a midpoint label when provided', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 1, label: '\\theta' }, host);
    expect(host.overlayEl.children.length).toBe(1);
    handle.dispose();
    expect(host.overlayEl.children.length).toBe(0);
  });

  it('dispose removes the group from its parent', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 1 }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
