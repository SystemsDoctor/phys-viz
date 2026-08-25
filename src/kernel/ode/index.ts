/**
 * kernel/ode — Layer 0 (pure). See ARCHITECTURE.md §7 and §12.
 *
 * Numerical integration is a FALLBACK, not a default (see the Visualizer
 * Doctrine, §2). Prefer closed form; reach for `stepped` time models and
 * these integrators only for genuinely path-dependent systems.
 *
 * All integrators are pure `(state, dt) => state` and allocate nothing OF
 * THEIR OWN after warmup — each keeps a persistent, named scratch buffer
 * per state length (lazily allocated on first use at that length, then
 * reused forever). This only covers the integrators' own internals: if
 * the caller's `deriv`/`accel` callback itself allocates a fresh array
 * every call, that allocation is the caller's, not this module's — write
 * physics callbacks that reuse a single owned buffer across calls (the
 * integrators always copy a callback's result elementwise into their own
 * scratch immediately, so a callback returning the SAME aliased buffer
 * every call is safe).
 *
 * `S` is bounded to `OdeState` (`Float64Array`) rather than left fully
 * generic — nothing about these signatures works for a non-indexable,
 * lengthless `S`, and nothing in the codebase depends on the looser bound.
 *
 * `velocityVerlet` is symplectic and is the default choice for anything
 * conservative. `rkf45` is adaptive-step, for everything else that must be
 * stepped. Both share `rk4`'s `Derivative<S>` shape: state is packed as
 * `[pos(k)..., vel(k)...]` and the callback returns
 * `[vel(k)..., accel(k)...]` — the same physics function works with
 * either integrator (a general vs. symplectic step of the same ODE).
 * Velocity-dependent forces make `velocityVerlet` a semi-implicit
 * approximation rather than exactly symplectic — standard, and fine for
 * this doctrine's "conservative systems" use case.
 *
 * Event detection root-finds a scalar event function between steps
 * (bisection is fine) for turning points, zero-crossings, and "hits the
 * ground". `findRoot` (M1-15, not in ARCHITECTURE.md §5's original file
 * list, recorded there now) is the general Newton-Raphson-with-bisection-
 * fallback root-finder §12 assumes exists ("a Kepler orbit via
 * Newton-Raphson on Kepler's equation").
 */

export type OdeState = Float64Array;
export type Derivative<S extends OdeState = OdeState> = (state: S, t: number) => S;

let scratchAllocCount = 0;

/** Test-only: total Float64Array allocations made by this module's scratch pools. */
export function _scratchAllocCount(): number {
  return scratchAllocCount;
}

/** Test-only: zero the counter (call after warmup, before asserting no further growth). */
export function _resetScratchAllocCount(): void {
  scratchAllocCount = 0;
}

function allocScratch(len: number): Float64Array {
  scratchAllocCount++;
  return new Float64Array(len);
}

/* ----------------------------------- rk4 ----------------------------------- */

interface Rk4Scratch {
  k1: Float64Array;
  k2: Float64Array;
  k3: Float64Array;
  k4: Float64Array;
  trial: Float64Array;
  result: Float64Array;
}
const rk4ScratchByLength = new Map<number, Rk4Scratch>();

function getRk4Scratch(len: number): Rk4Scratch {
  let s = rk4ScratchByLength.get(len);
  if (!s) {
    s = {
      k1: allocScratch(len),
      k2: allocScratch(len),
      k3: allocScratch(len),
      k4: allocScratch(len),
      trial: allocScratch(len),
      result: allocScratch(len),
    };
    rk4ScratchByLength.set(len, s);
  }
  return s;
}

export function rk4<S extends OdeState = OdeState>(
  deriv: Derivative<S>,
  state: S,
  t: number,
  dt: number,
): S {
  const len = state.length;
  const { k1, k2, k3, k4, trial, result } = getRk4Scratch(len);

  const d1 = deriv(state, t);
  for (let i = 0; i < len; i++) k1[i] = d1[i];

  for (let i = 0; i < len; i++) trial[i] = state[i] + 0.5 * dt * k1[i];
  const d2 = deriv(trial as S, t + 0.5 * dt);
  for (let i = 0; i < len; i++) k2[i] = d2[i];

  for (let i = 0; i < len; i++) trial[i] = state[i] + 0.5 * dt * k2[i];
  const d3 = deriv(trial as S, t + 0.5 * dt);
  for (let i = 0; i < len; i++) k3[i] = d3[i];

  for (let i = 0; i < len; i++) trial[i] = state[i] + dt * k3[i];
  const d4 = deriv(trial as S, t + dt);
  for (let i = 0; i < len; i++) k4[i] = d4[i];

  for (let i = 0; i < len; i++) {
    result[i] = state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }
  return result as S;
}

