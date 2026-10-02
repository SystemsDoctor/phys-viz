/**
 * frame — nestable coordinate triads. Modules compose these rather than
 * doing their own matrix bookkeeping. See ARCHITECTURE.md §8.
 *
 * Nesting (`parent`) is a real scene-graph parent/child relationship:
 * a nested frame's Group is attached as a child of its parent frame's
 * own Group, so three.js's own transform composition does the "combined
 * transform" work, and the nested frame inherits the parent's visibility
 * for free. A `WeakMap` from handle -> Group is how a `parent` prop
 * (just a `FrameGlyphHandle`, with no exposed internals) resolves to
 * the actual Object3D to attach under.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface FrameGlyphProps {
  group?: GroupHandle;
  origin: [number, number, number];
  orientation: [number, number, number, number]; // quaternion
  scale?: number;
  parent?: FrameGlyphHandle;
}

export type FrameGlyphHandle = Handle<FrameGlyphProps>;

const AXIS_COLORS = [0xd55e00, 0x009e73, 0x0072b2]; // x, y, z — conventional RGB-ish, orthogonal to the physics semantic palette
// X-49: pixel screen-space width (see arrow.ts) — a real number the
// projector multiplier can act on, unlike an ANGLE-clamped `THREE.Line`.
// `worldUnits: false` keeps it constant under the frame's own `scale`.
const AXIS_LINE_WIDTH_PX = 3;
const AXES: readonly [number, number, number][] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const frameGroups = new WeakMap<FrameGlyphHandle, THREE.Group>();

export function createFrame(props: FrameGlyphProps, host: SubstrateHost): FrameGlyphHandle {
  const root = new THREE.Group();

  const lineGeometries: LineGeometry[] = [];
  const lineMaterials: LineMaterial[] = [];
  const unThemes: Array<() => void> = [];
  for (let i = 0; i < 3; i++) {
    // Fixed 2-point axis, never moved (the frame's transform does that),
    // so one `setPositions()` at construction is all it ever needs.
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, AXES[i][0], AXES[i][1], AXES[i][2]]);
    const material = new LineMaterial({
      color: AXIS_COLORS[i],
      linewidth: AXIS_LINE_WIDTH_PX,
      worldUnits: false,
    });
    const line = new Line2(geometry, material);
    root.add(line);
    lineGeometries.push(geometry);
    lineMaterials.push(material);
    unThemes.push(host.registerThemedMaterial(material, 'line'));
  }

  const unFrame = host.onFrame((info) => {
    for (const material of lineMaterials)
      material.resolution.set(info.rendererWidth, info.rendererHeight);
  });

  let attachedParent: THREE.Object3D | null = null;

  function attach(p: FrameGlyphProps): void {
    const desiredParent = p.parent
      ? (frameGroups.get(p.parent) ?? host.resolveGroup(p.group))
      : host.resolveGroup(p.group);
    if (desiredParent !== attachedParent) {
      attachedParent?.remove(root);
      desiredParent.add(root);
      attachedParent = desiredParent;
    }
  }

  function applyProps(p: FrameGlyphProps): void {
    attach(p);
    root.position.set(p.origin[0], p.origin[1], p.origin[2]);
    root.quaternion.set(p.orientation[0], p.orientation[1], p.orientation[2], p.orientation[3]);
    const scale = p.scale ?? 1;
    root.scale.set(scale, scale, scale);
  }

  let current: FrameGlyphProps = { ...props };
  applyProps(current);

  const handle: FrameGlyphHandle = {
    set(next) {
      current = { ...current, ...next };
      applyProps(current);
    },
    visible(show) {
      root.visible = show;
    },
    dispose() {
      unFrame();
      for (const unTheme of unThemes) unTheme();
      attachedParent?.remove(root);
      for (const geometry of lineGeometries) geometry.dispose();
      for (const material of lineMaterials) material.dispose();
      frameGroups.delete(handle);
    },
  };
  frameGroups.set(handle, root);
  return handle;
}
