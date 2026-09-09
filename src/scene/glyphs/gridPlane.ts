/**
 * gridPlane — a light reference grid of lines confined to one of the
 * three principal coordinate planes (xy / xz / yz). Independent of the
 * `axes` glyph's own world-axes-plus-ticks grid: this is a per-plane,
 * opt-in toggle (`prefs.gridPlaneXY`/`XZ`/`YZ`, §9 settings menu), built
 * and owned directly by Viewport, same treatment as `axes.ts`'s
 * shell-owned reference grid.
 *
 * Spacing tracks the same "nice" 1/2/5 x 10^n heuristic `axes.ts` uses
 * for its ticks, recomputed from camera distance every frame, so the
 * grid squares line up with the axis ticks at any zoom level.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { worldUnitsPerPixel } from '../internal/screenSpace';
import { niceSpacing } from './axes';

export type GridPlaneKind = 'xy' | 'xz' | 'yz';

export interface GridPlaneProps {
  group?: GroupHandle;
  extent?: number;
}

export type GridPlaneHandle = Handle<GridPlaneProps>;

const DEFAULT_EXTENT = 5;
const TARGET_TICK_PX = 60;
const MAX_LINES_PER_DIRECTION = 64;
// --rule from tokens.css: a light, structural hairline colour — this is
// UI furniture, not physics data, so (like axes.ts's AXIS_COLOR) it is
// deliberately not one of ctx.palette's semantic colours.
const GRID_COLOR = 0xc8ccd4;
const GRID_OPACITY = 0.5;

/** The two in-plane basis directions for each grid kind, e.g. 'xy' spans x and y at z=0. */
const PLANE_AXES: Record<
  GridPlaneKind,
  readonly [readonly [number, number, number], readonly [number, number, number]]
> = {
  xy: [
    [1, 0, 0],
    [0, 1, 0],
  ],
  xz: [
    [1, 0, 0],
    [0, 0, 1],
  ],
  yz: [
    [0, 1, 0],
    [0, 0, 1],
  ],
};

const scratchOrigin = new THREE.Vector3(0, 0, 0);

export function createGridPlane(
  kind: GridPlaneKind,
  props: GridPlaneProps,
  host: SubstrateHost,
): GridPlaneHandle {
  const parent = host.resolveGroup(props.group);
  const root = new THREE.Group();
  parent.add(root);

  const [axisA, axisB] = PLANE_AXES[kind];

  const geometry = new THREE.BufferGeometry();
  // Two line families (parallel to A, parallel to B), each up to
  // (2*MAX+1) lines, 2 points per line, 3 coords per point.
  const maxFloats = 2 * (2 * MAX_LINES_PER_DIRECTION + 1) * 2 * 3;
  const positions = new Float32Array(maxFloats);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color: GRID_COLOR,
    transparent: true,
    opacity: GRID_OPACITY,
  });
  const lines = new THREE.LineSegments(geometry, material);
  root.add(lines);
  const unTheme = host.registerThemedMaterial(material, 'line');

  let current: GridPlaneProps = { ...props };
  let lastSpacing = -1;

  function rebuild(spacing: number): void {
    const extent = current.extent ?? DEFAULT_EXTENT;
    const steps = Math.min(MAX_LINES_PER_DIRECTION, Math.floor(extent / spacing));
    let cursor = 0;
    // Lines parallel to axisA, evenly offset along axisB.
    for (let s = -steps; s <= steps; s++) {
      const offX = axisB[0] * spacing * s;
      const offY = axisB[1] * spacing * s;
      const offZ = axisB[2] * spacing * s;
      positions[cursor++] = offX - axisA[0] * extent;
      positions[cursor++] = offY - axisA[1] * extent;
      positions[cursor++] = offZ - axisA[2] * extent;
      positions[cursor++] = offX + axisA[0] * extent;
      positions[cursor++] = offY + axisA[1] * extent;
      positions[cursor++] = offZ + axisA[2] * extent;
    }
    // Lines parallel to axisB, evenly offset along axisA.
    for (let s = -steps; s <= steps; s++) {
      const offX = axisA[0] * spacing * s;
      const offY = axisA[1] * spacing * s;
      const offZ = axisA[2] * spacing * s;
      positions[cursor++] = offX - axisB[0] * extent;
      positions[cursor++] = offY - axisB[1] * extent;
      positions[cursor++] = offZ - axisB[2] * extent;
      positions[cursor++] = offX + axisB[0] * extent;
      positions[cursor++] = offY + axisB[1] * extent;
      positions[cursor++] = offZ + axisB[2] * extent;
    }
    geometry.setDrawRange(0, cursor / 3);
    geometry.attributes.position.needsUpdate = true;
    if (cursor > 0) geometry.computeBoundingSphere();
  }

  rebuild(niceSpacing(DEFAULT_EXTENT / 10));

  const unFrame = host.onFrame((info) => {
    const distance = info.camera.position.distanceTo(scratchOrigin);
    const roughSpacing =
      TARGET_TICK_PX * worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    const spacing = niceSpacing(roughSpacing);
    if (spacing !== lastSpacing) {
      lastSpacing = spacing;
      rebuild(spacing);
    }
  });

  return {
    set(next) {
      current = { ...current, ...next };
      lastSpacing = -1; // force a rebuild on the next frame
    },
    visible(show) {
      root.visible = show;
    },
    dispose() {
      unFrame();
      unTheme();
      parent.remove(root);
      geometry.dispose();
      material.dispose();
    },
  };
}
