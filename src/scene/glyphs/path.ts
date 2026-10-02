/**
 * path — trajectories, field lines. Supports a fading tail with
 * configurable persistence. See ARCHITECTURE.md §8.
 *
 * "Fading" is approximated by blending each trailing vertex's colour
 * toward the viewport's fixed background colour, via vertex colours —
 * stock `LineBasicMaterial` has no per-vertex alpha channel to fade
 * against an arbitrary background, and the viewport's background is a
 * fixed, known colour, so this reads correctly without needing a custom
 * shader.
 *
 * The underlying buffer is allocated ONCE at a fixed capacity
 * (`MAX_POINTS`); `set()` only ever writes into it and adjusts the draw
 * range, so a `stepped`/`parametric` module calling `set()` every
 * rendered frame allocates nothing here.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import {
  rawPositionBuffer,
  markPositionBufferDirty,
  rawColorBuffer,
  markColorBufferDirty,
} from '../internal/line2';

export interface PathProps {
  group?: GroupHandle;
  points: [number, number, number][];
  color?: string;
  /**
   * Max trailing points to render (oldest are dropped first). Default: no limit
   * up to MAX_POINTS — and NO fade: only a path with `persistence` set is a
   * fading tail; without it every vertex is drawn at full colour (X-54).
   */
  persistence?: number;
}

export type PathHandle = Handle<PathProps>;

const MAX_POINTS = 2000;
const DEFAULT_COLOR = 0x12161d;
const BACKGROUND_COLOR = 0xeceef2;
// `LineMaterial`'s fragment shader multiplies `vColor` by this base
// colour when `vertexColors` is on — stays white so the per-vertex fade
// computed in `applyProps` (already blended toward `p.color`) is what
// actually reaches the screen, instead of being tinted toward whatever
// this material's own `.color` happens to be.
const MATERIAL_BASE_COLOR = 0xffffff;
// X-49: pixel screen-space width; see arrow.ts for why this is a real
// number that projector mode's multiplier can act on.
const LINE_WIDTH_PX = 2.5;

const scratchColor = new THREE.Color();
const scratchBg = new THREE.Color(BACKGROUND_COLOR);

export function createPath(props: PathProps, host: SubstrateHost): PathHandle {
  const parent = host.resolveGroup(props.group);

  // One-time fixed-capacity allocation (MAX_POINTS points -> MAX_POINTS-1
  // segment records); every later `set()` writes into these arrays.
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(MAX_POINTS * 3));
  geometry.setColors(new Float32Array(MAX_POINTS * 3));
  const positions = rawPositionBuffer(geometry);
  const colors = rawColorBuffer(geometry);
  geometry.instanceCount = 0;
  const material = new LineMaterial({
    color: MATERIAL_BASE_COLOR,
    vertexColors: true,
    linewidth: LINE_WIDTH_PX,
    worldUnits: false,
  });
  const line = new Line2(geometry, material);
  // The bounding sphere is computed once over the full (zero-padded)
  // capacity buffer, so it would be wrong for the live points — skip
  // frustum culling rather than recompute O(MAX_POINTS) every frame.
  line.frustumCulled = false;
  parent.add(line);
  const unTheme = host.registerThemedMaterial(material, 'line');
  const unFrame = host.onFrame((info) => {
    material.resolution.set(info.rendererWidth, info.rendererHeight);
  });

  function applyProps(p: PathProps): void {
    scratchColor.set(p.color ?? DEFAULT_COLOR);
    const limit = Math.min(p.persistence ?? MAX_POINTS, MAX_POINTS);
    const start = Math.max(0, p.points.length - limit);
    const count = p.points.length - start;
    const fades = p.persistence !== undefined;

    // Segment record s joins point s to point s+1 (6 floats: start xyz,
    // end xyz), for both positions and colours.
    for (let i = 0; i < count; i++) {
      const [x, y, z] = p.points[start + i];
      // A path with `persistence` is a fading tail: the trailing (oldest,
      // index 0) end blends toward the background while the leading
      // (newest) end stays full colour. Without it (a fixed outline, an
      // axis line) every vertex stays full colour — fading the first
      // vertex of a two-point axis or a closed orbit left one end
      // invisible (X-54).
      const fadeT = fades && count > 1 ? i / (count - 1) : 1;
      const r = scratchBg.r + (scratchColor.r - scratchBg.r) * fadeT;
      const g = scratchBg.g + (scratchColor.g - scratchBg.g) * fadeT;
      const b = scratchBg.b + (scratchColor.b - scratchBg.b) * fadeT;
      if (i < count - 1) {
        const o = i * 6;
        positions[o] = x;
        positions[o + 1] = y;
        positions[o + 2] = z;
        colors[o] = r;
        colors[o + 1] = g;
        colors[o + 2] = b;
      }
      if (i > 0) {
        const o = (i - 1) * 6 + 3;
        positions[o] = x;
        positions[o + 1] = y;
        positions[o + 2] = z;
        colors[o] = r;
        colors[o + 1] = g;
        colors[o + 2] = b;
      }
    }
    geometry.instanceCount = Math.max(0, count - 1);
    markPositionBufferDirty(geometry);
    markColorBufferDirty(geometry);
  }

  let current: PathProps = { ...props };
  applyProps(current);

  return {
    set(next) {
      current = { ...current, ...next };
      applyProps(current);
    },
    visible(show) {
      line.visible = show;
    },
    dispose() {
      unFrame();
      unTheme();
      parent.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}
