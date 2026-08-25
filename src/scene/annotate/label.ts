/**
 * label — `label({ latex, anchor, offset })`, KaTeX rendered once to an
 * HTML element, positioned by projecting the anchor each frame.
 * See ARCHITECTURE.md §8.
 */
import type { Handle } from '../glyphs/Handle';
import type { SubstrateHost } from '../internal/SubstrateHost';
import { createKatexElement, setKatexContent, projectToOverlayPixels } from './htmlOverlay';

export interface LabelProps {
  latex: string;
  anchor: readonly [number, number, number];
  offset?: readonly [number, number];
}

export type LabelHandle = Handle<LabelProps>;

export function createLabel(props: LabelProps, host: SubstrateHost): LabelHandle {
  let current: LabelProps = { ...props };
  let shown = true;
  const el = createKatexElement(current.latex, host.overlayEl);

  const unFrame = host.onFrame((info) => {
    if (!shown) return;
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