/* ------------------------------ velocityVerlet ------------------------------ */

interface VerletScratch {
  d0: Float64Array;
  xNew: Float64Array;
  stateMid: Float64Array;
  d1: Float64Array;
  result: Float64Array;
}
const verletScratchByLength = new Map<number, VerletScratch>();

function getVerletScratch(len: number): VerletScratch {
  let s = verletScratchByLength.get(len);
  if (!s) {
    s = {
      d0: allocScratch(len),
      xNew: allocScratch(len),
      stateMid: allocScratch(len),
      d1: allocScratch(len),
      result: allocScratch(len),
    };
    verletScratchByLength.set(len, s);
  }
  return s;
}

/**
 * State is `[pos(k)..., vel(k)...]`; `accel(state,t)` returns
 * `[vel(k)..., accel(k)...]` — see the module doc comment. Throws if
 * `state.length` is odd (not a valid pos/vel split).
 */
export function velocityVerlet<S extends OdeState = OdeState>(
  accel: Derivative<S>,
  state: S,
  t: number,
  dt: number,
): S {
  const len = state.length;
  if (len % 2 !== 0) {
    throw new Error('kernel/ode: velocityVerlet requires an even-length [pos..., vel...] state');
  }
  const k = len / 2;
  const { d0, xNew, stateMid, d1, result } = getVerletScratch(len);

  const derivative0 = accel(state, t);
  for (let i = 0; i < len; i++) d0[i] = derivative0[i];

  for (let i = 0; i < k; i++) {
    xNew[i] = state[i] + state[k + i] * dt + 0.5 * d0[k + i] * dt * dt;
  }
  for (let i = 0; i < k; i++) {
    stateMid[i] = xNew[i];
    stateMid[k + i] = state[k + i]; // velocity not yet updated
  }

  const derivative1 = accel(stateMid as S, t + dt);
  for (let i = 0; i < len; i++) d1[i] = derivative1[i];

  for (let i = 0; i < k; i++) {
    result[i] = xNew[i];
    result[k + i] = state[k + i] + 0.5 * (d0[k + i] + d1[k + i]) * dt;
  }
  return result as S;
}

/* --------------------------------- rkf45 --------------------------------- */

interface Rkf45Scratch {
  k1: Float64Array;
  k2: Float64Array;
  k3: Float64Array;
  k4: Float64Array;
  k5: Float64Array;
  k6: Float64Array;
  trial: Float64Array;
  y4: Float64Array;
  y5: Float64Array;
}
const rkf45ScratchByLength = new Map<number, Rkf45Scratch>();

function getRkf45Scratch(len: number): Rkf45Scratch {
  let s = rkf45ScratchByLength.get(len);
  if (!s) {
    s = {
      k1: allocScratch(len),
      k2: allocScratch(len),
      k3: allocScratch(len),
      k4: allocScratch(len),
      k5: allocScratch(len),
      k6: allocScratch(len),
      trial: allocScratch(len),
      y4: allocScratch(len),
      y5: allocScratch(len),
    };
    rkf45ScratchByLength.set(len, s);
  }
  return s;
}

