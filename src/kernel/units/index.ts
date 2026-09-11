/**
 * kernel/units — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * `Quantity { value, dim }` where `Dimension` is an exponent tuple over
 * [M, L, T, Theta, I, N, J] (mass, length, time, temperature, current,
 * amount, luminous intensity). Arithmetic checks dimensions and throws on
 * mismatch. This catches a live-demo error class that is otherwise
 * invisible, and dimensional consistency is itself a thing we teach — it
 * also makes readouts and axis labels correct for free.
 *
 * `formatQuantity` is prefix-and-numeral only (e.g. "1.23 k"); deriving a
 * unit *symbol* string from `Dimension`'s seven exponents (e.g. "kg m/s")
 * is a Layer 2/3 axis-label concern, out of kernel scope — see
 * `src/shell/unitSymbol.ts`, which derives one and appends it to this
 * file's output. `chooseSIPrefix` below is exported specifically so that
 * helper can learn which prefix letter a value resolves to without
 * re-deriving (and risking drift from) this file's own rounding-artifact
 * corrections. A DIMENSIONLESS quantity (a pure ratio like a direction
 * cosine) never gets an SI-prefix letter — there is no unit for "milli"
 * or "kilo" to modify — so it prints as a plain decimal number instead.
 */

export type Dimension = readonly [number, number, number, number, number, number, number];

export const DIMENSIONLESS: Dimension = [0, 0, 0, 0, 0, 0, 0];

/**
 * Named exponent tuples over [M, L, T, Θ, I, N, J] for the quantities
 * modules reach for most often, so a `unit:` field never has to be
 * hand-derived (and its exponent order guessed) per module. Prefer one
 * of these; only write a literal tuple for a quantity not listed here.
 */
export const MASS: Dimension = [1, 0, 0, 0, 0, 0, 0];
export const LENGTH: Dimension = [0, 1, 0, 0, 0, 0, 0];
export const TIME: Dimension = [0, 0, 1, 0, 0, 0, 0];
export const VELOCITY: Dimension = [0, 1, -1, 0, 0, 0, 0];
export const ACCEL: Dimension = [0, 1, -2, 0, 0, 0, 0];
export const FORCE: Dimension = [1, 1, -2, 0, 0, 0, 0];
export const ENERGY: Dimension = [1, 2, -2, 0, 0, 0, 0];
/**
 * N·m — dimensionally identical to `ENERGY` (`dimEquals(ENERGY, TORQUE)`
 * is `true`, and arithmetic treats them as interchangeable, correctly).
 * Deliberately a SEPARATE array literal rather than `= ENERGY`, even
 * though the two are value-equal: `src/shell/unitSymbol.ts` looks up a
 * display symbol by REFERENCE for exactly these two exports, since a
 * torque conventionally prints as "N·m" and an energy as "J" despite
 * sharing one dimension — a value-keyed lookup could never tell them
 * apart; this one can, because they're different array objects.
 */
export const TORQUE: Dimension = [1, 2, -2, 0, 0, 0, 0];
export const MOMENT_OF_INERTIA: Dimension = [1, 2, 0, 0, 0, 0, 0];
export const ANGULAR_VELOCITY: Dimension = [0, 0, -1, 0, 0, 0, 0];
export const ANGULAR_MOMENTUM: Dimension = [1, 2, -1, 0, 0, 0, 0];

export interface Quantity {
  value: number;
  dim: Dimension;
}

/** Value equality — two Dimensions with the same 7 exponents are equal regardless of array identity (see `TORQUE`'s doc comment for when identity itself matters instead). */
export function dimEquals(a: Dimension, b: Dimension): boolean {
  for (let i = 0; i < 7; i++) if (a[i] !== b[i]) return false;
  return true;
}

function formatDim(dim: Dimension): string {
  return `[${dim.join(',')}]`;
}

export function addQ(a: Quantity, b: Quantity): Quantity {
  if (!dimEquals(a.dim, b.dim)) {
    throw new Error(
      `kernel/units: cannot add quantities of dimension ${formatDim(a.dim)} and ${formatDim(b.dim)}`,
    );
  }
  return { value: a.value + b.value, dim: a.dim };
}

