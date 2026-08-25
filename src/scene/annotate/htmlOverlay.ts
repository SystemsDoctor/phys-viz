/**
 * Shared plumbing for annotate/* — KaTeX-rendered HTML overlay elements
 * positioned by projecting a 3D anchor to 2D screen space every frame.
 * HTML overlay rather than a texture: crisp at any zoom, selectable,
 * accessible to screen readers (§16).
 */
import * as THREE from 'three';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { FrameInfo } from '../internal/SubstrateHost';

/** Render LaTeX into an already-positioned HTML element. */
export function setKatexContent(el: HTMLElement, latex: string): void {
  try {
    el.innerHTML = katex.renderToString(latex, { throwOnError: false });
  } catch {
    el.textContent = latex;
  }
}

/** Create a positioned HTML element, rendered once, appended to `overlayEl`. */
export function createKatexElement(latex: string, overlayEl: HTMLElement): HTMLSpanElement {
  const el = document.createElement('span');
  el.style.position = 'absolute';
  el.style.transform = 'translate(-50%, -50%)';
  el.style.pointerEvents = 'auto';
  el.style.userSelect = 'text';
  setKatexContent(el, latex);
  overlayEl.appendChild(el);
  return el;
}

const projectionScratch = new THREE.Vector3();

/**
 * Project a world-space anchor to overlay-relative CSS pixels via the
 * current camera. Returns null when the point is behind the camera
 * (the label should be hidden that frame).
 */
export function projectToOverlayPixels(
  anchor: readonly [number, number, number],
  info: FrameInfo,
  offsetPx?: readonly [number, number],
): { left: number; top: number } | null {
  projectionScratch.set(anchor[0], anchor[1], anchor[2]);
  projectionScratch.project(info.camera);
  if (projectionScratch.z > 1) return null;
  const left = (projectionScratch.x * 0.5 + 0.5) * info.rendererWidth + (offsetPx?.[0] ?? 0);
  const top = (-projectionScratch.y * 0.5 + 0.5) * info.rendererHeight + (offsetPx?.[1] ?? 0);
  return { left, top };
}
