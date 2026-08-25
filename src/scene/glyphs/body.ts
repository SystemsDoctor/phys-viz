/**
 * body — schematic rigid bodies: box, sphere, cylinder, disc, rod,
 * spring helix. Low poly by design (Visualizer Doctrine, §2).
 * See ARCHITECTURE.md §8.
 *
 * `kind` defines the geometry and is expected to stay fixed for a given
 * handle's lifetime (rebuilding it is only done defensively, if a
 * caller does change it) — position/orientation/scale/colour are the
 * properties a module actually animates frame to frame, all applied
 * directly via Object3D transforms, no per-frame screen-space math
 * needed (a body has a real world-space size).
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export type BodyKind = 'box' | 'sphere' | 'cylinder' | 'disc' | 'rod' | 'spring';

export interface BodyProps {
  group?: GroupHandle;
  kind: BodyKind;
  position: [number, number, number];
  orientation?: [number, number, number, number]; // quaternion
  scale?: [number, number, number];
  color?: string;
}

export type BodyHandle = Handle<BodyProps>;

const DEFAULT_COLOR = 0x7b8494;

function buildGeometry(kind: BodyKind): THREE.BufferGeometry {
  switch (kind) {
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'sphere':
      return new THREE.SphereGeometry(0.5, 16, 12);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    case 'disc':
      return new THREE.CylinderGeometry(0.5, 0.5, 0.05, 32);
    case 'rod':
      return new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    case 'spring': {
      const turns = 6;
      const pointsPerTurn = 12;
      const points: THREE.Vector3[] = [];
      const totalPoints = turns * pointsPerTurn;
      for (let i = 0; i <= totalPoints; i++) {
        const t = i / totalPoints;
        const angle = t * turns * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * 0.3, t - 0.5, Math.sin(angle) * 0.3));
      }
      const curve = new THREE.CatmullRomCurve3(points);
      return new THREE.TubeGeometry(curve, totalPoints, 0.04, 6, false);
    }
  }
}

export function createBody(props: BodyProps, host: SubstrateHost): BodyHandle {
  const parent = host.resolveGroup(props.group);
  const material = new THREE.MeshStandardMaterial({
    color: props.color ?? DEFAULT_COLOR,
    roughness: 0.8,
    metalness: 0.05,
  });
  let geometry = buildGeometry(props.kind);
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  const unTheme = host.registerThemedMaterial(material, 'fill');

  let currentKind = props.kind;

  function applyProps(p: BodyProps): void {
    if (p.kind !== currentKind) {
      geometry.dispose();
      geometry = buildGeometry(p.kind);
      mesh.geometry = geometry;
      currentKind = p.kind;
    }
    mesh.position.set(p.position[0], p.position[1], p.position[2]);
    if (p.orientation) {
      mesh.quaternion.set(p.orientation[0], p.orientation[1], p.orientation[2], p.orientation[3]);
    }
    if (p.scale) mesh.scale.set(p.scale[0], p.scale[1], p.scale[2]);
    material.color.set(p.color ?? DEFAULT_COLOR);
  }

  let current: BodyProps = { ...props };
  applyProps(current);

  return {
    set(next) {
      current = { ...current, ...next };
      applyProps(current);
    },
    visible(show) {
      mesh.visible = show;
    },
    dispose() {
      unTheme();
      parent.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
