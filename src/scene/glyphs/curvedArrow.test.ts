import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCurvedArrow } from './curvedArrow';
import { createFakeHost } from '../internal/fakeHost.test-utils';

describe('createCurvedArrow', () => {
  it('builds an arc line attached to the scene root', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    const root = host.root.children[0] as THREE.Group;
    const line = root.children.find((c) => c instanceof THREE.Line) as THREE.Line;
    expect(line).toBeDefined();
    handle.dispose();
  });

  it('the arc endpoints match the closed-form circle parametrization for its own (u,v,axis) basis', () => {
    // For axis=+z, computeBasis picks helper=+x (since axis.dot(+x)=0),
    // giving u = normalize(cross(+x,+z)) = (0,-1,0) and v = cross(+z,u)
    // = (1,0,0) — a right-handed basis (u x v = axis), but not aligned
    // with a naive "angle 0 = +x" guess. Point(angle) = center +
    // radius*(cos(angle)*u + sin(angle)*v).
    const host = createFakeHost();
    createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 2, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    const root = host.root.children[0] as THREE.Group;
    const line = root.children.find((c) => c instanceof THREE.Line) as THREE.Line;
    const positions = line.geometry.attributes.position.array;
    // start (angle=0): center + radius*u = (0, -2, 0)
    expect(positions[0]).toBeCloseTo(0, 5);
    expect(positions[1]).toBeCloseTo(-2, 5);
  });

  it('u cross v equals axis (right-handed, per ADR 0008)', () => {
    const host = createFakeHost();
    createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    const root = host.root.children[0] as THREE.Group;
    const line = root.children.find((c) => c instanceof THREE.Line) as THREE.Line;
    const positions = line.geometry.attributes.position.array;
    const p0 = new THREE.Vector3(positions[0], positions[1], positions[2]); // angle=0 -> radius*u
    const pEnd = new THREE.Vector3(
      positions[positions.length - 3],
      positions[positions.length - 2],
      positions[positions.length - 1],
    ); // angle=pi/2 -> radius*v
    const crossed = p0.clone().cross(pEnd).normalize();
    expect(crossed.z).toBeCloseTo(1, 5); // matches axis (0,0,1)
  });

  it('positions the tangential head after a frame tick', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    host.fireFrame();
    const root = host.root.children[0] as THREE.Group;
    const head = root.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh;
    // endAngle = pi/2 -> point = center + radius*v = (1, 0, 0)
    expect(head.position.x).toBeCloseTo(1, 5);
    expect(head.position.y).toBeCloseTo(0, 5);
    handle.dispose();
  });

  it('dispose cleans up and does not throw on a later frame', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: 1 },
      host,
    );
    handle.dispose();
    expect(host.root.children.length).toBe(0);
    expect(() => host.fireFrame()).not.toThrow();
  });

  it('renders and disposes a midpoint label when provided', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: 1, label: '\\tau' },
      host,
    );
    expect(host.overlayEl.children.length).toBe(1);
    handle.dispose();
    expect(host.overlayEl.children.length).toBe(0);
  });
});
