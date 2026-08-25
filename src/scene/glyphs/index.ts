/**
 * scene/glyphs — the retained-handle glyph set. This, the Sweep Plot
 * (shell/plots), and half-plane polygon clipping (kernel/geometry) are
 * the "three generic substrate features" that unlock most anticipated
 * extensions per ARCHITECTURE.md §22. Add a glyph here and every module,
 * present and future, gets it for free.
 */
export * from './Handle';
export * from './arrow';
export * from './curvedArrow';
export * from './path';
export * from './point';
export * from './patch';
export * from './surface';
export * from './arc';
export * from './body';
export * from './field';
export * from './frame';
export * from './axes';
export * from './graticule';
