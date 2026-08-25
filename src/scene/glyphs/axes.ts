/**
 * axes — world axes with ticks. Ticks are live: labels reflect current
 * world-unit spacing as you zoom. See ARCHITECTURE.md §8.
 *
 * Tick spacing is recomputed every rendered frame from the camera
 * distance (a "nice" 1/2/5 x 10^n value targeting ~60px between ticks —
 * the standard axis-labelling heuristic), but the tick geometry itself
 * is only rebuilt when that spacing actually changes, not every frame.
 */
import * as THREE from 'three';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { worldUnitsPerPixel } from '../internal/screenSpace';

export interface AxesProps {
  group?: GroupHandle;
  extent?: number;
  showTicks?: boolean;
}

export type AxesHandle = Handle<AxesProps>;

const DEFAULT_EXTENT = 5;
const TARGET_TICK_PX = 60;
const TICK_MARK_HALF_LENGTH = 0.06;
const MAX_TICKS_PER_AXIS = 64;
const AXIS_COLOR = 0x7b8494;

const AXES: readonly [number, number, number][] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
const PERPENDICULARS: readonly [number, number, number][] = [
  [0, 1, 0],
  [1, 0, 0],
  [1, 0, 0],
];

const scratchOrigin = new THREE.Vector3(0, 0, 0);

/** Nearest "nice" value (1, 2, or 5 x 10^n) to `rough`, the standard axis-tick heuristic. */
export function niceSpacing(rough: number): number {
  if (rough <= 0) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exponent);
  const fraction = rough / base;
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return niceFraction * base;
}

export function createAxes(props: AxesProps, host: SubstrateHost): AxesHandle {
  const parent = host.resolveGroup(props.group);
  const root = new THREE.Group();
  parent.add(root);

  const axisGeometry = new THREE.BufferGeometry();
  const axisPositions = new Float32Array(3 * 2 * 3); // 3 axes, 2 points each
  axisGeometry.setAttribute('position', new THREE.BufferAttribute(axisPositions, 3));
  const axisMaterial = new THREE.LineBasicMaterial({ color: AXIS_COLOR });
  const axisLines = new THREE.LineSegments(axisGeometry, axisMaterial);
  root.add(axisLines);
  const unAxisTheme = host.registerThemedMaterial(axisMaterial, 'line');

  const tickGeometry = new THREE.BufferGeometry();
  const tickPositions = new Float32Array(3 * MAX_TICKS_PER_AXIS * 2 * 3);
  tickGeometry.setAttribute('position', new THREE.BufferAttribute(tickPositions, 3));
  tickGeometry.setDrawRange(0, 0);
  const tickMaterial = new THREE.LineBasicMaterial({ color: AXIS_COLOR });
  const tickLines = new THREE.LineSegments(tickGeometry, tickMaterial);
  root.add(tickLines);
  const unTickTheme = host.registerThemedMaterial(tickMaterial, 'line');

  let current: AxesProps = { ...props };
  let lastSpacing = -1;

  function rebuildAxisLines(): void {
    const extent = current.extent ?? DEFAULT_EXTENT;
    for (let a = 0; a < 3; a++) {
      const [dx, dy, dz] = AXES[a];
      axisPositions[a * 6] = -dx * extent;
      axisPositions[a * 6 + 1] = -dy * extent;
      axisPositions[a * 6 + 2] = -dz * extent;
      axisPositions[a * 6 + 3] = dx * extent;
      axisPositions[a * 6 + 4] = dy * extent;
      axisPositions[a * 6 + 5] = dz * extent;
    }
    axisGeometry.attributes.position.needsUpdate = true;
    axisGeometry.computeBoundingSphere();
  }

  function rebuildTicks(spacing: number): void {
    const extent = current.extent ?? DEFAULT_EXTENT;
    let cursor = 0;
    const maxCursor = tickPositions.length;
    for (let a = 0; a < 3 && current.showTicks !== false; a++) {
      const [dx, dy, dz] = AXES[a];
      const [px, py, pz] = PERPENDICULARS[a];
      const steps = Math.floor(extent / spacing);
      for (let s = -steps; s <= steps; s++) {
        if (s === 0) continue;
        if (cursor + 6 > maxCursor) break;
        const cx = dx * spacing * s;
        const cy = dy * spacing * s;
        const cz = dz * spacing * s;
        tickPositions[cursor++] = cx - px * TICK_MARK_HALF_LENGTH;
        tickPositions[cursor++] = cy - py * TICK_MARK_HALF_LENGTH;
        tickPositions[cursor++] = cz - pz * TICK_MARK_HALF_LENGTH;
        tickPositions[cursor++] = cx + px * TICK_MARK_HALF_LENGTH;
        tickPositions[cursor++] = cy + py * TICK_MARK_HALF_LENGTH;
        tickPositions[cursor++] = cz + pz * TICK_MARK_HALF_LENGTH;
      }
    }
    tickGeometry.setDrawRange(0, cursor / 3);
    tickGeometry.attributes.position.needsUpdate = true;
    if (cursor > 0) tickGeometry.computeBoundingSphere();
  }

  rebuildAxisLines();
  rebuildTicks(niceSpacing(DEFAULT_EXTENT / 10));

  const unFrame = host.onFrame((info) => {
    const distance = info.camera.position.distanceTo(scratchOrigin);
    const roughSpacing =
      TARGET_TICK_PX * worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    const spacing = niceSpacing(roughSpacing);
    if (spacing !== lastSpacing) {
      lastSpacing = spacing;
      rebuildTicks(spacing);
    }
  });

  return {
    set(next) {
      current = { ...current, ...next };
      rebuildAxisLines();
      lastSpacing = -1; // force a tick rebuild on the next frame
    },
    visible(show) {
      root.visible = show;
    },
    dispose() {
      unFrame();
      unAxisTheme();
      unTickTheme();
      parent.remove(root);
      axisGeometry.dispose();
      axisMaterial.dispose();
      tickGeometry.dispose();
      tickMaterial.dispose();
    },
  };
}
