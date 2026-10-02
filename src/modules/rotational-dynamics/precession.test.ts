import { describe, it, expect } from 'vitest';
import type { SceneContext } from '@/scene/SceneContext';
import { discInertia, parallelAxis as parallelAxisTensor } from '@/kernel/inertia';
import { rk4 } from '@/kernel/ode';
import module from './index';
import type { ModuleState } from '../types';

// X-60. The precession panel draws a closed-form fast-top (small-nutation)
// approximation. X-29 found it carried a stray factor of 2 in the swing --
// a bug that a test written from the module's own formulas cannot see. So
// this file checks the DRAWN flywheel against an INDEPENDENT reference: an
// RK4 integration of the exact heavy-symmetric-top equations of motion
// (Lagrangian, pivot fixed, spin component Omega = omega_3 conserved):
//   I1 theta'' = I1 phi'^2 sin(th) cos(th) - I3 Omega phi' sin(th) + M g l sin(th)
//   phi'       = (p_phi - I3 Omega cos(th)) / (I1 sin^2(th)),  p_phi const
// with theta measured from the upward vertical.

const G = 9.8; // the module's local g (not exported); the reference must use the same value
const noopHandle = { set: () => {}, visible: () => {}, dispose: () => {} };

/** A ctx that records every position the precession flywheel is given. */
function capturingCtx(sink: { last: [number, number, number] | null }): SceneContext {
  return new Proxy({} as SceneContext, {
    get(_target, prop) {
      if (prop === 'palette') return new Proxy({}, { get: () => '#000000' });
      if (prop === 'up') return 'y';
      if (prop === 'group') return (name: string) => ({ id: name });
      if (prop === 'body') {
        return (props: { group?: { id: string }; position: [number, number, number] }) => {
          const isFlywheel = props.group?.id === 'precession';
          if (isFlywheel) sink.last = props.position;
          return {
            set: (next: { position?: [number, number, number] }) => {
              if (isFlywheel && next.position) sink.last = next.position;
            },
            visible: () => {},
            dispose: () => {},
          };
        };
      }
      return () => noopHandle;
    },
  });
}

interface TopParams {
  topMass: number;
  topArmLength: number;
  topRadius: number;
  topSpinRate: number;
  topTiltAngle: number;
}

/** Exact heavy-top (theta, phi) at each requested time, by RK4. phi is unwrapped. */
function exactTop(p: TopParams, k: number, times: number[]): { theta: number[]; phi: number[] } {
  const flywheel = discInertia(p.topMass, p.topRadius);
  const i3 = flywheel[8];
  const i1 = parallelAxisTensor(flywheel, p.topMass, [0, 0, p.topArmLength])[0];
  const mgl = p.topMass * G * p.topArmLength;
  const omega = p.topSpinRate;
  const omegaP = mgl / (i3 * omega);
  const th0 = p.topTiltAngle;
  const phiDot0 = k * omegaP;
  const pPhi = i1 * phiDot0 * Math.sin(th0) ** 2 + i3 * omega * Math.cos(th0);

  // state = [theta, thetaDot, phi]
  const deriv = (s: Float64Array): Float64Array => {
    const th = s[0];
    const sin = Math.sin(th);
    const phiDot = (pPhi - i3 * omega * Math.cos(th)) / (i1 * sin * sin);
    const thDdot =
      (i1 * phiDot * phiDot * sin * Math.cos(th) - i3 * omega * phiDot * sin + mgl * sin) / i1;
    return Float64Array.of(s[1], thDdot, phiDot);
  };

  const nutationOmega = (i3 * omega) / i1;
  const dt = Math.min(1e-3, 0.01 / nutationOmega); // >= 600 steps per nutation cycle
  let state: Float64Array = Float64Array.of(th0, 0, 0);
  let t = 0;
  const theta: number[] = [];
  const phi: number[] = [];
  for (const target of times) {
    while (t < target - 1e-12) {
      const h = Math.min(dt, target - t);
      state = Float64Array.from(rk4(deriv, state, t, h));
      t += h;
    }
    theta.push(state[0]);
    phi.push(state[2]);
  }
  return { theta, phi };
}

function stateFor(p: TopParams, nutationAmplitude: number, t: number): ModuleState {
  const params: ModuleState['params'] = {};
  for (const q of module.params) params[q.key] = q.default;
  return { params: { ...params, ...p, nutationAmplitude }, layers: {}, t };
}

