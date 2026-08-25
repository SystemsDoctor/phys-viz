/**
 * scene — LAYER 1. The ONLY layer that imports `three` (ARCHITECTURE.md
 * §3, §6, §8).
 *
 * May import kernel and `three`. Must NOT import react, shell, or
 * modules. Exposes SceneContext, the single object handed to every
 * module's `create()`.
 */

export * from './SceneContext';
export * from './Viewport';
export * as camera from './camera';
export * as glyphs from './glyphs';
export * as annotate from './annotate';
export * as theme from './theme';
