import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { createCurvedArrow } from './curvedArrow';
import { rawPositionBuffer } from '../internal/line2';
import { createFakeHost } from '../internal/fakeHost.test-utils';

// X-49: the arc is a `Line2` (a `THREE.Mesh` subclass), so only an
// exact-constructor check finds the real cone head.
const isArcLine = (c: THREE.Object3D): c is Line2 => c.constructor === Line2;
const isConeMesh = (c: THREE.Object3D): c is THREE.Mesh => c.constructor === THREE.Mesh;

/** World position of a head cone's apex (its highest-y vertex, in local space). */
function apexWorld(mesh: THREE.Mesh): THREE.Vector3 {
  mesh.updateWorldMatrix(true, false);
  const pos = mesh.geometry.attributes.position;
  let apex = new THREE.Vector3();
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) > maxY) {
      maxY = pos.getY(i);
      apex = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
    }
  }
  return mesh.localToWorld(apex);
}

describe('createCurvedArrow', () => {
  // X-62: the cone was centred on its own origin but placed AT the arc end,
  // so the visible tip overshot the arc end by half a head length.
  for (const [name, start, end] of [
    ['counter-clockwise', 0, Math.PI / 2],
    ['clockwise', Math.PI / 2, 0],
  ] as const) {
    it(`the ${name} head apex lands exactly on the arc end (X-62)`, () => {
      const host = createFakeHost();
      const handle = createCurvedArrow(
        { center: [0.5, -1, 2], axis: [0, 1, 1], radius: 1.5, startAngle: start, endAngle: end },
        host,
      );
      host.fireFrame();
      const root = host.root.children[0] as THREE.Group;
      const line = root.children.find(isArcLine) as Line2;
      const positions = rawPositionBuffer(line.geometry as LineGeometry);
      const n = positions.length;
      const apex = apexWorld(root.children.find(isConeMesh) as THREE.Mesh);
      expect(apex.x).toBeCloseTo(positions[n - 3], 5);
      expect(apex.y).toBeCloseTo(positions[n - 2], 5);
      expect(apex.z).toBeCloseTo(positions[n - 1], 5);
      handle.dispose();
    });
  }

  it('draws the arc as a Line2/LineMaterial that projector mode can thicken (X-49)', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    const root = host.root.children[0] as THREE.Group;
    const line = root.children.find(isArcLine) as Line2;
    expect(line).toBeDefined();
    const material = line.material as LineMaterial;
    expect(material).toBeInstanceOf(LineMaterial);
    expect(material.linewidth).toBeGreaterThan(1);
    expect(host.themedMaterials.some((m) => m.material === material && m.kind === 'line')).toBe(
      true,
    );
    host.fireFrame({ rendererWidth: 640, rendererHeight: 480 });
    expect(material.resolution.x).toBe(640);
    expect(material.resolution.y).toBe(480);
    handle.dispose();
  });

  it('builds an arc line attached to the scene root', () => {
    const host = createFakeHost();
    const handle = createCurvedArrow(
      { center: [0, 0, 0], axis: [0, 0, 1], radius: 1, startAngle: 0, endAngle: Math.PI / 2 },
      host,
    );
    const root = host.root.children[0] as THREE.Group;
    const line = root.children.find(isArcLine) as Line2;
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
    const line = root.children.find(isArcLine) as Line2;
    const positions = rawPositionBuffer(line.geometry as LineGeometry);
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
    const line = root.children.find(isArcLine) as Line2;
    const positions = rawPositionBuffer(line.geometry as LineGeometry);
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
    const head = root.children.find(isConeMesh) as THREE.Mesh;
    // endAngle = pi/2 -> point = center + radius*v = (1, 0, 0), tangent +y;
    // X-62: the cone's BASE sits one head length back along the tangent.
    expect(head.position.x).toBeCloseTo(1, 5);
    expect(head.scale.y).toBeGreaterThan(0);
    expect(head.position.y).toBeCloseTo(-head.scale.y, 5);
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
