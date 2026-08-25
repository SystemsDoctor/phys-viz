/**
 * kernel/ode — Layer 0 (pure). See ARCHITECTURE.md §7 and §12.
 *
 * Numerical integration is a FALLBACK, not a default (see the Visualizer
 * Doctrine, §2). Prefer closed form; reach for `stepped` time models and
 * these integrators only for genuinely path-dependent systems.
 *
 * All integrators are pure `(state, dt) => state` and allocate nothing.
 * `velocityVerlet` is symplectic and is the default choice for anything
 * conservative. `rkf45` is adaptive-step, for everything else that must be
 * stepped. Event detection root-finds a scalar event function between
 * steps (bisection is fine) for turning points, zero-crossings, and
 * "hits the ground".
 *
 * TODO(M1): implement per ARCHITECTURE.md §7.
 */

export type OdeState = Float64Array;
export type Derivative<S = OdeState> = (state: S, t: number) => S;

export function rk4<S = OdeState>(_deriv: Derivative<S>, _state: S, _t: number, _dt: number): S {
  throw new Error('kernel/ode: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function velocityVerlet<S = OdeState>(
  _accel: Derivative<S>,
  _state: S,
  _t: number,
  _dt: number,
): S {
  throw new Error('kernel/ode: not implemented (see M1 in ARCHITECTURE.md §20)');
}

export function rkf45<S = OdeState>(
  _deriv: Derivative<S>,
  _state: S,
  _t: number,
  _dt: number,
  _tol?: number,
): { state: S; dtNext: number } {
  throw new Error('kernel/ode: not implemented (see M1 in ARCHITECTURE.md §20)');
}

/** Bisection root-find of a scalar event function between two samples. */
export function findEvent(
  _eventFn: (t: number) => number,
  _tLo: number,
  _tHi: number,
  _tol?: number,
): number {
  throw new Error('kernel/ode: not implemented (see M1 in ARCHITECTURE.md §20)');
}
