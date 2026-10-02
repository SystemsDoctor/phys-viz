import { describe, it, expect } from 'vitest';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createDimensionLine } from './dimensionLine';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getLine(host: ReturnType<typeof createFakeHost>): Line2 {
  return host.root.children[0] as Line2;
}

describe('createDimensionLine', () => {
  // X-49: `THREE.Line`'s linewidth is clamped to 1px by ANGLE, so projector
  // mode's multiplier never thickened dimension/leader/drop lines.
  it('is a Line2 with a LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createDimensionLine({ from: [0, 0, 0], to: [2, 0, 0] }, host);
    const line = getLine(host);
    expect(line.constructor).toBe(Line2);
    const material = line.material as LineMaterial;
    expect(material).toBeInstanceOf(LineMaterial);
    expect(material.linewidth).toBeGreaterThan(1);
    expect(material.worldUnits).toBe(false);
    expect(host.themedMaterials).toEqual([{ material, kind: 'line' }]);
    host.fireFrame({ rendererWidth: 900, rendererHeight: 450 });
    expect(material.resolution.x).toBe(900);
    expect(material.resolution.y).toBe(450);
    handle.dispose();
    expect(host.themedMaterials.length).toBe(0);
  });

  it('writes from/to (plus perpendicular offset) into the segment buffer', () => {
    const host = createFakeHost();
    const handle = createDimensionLine({ from: [0, 0, 0], to: [2, 0, 0] }, host);
    const geometry = getLine(host).geometry as LineGeometry;
    expect(Array.from(rawPositionBuffer(geometry).slice(0, 6))).toEqual([0, 0, 0, 2, 0, 0]);
    handle.set({ from: [1, 1, 0], to: [3, 1, 0] });
    expect(Array.from(rawPositionBuffer(geometry).slice(0, 6))).toEqual([1, 1, 0, 3, 1, 0]);
    handle.set({ offset: 0.5 });
    // dir = +x, up = +y: perp = normalize(x cross y) = +z, offset 0.5.
    expect(Array.from(rawPositionBuffer(geometry).slice(0, 6))).toEqual([1, 1, 0.5, 3, 1, 0.5]);
    handle.dispose();
  });

  it('dashed is a real toggle on the material, not a huge-dash hack', () => {
    const host = createFakeHost();
    const handle = createDimensionLine({ from: [0, 0, 0], to: [2, 0, 0], dashed: true }, host);
    const material = getLine(host).material as LineMaterial;
    expect(material.dashed).toBe(true);
    handle.set({ dashed: false });
    expect(material.dashed).toBe(false);
    handle.dispose();
  });

  it('renders and disposes a midpoint label when provided', () => {
    const host = createFakeHost();
    const handle = createDimensionLine({ from: [0, 0, 0], to: [2, 0, 0], label: 'd' }, host);
    expect(host.overlayEl.children.length).toBe(1);
    handle.dispose();
    expect(host.overlayEl.children.length).toBe(0);
    expect(host.root.children.length).toBe(0);
  });
});
