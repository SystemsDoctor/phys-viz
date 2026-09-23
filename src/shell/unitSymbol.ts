/**
 * shell/unitSymbol — Layer 2. Derives a display unit-SYMBOL string from
 * a `Dimension`, the piece `kernel/units`' own doc comment names as
 * deliberately out of kernel scope ("deriving a unit symbol string...
 * is a Layer 2/3 axis-label concern"). `formatQuantity` alone produces
 * only a numeral and an SI-prefix letter (e.g. "847m") — for a
 * LENGTH-dimensioned reading, that "m" is the "milli" prefix, easily
 * misread as the base unit "meters" itself. `formatQuantityWithUnit`
 * below appends the actual base symbol so the same reading is
 * unambiguous ("847 mm").
 *
 * Two tiers, cheapest first:
 * 1. `NAMED_SYMBOLS`, keyed by REFERENCE (not value) to a handful of
 *    `kernel/units` exports where the idiomatic symbol either isn't a
 *    plain composition of base units (`FORCE` -> "N", not "kg·m/s²")
 *    or needs to disambiguate two exports that share one Dimension —
 *    `ENERGY` and `TORQUE` are dimensionally identical
 *    (`dimEquals(ENERGY, TORQUE)` is `true`) but conventionally printed
 *    differently ("J" vs "N·m"); a lookup keyed by VALUE could never
 *    tell them apart, which is exactly why `kernel/units` keeps them as
 *    two distinct array objects rather than one aliased to the other.
 * 2. `composeFromExponents`, a generic fallback that spells out any
 *    other Dimension (including a module's own hand-written literal
 *    tuple, e.g. a spring constant) from the seven base SI symbols.
 *
 * Known limitation, deliberately not handled: kilogram is the one SI
 * base unit whose own name already carries a prefix ("kilo-gram"), so
 * naively gluing an SI-prefix letter onto "kg" for a `MASS` value
 * outside [1, 1000) produces a non-standard compound like "mkg" instead
 * of the conventional "g" (0.2 kg -> "200 g", not "200 mkg"). No
 * currently-registered module's `ScalarDef` uses `unit: MASS` (every
 * `MASS`-dimensioned field today is a `ParamDef`, shown as a plain
 * number by `Slider`, never through `formatQuantity`), so this never
 * manifests live — flagged here rather than solved pre-emptively for a
 * case nothing currently reaches (YAGNI). Revisit if a module ever adds
 * a `MASS`-dimensioned scalar.
 */
import {
  chooseSIPrefix,
  dimEquals,
  formatQuantity,
  DIMENSIONLESS,
  FORCE,
  ENERGY,
  TORQUE,
  ANGULAR_VELOCITY,
} from '@/kernel/units';
import type { Dimension, Quantity } from '@/kernel/units';

/** Base SI symbols in `Dimension`'s own exponent order: [M, L, T, Θ, I, N, J]. */
const BASE_SYMBOLS: readonly string[] = ['kg', 'm', 's', 'K', 'A', 'mol', 'cd'];

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

function superscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPERSCRIPT_DIGITS[c] ?? c)
    .join('');
}

/**
 * X-37: an SI prefix is only a valid, linear scale factor on the
 * numeral when the unit it's glued onto is itself raised to the first
 * power — "km/s" (a length-per-time, leading exponent 1) means exactly
 * 1000x the m/s value, but "km²/s" under standard SI prefix rules means
 * (km)²/s = 10⁶ m²/s, not the 1000x `chooseSIPrefix` actually computed.
 * `unitSymbolOf`'s NAMED_SYMBOLS entries (N, J, N·m, rad/s) are exempt:
 * they're conventionally prefixed as one atomic unit (kN, kJ, ...) with
 * no visible exponent on the leading symbol, unlike a composed unit
 * whose superscript is printed right there in the string. Also carries
 * the module's own documented kg exception (kg is already a prefixed
 * unit name, so a MASS-leading composite can't take a second prefix
 * either) by checking the leading base symbol, not just its exponent.
 */
function isPrefixSafe(dim: Dimension): boolean {
  if (NAMED_SYMBOLS.has(dim)) return true;
  const firstIdx = dim.findIndex((exp) => exp !== 0);
  if (firstIdx === -1) return false; // dimensionless — moot, callers never reach this
  if (BASE_SYMBOLS[firstIdx] === 'kg') return false;
  return dim[firstIdx] === 1;
}

/** Scientific notation, e.g. "2.00×10³" or "1.50" (exponent 0 omitted) — the fallback for a unit `isPrefixSafe` rejects, so the numeral never implies a scale factor the glued-on unit symbol doesn't actually have. */
function toScientific(value: number, sigFigs: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs < 1e-9) return (0).toFixed(Math.max(0, sigFigs - 1));
  let exp = Math.floor(Math.log10(abs));
  let mantissa = abs / Math.pow(10, exp);
  let mantissaStr = mantissa.toFixed(Math.max(0, sigFigs - 1));
  // Rounding at sigFigs can push the mantissa up to "10.0" (e.g. 9.996 at 3 sig figs).
  if (parseFloat(mantissaStr) >= 10) {
    exp += 1;
    mantissa = abs / Math.pow(10, exp);
    mantissaStr = mantissa.toFixed(Math.max(0, sigFigs - 1));
  }
  return exp === 0 ? `${sign}${mantissaStr}` : `${sign}${mantissaStr}×10${superscript(exp)}`;
}