/** Runge-Kutta-Fehlberg 4(5), classic coefficients. Returns the 5th-order (local-extrapolation) state. */
export function rkf45<S extends OdeState = OdeState>(
  deriv: Derivative<S>,
  state: S,
  t: number,
  dt: number,
  tol = 1e-6,
): { state: S; dtNext: number } {
  const len = state.length;
  const { k1, k2, k3, k4, k5, k6, trial, y4, y5 } = getRkf45Scratch(len);

  const d1 = deriv(state, t);
  for (let i = 0; i < len; i++) k1[i] = d1[i];

  for (let i = 0; i < len; i++) trial[i] = state[i] + dt * (0.25 * k1[i]);
  const d2 = deriv(trial as S, t + dt * 0.25);
  for (let i = 0; i < len; i++) k2[i] = d2[i];

  for (let i = 0; i < len; i++) trial[i] = state[i] + dt * ((3 / 32) * k1[i] + (9 / 32) * k2[i]);
  const d3 = deriv(trial as S, t + dt * (3 / 8));
  for (let i = 0; i < len; i++) k3[i] = d3[i];

  for (let i = 0; i < len; i++) {
    trial[i] =
      state[i] + dt * ((1932 / 2197) * k1[i] - (7200 / 2197) * k2[i] + (7296 / 2197) * k3[i]);
  }
  const d4 = deriv(trial as S, t + dt * (12 / 13));
  for (let i = 0; i < len; i++) k4[i] = d4[i];

  for (let i = 0; i < len; i++) {
    trial[i] =
      state[i] +
      dt * ((439 / 216) * k1[i] - 8 * k2[i] + (3680 / 513) * k3[i] - (845 / 4104) * k4[i]);
  }
  const d5 = deriv(trial as S, t + dt);
  for (let i = 0; i < len; i++) k5[i] = d5[i];

  for (let i = 0; i < len; i++) {
    trial[i] =
      state[i] +
      dt *
        (-(8 / 27) * k1[i] +
          2 * k2[i] -
          (3544 / 2565) * k3[i] +
          (1859 / 4104) * k4[i] -
          (11 / 40) * k5[i]);
  }
  const d6 = deriv(trial as S, t + dt * 0.5);
  for (let i = 0; i < len; i++) k6[i] = d6[i];

  let maxError = 0;
  for (let i = 0; i < len; i++) {
    y4[i] =
      state[i] +
      dt * ((25 / 216) * k1[i] + (1408 / 2565) * k3[i] + (2197 / 4104) * k4[i] - (1 / 5) * k5[i]);
    y5[i] =
      state[i] +
      dt *
        ((16 / 135) * k1[i] +
          (6656 / 12825) * k3[i] +
          (28561 / 56430) * k4[i] -
          (9 / 50) * k5[i] +
          (2 / 55) * k6[i]);
    maxError = Math.max(maxError, Math.abs(y5[i] - y4[i]));
  }

  let dtNext: number;
  if (maxError === 0) {
    dtNext = dt * 4;
  } else {
    const factor = 0.9 * Math.pow(tol / maxError, 0.2);
    dtNext = dt * Math.min(4, Math.max(0.1, factor));
  }

  return { state: y5 as S, dtNext };
}

/* ------------------------------ Root/event finding ------------------------------ */

/** Bisection root-find of a scalar event function between two samples (assumes a sign-change bracket). */
export function findEvent(
  eventFn: (t: number) => number,
  tLo: number,
  tHi: number,
  tol = 1e-10,
): number {
  let lo = tLo;
  let hi = tHi;
  let fLo = eventFn(lo);
  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = eventFn(mid);
    if (Math.abs(fMid) < tol || (hi - lo) / 2 < tol) return mid;
    const loNegative = fLo < 0;
    const midNegative = fMid < 0;
    if (loNegative === midNegative) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * General scalar root-finder: Newton-Raphson, falling back to bisection
 * whenever a Newton step would leave the bracket or convergence is too
 * slow ("rtsafe", Numerical Recipes §9.4). Requires `f(xLo)` and `f(xHi)`
 * to bracket a root (opposite signs).
 */
export function findRoot(
  f: (x: number) => number,
  fPrime: (x: number) => number,
  xLo: number,
  xHi: number,
  tol = 1e-10,
  maxIter = 100,
): number {
  const fLo = f(xLo);
  const fHi = f(xHi);
  if (fLo === 0) return xLo;
  if (fHi === 0) return xHi;

  let xl: number;
  let xh: number;
  if (fLo < 0) {
    xl = xLo;
    xh = xHi;
  } else {
    xl = xHi;
    xh = xLo;
  }

  let rts = 0.5 * (xLo + xHi);
  let dxOld = Math.abs(xHi - xLo);
  let dx = dxOld;
  let fx = f(rts);
  let fpx = fPrime(rts);

  for (let iter = 0; iter < maxIter; iter++) {
    const newtonOutOfBracket = ((rts - xh) * fpx - fx) * ((rts - xl) * fpx - fx) > 0;
    const tooSlow = Math.abs(2 * fx) > Math.abs(dxOld * fpx);
    if (newtonOutOfBracket || tooSlow) {
      dxOld = dx;
      dx = 0.5 * (xh - xl);
      rts = xl + dx;
      if (xl === rts) return rts;
    } else {
      dxOld = dx;
      dx = fx / fpx;
      const prev = rts;
      rts -= dx;
      if (prev === rts) return rts;
    }
    if (Math.abs(dx) < tol) return rts;
    fx = f(rts);
    fpx = fPrime(rts);
    if (fx < 0) xl = rts;
    else xh = rts;
  }
  return rts;
}