export function mulQ(a: Quantity, b: Quantity): Quantity {
  const dim = a.dim.map((e, i) => e + b.dim[i]) as unknown as Dimension;
  return { value: a.value * b.value, dim };
}

export function divQ(a: Quantity, b: Quantity): Quantity {
  const dim = a.dim.map((e, i) => e - b.dim[i]) as unknown as Dimension;
  return { value: a.value / b.value, dim };
}

/* ------------------------------ Formatting ------------------------------ */

const SI_PREFIXES: Record<number, string> = {
  [-24]: 'y',
  [-21]: 'z',
  [-18]: 'a',
  [-15]: 'f',
  [-12]: 'p',
  [-9]: 'n',
  [-6]: 'µ',
  [-3]: 'm',
  [0]: '',
  [3]: 'k',
  [6]: 'M',
  [9]: 'G',
  [12]: 'T',
  [15]: 'P',
  [18]: 'E',
  [21]: 'Z',
  [24]: 'Y',
};

/**
 * Format the mantissa at a fixed character width for a given sig-fig
 * count, given `mantissa` already known to be in [1, 1000). Returns
 * `null` if rounding pushed the mantissa's printed value up to the next
 * engineering-notation group (e.g. 999.96 -> "1000") — the caller should
 * bump the prefix exponent and retry.
 */
function formatMantissaFixedWidth(mantissa: number, sigFigs: number): string | null {
  const intDigits = mantissa >= 100 ? 3 : mantissa >= 10 ? 2 : 1;
  const decimals = Math.max(0, sigFigs - intDigits);
  const str = mantissa.toFixed(decimals);
  if (Number(str) >= 1000) return null;
  return str.padEnd(sigFigs + 1, ' ');
}

/**
 * Format a dimensionless value (e.g. a direction cosine or other pure
 * ratio) as a plain decimal number with `sigFigs` significant figures —
 * no SI-prefix scaling, since there is no unit for a prefix to modify.
 * Self-corrects once if rounding pushes the value up an order of
 * magnitude (e.g. 0.9996 -> "1.000"), mirroring `formatMantissaFixedWidth`.
 */
function formatDimensionlessMantissa(absValue: number, sigFigs: number): string {
  let order = Math.floor(Math.log10(absValue));
  let decimals = Math.max(0, sigFigs - 1 - order);
  let str = absValue.toFixed(decimals);
  const roundedOrder = Math.floor(Math.log10(Number(str)));
  if (roundedOrder !== order) {
    order = roundedOrder;
    decimals = Math.max(0, sigFigs - 1 - order);
    str = absValue.toFixed(decimals);
  }
  return str;
}

/**
 * Below this magnitude, a value is display-indistinguishable from
 * floating-point noise for every quantity this app models (undergraduate
 * mechanics — nothing here is ever intentionally sub-nanometer or
 * sub-nanosecond) and is shown as exact zero instead of being routed
 * through the SI-prefix ladder.
 *
 * Without this floor, a quantity that is mathematically exactly zero at
 * a specific instant — e.g. a closed-form velocity at a turning point,
 * `-A * omega * Math.sin(omega * t)` — but lands on floating-point trig
 * residue instead (`Math.sin` of a float64 approximation of a multiple
 * of pi is essentially never exactly 0; e.g. `Math.sin(Math.PI)` is
 * `1.2246...e-16`, not `0`) gets formatted at whatever absurd
 * atto/zepto/yocto scale that residue happens to land in. Since the
 * residue's MANTISSA (after dividing out that scale) is essentially
 * arbitrary within [1, 1000), it can print as a 2-3 digit number that
 * reads as "large" at a glance if the reader doesn't parse the
 * accompanying prefix letter — reported live as "the reported velocity
 * becomes a value in the hundreds" right where it should visibly settle
 * near zero (work-energy's `speed` readout near the turning points).
 */
const ZERO_EPSILON = 1e-9;

export interface SIPrefixChoice {
  /** The chosen prefix exponent, a multiple of 3 clamped to [-24, 24]. */
  prefixExp: number;
  /** `absValue` divided down by `10 ** prefixExp` — in [1, 1000) except at the extremes of the supported range, where it's clamped rather than left out of range. */
  mantissa: number;
  /** The SI-prefix letter for `prefixExp` (e.g. 'k', 'm'), or '' when `prefixExp === 0` (no prefix needed). */
  prefixChar: string;
}

