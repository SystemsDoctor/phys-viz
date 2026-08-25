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
 * TODO(M2): implement; keep in sync with src/design/tokens.css, which is
 * the single source of truth for the colour values themselves.
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

export function getPalette(_projectorMode?: boolean): Palette {
  throw new Error('scene/theme: not implemented (see M2 in ARCHITECTURE.md §20)');
}
