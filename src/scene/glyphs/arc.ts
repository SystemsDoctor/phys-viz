/**
 * arc — angle annotations between two vectors from the origin, with an
 * optional label at the midpoint angle. See ARCHITECTURE.md §8.
 *
 * `from`/`to` are directions from the origin (matching the §21 cookbook
 * usage: `ctx.arc({ from: a, to: b, radius, label: '\\theta' })` drawing
 * the angle between vectors `a` and `b`) — unlike `curvedArrow`, there's
 * no explicit `center`; it's always the origin.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { rawPositionBuffer, markPositionBufferDirty, setPolylineVertex } from '../internal/line2';
import { createLabel } from '../annotate/label';
import type { LabelHandle } from '../annotate/label';

export interface ArcProps {
  group?: GroupHandle;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  radius: number;
  color?: string;
  label?: string;
}

export type ArcHandle = Handle<ArcProps>;

const SEGMENTS = 32;
const DEFAULT_COLOR = 0x7b8494;
// X-49: pixel screen-space width (see arrow.ts) — a real number the
// projector multiplier can act on, unlike an ANGLE-clamped `THREE.Line`.
const ARC_LINE_WIDTH_PX = 2;

const scratchFrom = new THREE.Vector3();
const scratchTo = new THREE.Vector3();
const scratchAxis = new THREE.Vector3();
const scratchU = new THREE.Vector3();
const scratchV = new THREE.Vector3();
const scratchPoint = new THREE.Vector3();

/** Right-handed (u, v, axis) basis with u along `from` and axis = from x to, so angle runs from `from` toward `to`. */
function computeBasis(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
): number {
  scratchFrom.set(from[0], from[1], from[2]).normalize();
  scratchTo.set(to[0], to[1], to[2]).normalize();
  scratchAxis.crossVectors(scratchFrom, scratchTo);
  const axisLength = scratchAxis.length();
  scratchU.copy(scratchFrom);
  if (axisLength < 1e-9) {
    // from/to are parallel or anti-parallel — angle is 0 or pi; pick an
    // arbitrary perpendicular so the arc degenerates gracefully instead of NaN.
    scratchAxis.set(1, 0, 0);
    if (Math.abs(scratchU.dot(scratchAxis)) > 0.9) scratchAxis.set(0, 1, 0);
    scratchAxis.crossVectors(scratchU, scratchAxis).normalize();
  } else {
    scratchAxis.multiplyScalar(1 / axisLength);
  }
  scratchV.crossVectors(scratchAxis, scratchU);
  return Math.acos(THREE.MathUtils.clamp(scratchFrom.dot(scratchTo), -1, 1));
}

export function createArc(props: ArcProps, host: SubstrateHost): ArcHandle {
  const parent = host.resolveGroup(props.group);
  const root = new THREE.Group();
  parent.add(root);

  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array((SEGMENTS + 1) * 3));
  const positions = rawPositionBuffer(geometry);
  const material = new LineMaterial({
    color: DEFAULT_COLOR,
    linewidth: ARC_LINE_WIDTH_PX,
    worldUnits: false,
  });
  const line = new Line2(geometry, material);
  root.add(line);
  const unTheme = host.registerThemedMaterial(material, 'line');
  const unFrame = host.onFrame((info) => {
    material.resolution.set(info.rendererWidth, info.rendererHeight);
  });

  let label: LabelHandle | null = null;

  function applyProps(p: ArcProps): void {
    material.color.set(p.color ?? DEFAULT_COLOR);
    const angle = computeBasis(p.from, p.to);
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = (angle * i) / SEGMENTS;
      scratchPoint
        .copy(scratchU)
        .multiplyScalar(Math.cos(t) * p.radius)
        .addScaledVector(scratchV, Math.sin(t) * p.radius);
      setPolylineVertex(positions, i, SEGMENTS + 1, scratchPoint.x, scratchPoint.y, scratchPoint.z);
    }
    markPositionBufferDirty(geometry);
    geometry.computeBoundingSphere();

    if (p.label) {
      const midT = angle / 2;
      scratchPoint
        .copy(scratchU)
        .multiplyScalar(Math.cos(midT) * p.radius * 1.15)
        .addScaledVector(scratchV, Math.sin(midT) * p.radius * 1.15);
      const anchor: [number, number, number] = [scratchPoint.x, scratchPoint.y, scratchPoint.z];
      if (!label) label = createLabel({ latex: p.label, anchor }, host, root);
      else label.set({ latex: p.label, anchor });
    } else if (label) {
      label.dispose();
      label = null;
    }
  }

  let current: ArcProps = { ...props };
  applyProps(current);

  return {
    set(next) {
      current = { ...current, ...next };
      applyProps(current);
    },
    visible(show) {
      root.visible = show;
      label?.visible(show);
    },
    dispose() {
      unFrame();
      unTheme();
      parent.remove(root);
      geometry.dispose();
      material.dispose();
      label?.dispose();
    },
  };
}
