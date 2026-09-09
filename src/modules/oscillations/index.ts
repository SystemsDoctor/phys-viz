// A mass hangs from a spring, driven by a sinusoidal force F0*cos(Omega
// t) applied directly to the mass, with linear viscous damping. Only the
// STEADY-STATE (particular) solution is drawn — not the transient that
// decays away from whatever initial condition started it — because the
// steady state alone is already a clean closed form
// (`x(t) = A(Omega) cos(Omega t - delta(Omega))`, the standard driven
// damped harmonic oscillator result) and is the part that actually
// answers the pedagogical question this module is about: how do
// amplitude and phase lag depend on the drive frequency. Adding the
// transient back in would mean branching on the damping regime
// (under-/critically-/over-damped each have a different closed form) for
// no real gain in what a student takes away — TASKS.md's own M7-4 note
// says to keep this `parametric`, not reach for `kernel/ode`, and this is
// the scope that keeps it that way (ARCHITECTURE.md §2).
//
// The resonance curve itself needs no bespoke plotting code: `omegaDrive`
// is an ordinary `number` param and `amplitude`/`phaseLag` are ordinary
// declared scalars, so the shell's existing generic Sweep Plot (§9 —
// "pick a parameter, sweep it across its range, evaluate a declared
// scalar at each value" — built for exactly this) already produces the
// textbook amplitude-vs-drive-frequency resonance curve with zero
// module-specific plotting code.
//
// This module DOES have a notion of "vertical" (a mass hanging under a
// fixed anchor) and reads `ctx.up`, same idiom as
// projectile-motion/rotational-dynamics (PHYSICS_CONVENTIONS.md). Every
// glyph stays in the plane spanned by the horizontal axis and `ctx.up`
// (the canonical x/up plane — X-17 in TASKS.md), so no off-plane
// `surface`/`patch` risk; this module doesn't use either glyph anyway.
import type { PhysicsModule, ModuleState } from '../types';
import type { SceneContext } from '@/scene/SceneContext';
import { fromAxisAngle } from '@/kernel/math';
import type { Quat } from '@/kernel/math';
import manifest from './manifest';
import { params, layers, scalars } from './params';

type V3 = [number, number, number];

const X_HAT: V3 = [1, 0, 0];
const Y_HAT: V3 = [0, 1, 0];
const Z_HAT: V3 = [0, 0, 1];

const Y_ANCHOR = 2.4; // fixed ceiling mount, in "up" world units above the origin
const REST_LENGTH = 1.4; // undeformed spring length — schematic, not a param
const Y_EQUILIBRIUM = Y_ANCHOR - REST_LENGTH; // where the mass sits when x = 0
const MASS_SIZE = 0.55; // box glyph edge length
const ARM_OFFSET = 0.7; // horizontal offset for the velocity/force arrows, away from the spring's own line
const VEL_ARROW_SCALE = 0.35;
const FORCE_ARROW_SCALE = 0.12;
const DENOM_FLOOR = 1e-6; // keeps the amplitude finite even at exact undamped resonance (c=0, omegaDrive=omega0)

function mutQ(q: Quat): [number, number, number, number] {
  return [q[0], q[1], q[2], q[3]];
}
// The `spring` glyph's own local axis of extension is its geometry's Y
// axis — identity when the world's up axis already IS y; a 90-degree
// rotation about X (local Y -> world Z) when the viewer has switched to
// z-up. Computed once in `create()`, same idiom as
// projectile-motion/rotational-dynamics's own `ctx.up` handling — NOTE
// this is only correct for the axis in effect when the module mounts: a
// LIVE up-axis switch from the settings menu while this module stays
// mounted does NOT get picked up (the shell only re-tweens the camera;
// it does not call `create()` again), so the spring/mass/arrows would
// stay oriented along the old axis while the camera reorients out from
// under them. Logged as a cross-cutting gap (X-22 in TASKS.md) shared
// with the other two `ctx.up`-reading modules, not fixed here — the
// options (recompute per `update()`, or have the shell remount on
// switch) trade off against the camera's own deliberately-animated
// up-axis transition (M2-21/M3-41), so it needs a real decision, not a
// one-module patch.
const Z_UP_SPRING_ORIENTATION = mutQ(fromAxisAngle([1, 0, 0], Math.PI / 2));
const IDENTITY_ORIENTATION: [number, number, number, number] = [0, 0, 0, 1];

interface SteadyState {
  amplitude: number;
  phase: number;
  x: number;
  v: number;
}

/**
 * Steady-state (particular) solution of `x'' + gamma x' + omega0^2 x =
 * (F0/m) cos(omegaDrive t)`: amplitude and phase lag from the standard
 * driven-damped-oscillator formulas, then `x(t)`/`v(t)` at the given
 * time. `denom` is floored rather than left to reach exactly zero so
 * undamped exact resonance (`c=0`, `omegaDrive=omega0`) renders a large
 * but finite amplitude instead of `Infinity`/`NaN`.
 */
