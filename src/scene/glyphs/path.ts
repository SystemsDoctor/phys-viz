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
import type { GroupHandle } from '../SceneContext';
import type { Handle } from './Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';

export interface PathProps {
  group?: GroupHandle;
  points: [number, number, number][];
  color?: string;
  /** Max trailing points to render (oldest are dropped first). Default: no limit up to MAX_POINTS. */
  persistence?: number;
}

export type PathHandle = Handle<PathProps>;

const MAX_POINTS = 2000;
const DEFAULT_COLOR = 0x12161d;
const BACKGROUND_COLOR = 0xeceef2;

const scratchColor = new THREE.Color();
const scratchBg = new THREE.Color(BACKGROUND_COLOR);

export function createPath(props: PathProps, host: SubstrateHost): PathHandle {
  const parent = host.resolveGroup(props.group);

  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(MAX_POINTS * 3);
  const colors = new Float32Array(MAX_POINTS * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color: DEFAULT_COLOR, vertexColors: true });
  const line = new THREE.Line(geometry, material);
  parent.add(line);
  const unTheme = host.registerThemedMaterial(material, 'line');

  function applyProps(p: PathProps): void {
    scratchColor.set(p.color ?? DEFAULT_COLOR);
    const limit = Math.min(p.persistence ?? MAX_POINTS, MAX_POINTS);
    const start = Math.max(0, p.points.length - limit);
    const count = p.points.length - start;

    for (let i = 0; i < count; i++) {
      const [x, y, z] = p.points[start + i];
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      // Fade the trailing (oldest, index 0) end toward the background;
      // the leading (newest) end stays full colour.
      const fadeT = count > 1 ? i / (count - 1) : 1;
      colors[i * 3] = scratchBg.r + (scratchColor.r - scratchBg.r) * fadeT;
      colors[i * 3 + 1] = scratchBg.g + (scratchColor.g - scratchBg.g) * fadeT;
      colors[i * 3 + 2] = scratchBg.b + (scratchColor.b - scratchBg.b) * fadeT;
    }
    geometry.setDrawRange(0, count);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
    if (count > 0) geometry.computeBoundingSphere();
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
      unTheme();
      parent.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}
