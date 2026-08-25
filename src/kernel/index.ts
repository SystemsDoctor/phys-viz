/**
 * kernel — LAYER 0. Pure computation only.
 *
 * No DOM, no `three`, no React, no module imports. Fully unit-testable
 * with no browser. Target >= 90% line coverage (ARCHITECTURE.md §7, §18).
 *
 * This barrel re-exports the kernel's public surface. Import from
 * `@/kernel` or a specific subpath (`@/kernel/math`, `@/kernel/ode`, ...).
 */

export * as math from './math';
export * as frames from './frames';
export * as calculus from './calculus';
export * as geometry from './geometry';
export * as ode from './ode';
export * as units from './units';
export * as expr from './expr';
export * as random from './random';
export * as inertia from './inertia';
