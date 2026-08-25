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
 * is a Layer 2/3 axis-label concern, out of kernel scope.
 */

export type Dimension = readonly [number, number, number, number, number, number, number];

export const DIMENSIONLESS: Dimension = [0, 0, 0, 0, 0, 0, 0];

export interface Quantity {
  value: number;
  dim: Dimension;
}

function dimEquals(a: Dimension, b: Dimension): boolean {
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

/** Format with SI prefixes and significant-figure control, at a fixed character width. */
export function formatQuantity(q: Quantity, sigFigs = 3): string {
  const sign = q.value < 0 ? '-' : ' ';
  const absValue = Math.abs(q.value);

  if (absValue === 0) {
    const mantissaStr = (0).toFixed(Math.max(0, sigFigs - 1)).padEnd(sigFigs + 1, ' ');
    return `${sign}${mantissaStr}${SI_PREFIXES[0] || ' '}`;
  }

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

  let mantissaStr = formatMantissaFixedWidth(mantissa, sigFigs);
  if (mantissaStr === null && prefixExp < 24) {
    prefixExp += 3;
    mantissa = absValue / Math.pow(10, prefixExp);
    mantissaStr = formatMantissaFixedWidth(mantissa, sigFigs);
  }
  // At the top of the prefix range there's nowhere further to bump; show
  // whatever toFixed produced rather than losing the value entirely.
  const finalStr =
    mantissaStr ?? mantissa.toFixed(Math.max(0, sigFigs - 3)).padEnd(sigFigs + 1, ' ');

  return `${sign}${finalStr}${SI_PREFIXES[prefixExp] || ' '}`;
}
