/**
 * point — particles, markers. Screen-space constant size.
 * See ARCHITECTURE.md §8.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { worldUnitsPerPixel } from '../internal/screenSpace';

export interface PointProps {
  group?: GroupHandle;
  position: [number, number, number];
  color?: string;
  sizePx?: number;
}

export type PointHandle = Handle<PointProps>;

const DEFAULT_SIZE_PX = 8;
const DEFAULT_COLOR = 0x12161d;
const scratchPoint = new THREE.Vector3();

export function createPoint(props: PointProps, host: SubstrateHost): PointHandle {
  const parent = host.resolveGroup(props.group);
  const geometry = new THREE.SphereGeometry(0.5, 12, 8);
  const material = new THREE.MeshBasicMaterial({ color: props.color ?? DEFAULT_COLOR });
  const mesh = new THREE.Mesh(geometry, material);
  parent.add(mesh);
  const unTheme = host.registerThemedMaterial(material, 'fill');

  let current: PointProps = { ...props };
  mesh.position.set(current.position[0], current.position[1], current.position[2]);

  const unFrame = host.onFrame((info) => {
    scratchPoint.set(current.position[0], current.position[1], current.position[2]);
    const distance = info.camera.position.distanceTo(scratchPoint);
    const sizePx = current.sizePx ?? DEFAULT_SIZE_PX;
    const worldSize = sizePx * worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    mesh.position.copy(scratchPoint);
    mesh.scale.set(worldSize, worldSize, worldSize);
  });

  return {
    set(next) {
      current = { ...current, ...next };
      if (next.color !== undefined) material.color.set(next.color);
    },
    visible(show) {
      mesh.visible = show;
    },
    dispose() {
      unFrame();
      unTheme();
      parent.remove(mesh);
      geometry.dispose();
      material.dispose();
    },
  };
}
