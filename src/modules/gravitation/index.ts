// A single body orbiting a fixed central mass under Newtonian gravity —
// the restricted two-body ("test particle") problem: the orbiting body's
// own mass is assumed negligible next to the central mass, so every
// scalar below is PER UNIT MASS (specific energy, specific angular
// momentum) rather than carrying an actual mass factor. This is the
// standard simplification behind every "planet around a star" or
// "satellite around a planet" demo and is exactly what keeps this module
// closed-form (Visualizer Doctrine, ARCHITECTURE.md §2): position and
// velocity at any time t come from Kepler's equation, solved once per
// update() via kernel/ode's `findRoot` (Newton-Raphson/bisection,
// M1-15) — never from `kernel/ode`'s integrators. `findRoot` here is
// solving one transcendental algebraic equation, not integrating an ODE
// forward in time, so this stays a `parametric` module: `update({t})`
// from a fresh instance is bit-for-bit the same as scrubbing there,
// exactly the idempotence the contract suite checks.
//
// This module has no notion of "vertical" the way a hanging pendulum or
// a projectile under surface gravity does — the orbital plane's tilt is
// its own parameter (`inclination`), not tied to the viewer's up-axis
// setting — so, like `vector-algebra`/`fields-gradients`, it deliberately
// ignores `ctx.up` (PHYSICS_CONVENTIONS.md, "which axis is up").
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { norm, normalize, fromAxisAngle, rotateVec3 } from '@/kernel/math';
import type { Vec3 } from '@/kernel/math';
import { findRoot } from '@/kernel/ode';
import manifest from './manifest';
import { params, layers, scalars } from './params';

const X_HAT: Vec3 = [1, 0, 0];
const Z_HAT: Vec3 = [0, 0, 1];
const ORIGIN: [number, number, number] = [0, 0, 0];

const CENTRAL_BODY_DIAMETER = 0.4;
const ORBITING_BODY_DIAMETER = 0.22;
const VELOCITY_ARROW_SCALE = 0.4; // schematic: velocity units aren't length units, so this just needs to read clearly at this module's default a/mu range
const ACCEL_ARROW_SCALE = 0.15;
const ANGULAR_MOMENTUM_ARROW_LENGTH = 1.4; // fixed schematic length — h's own magnitude has different units than world-space length
const ORBIT_PATH_SAMPLES = 96;

function toMut(v: Vec3): [number, number, number] {
  return [v[0], v[1], v[2]];
}

/**
 * Solve Kepler's equation `M = E - e*sin(E)` for the eccentric anomaly E,
 * given mean anomaly M (any real value — no need to wrap into [0, 2*pi))
 * and eccentricity e in [0, 1). `f` is monotonically increasing
 * (f'(E) = 1 - e*cos(E) >= 1 - e > 0), and `|E - M| = e*|sin(E)| <= e`,
 * so `[M - e - margin, M + e + margin]` always brackets the unique root.
 */
function solveEccentricAnomaly(M: number, e: number): number {
  const bracket = e + 1e-6;
  const f = (E: number) => E - e * Math.sin(E) - M;
  const fPrime = (E: number) => 1 - e * Math.cos(E);
  return findRoot(f, fPrime, M - bracket, M + bracket);
}

interface OrbitState {
  r: number;
  speed: number;
  trueAnomaly: number;
  position: Vec3;
  velocity: Vec3;
  hVec: Vec3;
  h: number;
  period: number;
  specificEnergy: number;
  accel: number;
}

/**
 * Everything at a given instant, in closed form. `omega`/`inclination`
 * only rotate the fixed orbital plane (via two sequential `rotateVec3`
 * calls — a longitude-of-ascending-node term is omitted, i.e. the line
 * of nodes is pinned to the world x-axis, to keep this module's param
 * count in line with the rest of the library); everything else is a
 * function of `t` alone.
 */
