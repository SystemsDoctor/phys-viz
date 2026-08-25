/**
 * kernel/random — Layer 0 (pure). Added at M1 (see TASKS.md M1-20); not
 * in ARCHITECTURE.md §5's original file list, recorded there now.
 *
 * §12's determinism requirement permits module randomness only via "a
 * seeded PRNG from the kernel, seeded from a serialized param" — a
 * bookmarked demo must render identically every time. This is a small,
 * fast, deterministic, NON-cryptographic generator (mulberry32):
 * plenty for scattering field-glyph samples or jittering a starting
 * condition, not a security primitive.
 */

/** A seeded generator: each call returns the next float in [0, 1). */
export type Rng = () => number;

/** mulberry32 — 32-bit state, one Math.imul-based mixing step per call. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return function rng(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform random integer in [minInclusive, maxExclusive). */
export function nextInt(rng: Rng, minInclusive: number, maxExclusive: number): number {
  return minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));
}

/** Uniform random float in [min, max). */
export function nextRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}