function steadyStateAt(
  omega0: number,
  gamma: number,
  omegaDrive: number,
  forcePerMass: number,
  t: number,
): SteadyState {
  const detuning = omega0 * omega0 - omegaDrive * omegaDrive;
  const dampingTerm = gamma * omegaDrive;
  const denom = Math.max(Math.hypot(detuning, dampingTerm), DENOM_FLOOR);
  const amplitude = forcePerMass / denom;
  const phase = Math.atan2(dampingTerm, detuning);
  const x = amplitude * Math.cos(omegaDrive * t - phase);
  const v = -amplitude * omegaDrive * Math.sin(omegaDrive * t - phase);
  return { amplitude, phase, x, v };
}

function sceneAt(state: ModuleState) {
  const m = state.params.m as number;
  const k = state.params.k as number;
  const c = state.params.c as number;
  const F0 = state.params.F0 as number;
  const omegaDrive = state.params.omegaDrive as number;

  const omega0 = Math.sqrt(k / m);
  const gamma = c / m;
  const zeta = c / (2 * Math.sqrt(m * k));
  const steady = steadyStateAt(omega0, gamma, omegaDrive, F0 / m, state.t);
  const drivingForce = F0 * Math.cos(omegaDrive * state.t);

  return { m, k, c, F0, omegaDrive, omega0, zeta, steady, drivingForce };
}

const module: PhysicsModule = {
  manifest,
  params,
  layers,
  scalars,

  defaultView: { preset: '+z', projection: 'ortho' },

  create(ctx: SceneContext) {
    const upVec: V3 = ctx.up === 'y' ? Y_HAT : Z_HAT;
    const horizAxis: V3 = X_HAT;
    const springOrientation = ctx.up === 'y' ? IDENTITY_ORIENTATION : Z_UP_SPRING_ORIENTATION;

    const toWorld = (horiz: number, vert: number): V3 => [
      horizAxis[0] * horiz + upVec[0] * vert,
      horizAxis[1] * horiz + upVec[1] * vert,
      horizAxis[2] * horiz + upVec[2] * vert,
    ];

    const gSystem = ctx.group('system');
    const gDrive = ctx.group('drive');

    const anchor = ctx.body({
      group: gSystem,
      kind: 'box',
      position: toWorld(0, Y_ANCHOR),
      scale: [0.5, 0.2, 0.3],
      color: ctx.palette.construction,
    });
    const spring = ctx.body({
      group: gSystem,
      kind: 'spring',
      position: toWorld(0, Y_ANCHOR),
      orientation: springOrientation,
      scale: [1, REST_LENGTH, 1],
      color: ctx.palette.construction,
    });
    const mass = ctx.body({
      group: gSystem,
      kind: 'box',
      position: toWorld(0, Y_EQUILIBRIUM),
      scale: [MASS_SIZE, MASS_SIZE, MASS_SIZE],
      color: ctx.palette.position,
    });
    const massLabel = ctx.label({
      latex: 'm',
      anchor: toWorld(0, Y_EQUILIBRIUM),
      offset: [0, -24],
    });
    const velocityArrow = ctx.arrow({
      group: gSystem,
      color: ctx.palette.velocity,
      label: '\\vec{v}',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });
    const forceArrow = ctx.arrow({
      group: gDrive,
      color: ctx.palette.force,
      label: '\\vec{F}(t)',
      from: [0, 0, 0],
      to: [0, 0, 0],
    });

    return {
      update(state: ModuleState) {
        const systemOn = state.layers.system ?? true;
        const driveOn = state.layers.drive ?? true;

        const { steady, drivingForce } = sceneAt(state);
        const yMass = Y_EQUILIBRIUM + steady.x;
        const massPos = toWorld(0, yMass);

        anchor.visible(systemOn);

        const springLength = Y_ANCHOR - yMass;
        const springMidY = (Y_ANCHOR + yMass) / 2;
        spring.set({ position: toWorld(0, springMidY), scale: [1, springLength, 1] });
        spring.visible(systemOn);

        mass.set({ position: massPos });
        mass.visible(systemOn);
        massLabel.set({ anchor: massPos });
        massLabel.visible(systemOn);

        const velArmBase = toWorld(-ARM_OFFSET, yMass);
        velocityArrow.set({
          from: velArmBase,
          to: toWorld(-ARM_OFFSET, yMass + steady.v * VEL_ARROW_SCALE),
        });
        velocityArrow.visible(systemOn);

        const forceArmBase = toWorld(ARM_OFFSET, yMass);
        forceArrow.set({
          from: forceArmBase,
          to: toWorld(ARM_OFFSET, yMass + drivingForce * FORCE_ARROW_SCALE),
        });
        forceArrow.visible(driveOn);
      },

      // Duplicates sceneAt()'s math rather than sharing state with
      // update() — scalars() must stay pure, same pattern as every other
      // parametric module in this library (see momentum-collisions'
      // module.test.ts note on this).
      scalars(state: ModuleState) {
        const { omega0, zeta, steady } = sceneAt(state);
        return {
          omega0,
          zeta,
          amplitude: steady.amplitude,
          phaseLag: steady.phase,
          x: steady.x,
          v: steady.v,
        };
      },

      dispose() {
        anchor.dispose();
        spring.dispose();
        mass.dispose();
        massLabel.dispose();
        velocityArrow.dispose();
        forceArrow.dispose();
      },
    };
  },
};

export default module;
