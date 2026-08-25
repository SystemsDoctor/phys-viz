/**
 * dimensionLine — dimension lines, dashed projection drop-lines, and
 * leader lines (all the same primitive: a line with an optional offset
 * and an optional label at its midpoint). See ARCHITECTURE.md §8.
 */
import * as THREE from 'three';
import { add, cross, normalize, norm, scale, sub } from '@/kernel/math';
import type { Vec3 } from '@/kernel/math';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from '../glyphs/Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { createLabel } from './label';
import type { LabelHandle } from './label';

export interface DimensionLineProps {
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  /** Perpendicular offset distance (drafting-style extension), default 0. */
  offset?: number;
  label?: string;
  dashed?: boolean;
  group?: GroupHandle;
}

export type DimensionLineHandle = Handle<DimensionLineProps>;

const EPS = 1e-9;

/** A perpendicular to `dir`, preferring the world up axis, falling back to +x if parallel to it. */
function perpendicular(dir: Vec3, upAxis: Vec3): Vec3 {
  let perp = cross(dir, upAxis);
  if (norm(perp) < EPS) perp = cross(dir, [1, 0, 0]);
  return normalize(perp);
}

function offsetEndpoints(props: DimensionLineProps, upAxis: Vec3): { from: Vec3; to: Vec3 } {
  const offset = props.offset ?? 0;
  if (offset === 0) return { from: props.from as Vec3, to: props.to as Vec3 };
  const dir = normalize(sub(props.to as Vec3, props.from as Vec3));
  const perp = scale(perpendicular(dir, upAxis), offset);
  return { from: add(props.from as Vec3, perp), to: add(props.to as Vec3, perp) };
}

export function createDimensionLine(
  props: DimensionLineProps,
  host: SubstrateHost,
): DimensionLineHandle {
  const parent = host.resolveGroup(props.group);
  const upAxis: Vec3 = host.upAxis() === 'y' ? [0, 1, 0] : [0, 0, 1];

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(6);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineDashedMaterial({
    color: 0x000000,
    dashSize: 0.1,
    gapSize: 0.06,
  });
  const line = new THREE.Line(geometry, material);
  parent.add(line);
  const unMaterial = host.registerThemedMaterial(material, 'line');

  let label: LabelHandle | null = null;
  let current: DimensionLineProps = { ...props };

  function applyGeometry(p: DimensionLineProps): void {
    const { from, to } = offsetEndpoints(p, upAxis);
    positions[0] = from[0];
    positions[1] = from[1];
    positions[2] = from[2];
    positions[3] = to[0];
    positions[4] = to[1];
    positions[5] = to[2];
    geometry.attributes.position.needsUpdate = true;
    geometry.computeBoundingSphere();
    line.computeLineDistances();
    material.visible = true;
    line.visible = true;
    material.dashSize = p.dashed ? 0.1 : 1e6; // effectively solid when not dashed
    material.gapSize = p.dashed ? 0.06 : 0;

    const midpoint: Vec3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
    if (p.label) {
      if (!label) label = createLabel({ latex: p.label, anchor: midpoint }, host);
      else label.set({ latex: p.label, anchor: midpoint });
    } else if (label) {
      label.dispose();
      label = null;
    }
  }
  applyGeometry(current);

  return {
    set(next) {
      current = { ...current, ...next };
      applyGeometry(current);
    },
    visible(show) {
      line.visible = show;
      label?.visible(show);
    },
    dispose() {
      unMaterial();
      parent.remove(line);
      geometry.dispose();
      material.dispose();
      label?.dispose();
    },
  };
}