/** Composes a base-SI-unit symbol directly from the exponent tuple, e.g. [0,1,-1,0,0,0,0] -> "m/s". */
function composeFromExponents(dim: Dimension): string {
  const numerator: string[] = [];
  const denominator: string[] = [];
  dim.forEach((exp, i) => {
    if (exp === 0) return;
    const base = BASE_SYMBOLS[i];
    const abs = Math.abs(exp);
    const term = abs === 1 ? base : `${base}${superscript(abs)}`;
    (exp > 0 ? numerator : denominator).push(term);
  });
  if (numerator.length === 0 && denominator.length === 0) return '';
  const num = numerator.join('·') || '1';
  if (denominator.length === 0) return num;
  if (denominator.length === 1) return `${num}/${denominator[0]}`;
  // Two or more denominator terms would make a single slash ambiguous
  // ("kg/m·s" could misread as "(kg/m)·s") — spell every negative
  // exponent out instead of dividing by a multi-term group.
  const negTerms = dim
    .map((exp, i) => (exp < 0 ? `${BASE_SYMBOLS[i]}${superscript(exp)}` : null))
    .filter((s): s is string => s !== null);
  return [...numerator, ...negTerms].join('·');
}

/**
 * Idiomatic symbols for named quantities where the generic composition
 * would be technically correct but not how anyone actually writes it,
 * or where two named exports share a Dimension and need to be told
 * apart by which one was actually used (see the module doc comment).
 * A `Map` keys by reference for object values, so `ENERGY` and `TORQUE`
 * — distinct arrays in `kernel/units` even though value-equal — resolve
 * to different entries here.
 */
const NAMED_SYMBOLS = new Map<Dimension, string>([
  [FORCE, 'N'],
  [ENERGY, 'J'],
  [TORQUE, 'N·m'],
  [ANGULAR_VELOCITY, 'rad/s'],
]);

/**
 * Derives a display unit-symbol string from a `Dimension`. Returns `''`
 * for `DIMENSIONLESS` — a pure ratio has no unit to show, and no
 * caller should append a space-plus-nothing for one.
 */
export function unitSymbolOf(dim: Dimension): string {
  if (dimEquals(dim, DIMENSIONLESS)) return '';
  const named = NAMED_SYMBOLS.get(dim);
  return named !== undefined ? named : composeFromExponents(dim);
}

/**
 * `formatQuantity`'s numeral-and-prefix output with a unit symbol
 * appended, e.g. "847 mm" (a LENGTH of 0.847, milli-prefixed) or
 * "0.847 m" (no prefix needed) instead of the bare "847m"/"0.847 " a
 * reader can't tell from a genuine "847 meters"/"0.847". `unit` is
 * placed directly after the SI-prefix letter `formatQuantity` already
 * chose (so "milli" + "meter" reads as the single "mm" it should, not
 * "m mm"), separated from the numeral itself by exactly one space —
 * `formatQuantity`'s own fixed-width padding puts an inconsistent
 * number of spaces there (for column alignment, not prose), so this
 * strips it via `chooseSIPrefix` rather than trusting it.
 *
 * Returns the bare numeral, unchanged, for `DIMENSIONLESS` values or
 * any other Dimension `unitSymbolOf` can't give a symbol for.
 */
export function formatQuantityWithUnit(q: Quantity, sigFigs = 3): string {
  const unit = unitSymbolOf(q.dim);
  const raw = formatQuantity(q, sigFigs).trim();
  if (!unit) return raw;

  // X-37: for a unit an SI prefix can't be glued onto safely (a powered
  // composite like m²/s, m³/s² — see `isPrefixSafe`), fall back to
  // scientific notation with the bare unit symbol instead of letting
  // `chooseSIPrefix`'s LINEAR scale factor silently misrepresent a
  // squared/cubed one (gravitation's specific energy at mu=1, a=5 was
  // reachable today: -0.1 m²/s² printed as "-100 mm²/s²", 1000x off).
  if (!isPrefixSafe(q.dim)) {
    return `${toScientific(q.value, sigFigs)} ${unit}`;
  }

  // `chooseSIPrefix` is a pure function of the magnitude alone — it
  // knows nothing of `formatQuantity`'s separate near-zero floor
  // (ADR-less "ZERO_EPSILON" fix), so for a value that floor catches,
  // its predicted prefix won't actually be the trailing character of
  // `raw` ("0.00" has none). Only trust the prediction when `raw`
  // genuinely ends with it; otherwise there's no prefix to strip.
  const predicted = chooseSIPrefix(Math.abs(q.value), sigFigs).prefixChar;
  const hasPrefix = predicted !== '' && raw.endsWith(predicted);
  // formatQuantity's own fixed-width padding can leave a space directly
  // before the prefix letter (e.g. "847 m", padded to align columns) —
  // stripping just the letter would leave that space stuck to the
  // numeral, doubling up with the one this function adds below.
  const numeral = (hasPrefix ? raw.slice(0, -predicted.length) : raw).trimEnd();
  const prefixChar = hasPrefix ? predicted : '';
  return `${numeral} ${prefixChar}${unit}`;
}