/** The (theta, phi) the module actually hands the flywheel at time t (up = y). */
function drawnTopAt(
  p: TopParams,
  nutationAmplitude: number,
  times: number[],
): { theta: number[]; phi: number[] } {
  const sink: { last: [number, number, number] | null } = { last: null };
  const instance = module.create(capturingCtx(sink));
  const theta: number[] = [];
  const phi: number[] = [];
  let prev = 0;
  for (const t of times) {
    sink.last = null;
    instance.update(stateFor(p, nutationAmplitude, t));
    const [x, y, z] = sink.last as unknown as [number, number, number];
    theta.push(Math.acos(y / p.topArmLength));
    // position = L (sin th sin phi, cos th, sin th cos phi); unwrap phi.
    let ph = Math.atan2(x, z);
    while (ph - prev > Math.PI) ph -= 2 * Math.PI;
    while (ph - prev < -Math.PI) ph += 2 * Math.PI;
    phi.push(ph);
    prev = ph;
  }
  return { theta, phi };
}

describe('rotational-dynamics precession vs the exact heavy top (X-60)', () => {
  const fast: TopParams = {
    topMass: 1.4,
    topArmLength: 0.7,
    topRadius: 0.35,
    topSpinRate: 600,
    topTiltAngle: 0.5,
  };

  /** Module-vs-exact comparison over `periods` nutation periods at release ratio k = phi'(0)/Omega_p. */
  function compare(spin: number, k: number, periods = 4) {
    const q = { ...fast, topSpinRate: spin };
    const flywheel = discInertia(q.topMass, q.topRadius);
    const i3 = flywheel[8];
    const i1 = parallelAxisTensor(flywheel, q.topMass, [0, 0, q.topArmLength])[0];
    const omegaP = (q.topMass * G * q.topArmLength) / (i3 * spin);
    const nutationOmega = (i3 * spin) / i1;
    const baseSwing = (omegaP * Math.sin(q.topTiltAngle)) / nutationOmega;
    const period = (2 * Math.PI) / nutationOmega;
    const n = 40 * periods;
    const times = Array.from({ length: n + 1 }, (_, i) => (i * periods * period) / n);
    // nutationAmplitude <-> release ratio: k = 1 - deltaTheta / baseSwing
    const exact = exactTop(q, k, times);
    const drawn = drawnTopAt(q, (1 - k) * baseSwing, times);
    const span = (a: number[]) => Math.max(...a) - Math.min(...a);
    let thetaErr = 0;
    let phiErr = 0;
    for (let i = 0; i <= n; i++) {
      thetaErr = Math.max(thetaErr, Math.abs(exact.theta[i] - drawn.theta[i]));
      phiErr = Math.max(phiErr, Math.abs(exact.phi[i] - drawn.phi[i]));
    }
    const T = times[n];
    const exactRate = (exact.phi[n] - exact.phi[0]) / T / omegaP;
    const drawnRate = (drawn.phi[n] - drawn.phi[0]) / T / omegaP;
    return {
      thetaErr,
      phiErrRel: phiErr / (omegaP * T), // vs. the precession angle swept
      exactSwing: span(exact.theta),
      drawnSwing: span(drawn.theta),
      rateErr: Math.abs(drawnRate - exactRate), // in units of Omega_p
      baseSwing,
    };
  }

  // Released from rest, released at the steady rate (no nutation), and
  // released already precessing backward (looping regime).
  it.each([
    ['from rest (k=0, cusped)', 0],
    ['at the steady rate (k=1, no nutation)', 1],
    ['precessing backward (k=-1, looping)', -1],
  ])('tracks the exact heavy top at Omega=600: %s', (_name, k) => {
    const r = compare(600, k);
    // Mean precession rate within 1.5% of the exact one (X-29: it was 2x).
    expect(r.rateErr).toBeLessThan(0.015);
    // Drawn azimuth stays within 3% of the precession angle swept.
    expect(r.phiErrRel).toBeLessThan(0.03);
    if (k !== 1) {
      // Nutation swing within 10% of the exact one (X-29: it was 2x) ...
      expect(Math.abs(r.drawnSwing / r.exactSwing - 1)).toBeLessThan(0.1);
      // ... and the tilt tracks it to well under the swing itself.
      expect(r.thetaErr).toBeLessThan(0.12 * r.exactSwing);
    } else {
      // Steady precession: no tilt wobble to speak of, drawn or exact.
      expect(r.thetaErr).toBeLessThan(0.01 * r.baseSwing);
      expect(r.drawnSwing).toBeLessThan(1e-9);
    }
  });

  it('the approximation converges to the exact top as the spin grows', () => {
    const slow = compare(300, 0);
    const mid = compare(600, 0);
    const fastest = compare(1200, 0);
    expect(fastest.rateErr).toBeLessThan(mid.rateErr / 2);
    expect(mid.rateErr).toBeLessThan(slow.rateErr / 2);
    expect(fastest.thetaErr / fastest.exactSwing).toBeLessThan(mid.thetaErr / mid.exactSwing);
  });
});
