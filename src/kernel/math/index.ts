/**
 * kernel/math — Layer 0 (pure). See ARCHITECTURE.md §7.
 *
 * Vec2, Vec3, Mat3, Mat4, Quat as plain typed structures with free
 * functions (add, cross, normalize, ...). Provide both allocating and
 * in-place (`addInto(out, a, b)`) variants.
 *
 * A scratch pool (`tmp.v3()`) of pre-allocated temporaries must live here
 * so hot paths (the render loop, `update()`) allocate nothing — see the
 * Performance budget in §17 ("Allocations in the animation loop: zero").
 *
 * Orientation is ALWAYS represented as a quaternion, never Euler angles —
 * rigid-body and gyroscope modules will gimbal-lock otherwise (§7).
 *
 * TODO(M1): implement Vec2, Vec3, Mat3, Mat4, Quat and the scratch pool.
 */

export type Vec2 = readonly [number, number];
export type Vec3 = readonly [number, number, number];
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];
export type Mat4 = readonly number[]; // 16 elements, column-major
export type Quat = readonly [number, number, number, number]; // x, y, z, w

export function add(_a: Vec3, _b: Vec3): Vec3 {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function addInto(_out: [number, number, number], _a: Vec3, _b: Vec3): void {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function cross(_a: Vec3, _b: Vec3): Vec3 {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function dot(_a: Vec3, _b: Vec3): number {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function scale(_a: Vec3, _s: number): Vec3 {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function norm(_a: Vec3): number {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function normalize(_a: Vec3): Vec3 {
  throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
}

/**
 * Pre-allocated ring of temporary vectors so hot paths allocate nothing.
 * Usage: `const v = tmp.v3(); v[0] = ...` — do not retain the reference
 * past the current frame/update call.
 *
 * CONTRACT: the ring wraps. A `tmp.v3()` result is only valid until the
 * Nth-next `tmp.v3()`/`tmp.v2()` call (N = ring size). Never store a
 * scratch result on `this`, in a closure, or return it from a module's
 * `create()` — copy it into owned storage (`[...v]` or `structuredClone`)
 * first, or callers get silent, hard-to-repro corruption when the ring
 * wraps under them. Module authors: never call `tmp.v3()` inside
 * `create()` and hold the result across `update()` calls.
 */
export const tmp = {
  v2(): [number, number] {
    throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
  },
  v3(): [number, number, number] {
    throw new Error('kernel/math: not implemented (see M1 in ARCHITECTURE.md §20)');
  },
};
