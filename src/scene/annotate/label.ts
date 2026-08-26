/**
 * label — `label({ latex, anchor, offset })`, KaTeX rendered once to an
 * HTML element, positioned by projecting the anchor each frame.
 * See ARCHITECTURE.md §8.
 */
import type * as THREE from 'three';
import type { Handle } from '../glyphs/Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { isVisibleInHierarchy } from '../internal/visibility';
import { createKatexElement, setKatexContent, projectToOverlayPixels } from './htmlOverlay';

export interface LabelProps {
  latex: string;
  anchor: readonly [number, number, number];
  offset?: readonly [number, number];
}

export type LabelHandle = Handle<LabelProps>;

/**
 * `attachTo`, when given, is the glyph's own root Object3D — a label
 * embedded in another glyph (arrow/arc/curvedArrow/dimensionLine) must
 * hide itself whenever that root (or any ancestor, e.g. a layer group
 * toggled off via `Viewport.setGroupVisible`) goes invisible, since the
 * DOM overlay this label renders into sits outside the three.js scene
 * graph and never gets skipped by that render-time visibility check on
 * its own. See docs/adr/0011 for the bug this closes.
 */
export function createLabel(
  props: LabelProps,
  host: SubstrateHost,
  attachTo?: THREE.Object3D,
): LabelHandle {
  let current: LabelProps = { ...props };
  let shown = true;
  const el = createKatexElement(current.latex, host.overlayEl);

  const unFrame = host.onFrame((info) => {
    if (!shown || (attachTo && !isVisibleInHierarchy(attachTo))) {
      el.style.display = 'none';
      return;
    }
    const pos = projectToOverlayPixels(current.anchor, info, current.offset);
    if (!pos) {
      el.style.display = 'none';
      return;
    }
    el.style.display = '';
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
  });

  return {
    set(next) {
      const latexChanged = next.latex !== undefined && next.latex !== current.latex;
      current = { ...current, ...next };
      if (latexChanged) setKatexContent(el, current.latex);
    },
    visible(show) {
      shown = show;
      el.style.visibility = show ? 'visible' : 'hidden';
    },
    dispose() {
      unFrame();
      el.remove();
    },
  };
}