function orbitAt(
  mu: number,
  a: number,
  e: number,
  omega: number,
  inclination: number,
  t: number,
): OrbitState {
  const n = Math.sqrt(mu / (a * a * a)); // mean motion
  const period = (2 * Math.PI) / n;
  const M = n * t; // mean anomaly — deliberately not wrapped, see solveEccentricAnomaly's doc comment
  const E = solveEccentricAnomaly(M, e);
  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const oneMinusECosE = 1 - e * cosE;
  const r = a * oneMinusECosE;
  const p = a * (1 - e * e); // semi-latus rectum
  const sqrt1MinusE2 = Math.sqrt(Math.max(0, 1 - e * e));
  const cosNu = (cosE - e) / oneMinusECosE;
  const sinNu = (sqrt1MinusE2 * sinE) / oneMinusECosE;
  const trueAnomaly = Math.atan2(sinNu, cosNu);

  const xp = r * cosNu;
  const yp = r * sinNu;
  const sqrtMuOverP = Math.sqrt(mu / p);
  const vxp = -sqrtMuOverP * sinNu;
  const vyp = sqrtMuOverP * (e + cosNu);

  const qOmega = fromAxisAngle(Z_HAT, omega);
  const qInc = fromAxisAngle(X_HAT, inclination);
  const toWorld = (v: Vec3): Vec3 => rotateVec3(qInc, rotateVec3(qOmega, v));

  const position = toWorld([xp, yp, 0]);
  const velocity = toWorld([vxp, vyp, 0]);
  const speed = Math.hypot(vxp, vyp);

  const h = Math.sqrt(mu * p); // specific angular momentum magnitude, |r x v|
  const hVec = toWorld([0, 0, h]);

  return {
    r,
    speed,
    trueAnomaly,
    position,
    velocity,
    hVec,
    h,
    period,
    specificEnergy: -mu / (2 * a), // vis-viva constant: speed^2/2 - mu/r, independent of t
    accel: mu / (r * r),
  };
}

