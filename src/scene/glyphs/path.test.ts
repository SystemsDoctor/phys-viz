import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPath } from './path';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getLine(host: ReturnType<typeof createFakeHost>): THREE.Line {
  return host.root.children[0] as THREE.Line;
}

describe('createPath', () => {
  it('renders exactly the given points via setDrawRange', () => {
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
    expect(line.geometry.drawRange.count).toBe(3);
    const positions = line.geometry.attributes.position.array;
    expect(positions[3]).toBe(1);
    handle.dispose();
  });

  it('respects persistence by keeping only the trailing window', () => {
    const host = createFakeHost();
    const points: [number, number, number][] = [];
    for (let i = 0; i < 10; i++) points.push([i, 0, 0]);
    const handle = createPath({ points, persistence: 3 }, host);
    const line = getLine(host);
    expect(line.geometry.drawRange.count).toBe(3);
    const positions = line.geometry.attributes.position.array;
    // trailing 3 points are x=7,8,9
    expect(positions[0]).toBe(7);
    expect(positions[3]).toBe(8);
    expect(positions[6]).toBe(9);
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
    const colors = line.geometry.attributes.color.array;
    // oldest vertex (index 0) should be lighter (closer to background) than newest (index 2)
    const oldestBrightness = colors[0] + colors[1] + colors[2];
    const newestBrightness = colors[6] + colors[7] + colors[8];
    expect(oldestBrightness).toBeGreaterThan(newestBrightness);
    handle.dispose();
  });

  it('does not allocate a new geometry when set() is called repeatedly', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [[0, 0, 0]] }, host);
    const line = getLine(host);
    const geometry = line.geometry;
    for (let i = 0; i < 50; i++) {
      handle.set({
        points: [
          [0, 0, 0],
          [i, 0, 0],
        ],
      });
    }
    expect(getLine(host).geometry).toBe(geometry);
    handle.dispose();
  });

  it('handles an empty points array without throwing', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [] }, host);
    const line = getLine(host);
    expect(line.geometry.drawRange.count).toBe(0);
    handle.dispose();
  });

  it('dispose removes the line from its parent', () => {
    const host = createFakeHost();
    const handle = createPath({ points: [[0, 0, 0]] }, host);
    handle.dispose();
    expect(host.root.children.length).toBe(0);
  });
});
