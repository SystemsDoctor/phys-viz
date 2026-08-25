import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createArc } from './arc';
import { createFakeHost } from '../internal/fakeHost.test-utils';

function getLine(host: ReturnType<typeof createFakeHost>): THREE.Line {
  const root = host.root.children[0] as THREE.Group;
  return root.children.find((c) => c instanceof THREE.Line) as THREE.Line;
}

describe('createArc', () => {
  it('starts the arc at the from-direction, scaled by radius', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 2 }, host);
    const line = getLine(host);
    const positions = line.geometry.attributes.position.array;
    expect(positions[0]).toBeCloseTo(2, 5);
    expect(positions[1]).toBeCloseTo(0, 5);
    expect(positions[2]).toBeCloseTo(0, 5);
    handle.dispose();
  });

  it('ends the arc at the to-direction, scaled by radius', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [0, 1, 0], radius: 2 }, host);
    const line = getLine(host);
    const positions = line.geometry.attributes.position.array;
    const last = positions.length - 3;
    expect(positions[last]).toBeCloseTo(0, 4);
    expect(positions[last + 1]).toBeCloseTo(2, 4);
    handle.dispose();
  });

  it('handles parallel from/to vectors without producing NaN', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [1, 0, 0], radius: 1 }, host);
    const line = getLine(host);
    const positions = line.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i++) expect(Number.isNaN(positions[i])).toBe(false);
    handle.dispose();
  });

  it('handles anti-parallel from/to vectors without producing NaN', () => {
    const host = createFakeHost();
    const handle = createArc({ from: [1, 0, 0], to: [-1, 0, 0], radius: 1 }, host);
    const line = getLine(host);
    const positions = line.geometry.attributes.position.array;
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