/** The static ellipse outline — a pure function of the shape/orientation params, independent of t. */
function orbitPathPoints(a: number, e: number, omega: number, inclination: number) {
  const qOmega = fromAxisAngle(Z_HAT, omega);
  const qInc = fromAxisAngle(X_HAT, inclination);
  const toWorld = (v: Vec3): Vec3 => rotateVec3(qInc, rotateVec3(qOmega, v));
  const points: [number, number, number][] = [];
  for (let i = 0; i <= ORBIT_PATH_SAMPLES; i++) {
    const E = (2 * Math.PI * i) / ORBIT_PATH_SAMPLES;
    const r = a * (1 - e * Math.cos(E));
    const xp = r * Math.cos(E);
    // E is the eccentric, not true, anomaly, but cos(E)/sin(E) trace the
    // same ellipse shape up to a per-axis scale — fine for a shape-only
    // outline that never needs to line up point-for-point with orbitAt().
    const yp = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
    points.push(toMut(toWorld([xp, yp, 0])));
  }
  return points;
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    const gOrbit = ctx.group('orbit');
    const gVectors = ctx.group('vectors');
    const gAngular = ctx.group('angularMomentum');

    const centralBody = ctx.body({
      group: gOrbit,
      kind: 'sphere',
      position: ORIGIN,
      scale: [CENTRAL_BODY_DIAMETER, CENTRAL_BODY_DIAMETER, CENTRAL_BODY_DIAMETER],
      color: ctx.palette.construction,
    });
    const centralLabel = ctx.label({ latex: 'M', anchor: ORIGIN, offset: [0, 22] });
    const orbitPath = ctx.path({ group: gOrbit, color: ctx.palette.construction, points: [] });
    const orbitingBody = ctx.body({
      group: gOrbit,
      kind: 'sphere',
      position: ORIGIN,
      scale: [ORBITING_BODY_DIAMETER, ORBITING_BODY_DIAMETER, ORBITING_BODY_DIAMETER],
      color: ctx.palette.position,
    });

    const positionArrow = ctx.arrow({
      group: gVectors,
      color: ctx.palette.position,
      label: '\\vec{r}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const velocityArrow = ctx.arrow({
      group: gVectors,
      color: ctx.palette.velocity,
      label: '\\vec{v}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const accelArrow = ctx.arrow({
      group: gVectors,
      color: ctx.palette.accel,
      label: '\\vec{g}',
      from: ORIGIN,
      to: ORIGIN,
    });
    const angularMomentumArrow = ctx.arrow({
      group: gAngular,
      color: ctx.palette.angular,
      label: '\\vec{h}',
      doubleHead: true,
      from: ORIGIN,
      to: ORIGIN,
    });

    return {
      update(state: ModuleState) {
        const mu = state.params.mu as number;
        const a = state.params.a as number;
        const e = state.params.e as number;
        const omega = state.params.omega as number;
        const inclination = state.params.inclination as number;
        const orbitOn = state.layers.orbit ?? true;
        const vectorsOn = state.layers.vectors ?? true;
        const angularOn = state.layers.angularMomentum ?? false;

        const orbit = orbitAt(mu, a, e, omega, inclination, state.t);
        const posMut = toMut(orbit.position);

        centralBody.visible(orbitOn);
        centralLabel.visible(orbitOn);
        orbitPath.set({ points: orbitPathPoints(a, e, omega, inclination) });
        orbitPath.visible(orbitOn);
        orbitingBody.set({ position: posMut });
        orbitingBody.visible(orbitOn);

        positionArrow.set({ from: ORIGIN, to: posMut });
        positionArrow.visible(vectorsOn);

        const velTip = toMut([
          orbit.position[0] + orbit.velocity[0] * VELOCITY_ARROW_SCALE,
          orbit.position[1] + orbit.velocity[1] * VELOCITY_ARROW_SCALE,
          orbit.position[2] + orbit.velocity[2] * VELOCITY_ARROW_SCALE,
        ]);
        velocityArrow.set({ from: posMut, to: velTip });
        velocityArrow.visible(vectorsOn);

        // Gravity always points from the orbiting body back toward the
        // central mass, i.e. along -position (the central mass sits at
        // the origin).
        const towardCenter = norm(orbit.position) > 0 ? normalize(orbit.position) : [0, 0, 0];
        const accelTip = toMut([
          orbit.position[0] - towardCenter[0] * orbit.accel * ACCEL_ARROW_SCALE,
          orbit.position[1] - towardCenter[1] * orbit.accel * ACCEL_ARROW_SCALE,
          orbit.position[2] - towardCenter[2] * orbit.accel * ACCEL_ARROW_SCALE,
        ]);
        accelArrow.set({ from: posMut, to: accelTip });
        accelArrow.visible(vectorsOn);

        const hDir = norm(orbit.hVec) > 0 ? normalize(orbit.hVec) : [0, 0, 0];
        angularMomentumArrow.set({
          from: ORIGIN,
          to: toMut([
            hDir[0] * ANGULAR_MOMENTUM_ARROW_LENGTH,
            hDir[1] * ANGULAR_MOMENTUM_ARROW_LENGTH,
            hDir[2] * ANGULAR_MOMENTUM_ARROW_LENGTH,
          ]),
        });
        angularMomentumArrow.visible(angularOn);
      },

      // Recomputes orbitAt() rather than sharing state with update() —
      // scalars() must stay pure, same pattern as every other parametric
      // module in this library (see oscillations/momentum-collisions).
      scalars(state: ModuleState) {
        const mu = state.params.mu as number;
        const a = state.params.a as number;
        const e = state.params.e as number;
        const omega = state.params.omega as number;
        const inclination = state.params.inclination as number;
        const orbit = orbitAt(mu, a, e, omega, inclination, state.t);
        return {
          r: orbit.r,
          speed: orbit.speed,
          trueAnomaly: orbit.trueAnomaly,
          period: orbit.period,
          specificEnergy: orbit.specificEnergy,
          h: orbit.h,
          accel: orbit.accel,
        };
      },

      dispose() {
        centralBody.dispose();
        centralLabel.dispose();
        orbitPath.dispose();
        orbitingBody.dispose();
        positionArrow.dispose();
        velocityArrow.dispose();
        accelArrow.dispose();
        angularMomentumArrow.dispose();
      },
    };
  },
};

export default module;
