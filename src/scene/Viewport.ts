/**
 * Viewport — owns the canvas, WebGLRenderer, resize observer, and the
 * SINGLE requestAnimationFrame loop for the whole app (ARCHITECTURE.md §8).
 *
 * Supports `renderOnDemand`: when time is paused and no parameter is
 * changing, stop rendering entirely (battery; keeps fans quiet in a
 * lecture hall).
 *
 * This is the only file (besides glyphs/, camera/, annotate/, theme/)
 * that may import `three`.
 *
 * TODO(M2): implement per ARCHITECTURE.md §8 and the M2 acceptance
 * criterion in §20 (every glyph exercised at 60 fps, zero per-frame
 * allocation).
 */

export interface ViewportOptions {
  canvas: HTMLCanvasElement;
  renderOnDemand?: boolean;
}

export class Viewport {
  constructor(_options: ViewportOptions) {
    throw new Error('scene/Viewport: not implemented (see M2 in ARCHITECTURE.md §20)');
  }

  requestRender(): void {
    throw new Error('scene/Viewport: not implemented (see M2 in ARCHITECTURE.md §20)');
  }

  dispose(): void {
    throw new Error('scene/Viewport: not implemented (see M2 in ARCHITECTURE.md §20)');
  }
}
