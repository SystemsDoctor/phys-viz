/**
 * arrow — vectors. Cone head sized in SCREEN space, not world space, so
 * short vectors still read as arrows. Optional double head for
 * pseudovectors (omega, tau, L) — a convention taught explicitly.
 * See ARCHITECTURE.md §8.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { worldUnitsPerPixel } from '../internal/screenSpace';
import { createLabel } from '../annotate/label';
import type { LabelHandle } from '../annotate/label';

export interface ArrowProps {
  group?: GroupHandle;
  from: readonly [number, number, number];
  to: readonly [number, number, number];
  color?: string;
  label?: string;
  dashed?: boolean;
  doubleHead?: boolean;
}

export type ArrowHandle = Handle<ArrowProps>;

const HEAD_LENGTH_PX = 16;
const HEAD_RADIUS_RATIO = 0.4;
const DEFAULT_COLOR = 0x12161d;

// Shared, file-scope scratch — every onFrame callback across every arrow
// instance runs synchronously in the same tick, one at a time, so reuse
// is safe: nothing else reads these between one arrow's write and its
// own read.
const scratchDir = new THREE.Vector3();
const scratchNegDir = new THREE.Vector3();
const scratchPoint = new THREE.Vector3();
const scratchQuat = new THREE.Quaternion();
const upHint = new THREE.Vector3(0, 1, 0);

function coneGeometry(): THREE.ConeGeometry {
  return new THREE.ConeGeometry(HEAD_RADIUS_RATIO, 1, 10);
}

export function createArrow(props: ArrowProps, host: SubstrateHost): ArrowHandle {
  const parent = host.resolveGroup(props.group);
  const root = new THREE.Group();
  parent.add(root);

  const shaftGeometry = new THREE.BufferGeometry();
  const shaftPositions = new Float32Array(6);
  shaftGeometry.setAttribute('position', new THREE.BufferAttribute(shaftPositions, 3));
  const shaftMaterial = new THREE.LineDashedMaterial({
    color: DEFAULT_COLOR,
    dashSize: 0.08,
    gapSize: 0.05,
  });
  const shaft = new THREE.Line(shaftGeometry, shaftMaterial);
  root.add(shaft);
  const unShaftTheme = host.registerThemedMaterial(shaftMaterial, 'line');

  const headMaterial = new THREE.MeshBasicMaterial({ color: DEFAULT_COLOR });
  const head = new THREE.Mesh(coneGeometry(), headMaterial);
  root.add(head);
  const unHeadTheme = host.registerThemedMaterial(headMaterial, 'fill');

  const tailHead = new THREE.Mesh(coneGeometry(), headMaterial);
  tailHead.visible = false;
  root.add(tailHead);

  let label: LabelHandle | null = null;
  let current: ArrowProps = { ...props };

  function applyStaticProps(p: ArrowProps): void {
    const color = new THREE.Color(p.color ?? DEFAULT_COLOR);
    shaftMaterial.color.copy(color);
    headMaterial.color.copy(color);
    shaftMaterial.dashSize = p.dashed ? 0.08 : 1e6;
    shaftMaterial.gapSize = p.dashed ? 0.05 : 0;
    tailHead.visible = !!p.doubleHead;

    if (p.label) {
      if (!label) label = createLabel({ latex: p.label, anchor: p.to }, host);
      else label.set({ latex: p.label, anchor: p.to });
    } else if (label) {
      label.dispose();
      label = null;
    }
  }
  applyStaticProps(current);

  const unFrame = host.onFrame((info) => {
    const [fx, fy, fz] = current.from;
    const [tx, ty, tz] = current.to;
    scratchDir.set(tx - fx, ty - fy, tz - fz);
    const length = scratchDir.length();
    if (length < 1e-9) {
      head.visible = false;
      shaft.visible = false;
      tailHead.visible = false;
      return;
    }
    shaft.visible = true;
    scratchDir.multiplyScalar(1 / length);

    scratchPoint.set(tx, ty, tz);
    const distance = info.camera.position.distanceTo(scratchPoint);
    const headLength =
      HEAD_LENGTH_PX * worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    const clampedHeadLength = Math.min(headLength, length * 0.8);

    const shaftEndX = tx - scratchDir.x * clampedHeadLength;
    const shaftEndY = ty - scratchDir.y * clampedHeadLength;
    const shaftEndZ = tz - scratchDir.z * clampedHeadLength;
    shaftPositions[0] = fx;
    shaftPositions[1] = fy;
    shaftPositions[2] = fz;
    shaftPositions[3] = shaftEndX;
    shaftPositions[4] = shaftEndY;
    shaftPositions[5] = shaftEndZ;
    shaftGeometry.attributes.position.needsUpdate = true;
    shaftGeometry.computeBoundingSphere();
    shaft.computeLineDistances();

    scratchQuat.setFromUnitVectors(upHint, scratchDir);
    head.visible = true;
    head.scale.set(clampedHeadLength, clampedHeadLength, clampedHeadLength);
    head.position.set(shaftEndX, shaftEndY, shaftEndZ);
    head.quaternion.copy(scratchQuat);

    if (current.doubleHead) {
      tailHead.visible = true;
      const tailEndX = fx + scratchDir.x * clampedHeadLength;
      const tailEndY = fy + scratchDir.y * clampedHeadLength;
      const tailEndZ = fz + scratchDir.z * clampedHeadLength;
      tailHead.scale.copy(head.scale);
      tailHead.position.set(tailEndX, tailEndY, tailEndZ);
      scratchNegDir.copy(scratchDir).negate();
      scratchQuat.setFromUnitVectors(upHint, scratchNegDir);
      tailHead.quaternion.copy(scratchQuat);
    } else {
      tailHead.visible = false;
    }
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
      unShaftTheme();
      unHeadTheme();
      parent.remove(root);
      shaftGeometry.dispose();
      shaftMaterial.dispose();
      head.geometry.dispose();
      tailHead.geometry.dispose();
      headMaterial.dispose();
      label?.dispose();
    },
  };
}
