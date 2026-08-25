/**
 * field — vector field glyph grids. INSTANCED: one draw call for
 * thousands of arrows (Performance budget, §17: draw calls <= 200).
 * Supports magnitude->length, magnitude->colour, or normalized modes.
 * See ARCHITECTURE.md §8.
 *
 * `gridResolution` defines the instance count and is fixed at creation
 * (an `InstancedMesh`'s instance count can't change after construction)
 * — same "topology fixed at creation" rule as `surface`. Every instance
 * transform/colour is recomputed in `set()` using only pre-allocated
 * scratch objects, so a time-varying field calling `set()` every
 * rendered frame allocates nothing beyond the one-time buffers built
 * at creation.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export type FieldMode = 'length' | 'color' | 'normalized';

export interface FieldProps {
  group?: GroupHandle;
  sample: (p: [number, number, number]) => [number, number, number];
  gridBounds: { min: [number, number, number]; max: [number, number, number] };
  gridResolution: [number, number, number];
  mode?: FieldMode;
}

export type FieldHandle = Handle<FieldProps>;

const DEFAULT_MODE: FieldMode = 'length';
const BASE_LENGTH = 0.4;
const DEFAULT_COLOR = new THREE.Color(0x12161d);
const LOW_COLOR = new THREE.Color(0x0072b2);
const HIGH_COLOR = new THREE.Color(0xd55e00);

const scratchPosition = new THREE.Vector3();
const scratchDirection = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const scratchScale = new THREE.Vector3();
const scratchMatrix = new THREE.Matrix4();
const scratchColor = new THREE.Color();
const upHint = new THREE.Vector3(0, 1, 0);
const samplePoint: [number, number, number] = [0, 0, 0];

function axisCount(n: number): number {
  return Math.max(1, Math.floor(n));
}

function gridCoord(min: number, max: number, count: number, index: number): number {
  return count > 1 ? min + ((max - min) * index) / (count - 1) : (min + max) / 2;
}

export function createField(props: FieldProps, host: SubstrateHost): FieldHandle {
  const parent = host.resolveGroup(props.group);
  const countX = axisCount(props.gridResolution[0]);
  const countY = axisCount(props.gridResolution[1]);
  const countZ = axisCount(props.gridResolution[2]);
  const instanceCount = countX * countY * countZ;

  const geometry = new THREE.ConeGeometry(0.25, 1, 8);
  const material = new THREE.MeshBasicMaterial();
  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(instanceCount * 3), 3);
  parent.add(mesh);
  const unTheme = host.registerThemedMaterial(material, 'fill');

  // Reused across every set() call — sized once, topology is fixed.
  const magnitudes = new Float32Array(instanceCount);
  const directions = new Float32Array(instanceCount * 3);

  function applyProps(p: FieldProps): void {
    const mode = p.mode ?? DEFAULT_MODE;
    let index = 0;
    let maxMagnitude = 0;
    for (let k = 0; k < countZ; k++) {
      const z = gridCoord(p.gridBounds.min[2], p.gridBounds.max[2], countZ, k);
      for (let j = 0; j < countY; j++) {
        const y = gridCoord(p.gridBounds.min[1], p.gridBounds.max[1], countY, j);
        for (let i = 0; i < countX; i++) {
          const x = gridCoord(p.gridBounds.min[0], p.gridBounds.max[0], countX, i);
          samplePoint[0] = x;
          samplePoint[1] = y;
          samplePoint[2] = z;
          const [vx, vy, vz] = p.sample(samplePoint);
          const magnitude = Math.sqrt(vx * vx + vy * vy + vz * vz);
          magnitudes[index] = magnitude;
          if (magnitude > 1e-12) {
            directions[index * 3] = vx / magnitude;
            directions[index * 3 + 1] = vy / magnitude;
            directions[index * 3 + 2] = vz / magnitude;
          } else {
            directions[index * 3] = 0;
            directions[index * 3 + 1] = 1;
            directions[index * 3 + 2] = 0;
          }
          if (magnitude > maxMagnitude) maxMagnitude = magnitude;
          index++;
        }
      }
    }

    index = 0;
    for (let k = 0; k < countZ; k++) {
      const z = gridCoord(p.gridBounds.min[2], p.gridBounds.max[2], countZ, k);
      for (let j = 0; j < countY; j++) {
        const y = gridCoord(p.gridBounds.min[1], p.gridBounds.max[1], countY, j);
        for (let i = 0; i < countX; i++) {
          const x = gridCoord(p.gridBounds.min[0], p.gridBounds.max[0], countX, i);
          const magnitude = magnitudes[index];
          const normalizedMag = maxMagnitude > 1e-12 ? magnitude / maxMagnitude : 0;
          scratchDirection.set(
            directions[index * 3],
            directions[index * 3 + 1],
            directions[index * 3 + 2],
          );
          scratchQuat.setFromUnitVectors(upHint, scratchDirection);

          const length =
            mode === 'length' ? BASE_LENGTH * (0.15 + 0.85 * normalizedMag) : BASE_LENGTH;
          scratchScale.set(length, length, length);
          scratchPosition.set(x, y, z);
          scratchMatrix.compose(scratchPosition, scratchQuat, scratchScale);
          mesh.setMatrixAt(index, scratchMatrix);

          if (mode === 'color') scratchColor.copy(LOW_COLOR).lerp(HIGH_COLOR, normalizedMag);
          else scratchColor.copy(DEFAULT_COLOR);
          mesh.setColorAt(index, scratchColor);

          index++;
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }

  let current: FieldProps = { ...props };
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
