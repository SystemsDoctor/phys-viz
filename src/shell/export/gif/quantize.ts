/**
 * Fixed export palette + nearest-colour quantization (ADR 0006, P-11).
 *
 * A GIF's colour table is capped at 256 entries, and this project's
 * colour is DATA (§15) — the Okabe–Ito semantic tokens must survive
 * quantization exactly, not just approximately. A generic quantizer
 * (median-cut, octree) optimizes for perceptual fidelity of an arbitrary
 * image and offers no such guarantee. Building the palette by hand
 * instead: every semantic token (and the fixed WebGL scene background,
 * `Viewport`'s hardcoded 0xeceef2) is a literal palette entry, so a pixel
 * that IS that colour always resolves to itself with zero error.
 *
 * `body` glyphs use `MeshStandardMaterial` (Viewport.ts), so a lit
 * sphere/cylinder shows a genuine shading gradient, not a flat fill —
 * the per-hue ramps below exist so that gradient quantizes to visibly
 * graded steps instead of two or three harsh bands, while staying well
 * under the 256-entry cap.
 */
import { getPalette } from '@/scene/theme';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** The fixed WebGL scene background (Viewport.ts's `scene.background`) — not a design token, but a literal colour every export frame contains. */
const SCENE_BACKGROUND_HEX = '#eceef2';

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function rampToward(base: RGB, target: RGB, steps: number): RGB[] {
  const out: RGB[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    out.push({
      r: lerp(base.r, target.r, t),
      g: lerp(base.g, target.g, t),
      b: lerp(base.b, target.b, t),
    });
  }
  return out;
}

const BLACK: RGB = { r: 0, g: 0, b: 0 };
const WHITE: RGB = { r: 255, g: 255, b: 255 };

/** Builds the fixed export palette. Deterministic — same output every call, no dependency on live theme/DOM state. */
export function buildExportPalette(): RGB[] {
  const palette = getPalette();
  const semanticHexes = Object.values(palette);
  const semanticRgb = semanticHexes.map(hexToRgb);

  const entries: RGB[] = [BLACK, WHITE, hexToRgb(SCENE_BACKGROUND_HEX), ...semanticRgb];

  // Generic greyscale ramp — covers ambient-lit neutral surfaces and
  // anti-aliased edges that aren't tinted toward any semantic hue.
  const GREY_STEPS = 32;
  for (let i = 1; i < GREY_STEPS; i++) {
    const v = Math.round((255 * i) / GREY_STEPS);
    entries.push({ r: v, g: v, b: v });
  }

  // Per-hue shading ramp (black -> hue -> white) — `MeshStandardMaterial`
  // under ambient + one directional light produces exactly this kind of
  // gradient across a curved schematic body.
  const HUE_STEPS = 12;
  for (const hue of semanticRgb) {
    entries.push(...rampToward(BLACK, hue, HUE_STEPS));
    entries.push(...rampToward(hue, WHITE, HUE_STEPS));
  }

  return entries;
}

/** Nearest palette entry by squared Euclidean RGB distance; exact matches short-circuit (common for flat semantic-colour fills and the background). */
export function nearestIndex(r: number, g: number, b: number, palette: readonly RGB[]): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    if (p.r === r && p.g === g && p.b === b) return i;
    const dr = p.r - r;
    const dg = p.g - g;
    const db = p.b - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Quantizes an RGBA buffer (e.g. from `ImageData.data`) to palette indices, one per pixel. Ignores alpha — the scene background is opaque. */
export function quantizeFrame(rgba: Uint8ClampedArray, palette: readonly RGB[]): Uint8Array {
  const pixelCount = rgba.length / 4;
  const indices = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    indices[i] = nearestIndex(rgba[o], rgba[o + 1], rgba[o + 2], palette);
  }
  return indices;
}