/**
 * Picks the SI-prefix exponent/mantissa/letter for a positive
 * magnitude at a given significant-figure count — the engineering-
 * notation core `formatQuantity` builds its fixed-width table string
 * from, factored out so a Layer 2/3 caller can reuse the exact same
 * (rounding-artifact-corrected) choice rather than re-deriving it and
 * risking drift. `sigFigs` matters here, not just for display: a
 * mantissa that ROUNDS UP to 1000 at the requested precision (e.g.
 * 999.96 -> "1000" at 3 sig figs) needs the next prefix group instead,
 * so two callers using different `sigFigs` for the same value can
 * legitimately land on different prefixes. Callers needing a DISPLAY
 * string should still go through `formatQuantity` — this is the raw
 * numeric choice only, with none of that function's sign handling,
 * fixed-width padding, or dimensionless/near-zero special cases.
 */
export function chooseSIPrefix(absValue: number, sigFigs = 3): SIPrefixChoice {
  // Math.log10 can round a value that's *just* under an exact power of
  // 1000 (e.g. 999999.9999999999) up to the boundary itself, picking a
  // prefixExp one group too high and landing mantissa just under 1 — the
  // loop below corrects that. The symmetric >=1000 case does not appear
  // to be reachable in double precision (floor() only ever biases the
  // initial guess toward being too high, never too low), but the guard
  // costs nothing to keep.
  let prefixExp = Math.min(24, Math.max(-24, Math.floor(Math.log10(absValue) / 3) * 3));
  let mantissa = absValue / Math.pow(10, prefixExp);
  while (mantissa >= 1000 && prefixExp < 24) {
    prefixExp += 3;
    mantissa = absValue / Math.pow(10, prefixExp);
  }
  while (mantissa < 1 && prefixExp > -24) {
    prefixExp -= 3;
    mantissa = absValue / Math.pow(10, prefixExp);
  }
  // Bump once more if formatting the mantissa at `sigFigs` would itself
  // round up into the next thousand (999.96 -> "1000"). A second
  // cascading bump can't happen: dividing by another 1000 always drops
  // the new mantissa near [0, 1), nowhere close to rounding up again.
  if (formatMantissaFixedWidth(mantissa, sigFigs) === null && prefixExp < 24) {
    prefixExp += 3;
    mantissa = absValue / Math.pow(10, prefixExp);
  }
  return { prefixExp, mantissa, prefixChar: SI_PREFIXES[prefixExp] || '' };
}

/** Format with SI prefixes and significant-figure control, at a fixed character width. */
export function formatQuantity(q: Quantity, sigFigs = 3): string {
  const sign = q.value < 0 ? '-' : ' ';
  const absValue = Math.abs(q.value);
  const isDimensionless = dimEquals(q.dim, DIMENSIONLESS);

  if (absValue < ZERO_EPSILON) {
    // No leading '-' here even if q.value was a tiny negative residue —
    // anything this close to zero is display-indistinguishable from it,
    // and a "-0.00" reading would look like a real (if oddly-signed)
    // measurement rather than the "may as well be exactly zero" it is.
    const mantissaStr = (0).toFixed(Math.max(0, sigFigs - 1)).padEnd(sigFigs + 1, ' ');
    return isDimensionless
      ? ` ${mantissaStr.trimEnd()}`
      : ` ${mantissaStr}${SI_PREFIXES[0] || ' '}`;
  }

  if (isDimensionless) {
    return `${sign}${formatDimensionlessMantissa(absValue, sigFigs)}`;
  }

  const { prefixExp, mantissa } = chooseSIPrefix(absValue, sigFigs);
  // At the top of the prefix range there's nowhere further to bump; show
  // whatever toFixed produced rather than losing the value entirely.
  const finalStr =
    formatMantissaFixedWidth(mantissa, sigFigs) ??
    mantissa.toFixed(Math.max(0, sigFigs - 3)).padEnd(sigFigs + 1, ' ');

  return `${sign}${finalStr}${SI_PREFIXES[prefixExp] || ' '}`;
}
