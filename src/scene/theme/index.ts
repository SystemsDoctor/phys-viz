/**
 * scene/theme — maps the semantic palette (ARCHITECTURE.md §15) onto
 * three.js materials, with a projector variant (higher contrast, thicker
 * lines, larger labels, no subtle transparency) toggled at runtime via a
 * class on <html>.
 *
 * Colour is data (§3, principle 7): module authors pick from
 * `ctx.palette.velocity`, never a raw hex. The semantics are binding
 * across every module and documented in docs/PHYSICS_CONVENTIONS.md.
 *
 * The hex values below are a deliberate, hardcoded duplicate of
 * src/design/tokens.css's `--q-*` custom properties, NOT a
 * `getComputedStyle` DOM read — `MockSceneContext` (headless, no DOM)
 * must produce an identical palette, and a DOM read would just push that
 * problem onto the mock instead of solving it. `src/design/tokens.test.ts`
 * guards the two sources of truth against silently drifting apart.
 */

export interface Palette {
  position: string;
  velocity: string;
  accel: string;
  force: string;
  angular: string;
  field: string;
  energy: string;
  construction: string;
}

const HEX: Palette = {
  position: '#0072b2',
  velocity: '#009e73',
  accel: '#d55e00',
  force: '#cc79a7',
  angular: '#7a4fbf',
  field: '#56b4e9',
  energy: '#e69f00',
  construction: '#7b8494',
};

/**
 * The palette's hex values do not themselves change in projector mode —
 * legibility there comes from line weight and opacity (see
 * `getProjectorAdjustments`), not re-hued semantics (tokens.css's own
 * `html.projector-mode` override only touches `--rule`). `projectorMode`
 * is kept as a parameter so a future ADR adding projector-specific hues
 * is a one-line change here, not a signature change.
 */
export function getPalette(_projectorMode?: boolean): Palette {
  return { ...HEX };
}

export interface ProjectorAdjustments {
  lineWidthMultiplier: number;
  minOpacity: number;
}

/** Projector mode: ~1.6x line weight, and a floor under "subtle" transparency (§15). */
export function getProjectorAdjustments(projectorMode: boolean): ProjectorAdjustments {
  return projectorMode
    ? { lineWidthMultiplier: 1.6, minOpacity: 0.35 }
    : { lineWidthMultiplier: 1, minOpacity: 0 };
}
