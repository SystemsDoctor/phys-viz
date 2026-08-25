/**
 * patch — translucent polygons. Cross-product parallelograms, swept
 * areas, flux elements. Needs correct double-sided transparency and
 * depth-write off. See ARCHITECTURE.md §8.
 *
 * Triangulated as a simple fan from points[0] — correct for the convex
 * polygons this is actually used for (parallelograms, triangles); a
 * concave polygon would need a real triangulator, out of scope here.
 * Non-indexed (each triangle owns its own 3 vertices) so a variable
 * point count never needs an index-buffer resize — just a draw-range
 * change into a fixed-capacity buffer allocated once.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface PatchProps {
  group?: GroupHandle;
  points: (readonly [number, number, number])[];
  color?: string;
  opacity?: number;
}

export type PatchHandle = Handle<PatchProps>;

const MAX_POINTS = 16;
const MAX_TRIANGLES = MAX_POINTS - 2;
const DEFAULT_COLOR = 0x7a4fbf;
const DEFAULT_OPACITY = 0.25;

export function createPatch(props: PatchProps, host: SubstrateHost): PatchHandle {
  const parent = host.resolveGroup(props.group);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_TRIANGLES * 3 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.MeshBasicMaterial({
    color: DEFAULT_COLOR,
    opacity: DEFAULT_OPACITY,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  const unTheme = host.registerThemedMaterial(material, 'fill');

  function applyProps(p: PatchProps): void {
    material.color.set(p.color ?? DEFAULT_COLOR);
    material.opacity = p.opacity ?? DEFAULT_OPACITY;

    const n = Math.min(p.points.length, MAX_POINTS);
    const triangleCount = Math.max(0, n - 2);
    let cursor = 0;
    for (let i = 0; i < triangleCount; i++) {
      const a = p.points[0];
      const b = p.points[i + 1];
      const c = p.points[i + 2];
      positions[cursor++] = a[0];
      positions[cursor++] = a[1];
      positions[cursor++] = a[2];
      positions[cursor++] = b[0];
      positions[cursor++] = b[1];
      positions[cursor++] = b[2];
      positions[cursor++] = c[0];
      positions[cursor++] = c[1];
      positions[cursor++] = c[2];
    }
    geometry.setDrawRange(0, triangleCount * 3);
    geometry.attributes.position.needsUpdate = true;
    if (triangleCount > 0) geometry.computeBoundingSphere();
  }

  let current: PatchProps = { ...props };
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
