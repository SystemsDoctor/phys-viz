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
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

export type Dimension = readonly [number, number, number, number, number, number, number];

export const DIMENSIONLESS: Dimension = [0, 0, 0, 0, 0, 0, 0];

export interface Quantity {
  value: number;
  dim: Dimension;
}

export function addQ(_a: Quantity, _b: Quantity): Quantity {
  throw new Error('kernel/units: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function mulQ(_a: Quantity, _b: Quantity): Quantity {
  throw new Error('kernel/units: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function divQ(_a: Quantity, _b: Quantity): Quantity {
  throw new Error('kernel/units: not implemented (see M1 in ARCHITECTURE.md §20)');
}

/** Format with SI prefixes and significant-figure control. */
export function formatQuantity(_q: Quantity, _sigFigs?: number): string {
  throw new Error('kernel/units: not implemented (see M1 in ARCHITECTURE.md §20)');
}
