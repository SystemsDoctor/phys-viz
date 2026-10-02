import { describe, it, expect } from 'vitest';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createPath } from './path';
import { rawPositionBuffer, rawColorBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getLine(host: ReturnType<typeof createFakeHost>): Line2 {
  return host.root.children[0] as Line2;
}
const geom = (line: Line2): LineGeometry => line.geometry;

describe('createPath', () => {
  // X-49: `THREE.Line`'s linewidth is clamped to 1px by ANGLE, so projector
  // mode's multiplier was a no-op on every trace. The scene object must be
  // a real `Line2`/`LineMaterial`, registered as a projector-aware 'line'.
  it('is a Line2 with a LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [[0, 0, 0]] }, host);
    const line = getLine(host);
    expect(line.constructor).toBe(Line2);
    expect(line.material).toBeInstanceOf(LineMaterial);
    const material = line.material as LineMaterial;
    expect(material.linewidth).toBeGreaterThan(1);
    expect(material.worldUnits).toBe(false);
    expect(host.themedMaterials).toEqual([{ material, kind: 'line' }]);
    host.fireFrame({ rendererWidth: 1000, rendererHeight: 500 });
    expect(material.resolution.x).toBe(1000);
    expect(material.resolution.y).toBe(500);
    handle.dispose();
    expect(host.themedMaterials.length).toBe(0);
  });

  it('renders exactly the given points as N-1 segments', () => {
    const host = createFakeHost();
    const handle = createPath(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
        ],
      },
      host,
    );
    const line = getLine(host);
    expect(geom(line).instanceCount).toBe(2);
    const positions = rawPositionBuffer(geom(line));
    // segment 0: (0,0,0)->(1,0,0); segment 1: (1,0,0)->(2,0,0)
    expect(Array.from(positions.slice(0, 12))).toEqual([0, 0, 0, 1, 0, 0, 1, 0, 0, 2, 0, 0]);
    handle.dispose();
  });

  it('respects persistence by keeping only the trailing window', () => {
    const host = createFakeHost();
    const points: [number, number, number][] = [];
    for (let i = 0; i < 10; i++) points.push([i, 0, 0]);
    const handle = createPath({ points, persistence: 3 }, host);
    const line = getLine(host);
    expect(geom(line).instanceCount).toBe(2);
    const positions = rawPositionBuffer(geom(line));
    // trailing 3 points are x=7,8,9
    expect(positions[0]).toBe(7);
    expect(positions[3]).toBe(8);
    expect(positions[9]).toBe(9);
    handle.dispose();
  });

  it('fades the oldest vertex toward the background and keeps the newest at full colour', () => {
    const host = createFakeHost();
    const handle = createPath(
      {
        points: [
          [0, 0, 0],
          [1, 0, 0],
          [2, 0, 0],
        ],
        color: '#000000',
      },
      host,
    );
    const line = getLine(host);
    const colors = rawColorBuffer(geom(line));
    // oldest vertex (index 0) should be lighter (closer to background) than newest (index 2)
    const oldestBrightness = colors[0] + colors[1] + colors[2];
    const newestBrightness = colors[9] + colors[10] + colors[11];
    expect(oldestBrightness).toBeGreaterThan(newestBrightness);
    handle.dispose();
  });

  it('does not allocate a new geometry when set() is called repeatedly', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [[0, 0, 0]] }, host);
    const line = getLine(host);
    const geometry = line.geometry;
    const positionsBefore = rawPositionBuffer(geom(line));
    for (let i = 0; i < 50; i++) {
      handle.set({
        points: [
          [0, 0, 0],
          [i, 0, 0],
        ],
      });
    }
    expect(getLine(host).geometry).toBe(geometry);
    expect(rawPositionBuffer(geom(getLine(host)))).toBe(positionsBefore);
    handle.dispose();
  });

  it('handles an empty points array without throwing', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [] }, host);
    const line = getLine(host);
    expect(geom(line).instanceCount).toBe(0);
    handle.dispose();
  });

  it('dispose removes the line from its parent', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [[0, 0, 0]] }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
