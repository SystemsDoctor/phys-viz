/**
 * graticule — the instrument bezel (§15). Scale rules along viewport
 * edges. This is the project's signature visual element: it is what
 * makes the interface read as an instrument rather than a web app with a
 * 3D widget in it. Live labels reflect current world-unit spacing.
 * See ARCHITECTURE.md §8, §15.
 *
 * Unlike every other glyph, this is a pure DOM/2D overlay, not a 3D
 * scene object — there's no `group` in its props for exactly that
 * reason. Ticks run along the bottom and left edges (the two edges a
 * ruler/graph convention actually uses; all four would just be visual
 * noise). `viewportSize` is accepted for API shape but the live
 * renderer size from `onFrame`'s `FrameInfo` is authoritative.
 */
import * as THREE from 'three';
import type { Handle } from './Handle';
import type { SubstrateHost, FrameInfo } from '../internal/SubstrateHost';
import { worldUnitsPerPixel } from '../internal/screenSpace';
import { niceSpacing } from './axes';

export interface GraticuleProps {
  viewportSize: [number, number];
  worldUnitsPerTick?: number;
}

export type GraticuleHandle = Handle<GraticuleProps>;

const TARGET_TICK_PX = 80;
const MAX_TICKS = 40;

interface TickElements {
  bottom: HTMLDivElement[];
  left: HTMLDivElement[];
}

function makeTickEl(container: HTMLElement): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.font = '10px var(--font-mono, monospace)';
  el.style.color = '#7b8494';
  el.style.pointerEvents = 'none';
  el.style.display = 'none';
  container.appendChild(el);
  return el;
}

const scratchOrigin = new THREE.Vector3(0, 0, 0);

export function createGraticule(props: GraticuleProps, host: SubstrateHost): GraticuleHandle {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.inset = '0';
  host.overlayEl.appendChild(container);

  const ticks: TickElements = { bottom: [], left: [] };
  for (let i = 0; i < MAX_TICKS; i++) {
    ticks.bottom.push(makeTickEl(container));
    ticks.left.push(makeTickEl(container));
  }

  let current: GraticuleProps = { ...props };
  let shown = true;

  function layout(info: FrameInfo): void {
    for (const el of ticks.bottom) el.style.display = 'none';
    for (const el of ticks.left) el.style.display = 'none';
    if (!shown) return;

    const distance = info.camera.position.distanceTo(scratchOrigin);
    const unitsPerPixel = worldUnitsPerPixel(info.camera, distance, info.rendererHeight);
    const spacing = current.worldUnitsPerTick ?? niceSpacing(TARGET_TICK_PX * unitsPerPixel);
    const pxPerTick = spacing / unitsPerPixel;
    if (!Number.isFinite(pxPerTick) || pxPerTick < 4) return;

    const centerX = info.rendererWidth / 2;
    const centerY = info.rendererHeight / 2;

    let bi = 0;
    for (let x = centerX % pxPerTick; x < info.rendererWidth && bi < MAX_TICKS; x += pxPerTick) {
      const worldValue = Math.round((x - centerX) / pxPerTick) * spacing;
      const el = ticks.bottom[bi++];
      el.style.display = '';
      el.style.left = `${x}px`;
      el.style.bottom = '2px';
      el.textContent = worldValue.toFixed(spacing < 1 ? 2 : 0);
    }

    let li = 0;
    for (let y = centerY % pxPerTick; y < info.rendererHeight && li < MAX_TICKS; y += pxPerTick) {
      const worldValue = -Math.round((y - centerY) / pxPerTick) * spacing;
      const el = ticks.left[li++];
      el.style.display = '';
      el.style.left = '2px';
      el.style.top = `${y}px`;
      el.textContent = worldValue.toFixed(spacing < 1 ? 2 : 0);
    }
  }

  const unFrame = host.onFrame((info) => {
    layout(info);
  });

  return {
    set(next) {
      current = { ...current, ...next };
    },
    visible(show) {
      shown = show;
      container.style.display = show ? '' : 'none';
    },
    dispose() {
      unFrame();
      container.remove();
    },
  };
}
