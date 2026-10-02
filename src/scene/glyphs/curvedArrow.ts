/**
 * curvedArrow — rotation sense, torque. Arc with a tangential head.
 * See ARCHITECTURE.md §8.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { rawPositionBuffer, markPositionBufferDirty, setPolylineVertex } from '../internal/line2';
import { worldUnitsPerPixel } from '../internal/screenSpace';
import { createLabel } from '../annotate/label';
import type { LabelHandle } from '../annotate/label';

export interface CurvedArrowProps {
  group?: GroupHandle;
  center: [number, number, number];
  axis: [number, number, number];
  radius: number;
  startAngle: number;
  endAngle: number;
  color?: string;
  label?: string;
}

export type CurvedArrowHandle = Handle<CurvedArrowProps>;

const SEGMENTS = 48;
const HEAD_LENGTH_PX = 14;
const HEAD_RADIUS_RATIO = 0.4;
const DEFAULT_COLOR = 0x12161d;
// X-49: pixel screen-space width (see arrow.ts) — a real number projector
// mode's multiplier can act on, unlike a ANGLE-clamped `THREE.Line`.
const ARC_LINE_WIDTH_PX = 3;

const scratchAxis = new THREE.Vector3();
const scratchHelper = new THREE.Vector3();
const scratchU = new THREE.Vector3();
const scratchV = new THREE.Vector3();
const scratchPoint = new THREE.Vector3();
const scratchTangent = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const upHint = new THREE.Vector3(0, 1, 0);

/**
 * Unit-height cone with its BASE at the local origin and its APEX at +y.
 * `ConeGeometry` is centred on its origin, so a head positioned at the arc
 * end overshot it by half a head length; the head is now placed one head
 * length back along the tangent and the apex lands on the arc end (X-62,
 * same fix as `arrow`'s X-48).
 */
function headGeometry(): THREE.ConeGeometry {
  return new THREE.ConeGeometry(HEAD_RADIUS_RATIO, 1, 10).translate(0, 0.5, 0);
}

/** A right-handed (u, v, axis) basis so +angle runs counter-clockwise viewed from +axis (ADR 0008). */
function computeBasis(axis: readonly [number, number, number]): void {
  scratchAxis.set(axis[0], axis[1], axis[2]).normalize();
  scratchHelper.set(1, 0, 0);
  if (Math.abs(scratchAxis.dot(scratchHelper)) > 0.9) scratchHelper.set(0, 1, 0);
  scratchU.crossVectors(scratchHelper, scratchAxis).normalize();
  scratchV.crossVectors(scratchAxis, scratchU);
}

function pointAt(
  center: readonly [number, number, number],
  radius: number,
  angle: number,
  out: THREE.Vector3,
): void {
  out.set(
    center[0] + radius * (Math.cos(angle) * scratchU.x + Math.sin(angle) * scratchV.x),
    center[1] + radius * (Math.cos(angle) * scratchU.y + Math.sin(angle) * scratchV.y),
    center[2] + radius * (Math.cos(angle) * scratchU.z + Math.sin(angle) * scratchV.z),
  );
}

function tangentAt(angle: number, out: THREE.Vector3): void {
  out.set(
    -Math.sin(angle) * scratchU.x + Math.cos(angle) * scratchV.x,
    -Math.sin(angle) * scratchU.y + Math.cos(angle) * scratchV.y,
    -Math.sin(angle) * scratchU.z + Math.cos(angle) * scratchV.z,
  );
}

export function createCurvedArrow(props: CurvedArrowProps, host: SubstrateHost): CurvedArrowHandle {
  const parent = host.resolveGroup(props.group);
  const root = new THREE.Group();
  parent.add(root);

  const arcGeometry = new LineGeometry();
  arcGeometry.setPositions(new Float32Array((SEGMENTS + 1) * 3));
  const arcPositions = rawPositionBuffer(arcGeometry);
  const arcMaterial = new LineMaterial({
    color: DEFAULT_COLOR,
    linewidth: ARC_LINE_WIDTH_PX,
    worldUnits: false,
  });
  const arcLine = new Line2(arcGeometry, arcMaterial);
  root.add(arcLine);
  const unTheme = host.registerThemedMaterial(arcMaterial, 'line');

  const headMaterial = new THREE.MeshBasicMaterial({ color: DEFAULT_COLOR });
  const head = new THREE.Mesh(headGeometry(), headMaterial);
  root.add(head);
  const unHeadTheme = host.registerThemedMaterial(headMaterial, 'fill');

  let current: CurvedArrowProps = { ...props };
  let label: LabelHandle | null = null;

  function rebuildArc(p: CurvedArrowProps): void {
    computeBasis(p.axis);
    for (let i = 0; i <= SEGMENTS; i++) {
      const angle = p.startAngle + ((p.endAngle - p.startAngle) * i) / SEGMENTS;
      pointAt(p.center, p.radius, angle, scratchPoint);
      setPolylineVertex(
        arcPositions,
        i,
        SEGMENTS + 1,
        scratchPoint.x,
        scratchPoint.y,
        scratchPoint.z,
      );
    }
    markPositionBufferDirty(arcGeometry);
    arcGeometry.computeBoundingSphere();
  }

  function applyStaticProps(p: CurvedArrowProps): void {
    const color = new THREE.Color(p.color ?? DEFAULT_COLOR);
    arcMaterial.color.copy(color);
    headMaterial.color.copy(color);
    rebuildArc(p);

    if (p.label) {
      const midAngle = (p.startAngle + p.endAngle) / 2;
      pointAt(p.center, p.radius, midAngle, scratchPoint);
      const anchor: [number, number, number] = [scratchPoint.x, scratchPoint.y, scratchPoint.z];
      if (!label) label = createLabel({ latex: p.label, anchor }, host, root);
      else label.set({ latex: p.label, anchor });
    } else if (label) {
      label.dispose();
      label = null;
    }
  }
  applyStaticProps(current);

  const unFrame = host.onFrame((info) => {
    arcMaterial.resolution.set(info.rendererWidth, info.rendererHeight);
    computeBasis(current.axis);
    pointAt(current.center, current.radius, current.endAngle, scratchPoint);
    tangentAt(current.endAngle, scratchTangent);
    if (current.endAngle < current.startAngle) scratchTangent.negate();

    const distance = info.camera.position.distanceTo(scratchPoint);
    const headLength =
      HEAD_LENGTH_PX * worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    head.scale.set(headLength, headLength, headLength);
    head.position.copy(scratchPoint).addScaledVector(scratchTangent, -headLength);
    scratchQuat.setFromUnitVectors(upHint, scratchTangent);
    head.quaternion.copy(scratchQuat);
  });

  return {
    set(next) {
      current = { ...current, ...next };
      applyStaticProps(current);
    },
    visible(show) {
      root.visible = show;
      label?.visible(show);
    },
    dispose() {
      unFrame();
      unTheme();
      unHeadTheme();
      parent.remove(root);
      arcGeometry.dispose();
      arcMaterial.dispose();
      head.geometry.dispose();
      headMaterial.dispose();
      label?.dispose();
    },
  };
}
